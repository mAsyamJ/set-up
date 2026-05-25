// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKreditScoreRegistry {
    function isAttestationUsable(uint256 attestationId) external view returns (bool);
    function getAttestationCore(uint256 attestationId)
        external
        view
        returns (
            uint256 borrowerAgentId,
            uint256 issuerAgentId,
            uint256 consentId,
            bytes32 attestationDigest,
            bytes32 evidenceHash,
            uint64 expiresAt,
            uint64 revokedAt
        );
}
