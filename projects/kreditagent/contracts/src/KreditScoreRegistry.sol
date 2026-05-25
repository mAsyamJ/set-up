// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KreditErrors} from "./KreditErrors.sol";
import {KreditRoles} from "./KreditRoles.sol";
import {IKreditAgentIdentity} from "./interfaces/IKreditAgentIdentity.sol";
import {IKreditAccessController} from "./interfaces/IKreditAccessController.sol";
import {IKreditConsentRegistry} from "./interfaces/IKreditConsentRegistry.sol";
import {IKreditScoreRegistry} from "./interfaces/IKreditScoreRegistry.sol";

/// @title KreditScoreRegistry
/// @notice Consent-gated credit score attestation registry.
/// @dev KreditAgent is an information/attestation layer only; this contract does not approve or issue loans.
contract KreditScoreRegistry is IKreditScoreRegistry {
    IKreditAgentIdentity public immutable identity;
    IKreditAccessController public immutable accessController;
    IKreditConsentRegistry public immutable consentRegistry;

    uint64 public constant MAX_ATTESTATION_TTL = 45 days;
    uint16 public constant MIN_SCORE = 300;
    uint16 public constant MAX_SCORE = 900;

    bytes32 public constant CREDIT_ATTESTATION_TYPEHASH = keccak256(
        "CreditAttestation(uint256 chainId,address registry,uint256 borrowerAgentId,uint256 issuerAgentId,uint256 consentId,bytes32 scoreVersionHash,bytes32 featureHash,bytes32 evidenceHash,bytes32 narrativeHash,uint16 score,uint8 scoreBand,uint64 expiresAt)"
    );

    struct CreditAttestation {
        uint256 borrowerAgentId;
        uint256 issuerAgentId;
        uint256 consentId;
        bytes32 scoreVersionHash;
        bytes32 modelPolicyHash;
        bytes32 featureHash;
        bytes32 evidenceHash;
        bytes32 narrativeHash;
        bytes32 attestationDigest;
        uint16 score;
        uint8 scoreBand;
        uint64 issuedAt;
        uint64 expiresAt;
        uint64 revokedAt;
        string metadataURI;
    }

    uint256 public nextAttestationId = 1;
    mapping(uint256 => CreditAttestation) private _attestations;
    mapping(bytes32 => uint256) public attestationIdByDigest;

    event CreditAttestationPublished(
        uint256 indexed attestationId,
        uint256 indexed borrowerAgentId,
        uint256 indexed issuerAgentId,
        uint16 score,
        uint8 scoreBand,
        bytes32 attestationDigest,
        bytes32 evidenceHash
    );
    event CreditAttestationRevoked(
        uint256 indexed attestationId,
        uint256 indexed borrowerAgentId,
        uint256 indexed issuerAgentId,
        bytes32 reasonHash
    );

    constructor(
        IKreditAgentIdentity identity_,
        IKreditAccessController accessController_,
        IKreditConsentRegistry consentRegistry_
    ) {
        if (address(identity_) == address(0) || address(accessController_) == address(0) || address(consentRegistry_) == address(0)) {
            revert KreditErrors.ZeroAddress();
        }
        identity = identity_;
        accessController = accessController_;
        consentRegistry = consentRegistry_;
    }

    function publishCreditAttestation(
        uint256 borrowerAgentId,
        uint256 issuerAgentId,
        uint256 consentId,
        bytes32 scoreVersionHash,
        bytes32 modelPolicyHash,
        bytes32 featureHash,
        bytes32 evidenceHash,
        bytes32 narrativeHash,
        uint16 score,
        uint8 scoreBand,
        uint64 expiresAt,
        string calldata metadataURI
    ) external returns (uint256 attestationId, bytes32 attestationDigest) {
        accessController.requireNotPaused();
        accessController.requireAgentRole(KreditRoles.ISSUER_AGENT_ROLE, issuerAgentId);
        if (!identity.isAgentController(issuerAgentId, msg.sender)) revert KreditErrors.NotAgentController();
        if (!identity.isAgentActive(borrowerAgentId)) revert KreditErrors.UnknownAgent();
        if (score < MIN_SCORE || score > MAX_SCORE) revert KreditErrors.ScoreOutOfRange();
        if (scoreBand == 0 || scoreBand > 5) revert KreditErrors.ScoreOutOfRange();
        if (scoreVersionHash == bytes32(0) || modelPolicyHash == bytes32(0) || featureHash == bytes32(0) || evidenceHash == bytes32(0)) {
            revert KreditErrors.EmptyHash();
        }
        if (expiresAt <= block.timestamp || expiresAt > block.timestamp + MAX_ATTESTATION_TTL) revert KreditErrors.InvalidExpiry();
        if (!consentRegistry.canUseConsent(consentId, borrowerAgentId, issuerAgentId, keccak256("credit_attestation"))) {
            revert KreditErrors.ConsentNotActive();
        }

        attestationDigest = keccak256(
            abi.encode(
                CREDIT_ATTESTATION_TYPEHASH,
                block.chainid,
                address(this),
                borrowerAgentId,
                issuerAgentId,
                consentId,
                scoreVersionHash,
                featureHash,
                evidenceHash,
                narrativeHash,
                score,
                scoreBand,
                expiresAt
            )
        );
        if (attestationIdByDigest[attestationDigest] != 0) revert KreditErrors.DuplicateAttestation();

        attestationId = nextAttestationId++;
        _attestations[attestationId] = CreditAttestation({
            borrowerAgentId: borrowerAgentId,
            issuerAgentId: issuerAgentId,
            consentId: consentId,
            scoreVersionHash: scoreVersionHash,
            modelPolicyHash: modelPolicyHash,
            featureHash: featureHash,
            evidenceHash: evidenceHash,
            narrativeHash: narrativeHash,
            attestationDigest: attestationDigest,
            score: score,
            scoreBand: scoreBand,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            revokedAt: 0,
            metadataURI: metadataURI
        });
        attestationIdByDigest[attestationDigest] = attestationId;

        emit CreditAttestationPublished(attestationId, borrowerAgentId, issuerAgentId, score, scoreBand, attestationDigest, evidenceHash);
    }

    function revokeAttestation(uint256 attestationId, bytes32 reasonHash) external {
        CreditAttestation storage att = _attestations[attestationId];
        if (att.borrowerAgentId == 0) revert KreditErrors.UnknownAttestation();
        if (att.revokedAt != 0) revert KreditErrors.AttestationRevoked();
        bool issuerController = identity.isAgentController(att.issuerAgentId, msg.sender);
        bool borrowerController = identity.isAgentController(att.borrowerAgentId, msg.sender);
        if (!issuerController && !borrowerController) revert KreditErrors.NotAgentController();
        att.revokedAt = uint64(block.timestamp);
        emit CreditAttestationRevoked(attestationId, att.borrowerAgentId, att.issuerAgentId, reasonHash);
    }

    function isAttestationUsable(uint256 attestationId) public view override returns (bool) {
        CreditAttestation memory att = _attestations[attestationId];
        return att.borrowerAgentId != 0
            && att.revokedAt == 0
            && att.expiresAt > block.timestamp
            && identity.isAgentActive(att.borrowerAgentId)
            && identity.isAgentActive(att.issuerAgentId)
            && consentRegistry.isConsentActive(att.consentId);
    }

    function getAttestation(uint256 attestationId) external view returns (CreditAttestation memory) {
        if (_attestations[attestationId].borrowerAgentId == 0) revert KreditErrors.UnknownAttestation();
        return _attestations[attestationId];
    }

    function getAttestationCore(uint256 attestationId)
        external
        view
        override
        returns (
            uint256 borrowerAgentId,
            uint256 issuerAgentId,
            uint256 consentId,
            bytes32 attestationDigest,
            bytes32 evidenceHash,
            uint64 expiresAt,
            uint64 revokedAt
        )
    {
        CreditAttestation memory att = _attestations[attestationId];
        if (att.borrowerAgentId == 0) revert KreditErrors.UnknownAttestation();
        return (att.borrowerAgentId, att.issuerAgentId, att.consentId, att.attestationDigest, att.evidenceHash, att.expiresAt, att.revokedAt);
    }
}
