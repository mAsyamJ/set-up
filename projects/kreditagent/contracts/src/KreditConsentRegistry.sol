// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KreditErrors} from "./KreditErrors.sol";
import {KreditRoles} from "./KreditRoles.sol";
import {IKreditAgentIdentity} from "./interfaces/IKreditAgentIdentity.sol";
import {IKreditAccessController} from "./interfaces/IKreditAccessController.sol";
import {IKreditConsentRegistry} from "./interfaces/IKreditConsentRegistry.sol";

/// @title KreditConsentRegistry
/// @notice Borrower-owned consent receipts for alternative-data scoring.
/// @dev Stores only hashes/purpose metadata, never raw QRIS/e-commerce data.
contract KreditConsentRegistry is IKreditConsentRegistry {
    IKreditAgentIdentity public immutable identity;
    IKreditAccessController public immutable accessController;

    uint64 public constant MAX_CONSENT_DURATION = 370 days;

    struct ConsentReceipt {
        uint256 borrowerAgentId;
        uint256 processorAgentId;
        bytes32 consentHash;
        bytes32 sourceHash;
        bytes32 scopeHash;
        bytes32 purposeHash;
        bytes32 dataCommitmentHash;
        uint64 grantedAt;
        uint64 expiresAt;
        uint64 revokedAt;
    }

    uint256 public nextConsentId = 1;
    mapping(uint256 => ConsentReceipt) private _consents;

    event ConsentGranted(
        uint256 indexed consentId,
        uint256 indexed borrowerAgentId,
        uint256 indexed processorAgentId,
        bytes32 purposeHash,
        bytes32 consentHash,
        uint64 expiresAt
    );
    event ConsentRevoked(uint256 indexed consentId, uint256 indexed borrowerAgentId, bytes32 revokeReasonHash);

    constructor(IKreditAgentIdentity identity_, IKreditAccessController accessController_) {
        if (address(identity_) == address(0) || address(accessController_) == address(0)) revert KreditErrors.ZeroAddress();
        identity = identity_;
        accessController = accessController_;
    }

    function grantConsent(
        uint256 borrowerAgentId,
        uint256 processorAgentId,
        bytes32 consentHash,
        bytes32 sourceHash,
        bytes32 scopeHash,
        bytes32 purposeHash,
        bytes32 dataCommitmentHash,
        uint64 expiresAt
    ) external returns (uint256 consentId) {
        accessController.requireNotPaused();
        if (!identity.isAgentController(borrowerAgentId, msg.sender)) revert KreditErrors.NotAgentController();
        if (!identity.isAgentActive(processorAgentId)) revert KreditErrors.UnknownAgent();
        if (consentHash == bytes32(0) || purposeHash == bytes32(0) || scopeHash == bytes32(0)) revert KreditErrors.EmptyHash();
        if (expiresAt <= block.timestamp || expiresAt > block.timestamp + MAX_CONSENT_DURATION) revert KreditErrors.InvalidExpiry();

        consentId = nextConsentId++;
        _consents[consentId] = ConsentReceipt({
            borrowerAgentId: borrowerAgentId,
            processorAgentId: processorAgentId,
            consentHash: consentHash,
            sourceHash: sourceHash,
            scopeHash: scopeHash,
            purposeHash: purposeHash,
            dataCommitmentHash: dataCommitmentHash,
            grantedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            revokedAt: 0
        });

        emit ConsentGranted(consentId, borrowerAgentId, processorAgentId, purposeHash, consentHash, expiresAt);
    }

    function revokeConsent(uint256 consentId, bytes32 revokeReasonHash) external {
        ConsentReceipt storage consent = _consents[consentId];
        if (consent.borrowerAgentId == 0) revert KreditErrors.UnknownConsent();
        if (!identity.isAgentController(consent.borrowerAgentId, msg.sender)) revert KreditErrors.NotAgentController();
        if (consent.revokedAt != 0) revert KreditErrors.ConsentRevoked();

        consent.revokedAt = uint64(block.timestamp);
        emit ConsentRevoked(consentId, consent.borrowerAgentId, revokeReasonHash);
    }

    function isConsentActive(uint256 consentId) public view override returns (bool) {
        ConsentReceipt memory consent = _consents[consentId];
        return consent.borrowerAgentId != 0
            && consent.revokedAt == 0
            && consent.expiresAt > block.timestamp
            && identity.isAgentActive(consent.borrowerAgentId)
            && identity.isAgentActive(consent.processorAgentId);
    }

    function canUseConsent(
        uint256 consentId,
        uint256 borrowerAgentId,
        uint256 processorAgentId,
        bytes32 purposeHash
    ) external view override returns (bool) {
        ConsentReceipt memory consent = _consents[consentId];
        return isConsentActive(consentId)
            && consent.borrowerAgentId == borrowerAgentId
            && consent.processorAgentId == processorAgentId
            && consent.purposeHash == purposeHash;
    }

    function getConsent(uint256 consentId) external view returns (ConsentReceipt memory) {
        if (_consents[consentId].borrowerAgentId == 0) revert KreditErrors.UnknownConsent();
        return _consents[consentId];
    }
}
