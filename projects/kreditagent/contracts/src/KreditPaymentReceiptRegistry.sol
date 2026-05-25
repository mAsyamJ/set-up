// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KreditErrors} from "./KreditErrors.sol";
import {KreditRoles} from "./KreditRoles.sol";
import {IKreditAgentIdentity} from "./interfaces/IKreditAgentIdentity.sol";
import {IKreditAccessController} from "./interfaces/IKreditAccessController.sol";

/// @title KreditPaymentReceiptRegistry
/// @notice Anchors x402/API payment receipts used to unlock paid credit-attestation resources.
/// @dev This contract records verified receipts; token transfers/settlement happen through x402/facilitator off-chain/on-chain rails.
contract KreditPaymentReceiptRegistry {
    IKreditAgentIdentity public immutable identity;
    IKreditAccessController public immutable accessController;

    struct PaymentReceipt {
        uint256 payerAgentId;
        uint256 payeeAgentId;
        uint256 attestationId;
        bytes32 resourceHash;
        bytes32 receiptHash;
        address token;
        uint256 amount;
        uint256 paymentChainId;
        uint64 recordedAt;
    }

    uint256 public nextReceiptId = 1;
    mapping(uint256 => PaymentReceipt) private _receipts;
    mapping(bytes32 => uint256) public receiptIdByHash;
    mapping(bytes32 => bool) public resourceReceiptUsed;

    event PaymentReceiptRecorded(
        uint256 indexed receiptId,
        uint256 indexed payerAgentId,
        uint256 indexed payeeAgentId,
        uint256 attestationId,
        bytes32 resourceHash,
        bytes32 receiptHash,
        address token,
        uint256 amount,
        uint256 paymentChainId
    );

    constructor(IKreditAgentIdentity identity_, IKreditAccessController accessController_) {
        if (address(identity_) == address(0) || address(accessController_) == address(0)) revert KreditErrors.ZeroAddress();
        identity = identity_;
        accessController = accessController_;
    }

    function recordPaymentReceipt(
        uint256 payerAgentId,
        uint256 payeeAgentId,
        uint256 attestationId,
        bytes32 resourceHash,
        bytes32 receiptHash,
        address token,
        uint256 amount,
        uint256 paymentChainId
    ) external returns (uint256 receiptId) {
        accessController.requireNotPaused();
        accessController.requireAgentRole(KreditRoles.LENDER_AGENT_ROLE, payerAgentId);
        accessController.requireAgentRole(KreditRoles.ISSUER_AGENT_ROLE, payeeAgentId);
        bool callerAllowed = identity.isAgentController(payerAgentId, msg.sender)
            || identity.isAgentController(payeeAgentId, msg.sender)
            || accessController.hasAccountRole(KreditRoles.PAYMENT_RECORDER_ACCOUNT_ROLE, msg.sender);
        if (!callerAllowed) revert KreditErrors.NotAgentController();
        if (resourceHash == bytes32(0) || receiptHash == bytes32(0)) revert KreditErrors.EmptyHash();
        if (amount == 0) revert KreditErrors.InvalidAmount();
        if (receiptIdByHash[receiptHash] != 0 || resourceReceiptUsed[keccak256(abi.encode(resourceHash, payerAgentId, payeeAgentId))]) {
            revert KreditErrors.DuplicatePaymentReceipt();
        }

        receiptId = nextReceiptId++;
        _receipts[receiptId] = PaymentReceipt({
            payerAgentId: payerAgentId,
            payeeAgentId: payeeAgentId,
            attestationId: attestationId,
            resourceHash: resourceHash,
            receiptHash: receiptHash,
            token: token,
            amount: amount,
            paymentChainId: paymentChainId,
            recordedAt: uint64(block.timestamp)
        });
        receiptIdByHash[receiptHash] = receiptId;
        resourceReceiptUsed[keccak256(abi.encode(resourceHash, payerAgentId, payeeAgentId))] = true;

        emit PaymentReceiptRecorded(receiptId, payerAgentId, payeeAgentId, attestationId, resourceHash, receiptHash, token, amount, paymentChainId);
    }

    function getReceipt(uint256 receiptId) external view returns (PaymentReceipt memory) {
        if (_receipts[receiptId].payerAgentId == 0) revert KreditErrors.UnknownReputationEvent();
        return _receipts[receiptId];
    }
}
