// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title KreditErrors
/// @notice Central custom errors for KreditAgent contracts.
library KreditErrors {
    error ZeroAddress();
    error EmptyString();
    error EmptyHash();
    error UnknownAgent();
    error NotAgentOwner();
    error NotAgentController();
    error NotOwner();
    error NotPendingOwner();
    error NotGuardianOrOwner();
    error NotAllowedRole(bytes32 role, uint256 agentId);
    error AccountMissingRole(bytes32 role, address account);
    error Paused();
    error NotPaused();
    error Expired();
    error InvalidExpiry();
    error UnknownConsent();
    error ConsentRevoked();
    error ConsentNotActive();
    error ConsentMismatch();
    error UnknownAttestation();
    error AttestationRevoked();
    error AttestationExpired();
    error ScoreOutOfRange();
    error UnknownValidationRequest();
    error ValidationRequestClosed();
    error DuplicateValidation();
    error SelfValidation();
    error InvalidQuorum();
    error UnknownReputationEvent();
    error DisputeWindowClosed();
    error DisputeNotOpen();
    error DisputeAlreadyOpen();
    error DuplicateAttestation();
    error DuplicatePaymentReceipt();
    error InvalidAmount();
    error TransferNotAuthorized();
    error ApprovalToCurrentOwner();
    error ApprovalCallerNotOwnerNorApproved();
    error TransferToZeroAddress();
    error TransferFromIncorrectOwner();
    error InvalidAgentType();
}
