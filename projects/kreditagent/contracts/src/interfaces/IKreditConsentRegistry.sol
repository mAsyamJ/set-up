// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKreditConsentRegistry {
    function isConsentActive(uint256 consentId) external view returns (bool);
    function canUseConsent(
        uint256 consentId,
        uint256 borrowerAgentId,
        uint256 processorAgentId,
        bytes32 purposeHash
    ) external view returns (bool);
}
