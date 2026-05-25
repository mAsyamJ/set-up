// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title KreditRoles
/// @notice Canonical role identifiers shared by the KreditAgent protocol.
library KreditRoles {
    bytes32 internal constant ISSUER_AGENT_ROLE = keccak256("KREDIT_ISSUER_AGENT_ROLE");
    bytes32 internal constant LENDER_AGENT_ROLE = keccak256("KREDIT_LENDER_AGENT_ROLE");
    bytes32 internal constant VALIDATOR_AGENT_ROLE = keccak256("KREDIT_VALIDATOR_AGENT_ROLE");
    bytes32 internal constant REGULATOR_VIEWER_AGENT_ROLE = keccak256("KREDIT_REGULATOR_VIEWER_AGENT_ROLE");

    bytes32 internal constant GUARDIAN_ACCOUNT_ROLE = keccak256("KREDIT_GUARDIAN_ACCOUNT_ROLE");
    bytes32 internal constant DISPUTE_RESOLVER_ACCOUNT_ROLE = keccak256("KREDIT_DISPUTE_RESOLVER_ACCOUNT_ROLE");
    bytes32 internal constant PAYMENT_RECORDER_ACCOUNT_ROLE = keccak256("KREDIT_PAYMENT_RECORDER_ACCOUNT_ROLE");
    bytes32 internal constant CONFIG_ADMIN_ACCOUNT_ROLE = keccak256("KREDIT_CONFIG_ADMIN_ACCOUNT_ROLE");

    bytes32 internal constant REPAYMENT_ON_TIME = keccak256("repayment_on_time");
    bytes32 internal constant REPAYMENT_LATE = keccak256("repayment_late");
    bytes32 internal constant DEFAULT_REPORTED = keccak256("default_reported");
    bytes32 internal constant SCORE_ISSUED = keccak256("score_issued");
    bytes32 internal constant SCORE_VALIDATED = keccak256("score_validated");
    bytes32 internal constant LOAN_DISBURSED = keccak256("loan_disbursed");
    bytes32 internal constant DISPUTE_OPENED = keccak256("dispute_opened");
    bytes32 internal constant DISPUTE_RESOLVED = keccak256("dispute_resolved");

    bytes32 internal constant VALIDATION_PASS = keccak256("validation_pass");
    bytes32 internal constant VALIDATION_FAIL = keccak256("validation_fail");
    bytes32 internal constant VALIDATION_NEEDS_REVIEW = keccak256("validation_needs_review");
}
