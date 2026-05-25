// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKreditAgentIdentity {
    function ownerOf(uint256 agentId) external view returns (address);
    function getAgentURI(uint256 agentId) external view returns (string memory);
    function isAgentActive(uint256 agentId) external view returns (bool);
    function getAgentWallet(uint256 agentId) external view returns (address);
    function isAgentController(uint256 agentId, address account) external view returns (bool);
    function agentTypeOf(uint256 agentId) external view returns (bytes32);
}
