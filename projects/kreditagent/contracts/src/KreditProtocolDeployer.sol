// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {KreditAgentIdentityRegistry} from "./KreditAgentIdentityRegistry.sol";
import {KreditAccessController} from "./KreditAccessController.sol";
import {KreditConsentRegistry} from "./KreditConsentRegistry.sol";
import {KreditScoreRegistry} from "./KreditScoreRegistry.sol";
import {KreditValidationRegistry} from "./KreditValidationRegistry.sol";
import {KreditReputationRegistry} from "./KreditReputationRegistry.sol";
import {KreditPaymentReceiptRegistry} from "./KreditPaymentReceiptRegistry.sol";
import {KreditRoles} from "./KreditRoles.sol";

/// @title KreditProtocolDeployer
/// @notice Deploys the complete KreditAgent protocol suite and optionally seeds demo agents.
contract KreditProtocolDeployer {
    struct Deployment {
        KreditAgentIdentityRegistry identity;
        KreditAccessController accessController;
        KreditConsentRegistry consentRegistry;
        KreditScoreRegistry scoreRegistry;
        KreditValidationRegistry validationRegistry;
        KreditReputationRegistry reputationRegistry;
        KreditPaymentReceiptRegistry paymentReceiptRegistry;
    }

    event KreditProtocolDeployed(
        address indexed owner,
        address identity,
        address accessController,
        address consentRegistry,
        address scoreRegistry,
        address validationRegistry,
        address reputationRegistry,
        address paymentReceiptRegistry
    );

    function deploy(address owner) external returns (Deployment memory deployment) {
        deployment.identity = new KreditAgentIdentityRegistry();
        deployment.accessController = new KreditAccessController(deployment.identity, owner);
        deployment.consentRegistry = new KreditConsentRegistry(deployment.identity, deployment.accessController);
        deployment.scoreRegistry = new KreditScoreRegistry(deployment.identity, deployment.accessController, deployment.consentRegistry);
        deployment.validationRegistry = new KreditValidationRegistry(deployment.identity, deployment.accessController, deployment.scoreRegistry);
        deployment.reputationRegistry = new KreditReputationRegistry(deployment.identity, deployment.accessController, deployment.scoreRegistry);
        deployment.paymentReceiptRegistry = new KreditPaymentReceiptRegistry(deployment.identity, deployment.accessController);

        emit KreditProtocolDeployed(
            owner,
            address(deployment.identity),
            address(deployment.accessController),
            address(deployment.consentRegistry),
            address(deployment.scoreRegistry),
            address(deployment.validationRegistry),
            address(deployment.reputationRegistry),
            address(deployment.paymentReceiptRegistry)
        );
    }
}
