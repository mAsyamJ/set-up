// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import {KreditProtocolDeployer} from "../src/KreditProtocolDeployer.sol";
import {KreditRoles} from "../src/KreditRoles.sol";

contract DeployKreditProtocol is Script {
    using stdJson for string;

    function run() external {
        address protocolOwner = vm.envOr("PROTOCOL_OWNER", msg.sender);
        address deployOwner = msg.sender;
        string memory networkName = vm.envOr("NETWORK_NAME", string("local"));

        vm.startBroadcast();
        KreditProtocolDeployer deployer = new KreditProtocolDeployer();
        KreditProtocolDeployer.Deployment memory d = deployer.deploy(deployOwner);

        uint256 issuerAgentId = d.identity.registerAgent(
            deployOwner,
            "https://kreditagent.id/.well-known/agents/kreditagent-issuer.json",
            d.identity.ISSUER_AGENT_TYPE(),
            deployOwner
        );
        uint256 borrowerAgentId = d.identity.registerAgent(
            deployOwner,
            "https://kreditagent.id/.well-known/agents/demo-borrower-bu-siti.json",
            d.identity.BORROWER_AGENT_TYPE(),
            deployOwner
        );
        uint256 lenderAgentId = d.identity.registerAgent(
            deployOwner,
            "https://kreditagent.id/.well-known/agents/demo-lender.json",
            d.identity.LENDER_AGENT_TYPE(),
            deployOwner
        );
        uint256 validatorAgentId = d.identity.registerAgent(
            deployOwner,
            "https://kreditagent.id/.well-known/agents/validator-alpha.json",
            d.identity.VALIDATOR_AGENT_TYPE(),
            deployOwner
        );

        d.accessController.setAgentRole(KreditRoles.ISSUER_AGENT_ROLE, issuerAgentId, true);
        d.accessController.setAgentRole(KreditRoles.LENDER_AGENT_ROLE, lenderAgentId, true);
        d.accessController.setAgentRole(KreditRoles.VALIDATOR_AGENT_ROLE, validatorAgentId, true);
        if (protocolOwner != deployOwner) {
            d.accessController.transferOwnership(protocolOwner);
        }
        vm.stopBroadcast();

        string memory root = "root";
        vm.serializeString(root, "network", networkName);
        vm.serializeUint(root, "chainId", block.chainid);
        vm.serializeAddress(root, "deployer", msg.sender);
        vm.serializeAddress(root, "owner", protocolOwner);
        vm.serializeAddress(root, "identity", address(d.identity));
        vm.serializeAddress(root, "accessController", address(d.accessController));
        vm.serializeAddress(root, "consentRegistry", address(d.consentRegistry));
        vm.serializeAddress(root, "scoreRegistry", address(d.scoreRegistry));
        vm.serializeAddress(root, "validationRegistry", address(d.validationRegistry));
        vm.serializeAddress(root, "reputationRegistry", address(d.reputationRegistry));
        vm.serializeAddress(root, "paymentReceiptRegistry", address(d.paymentReceiptRegistry));
        vm.serializeUint(root, "issuerAgentId", issuerAgentId);
        vm.serializeUint(root, "borrowerAgentId", borrowerAgentId);
        vm.serializeUint(root, "lenderAgentId", lenderAgentId);
        string memory json = vm.serializeUint(root, "validatorAgentId", validatorAgentId);

        string memory path = string.concat("deployments/", networkName, ".json");
        vm.writeJson(json, path);

        console2.log("identity", address(d.identity));
        console2.log("accessController", address(d.accessController));
        console2.log("consentRegistry", address(d.consentRegistry));
        console2.log("scoreRegistry", address(d.scoreRegistry));
        console2.log("validationRegistry", address(d.validationRegistry));
        console2.log("reputationRegistry", address(d.reputationRegistry));
        console2.log("paymentReceiptRegistry", address(d.paymentReceiptRegistry));
        console2.log("issuerAgentId", issuerAgentId);
        console2.log("borrowerAgentId", borrowerAgentId);
        console2.log("lenderAgentId", lenderAgentId);
        console2.log("validatorAgentId", validatorAgentId);
    }
}
