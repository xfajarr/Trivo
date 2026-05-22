// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {FeeManager} from "../src/FeeManager.sol";
import {IFeeManager} from "../src/interfaces/IFeeManager.sol";

contract FeeManagerTest is Test {
    FeeManager public feeMgr;
    address public owner = address(0x1234);
    address public agentOwner_ = address(0x8888); // the agent creator
    address public stranger = address(0x5678);

    uint256 public constant AGENT_ID = 1;

    function setUp() public {
        vm.prank(owner);
        feeMgr = new FeeManager(owner);

        // Register agent creator
        vm.prank(owner);
        feeMgr.setAgentCreator(AGENT_ID, agentOwner_);
    }

    function test_Constructor_SetsOwner() public view {
        assertEq(feeMgr.owner(), owner);
    }

    function test_SetAgentCreator() public view {
        assertEq(feeMgr.agentCreators(AGENT_ID), agentOwner_);
    }

    function test_SetAgentCreator_RevertIf_NotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(IFeeManager.NotAuthorized.selector);
        feeMgr.setAgentCreator(2, stranger);
    }

    // ── Deposit ──

    function test_DepositFee() public {
        vm.prank(stranger);
        feeMgr.depositFee(AGENT_ID, 1000);

        assertEq(feeMgr.getPendingFees(AGENT_ID), 300);
        assertEq(feeMgr.getPendingPlatformFees(), 700);
    }

    function test_DepositFee_RevertIf_ZeroAmount() public {
        vm.prank(stranger);
        vm.expectRevert(IFeeManager.ZeroAmount.selector);
        feeMgr.depositFee(AGENT_ID, 0);
    }

    // ── Creator Withdraw (only agent creator) ──

    function test_WithdrawCreatorFees_ByCreator() public {
        vm.prank(stranger);
        feeMgr.depositFee(AGENT_ID, 1000);

        vm.prank(agentOwner_);
        uint256 amount = feeMgr.withdrawCreatorFees(AGENT_ID);
        assertEq(amount, 300);
        assertEq(feeMgr.getPendingFees(AGENT_ID), 0);
    }

    function test_WithdrawCreatorFees_RevertIf_NotCreator() public {
        vm.prank(stranger);
        feeMgr.depositFee(AGENT_ID, 1000);

        vm.prank(stranger);
        vm.expectRevert(IFeeManager.NotAuthorized.selector);
        feeMgr.withdrawCreatorFees(AGENT_ID);
    }

    function test_WithdrawCreatorFees_RevertIf_NoFees() public {
        vm.prank(agentOwner_);
        vm.expectRevert(IFeeManager.NoFeesToWithdraw.selector);
        feeMgr.withdrawCreatorFees(AGENT_ID);
    }

    // ── Platform Withdraw ──

    function test_WithdrawPlatformFees() public {
        vm.prank(stranger);
        feeMgr.depositFee(AGENT_ID, 1000);

        vm.prank(owner);
        uint256 amount = feeMgr.withdrawPlatformFees();
        assertEq(amount, 700);
        assertEq(feeMgr.getPendingPlatformFees(), 0);
    }

    function test_WithdrawPlatformFees_RevertIf_NotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(IFeeManager.NotAuthorized.selector);
        feeMgr.withdrawPlatformFees();
    }

    // ── Fee Tiers ──

    function test_SetFeeTier_ChangesDistribution() public {
        vm.prank(owner);
        feeMgr.setFeeTier(AGENT_ID, 2);

        vm.prank(stranger);
        feeMgr.depositFee(AGENT_ID, 1000);

        assertEq(feeMgr.getPendingFees(AGENT_ID), 700);
        assertEq(feeMgr.getPendingPlatformFees(), 300);
    }

    // ── Multiple Deposits ──

    function test_MultipleDeposits_Accumulate() public {
        vm.startPrank(stranger);
        feeMgr.depositFee(AGENT_ID, 500);
        feeMgr.depositFee(AGENT_ID, 500);
        feeMgr.depositFee(2, 1000);
        vm.stopPrank();

        assertEq(feeMgr.getPendingFees(AGENT_ID), 300);
        assertEq(feeMgr.getPendingFees(2), 300);
        assertEq(feeMgr.getPendingPlatformFees(), 1400);
    }
}
