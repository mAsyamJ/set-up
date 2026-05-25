// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KreditErrors} from "./KreditErrors.sol";
import {KreditRoles} from "./KreditRoles.sol";
import {IKreditAgentIdentity} from "./interfaces/IKreditAgentIdentity.sol";
import {IKreditAccessController} from "./interfaces/IKreditAccessController.sol";
import {IKreditScoreRegistry} from "./interfaces/IKreditScoreRegistry.sol";

/// @title KreditValidationRegistry
/// @notice Independent validator workflow for KreditAgent credit attestations.
contract KreditValidationRegistry {
    IKreditAgentIdentity public immutable identity;
    IKreditAccessController public immutable accessController;
    IKreditScoreRegistry public immutable scoreRegistry;

    uint8 public constant MAX_QUORUM = 7;
    uint64 public constant MAX_VALIDATION_WINDOW = 14 days;

    enum RequestStatus {
        Unknown,
        Open,
        Passed,
        Failed,
        Mixed,
        Expired
    }

    struct ValidationRequest {
        uint256 requesterAgentId;
        uint256 borrowerAgentId;
        uint256 issuerAgentId;
        uint256 attestationId;
        bytes32 attestationDigest;
        uint8 requiredQuorum;
        uint8 passCount;
        uint8 failCount;
        uint8 reviewCount;
        uint64 requestedAt;
        uint64 deadline;
        RequestStatus status;
    }

    struct ValidationResult {
        uint256 requestId;
        uint256 validatorAgentId;
        bytes32 resultCode;
        bytes32 evidenceHash;
        bytes32 reportHash;
        string reportURI;
        uint64 submittedAt;
    }

    uint256 public nextRequestId = 1;
    mapping(uint256 => ValidationRequest) private _requests;
    mapping(uint256 => ValidationResult[]) private _results;
    mapping(uint256 => mapping(uint256 => bool)) public hasValidatorSubmitted;
    mapping(uint256 => uint256) public latestPassedRequestByAttestation;

    event ValidationRequested(
        uint256 indexed requestId,
        uint256 indexed attestationId,
        uint256 indexed requesterAgentId,
        uint8 requiredQuorum,
        uint64 deadline
    );
    event ValidationSubmitted(
        uint256 indexed requestId,
        uint256 indexed validatorAgentId,
        bytes32 resultCode,
        bytes32 evidenceHash,
        bytes32 reportHash
    );
    event ValidationFinalized(uint256 indexed requestId, uint256 indexed attestationId, RequestStatus status);

    constructor(
        IKreditAgentIdentity identity_,
        IKreditAccessController accessController_,
        IKreditScoreRegistry scoreRegistry_
    ) {
        if (address(identity_) == address(0) || address(accessController_) == address(0) || address(scoreRegistry_) == address(0)) {
            revert KreditErrors.ZeroAddress();
        }
        identity = identity_;
        accessController = accessController_;
        scoreRegistry = scoreRegistry_;
    }

    function requestValidation(
        uint256 requesterAgentId,
        uint256 attestationId,
        uint8 requiredQuorum,
        uint64 deadline
    ) external returns (uint256 requestId) {
        accessController.requireNotPaused();
        bool requesterAllowed = accessController.hasAgentRole(KreditRoles.LENDER_AGENT_ROLE, requesterAgentId)
            || accessController.hasAgentRole(KreditRoles.ISSUER_AGENT_ROLE, requesterAgentId);
        if (!requesterAllowed) revert KreditErrors.NotAllowedRole(KreditRoles.LENDER_AGENT_ROLE, requesterAgentId);
        if (!identity.isAgentController(requesterAgentId, msg.sender)) revert KreditErrors.NotAgentController();
        if (!scoreRegistry.isAttestationUsable(attestationId)) revert KreditErrors.AttestationExpired();
        if (requiredQuorum == 0 || requiredQuorum > MAX_QUORUM) revert KreditErrors.InvalidQuorum();
        if (deadline <= block.timestamp || deadline > block.timestamp + MAX_VALIDATION_WINDOW) revert KreditErrors.InvalidExpiry();

        (uint256 borrowerAgentId, uint256 issuerAgentId,, bytes32 attestationDigest,,,) = scoreRegistry.getAttestationCore(attestationId);

        requestId = nextRequestId++;
        _requests[requestId] = ValidationRequest({
            requesterAgentId: requesterAgentId,
            borrowerAgentId: borrowerAgentId,
            issuerAgentId: issuerAgentId,
            attestationId: attestationId,
            attestationDigest: attestationDigest,
            requiredQuorum: requiredQuorum,
            passCount: 0,
            failCount: 0,
            reviewCount: 0,
            requestedAt: uint64(block.timestamp),
            deadline: deadline,
            status: RequestStatus.Open
        });

        emit ValidationRequested(requestId, attestationId, requesterAgentId, requiredQuorum, deadline);
    }

    function submitValidation(
        uint256 requestId,
        uint256 validatorAgentId,
        bytes32 resultCode,
        bytes32 evidenceHash,
        bytes32 reportHash,
        string calldata reportURI
    ) external {
        accessController.requireNotPaused();
        ValidationRequest storage req = _requests[requestId];
        if (req.status == RequestStatus.Unknown) revert KreditErrors.UnknownValidationRequest();
        if (req.status != RequestStatus.Open) revert KreditErrors.ValidationRequestClosed();
        if (block.timestamp > req.deadline) {
            req.status = RequestStatus.Expired;
            emit ValidationFinalized(requestId, req.attestationId, RequestStatus.Expired);
            revert KreditErrors.Expired();
        }
        accessController.requireAgentRole(KreditRoles.VALIDATOR_AGENT_ROLE, validatorAgentId);
        if (!identity.isAgentController(validatorAgentId, msg.sender)) revert KreditErrors.NotAgentController();
        if (hasValidatorSubmitted[requestId][validatorAgentId]) revert KreditErrors.DuplicateValidation();
        if (identity.ownerOf(validatorAgentId) == identity.ownerOf(req.issuerAgentId)) revert KreditErrors.SelfValidation();
        if (validatorAgentId == req.issuerAgentId || validatorAgentId == req.requesterAgentId) revert KreditErrors.SelfValidation();
        if (evidenceHash == bytes32(0) || reportHash == bytes32(0)) revert KreditErrors.EmptyHash();
        if (
            resultCode != KreditRoles.VALIDATION_PASS
                && resultCode != KreditRoles.VALIDATION_FAIL
                && resultCode != KreditRoles.VALIDATION_NEEDS_REVIEW
        ) revert KreditErrors.EmptyHash();

        hasValidatorSubmitted[requestId][validatorAgentId] = true;
        _results[requestId].push(ValidationResult({
            requestId: requestId,
            validatorAgentId: validatorAgentId,
            resultCode: resultCode,
            evidenceHash: evidenceHash,
            reportHash: reportHash,
            reportURI: reportURI,
            submittedAt: uint64(block.timestamp)
        }));

        if (resultCode == KreditRoles.VALIDATION_PASS) req.passCount += 1;
        else if (resultCode == KreditRoles.VALIDATION_FAIL) req.failCount += 1;
        else req.reviewCount += 1;

        emit ValidationSubmitted(requestId, validatorAgentId, resultCode, evidenceHash, reportHash);
        _tryFinalize(req, requestId);
    }

    function finalizeExpired(uint256 requestId) external {
        ValidationRequest storage req = _requests[requestId];
        if (req.status == RequestStatus.Unknown) revert KreditErrors.UnknownValidationRequest();
        if (req.status != RequestStatus.Open) revert KreditErrors.ValidationRequestClosed();
        if (block.timestamp <= req.deadline) revert KreditErrors.InvalidExpiry();
        req.status = RequestStatus.Expired;
        emit ValidationFinalized(requestId, req.attestationId, RequestStatus.Expired);
    }

    function isAttestationValidated(uint256 attestationId) external view returns (bool) {
        return latestPassedRequestByAttestation[attestationId] != 0;
    }

    function getRequest(uint256 requestId) external view returns (ValidationRequest memory) {
        if (_requests[requestId].status == RequestStatus.Unknown) revert KreditErrors.UnknownValidationRequest();
        return _requests[requestId];
    }

    function getResults(uint256 requestId) external view returns (ValidationResult[] memory) {
        if (_requests[requestId].status == RequestStatus.Unknown) revert KreditErrors.UnknownValidationRequest();
        return _results[requestId];
    }

    function _tryFinalize(ValidationRequest storage req, uint256 requestId) internal {
        if (req.passCount >= req.requiredQuorum) {
            req.status = RequestStatus.Passed;
            latestPassedRequestByAttestation[req.attestationId] = requestId;
            emit ValidationFinalized(requestId, req.attestationId, RequestStatus.Passed);
            return;
        }
        if (req.failCount >= req.requiredQuorum) {
            req.status = RequestStatus.Failed;
            emit ValidationFinalized(requestId, req.attestationId, RequestStatus.Failed);
            return;
        }
        if (req.reviewCount >= req.requiredQuorum) {
            req.status = RequestStatus.Mixed;
            emit ValidationFinalized(requestId, req.attestationId, RequestStatus.Mixed);
        }
    }
}
