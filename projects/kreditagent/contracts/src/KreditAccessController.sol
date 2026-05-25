// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KreditErrors} from "./KreditErrors.sol";
import {KreditRoles} from "./KreditRoles.sol";
import {IKreditAccessController} from "./interfaces/IKreditAccessController.sol";
import {IKreditAgentIdentity} from "./interfaces/IKreditAgentIdentity.sol";

/// @title KreditAccessController
/// @notice Governance, emergency pause, account roles, and agent roles for KreditAgent.
contract KreditAccessController is IKreditAccessController {
    IKreditAgentIdentity public immutable identity;

    address public override owner;
    address public pendingOwner;
    bool public override paused;

    mapping(bytes32 => mapping(address => bool)) private _accountRoles;
    mapping(bytes32 => mapping(uint256 => bool)) private _agentRoles;

    event OwnershipTransferStarted(address indexed previousOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AccountRoleUpdated(bytes32 indexed role, address indexed account, bool allowed);
    event AgentRoleUpdated(bytes32 indexed role, uint256 indexed agentId, bool allowed);
    event Paused(address indexed caller);
    event Unpaused(address indexed caller);

    modifier onlyOwner() {
        if (msg.sender != owner) revert KreditErrors.NotOwner();
        _;
    }

    modifier onlyGuardianOrOwner() {
        if (msg.sender != owner && !_accountRoles[KreditRoles.GUARDIAN_ACCOUNT_ROLE][msg.sender]) {
            revert KreditErrors.NotGuardianOrOwner();
        }
        _;
    }

    constructor(IKreditAgentIdentity identity_, address owner_) {
        if (address(identity_) == address(0) || owner_ == address(0)) revert KreditErrors.ZeroAddress();
        identity = identity_;
        owner = owner_;
        _accountRoles[KreditRoles.GUARDIAN_ACCOUNT_ROLE][owner_] = true;
        _accountRoles[KreditRoles.CONFIG_ADMIN_ACCOUNT_ROLE][owner_] = true;
        _accountRoles[KreditRoles.DISPUTE_RESOLVER_ACCOUNT_ROLE][owner_] = true;
        _accountRoles[KreditRoles.PAYMENT_RECORDER_ACCOUNT_ROLE][owner_] = true;
        emit OwnershipTransferred(address(0), owner_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert KreditErrors.ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert KreditErrors.NotPendingOwner();
        address oldOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(oldOwner, msg.sender);
    }

    function setPaused(bool paused_) external onlyGuardianOrOwner {
        if (paused == paused_) {
            if (paused_) revert KreditErrors.Paused();
            revert KreditErrors.NotPaused();
        }
        paused = paused_;
        if (paused_) emit Paused(msg.sender); else emit Unpaused(msg.sender);
    }

    function setAccountRole(bytes32 role, address account, bool allowed) external onlyOwner {
        if (role == bytes32(0)) revert KreditErrors.EmptyHash();
        if (account == address(0)) revert KreditErrors.ZeroAddress();
        _accountRoles[role][account] = allowed;
        emit AccountRoleUpdated(role, account, allowed);
    }

    function setAgentRole(bytes32 role, uint256 agentId, bool allowed) external onlyOwner {
        if (role == bytes32(0)) revert KreditErrors.EmptyHash();
        if (!identity.isAgentActive(agentId)) revert KreditErrors.UnknownAgent();
        _agentRoles[role][agentId] = allowed;
        emit AgentRoleUpdated(role, agentId, allowed);
    }

    function hasAccountRole(bytes32 role, address account) external view override returns (bool) {
        return _accountRoles[role][account];
    }

    function hasAgentRole(bytes32 role, uint256 agentId) public view override returns (bool) {
        return _agentRoles[role][agentId] && identity.isAgentActive(agentId);
    }

    function requireNotPaused() external view override {
        if (paused) revert KreditErrors.Paused();
    }

    function requireAccountRole(bytes32 role, address account) external view override {
        if (!_accountRoles[role][account]) revert KreditErrors.AccountMissingRole(role, account);
    }

    function requireAgentRole(bytes32 role, uint256 agentId) external view override {
        if (!hasAgentRole(role, agentId)) revert KreditErrors.NotAllowedRole(role, agentId);
    }

    function isAgentController(uint256 agentId, address account) external view returns (bool) {
        return identity.isAgentController(agentId, account);
    }
}
