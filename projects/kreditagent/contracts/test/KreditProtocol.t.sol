// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {KreditAgentIdentityRegistry} from "../src/KreditAgentIdentityRegistry.sol";
import {KreditAccessController} from "../src/KreditAccessController.sol";
import {KreditConsentRegistry} from "../src/KreditConsentRegistry.sol";
import {KreditScoreRegistry} from "../src/KreditScoreRegistry.sol";
import {KreditValidationRegistry} from "../src/KreditValidationRegistry.sol";
import {KreditReputationRegistry} from "../src/KreditReputationRegistry.sol";
import {KreditPaymentReceiptRegistry} from "../src/KreditPaymentReceiptRegistry.sol";
import {KreditProtocolDeployer} from "../src/KreditProtocolDeployer.sol";
import {KreditRoles} from "../src/KreditRoles.sol";
import {KreditErrors} from "../src/KreditErrors.sol";

contract KreditProtocolTest is Test {
    KreditAgentIdentityRegistry identity;
    KreditAccessController access;
    KreditConsentRegistry consent;
    KreditScoreRegistry scores;
    KreditValidationRegistry validation;
    KreditReputationRegistry reputation;
    KreditPaymentReceiptRegistry payments;

    address admin = address(0xA11CE);
    address issuerOwner = address(0x155E);
    address borrowerOwner = address(0xB0B);
    address lenderOwner = address(0x1EAD3A);
    address validatorOwner = address(0xA11DA7);
    address secondValidatorOwner = address(0x2222);
    address attacker = address(0xBAD);

    uint256 issuerAgentId;
    uint256 borrowerAgentId;
    uint256 lenderAgentId;
    uint256 validatorAgentId;
    uint256 secondValidatorAgentId;

    bytes32 constant PURPOSE = keccak256("credit_attestation");

    function setUp() public {
        vm.startPrank(admin);
        identity = new KreditAgentIdentityRegistry();
        access = new KreditAccessController(identity, admin);
        consent = new KreditConsentRegistry(identity, access);
        scores = new KreditScoreRegistry(identity, access, consent);
        validation = new KreditValidationRegistry(identity, access, scores);
        reputation = new KreditReputationRegistry(identity, access, scores);
        payments = new KreditPaymentReceiptRegistry(identity, access);

        issuerAgentId = identity.registerAgent(issuerOwner, "ipfs://issuer", identity.ISSUER_AGENT_TYPE(), issuerOwner);
        borrowerAgentId = identity.registerAgent(borrowerOwner, "ipfs://borrower", identity.BORROWER_AGENT_TYPE(), borrowerOwner);
        lenderAgentId = identity.registerAgent(lenderOwner, "ipfs://lender", identity.LENDER_AGENT_TYPE(), lenderOwner);
        validatorAgentId = identity.registerAgent(validatorOwner, "ipfs://validator", identity.VALIDATOR_AGENT_TYPE(), validatorOwner);
        secondValidatorAgentId = identity.registerAgent(secondValidatorOwner, "ipfs://validator-2", identity.VALIDATOR_AGENT_TYPE(), secondValidatorOwner);

        access.setAgentRole(KreditRoles.ISSUER_AGENT_ROLE, issuerAgentId, true);
        access.setAgentRole(KreditRoles.LENDER_AGENT_ROLE, lenderAgentId, true);
        access.setAgentRole(KreditRoles.VALIDATOR_AGENT_ROLE, validatorAgentId, true);
        access.setAgentRole(KreditRoles.VALIDATOR_AGENT_ROLE, secondValidatorAgentId, true);
        vm.stopPrank();
    }

    function _grantConsent() internal returns (uint256 consentId) {
        vm.prank(borrowerOwner);
        consentId = consent.grantConsent(
            borrowerAgentId,
            issuerAgentId,
            keccak256("consent-v1"),
            keccak256("qris+tokopedia"),
            keccak256("read_transactions+derive_credit_features"),
            PURPOSE,
            keccak256("encrypted-data-commitment"),
            uint64(block.timestamp + 30 days)
        );
    }

    function _publishAttestation(uint256 consentId) internal returns (uint256 attestationId, bytes32 digest) {
        vm.prank(issuerOwner);
        (attestationId, digest) = scores.publishCreditAttestation(
            borrowerAgentId,
            issuerAgentId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            742,
            2,
            uint64(block.timestamp + 7 days),
            "ipfs://attestation-json"
        );
    }

    function testFullCreditTrustFlow() public {
        uint256 consentId = _grantConsent();
        (uint256 attestationId, bytes32 digest) = _publishAttestation(consentId);
        assertTrue(scores.isAttestationUsable(attestationId));
        assertEq(scores.attestationIdByDigest(digest), attestationId);

        vm.prank(lenderOwner);
        uint256 requestId = validation.requestValidation(lenderAgentId, attestationId, 1, uint64(block.timestamp + 2 days));

        vm.prank(validatorOwner);
        validation.submitValidation(requestId, validatorAgentId, KreditRoles.VALIDATION_PASS, keccak256("evidence"), keccak256("report"), "ipfs://validation-report");
        assertTrue(validation.isAttestationValidated(attestationId));

        vm.prank(lenderOwner);
        uint256 receiptId = payments.recordPaymentReceipt(
            lenderAgentId,
            issuerAgentId,
            attestationId,
            keccak256("GET /v1/attestations/1/audit"),
            keccak256("x402-receipt"),
            address(0xCAFE),
            250000,
            block.chainid
        );
        assertEq(receiptId, 1);

        vm.prank(lenderOwner);
        uint256 eventId = reputation.postReputation(
            borrowerAgentId,
            lenderAgentId,
            attestationId,
            KreditRoles.REPAYMENT_ON_TIME,
            keccak256("repayment-evidence"),
            keccak256("repayment-meta"),
            8
        );
        assertEq(reputation.effectiveScoreDelta(eventId), 8);
    }

    function testConsentRevocationBlocksNewAttestation() public {
        uint256 consentId = _grantConsent();
        vm.prank(borrowerOwner);
        consent.revokeConsent(consentId, keccak256("borrower revoked"));

        vm.prank(issuerOwner);
        vm.expectRevert(KreditErrors.ConsentNotActive.selector);
        scores.publishCreditAttestation(
            borrowerAgentId,
            issuerAgentId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            742,
            2,
            uint64(block.timestamp + 7 days),
            "ipfs://attestation-json"
        );
    }

    function testNonIssuerCannotPublishScore() public {
        uint256 consentId = _grantConsent();
        vm.prank(attacker);
        vm.expectRevert(KreditErrors.NotAgentController.selector);
        scores.publishCreditAttestation(
            borrowerAgentId,
            issuerAgentId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            742,
            2,
            uint64(block.timestamp + 7 days),
            "ipfs://attestation-json"
        );
    }

    function testSelfValidationBlocked() public {
        uint256 consentId = _grantConsent();
        (uint256 attestationId,) = _publishAttestation(consentId);

        vm.startPrank(admin);
        uint256 validatorOwnedByIssuer = identity.registerAgent(issuerOwner, "ipfs://bad-validator", identity.VALIDATOR_AGENT_TYPE(), issuerOwner);
        access.setAgentRole(KreditRoles.VALIDATOR_AGENT_ROLE, validatorOwnedByIssuer, true);
        vm.stopPrank();

        vm.prank(lenderOwner);
        uint256 requestId = validation.requestValidation(lenderAgentId, attestationId, 1, uint64(block.timestamp + 2 days));

        vm.prank(issuerOwner);
        vm.expectRevert(KreditErrors.SelfValidation.selector);
        validation.submitValidation(requestId, validatorOwnedByIssuer, KreditRoles.VALIDATION_PASS, keccak256("evidence"), keccak256("report"), "ipfs://report");
    }

    function testPaymentReceiptReplayBlocked() public {
        uint256 consentId = _grantConsent();
        (uint256 attestationId,) = _publishAttestation(consentId);
        bytes32 resourceHash = keccak256("GET /v1/attestations/1/audit");
        bytes32 receiptHash = keccak256("x402-receipt");

        vm.startPrank(lenderOwner);
        payments.recordPaymentReceipt(lenderAgentId, issuerAgentId, attestationId, resourceHash, receiptHash, address(0xCAFE), 250000, block.chainid);
        vm.expectRevert(KreditErrors.DuplicatePaymentReceipt.selector);
        payments.recordPaymentReceipt(lenderAgentId, issuerAgentId, attestationId, resourceHash, keccak256("different-receipt"), address(0xCAFE), 250000, block.chainid);
        vm.stopPrank();
    }

    function testReputationDisputeLifecycle() public {
        uint256 consentId = _grantConsent();
        (uint256 attestationId,) = _publishAttestation(consentId);

        vm.prank(lenderOwner);
        uint256 eventId = reputation.postReputation(
            borrowerAgentId,
            lenderAgentId,
            attestationId,
            KreditRoles.DEFAULT_REPORTED,
            keccak256("default-evidence"),
            keccak256("default-meta"),
            -50
        );

        vm.prank(borrowerOwner);
        reputation.openDispute(eventId, borrowerAgentId, keccak256("borrower-proof"));

        vm.prank(lenderOwner);
        reputation.respondToDispute(eventId, keccak256("lender-proof"));

        vm.prank(admin);
        reputation.resolveDispute(eventId, false, keccak256("resolver says event invalid"));

        assertEq(reputation.effectiveScoreDelta(eventId), 0);
    }

    function testAgentTransferClearsAgentWallet() public {
        assertEq(identity.getAgentWallet(borrowerAgentId), borrowerOwner);
        vm.prank(borrowerOwner);
        identity.transferFrom(borrowerOwner, attacker, borrowerAgentId);
        assertEq(identity.ownerOf(borrowerAgentId), attacker);
        assertEq(identity.getAgentWallet(borrowerAgentId), address(0));
    }

    function testPauseBlocksSensitiveWrites() public {
        vm.prank(admin);
        access.setPaused(true);

        vm.prank(borrowerOwner);
        vm.expectRevert(KreditErrors.Paused.selector);
        consent.grantConsent(
            borrowerAgentId,
            issuerAgentId,
            keccak256("consent-v1"),
            keccak256("qris"),
            keccak256("scope"),
            PURPOSE,
            keccak256("commitment"),
            uint64(block.timestamp + 30 days)
        );
    }

    function testKreditProtocolDeployer_WiresAllContracts() public {
        KreditProtocolDeployer deployer = new KreditProtocolDeployer();
        vm.prank(admin);
        KreditProtocolDeployer.Deployment memory d = deployer.deploy(admin);
        assertTrue(address(d.identity) != address(0));
        assertTrue(address(d.accessController) != address(0));
        assertTrue(address(d.consentRegistry) != address(0));
        assertTrue(address(d.scoreRegistry) != address(0));
        assertTrue(address(d.validationRegistry) != address(0));
        assertTrue(address(d.reputationRegistry) != address(0));
        assertTrue(address(d.paymentReceiptRegistry) != address(0));
    }

    function testScoreOutOfRangeReverts() public {
        uint256 consentId = _grantConsent();
        vm.startPrank(issuerOwner);
        vm.expectRevert(KreditErrors.ScoreOutOfRange.selector);
        scores.publishCreditAttestation(
            borrowerAgentId,
            issuerAgentId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            299,
            2,
            uint64(block.timestamp + 7 days),
            "ipfs://a"
        );
        vm.expectRevert(KreditErrors.ScoreOutOfRange.selector);
        scores.publishCreditAttestation(
            borrowerAgentId,
            issuerAgentId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            742,
            0,
            uint64(block.timestamp + 7 days),
            "ipfs://b"
        );
        vm.stopPrank();
    }

    function testInvalidAttestationExpiryReverts() public {
        uint256 consentId = _grantConsent();
        vm.prank(issuerOwner);
        vm.expectRevert(KreditErrors.InvalidExpiry.selector);
        scores.publishCreditAttestation(
            borrowerAgentId,
            issuerAgentId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            742,
            2,
            uint64(block.timestamp),
            "ipfs://expired-now"
        );
        vm.prank(issuerOwner);
        vm.expectRevert(KreditErrors.InvalidExpiry.selector);
        scores.publishCreditAttestation(
            borrowerAgentId,
            issuerAgentId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            742,
            2,
            uint64(block.timestamp + 100 days),
            "ipfs://too-far"
        );
    }

    function testIssuerWithoutRoleCannotPublish() public {
        vm.prank(admin);
        uint256 rogueIssuerId = identity.registerAgent(attacker, "ipfs://rogue", identity.ISSUER_AGENT_TYPE(), attacker);

        vm.prank(borrowerOwner);
        uint256 consentId = consent.grantConsent(
            borrowerAgentId,
            rogueIssuerId,
            keccak256("consent-v1"),
            keccak256("qris+tokopedia"),
            keccak256("read_transactions+derive_credit_features"),
            PURPOSE,
            keccak256("encrypted-data-commitment"),
            uint64(block.timestamp + 30 days)
        );

        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(KreditErrors.NotAllowedRole.selector, KreditRoles.ISSUER_AGENT_ROLE, rogueIssuerId));
        scores.publishCreditAttestation(
            borrowerAgentId,
            rogueIssuerId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            742,
            2,
            uint64(block.timestamp + 7 days),
            "ipfs://rogue"
        );
    }

    function testDuplicateAttestationReverts() public {
        uint256 consentId = _grantConsent();
        vm.startPrank(issuerOwner);
        scores.publishCreditAttestation(
            borrowerAgentId,
            issuerAgentId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            742,
            2,
            uint64(block.timestamp + 7 days),
            "ipfs://dup"
        );
        vm.expectRevert(KreditErrors.DuplicateAttestation.selector);
        scores.publishCreditAttestation(
            borrowerAgentId,
            issuerAgentId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            742,
            2,
            uint64(block.timestamp + 7 days),
            "ipfs://dup"
        );
        vm.stopPrank();
    }

    function testRevokedAttestationNotUsable() public {
        uint256 consentId = _grantConsent();
        (uint256 attestationId,) = _publishAttestation(consentId);
        assertTrue(scores.isAttestationUsable(attestationId));
        vm.prank(issuerOwner);
        scores.revokeAttestation(attestationId, keccak256("issuer revoke"));
        assertFalse(scores.isAttestationUsable(attestationId));
    }

    function testValidationInvalidQuorumReverts() public {
        uint256 consentId = _grantConsent();
        (uint256 attestationId,) = _publishAttestation(consentId);
        vm.prank(lenderOwner);
        vm.expectRevert(KreditErrors.InvalidQuorum.selector);
        validation.requestValidation(lenderAgentId, attestationId, 0, uint64(block.timestamp + 2 days));
    }

    function testValidationFinalizeExpired() public {
        uint256 consentId = _grantConsent();
        (uint256 attestationId,) = _publishAttestation(consentId);
        vm.prank(lenderOwner);
        uint256 requestId = validation.requestValidation(lenderAgentId, attestationId, 1, uint64(block.timestamp + 1 days));
        vm.warp(block.timestamp + 2 days);
        validation.finalizeExpired(requestId);
        KreditValidationRegistry.ValidationRequest memory req = validation.getRequest(requestId);
        assertEq(uint8(req.status), uint8(KreditValidationRegistry.RequestStatus.Expired));
    }

    function testValidationSubmitAfterDeadlineRevertsExpired() public {
        uint256 consentId = _grantConsent();
        (uint256 attestationId,) = _publishAttestation(consentId);
        vm.prank(lenderOwner);
        uint256 requestId = validation.requestValidation(lenderAgentId, attestationId, 1, uint64(block.timestamp + 1 hours));
        vm.warp(block.timestamp + 2 hours);
        vm.prank(validatorOwner);
        vm.expectRevert(KreditErrors.Expired.selector);
        validation.submitValidation(
            requestId, validatorAgentId, KreditRoles.VALIDATION_PASS, keccak256("e"), keccak256("r"), "ipfs://late"
        );
    }

    function testValidationFailFinalizes() public {
        uint256 consentId = _grantConsent();
        (uint256 attestationId,) = _publishAttestation(consentId);
        vm.prank(lenderOwner);
        uint256 requestId = validation.requestValidation(lenderAgentId, attestationId, 1, uint64(block.timestamp + 2 days));
        vm.prank(validatorOwner);
        validation.submitValidation(
            requestId, validatorAgentId, KreditRoles.VALIDATION_FAIL, keccak256("e"), keccak256("r"), "ipfs://fail"
        );
        KreditValidationRegistry.ValidationRequest memory req = validation.getRequest(requestId);
        assertEq(uint8(req.status), uint8(KreditValidationRegistry.RequestStatus.Failed));
    }

    function testSetAgentURI_UpdatesTokenURI() public {
        vm.prank(borrowerOwner);
        identity.setAgentURI(borrowerAgentId, "ipfs://updated-borrower");
        assertEq(identity.tokenURI(borrowerAgentId), "ipfs://updated-borrower");
    }

    function testSetAgentURI_EmptyReverts() public {
        vm.prank(borrowerOwner);
        vm.expectRevert(KreditErrors.EmptyString.selector);
        identity.setAgentURI(borrowerAgentId, "");
    }

    function testRegisterAgent_InvalidAgentTypeReverts() public {
        vm.prank(admin);
        vm.expectRevert(KreditErrors.InvalidAgentType.selector);
        identity.registerAgent(admin, "ipfs://bad", keccak256("NOT_A_REAL_TYPE"), admin);
    }

    function testRegisterAgent_ToZeroAddressReverts() public {
        bytes32 borrowerType = identity.BORROWER_AGENT_TYPE();
        vm.prank(admin);
        vm.expectRevert(KreditErrors.ZeroAddress.selector);
        identity.registerAgent(address(0), "ipfs://a", borrowerType, admin);
    }

    function testRegisterAgent_EmptyURIReverts() public {
        bytes32 borrowerType = identity.BORROWER_AGENT_TYPE();
        vm.prank(admin);
        vm.expectRevert(KreditErrors.EmptyString.selector);
        identity.registerAgent(admin, "", borrowerType, admin);
    }

    function testBalanceOfZeroAddressReverts() public {
        vm.expectRevert(KreditErrors.ZeroAddress.selector);
        identity.balanceOf(address(0));
    }

    function testInactiveBorrowerBlocksScorePublication() public {
        uint256 consentId = _grantConsent();
        vm.prank(borrowerOwner);
        identity.setAgentActive(borrowerAgentId, false);
        vm.prank(issuerOwner);
        vm.expectRevert(KreditErrors.UnknownAgent.selector);
        scores.publishCreditAttestation(
            borrowerAgentId,
            issuerAgentId,
            consentId,
            keccak256("ka-score-v1"),
            keccak256("policy-v1"),
            keccak256("features"),
            keccak256("evidence"),
            keccak256("narrative"),
            742,
            2,
            uint64(block.timestamp + 7 days),
            "ipfs://inactive-borrower"
        );
    }

    function testAccess_NonOwnerCannotSetPause() public {
        vm.prank(attacker);
        vm.expectRevert(KreditErrors.NotGuardianOrOwner.selector);
        access.setPaused(true);
    }

    function testAccess_NonOwnerCannotSetAgentRole() public {
        vm.prank(attacker);
        vm.expectRevert(KreditErrors.NotOwner.selector);
        access.setAgentRole(KreditRoles.LENDER_AGENT_ROLE, lenderAgentId, false);
    }

    function testAccess_SetAgentRoleOnInactiveAgentReverts() public {
        vm.prank(lenderOwner);
        identity.setAgentActive(lenderAgentId, false);
        vm.prank(admin);
        vm.expectRevert(KreditErrors.UnknownAgent.selector);
        access.setAgentRole(KreditRoles.LENDER_AGENT_ROLE, lenderAgentId, true);
    }

    function testGuardianAccountCanTogglePause() public {
        address guardianAddr = address(0x999);
        vm.prank(admin);
        access.setAccountRole(KreditRoles.GUARDIAN_ACCOUNT_ROLE, guardianAddr, true);
        vm.prank(guardianAddr);
        access.setPaused(true);
        assertTrue(access.paused());
        vm.prank(guardianAddr);
        access.setPaused(false);
        assertFalse(access.paused());
    }

    function testSetPaused_WhenAlreadyPausedReverts() public {
        vm.startPrank(admin);
        access.setPaused(true);
        vm.expectRevert(KreditErrors.Paused.selector);
        access.setPaused(true);
        vm.stopPrank();
    }

    function testAcceptOwnership_TransfersControl() public {
        vm.prank(admin);
        access.transferOwnership(attacker);
        vm.prank(attacker);
        access.acceptOwnership();
        assertEq(access.owner(), attacker);
    }

    function testSetMetadata_UpdatesAndRevertsOnEmptyKey() public {
        vm.prank(borrowerOwner);
        identity.setMetadata(borrowerAgentId, keccak256("foru"), abi.encode("binding"));
        assertEq(identity.getMetadata(borrowerAgentId, keccak256("foru")), abi.encode("binding"));
        vm.prank(borrowerOwner);
        vm.expectRevert(KreditErrors.EmptyHash.selector);
        identity.setMetadata(borrowerAgentId, bytes32(0), hex"01");
    }
}
