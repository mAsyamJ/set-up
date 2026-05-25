// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KreditErrors} from "./KreditErrors.sol";
import {KreditRoles} from "./KreditRoles.sol";
import {IKreditAgentIdentity} from "./interfaces/IKreditAgentIdentity.sol";
import {IKreditAccessController} from "./interfaces/IKreditAccessController.sol";
import {IKreditScoreRegistry} from "./interfaces/IKreditScoreRegistry.sol";

/// @title KreditReputationRegistry
/// @notice Disputeable borrower/lender/issuer reputation events for KreditAgent.
contract KreditReputationRegistry {
    IKreditAgentIdentity public immutable identity;
    IKreditAccessController public immutable accessController;
    IKreditScoreRegistry public immutable scoreRegistry;

    uint64 public constant DISPUTE_WINDOW = 120 days;
    int16 public constant MAX_ABS_SCORE_DELTA = 150;

    enum DisputeStatus {
        None,
        Open,
        Responded,
        ResolvedUpheld,
        ResolvedRejected
    }

    struct ReputationEventData {
        uint256 subjectAgentId;
        uint256 issuerAgentId;
        uint256 attestationId;
        bytes32 eventType;
        bytes32 evidenceHash;
        bytes32 metadataHash;
        int16 scoreDelta;
        uint64 postedAt;
        DisputeStatus disputeStatus;
    }

    struct DisputeData {
        uint256 openedByAgentId;
        bytes32 disputeEvidenceHash;
        bytes32 responseEvidenceHash;
        bytes32 resolutionHash;
        uint64 openedAt;
        uint64 respondedAt;
        uint64 resolvedAt;
    }

    uint256 public nextEventId = 1;
    mapping(uint256 => ReputationEventData) private _events;
    mapping(uint256 => DisputeData) private _disputes;

    event ReputationPosted(
        uint256 indexed eventId,
        uint256 indexed subjectAgentId,
        uint256 indexed issuerAgentId,
        bytes32 eventType,
        int16 scoreDelta,
        bytes32 evidenceHash
    );
    event ReputationDisputeOpened(uint256 indexed eventId, uint256 indexed subjectAgentId, bytes32 disputeEvidenceHash);
    event ReputationDisputeResponded(uint256 indexed eventId, uint256 indexed issuerAgentId, bytes32 responseEvidenceHash);
    event ReputationDisputeResolved(uint256 indexed eventId, DisputeStatus status, bytes32 resolutionHash);

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

    function postReputation(
        uint256 subjectAgentId,
        uint256 issuerAgentId,
        uint256 attestationId,
        bytes32 eventType,
        bytes32 evidenceHash,
        bytes32 metadataHash,
        int16 scoreDelta
    ) external returns (uint256 eventId) {
        accessController.requireNotPaused();
        bool allowed = accessController.hasAgentRole(KreditRoles.LENDER_AGENT_ROLE, issuerAgentId)
            || accessController.hasAgentRole(KreditRoles.ISSUER_AGENT_ROLE, issuerAgentId);
        if (!allowed) revert KreditErrors.NotAllowedRole(KreditRoles.LENDER_AGENT_ROLE, issuerAgentId);
        if (!identity.isAgentController(issuerAgentId, msg.sender)) revert KreditErrors.NotAgentController();
        if (!identity.isAgentActive(subjectAgentId)) revert KreditErrors.UnknownAgent();
        if (eventType == bytes32(0) || evidenceHash == bytes32(0)) revert KreditErrors.EmptyHash();
        if (scoreDelta > MAX_ABS_SCORE_DELTA || scoreDelta < -MAX_ABS_SCORE_DELTA) revert KreditErrors.ScoreOutOfRange();

        if (attestationId != 0) {
            (uint256 borrowerAgentId,,,,,,) = scoreRegistry.getAttestationCore(attestationId);
            if (borrowerAgentId != subjectAgentId) revert KreditErrors.ConsentMismatch();
        }

        eventId = nextEventId++;
        _events[eventId] = ReputationEventData({
            subjectAgentId: subjectAgentId,
            issuerAgentId: issuerAgentId,
            attestationId: attestationId,
            eventType: eventType,
            evidenceHash: evidenceHash,
            metadataHash: metadataHash,
            scoreDelta: scoreDelta,
            postedAt: uint64(block.timestamp),
            disputeStatus: DisputeStatus.None
        });
        emit ReputationPosted(eventId, subjectAgentId, issuerAgentId, eventType, scoreDelta, evidenceHash);
    }

    function openDispute(uint256 eventId, uint256 openerAgentId, bytes32 disputeEvidenceHash) external {
        ReputationEventData storage rep = _events[eventId];
        if (rep.subjectAgentId == 0) revert KreditErrors.UnknownReputationEvent();
        if (rep.disputeStatus != DisputeStatus.None) revert KreditErrors.DisputeAlreadyOpen();
        if (block.timestamp > rep.postedAt + DISPUTE_WINDOW) revert KreditErrors.DisputeWindowClosed();
        if (openerAgentId != rep.subjectAgentId) revert KreditErrors.NotAgentController();
        if (!identity.isAgentController(openerAgentId, msg.sender)) revert KreditErrors.NotAgentController();
        if (disputeEvidenceHash == bytes32(0)) revert KreditErrors.EmptyHash();

        rep.disputeStatus = DisputeStatus.Open;
        _disputes[eventId] = DisputeData({
            openedByAgentId: openerAgentId,
            disputeEvidenceHash: disputeEvidenceHash,
            responseEvidenceHash: bytes32(0),
            resolutionHash: bytes32(0),
            openedAt: uint64(block.timestamp),
            respondedAt: 0,
            resolvedAt: 0
        });
        emit ReputationDisputeOpened(eventId, rep.subjectAgentId, disputeEvidenceHash);
    }

    function respondToDispute(uint256 eventId, bytes32 responseEvidenceHash) external {
        ReputationEventData storage rep = _events[eventId];
        if (rep.subjectAgentId == 0) revert KreditErrors.UnknownReputationEvent();
        if (rep.disputeStatus != DisputeStatus.Open) revert KreditErrors.DisputeNotOpen();
        if (!identity.isAgentController(rep.issuerAgentId, msg.sender)) revert KreditErrors.NotAgentController();
        if (responseEvidenceHash == bytes32(0)) revert KreditErrors.EmptyHash();

        rep.disputeStatus = DisputeStatus.Responded;
        _disputes[eventId].responseEvidenceHash = responseEvidenceHash;
        _disputes[eventId].respondedAt = uint64(block.timestamp);
        emit ReputationDisputeResponded(eventId, rep.issuerAgentId, responseEvidenceHash);
    }

    function resolveDispute(uint256 eventId, bool upholdEvent, bytes32 resolutionHash) external {
        accessController.requireAccountRole(KreditRoles.DISPUTE_RESOLVER_ACCOUNT_ROLE, msg.sender);
        ReputationEventData storage rep = _events[eventId];
        if (rep.subjectAgentId == 0) revert KreditErrors.UnknownReputationEvent();
        if (rep.disputeStatus != DisputeStatus.Open && rep.disputeStatus != DisputeStatus.Responded) revert KreditErrors.DisputeNotOpen();
        if (resolutionHash == bytes32(0)) revert KreditErrors.EmptyHash();

        rep.disputeStatus = upholdEvent ? DisputeStatus.ResolvedUpheld : DisputeStatus.ResolvedRejected;
        _disputes[eventId].resolutionHash = resolutionHash;
        _disputes[eventId].resolvedAt = uint64(block.timestamp);
        emit ReputationDisputeResolved(eventId, rep.disputeStatus, resolutionHash);
    }

    function effectiveScoreDelta(uint256 eventId) external view returns (int16) {
        ReputationEventData memory rep = _events[eventId];
        if (rep.subjectAgentId == 0) revert KreditErrors.UnknownReputationEvent();
        if (rep.disputeStatus == DisputeStatus.ResolvedRejected) return 0;
        return rep.scoreDelta;
    }

    function getReputationEvent(uint256 eventId) external view returns (ReputationEventData memory) {
        if (_events[eventId].subjectAgentId == 0) revert KreditErrors.UnknownReputationEvent();
        return _events[eventId];
    }

    function getDispute(uint256 eventId) external view returns (DisputeData memory) {
        if (_events[eventId].subjectAgentId == 0) revert KreditErrors.UnknownReputationEvent();
        return _disputes[eventId];
    }
}
