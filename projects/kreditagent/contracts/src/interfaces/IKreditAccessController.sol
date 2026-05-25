// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKreditAccessController {
    function owner() external view returns (address);
    function paused() external view returns (bool);
    function hasAccountRole(bytes32 role, address account) external view returns (bool);
    function hasAgentRole(bytes32 role, uint256 agentId) external view returns (bool);
    function requireNotPaused() external view;
    function requireAccountRole(bytes32 role, address account) external view;
    function requireAgentRole(bytes32 role, uint256 agentId) external view;
}
