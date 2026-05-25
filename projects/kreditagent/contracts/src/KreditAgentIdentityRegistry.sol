// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KreditErrors} from "./KreditErrors.sol";
import {IKreditAgentIdentity} from "./interfaces/IKreditAgentIdentity.sol";

/// @title KreditAgentIdentityRegistry
/// @notice ERC-8004-aligned identity registry for KreditAgent agents.
/// @dev Implements the ERC-8004 agentId/agentURI model with ERC-721-like ownership.
///      This is self-contained for hackathon reproducibility. Production deployments may
///      swap this for the reference ERC-8004 ERC721URIStorage implementation.
contract KreditAgentIdentityRegistry is IKreditAgentIdentity {
    string public constant name = "KreditAgent Identity Registry";
    string public constant symbol = "KAAGENT";

    bytes32 public constant BORROWER_AGENT_TYPE = keccak256("BORROWER_AGENT");
    bytes32 public constant ISSUER_AGENT_TYPE = keccak256("ISSUER_AGENT");
    bytes32 public constant LENDER_AGENT_TYPE = keccak256("LENDER_AGENT");
    bytes32 public constant VALIDATOR_AGENT_TYPE = keccak256("VALIDATOR_AGENT");
    bytes32 public constant REGULATOR_AGENT_TYPE = keccak256("REGULATOR_AGENT");
    bytes32 public constant OTHER_AGENT_TYPE = keccak256("OTHER_AGENT");

    struct AgentMetadata {
        string agentURI;
        bytes32 agentType;
        address agentWallet;
        bool active;
        uint64 registeredAt;
        uint64 updatedAt;
    }

    uint256 public nextAgentId = 1;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => AgentMetadata) private _agentMetadata;
    mapping(uint256 => mapping(bytes32 => bytes)) private _metadata;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        bytes32 indexed agentType,
        address agentWallet,
        string agentURI
    );
    event AgentURIUpdated(uint256 indexed agentId, string agentURI);
    event AgentActiveUpdated(uint256 indexed agentId, bool active);
    event AgentWalletUpdated(uint256 indexed agentId, address indexed wallet);
    event AgentMetadataUpdated(uint256 indexed agentId, bytes32 indexed key, bytes value);

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    modifier onlyExistingAgent(uint256 agentId) {
        if (_owners[agentId] == address(0)) revert KreditErrors.UnknownAgent();
        _;
    }

    modifier onlyAgentController(uint256 agentId) {
        if (!isAgentController(agentId, msg.sender)) revert KreditErrors.NotAgentController();
        _;
    }

    function registerAgent(
        address to,
        string calldata agentURI,
        bytes32 agentType,
        address agentWallet
    ) external returns (uint256 agentId) {
        if (to == address(0)) revert KreditErrors.ZeroAddress();
        if (bytes(agentURI).length == 0) revert KreditErrors.EmptyString();
        if (!_isKnownAgentType(agentType)) revert KreditErrors.InvalidAgentType();
        if (agentWallet == address(0)) agentWallet = to;

        agentId = nextAgentId++;
        _owners[agentId] = to;
        _balances[to] += 1;
        _agentMetadata[agentId] = AgentMetadata({
            agentURI: agentURI,
            agentType: agentType,
            agentWallet: agentWallet,
            active: true,
            registeredAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });

        emit Transfer(address(0), to, agentId);
        emit AgentRegistered(agentId, to, agentType, agentWallet, agentURI);
    }

    function balanceOf(address owner_) external view returns (uint256) {
        if (owner_ == address(0)) revert KreditErrors.ZeroAddress();
        return _balances[owner_];
    }

    function ownerOf(uint256 agentId) public view override returns (address) {
        address owner_ = _owners[agentId];
        if (owner_ == address(0)) revert KreditErrors.UnknownAgent();
        return owner_;
    }

    function tokenURI(uint256 agentId) external view onlyExistingAgent(agentId) returns (string memory) {
        return _agentMetadata[agentId].agentURI;
    }

    function getAgentURI(uint256 agentId) external view override onlyExistingAgent(agentId) returns (string memory) {
        return _agentMetadata[agentId].agentURI;
    }

    function setAgentURI(uint256 agentId, string calldata agentURI) external onlyExistingAgent(agentId) onlyAgentController(agentId) {
        if (bytes(agentURI).length == 0) revert KreditErrors.EmptyString();
        _agentMetadata[agentId].agentURI = agentURI;
        _agentMetadata[agentId].updatedAt = uint64(block.timestamp);
        emit AgentURIUpdated(agentId, agentURI);
    }

    function isAgentActive(uint256 agentId) external view override onlyExistingAgent(agentId) returns (bool) {
        return _agentMetadata[agentId].active;
    }

    function setAgentActive(uint256 agentId, bool active) external onlyExistingAgent(agentId) onlyAgentController(agentId) {
        _agentMetadata[agentId].active = active;
        _agentMetadata[agentId].updatedAt = uint64(block.timestamp);
        emit AgentActiveUpdated(agentId, active);
    }

    function agentTypeOf(uint256 agentId) external view override onlyExistingAgent(agentId) returns (bytes32) {
        return _agentMetadata[agentId].agentType;
    }

    function getAgentWallet(uint256 agentId) public view override onlyExistingAgent(agentId) returns (address) {
        return _agentMetadata[agentId].agentWallet;
    }

    function setAgentWallet(uint256 agentId, address wallet) external onlyExistingAgent(agentId) onlyAgentController(agentId) {
        if (wallet == address(0)) revert KreditErrors.ZeroAddress();
        _agentMetadata[agentId].agentWallet = wallet;
        _agentMetadata[agentId].updatedAt = uint64(block.timestamp);
        emit AgentWalletUpdated(agentId, wallet);
    }

    function unsetAgentWallet(uint256 agentId) external onlyExistingAgent(agentId) onlyAgentController(agentId) {
        _agentMetadata[agentId].agentWallet = address(0);
        _agentMetadata[agentId].updatedAt = uint64(block.timestamp);
        emit AgentWalletUpdated(agentId, address(0));
    }

    function isAgentController(uint256 agentId, address account) public view override returns (bool) {
        address owner_ = _owners[agentId];
        if (owner_ == address(0) || account == address(0)) return false;
        if (account == owner_) return true;
        if (_agentMetadata[agentId].agentWallet == account) return true;
        return getApproved(agentId) == account || isApprovedForAll(owner_, account);
    }

    function setMetadata(uint256 agentId, bytes32 key, bytes calldata value) external onlyExistingAgent(agentId) onlyAgentController(agentId) {
        if (key == bytes32(0)) revert KreditErrors.EmptyHash();
        _metadata[agentId][key] = value;
        _agentMetadata[agentId].updatedAt = uint64(block.timestamp);
        emit AgentMetadataUpdated(agentId, key, value);
    }

    function getMetadata(uint256 agentId, bytes32 key) external view onlyExistingAgent(agentId) returns (bytes memory) {
        return _metadata[agentId][key];
    }

    function approve(address to, uint256 agentId) public onlyExistingAgent(agentId) {
        address owner_ = ownerOf(agentId);
        if (to == owner_) revert KreditErrors.ApprovalToCurrentOwner();
        if (msg.sender != owner_ && !isApprovedForAll(owner_, msg.sender)) {
            revert KreditErrors.ApprovalCallerNotOwnerNorApproved();
        }
        _tokenApprovals[agentId] = to;
        emit Approval(owner_, to, agentId);
    }

    function getApproved(uint256 agentId) public view onlyExistingAgent(agentId) returns (address) {
        return _tokenApprovals[agentId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        if (operator == msg.sender) revert KreditErrors.ApprovalToCurrentOwner();
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner_, address operator) public view returns (bool) {
        return _operatorApprovals[owner_][operator];
    }

    function transferFrom(address from, address to, uint256 agentId) public onlyExistingAgent(agentId) {
        if (!_isApprovedOrOwner(msg.sender, agentId)) revert KreditErrors.TransferNotAuthorized();
        if (ownerOf(agentId) != from) revert KreditErrors.TransferFromIncorrectOwner();
        if (to == address(0)) revert KreditErrors.TransferToZeroAddress();

        delete _tokenApprovals[agentId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[agentId] = to;

        // ERC-8004 reference behavior: clear agent wallet on ownership transfer.
        _agentMetadata[agentId].agentWallet = address(0);
        _agentMetadata[agentId].updatedAt = uint64(block.timestamp);

        emit Transfer(from, to, agentId);
        emit AgentWalletUpdated(agentId, address(0));
    }

    function safeTransferFrom(address from, address to, uint256 agentId) external {
        transferFrom(from, to, agentId);
    }

    function safeTransferFrom(address from, address to, uint256 agentId, bytes calldata) external {
        transferFrom(from, to, agentId);
    }

    function getAgent(uint256 agentId) external view onlyExistingAgent(agentId) returns (AgentMetadata memory metadata, address owner_) {
        return (_agentMetadata[agentId], _owners[agentId]);
    }

    function _isApprovedOrOwner(address spender, uint256 agentId) internal view returns (bool) {
        address owner_ = ownerOf(agentId);
        return spender == owner_ || getApproved(agentId) == spender || isApprovedForAll(owner_, spender);
    }

    function _isKnownAgentType(bytes32 agentType) internal pure returns (bool) {
        return agentType == BORROWER_AGENT_TYPE
            || agentType == ISSUER_AGENT_TYPE
            || agentType == LENDER_AGENT_TYPE
            || agentType == VALIDATOR_AGENT_TYPE
            || agentType == REGULATOR_AGENT_TYPE
            || agentType == OTHER_AGENT_TYPE;
    }
}
