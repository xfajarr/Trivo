// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {CopyTrading} from "../src/CopyTrading.sol";
import {ICopyTrading} from "../src/interfaces/ICopyTrading.sol";

contract CopyTradingTest is Test {
    CopyTrading public copy;
    address public owner = address(0x1234);
    address public agentAddr = address(0x5678);
    address public agentOwner = address(0x7777);  // 🆕 the user who owns the agent
    address public follower = address(0x9999);
    address public stranger = address(0x1111);

    uint256 public constant AGENT_ID = 1;

    function setUp() public {
        vm.prank(owner);
        copy = new CopyTrading(owner);

        vm.prank(owner);
        copy.registerAgent(AGENT_ID, agentAddr, agentOwner);
    }

    // ── Register Agent ──

    function test_RegisterAgent() public {
        assertEq(copy.agentAddresses(AGENT_ID), agentAddr);
        assertEq(copy.agentOwners(AGENT_ID), agentOwner);
    }

    function test_RegisterAgent_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit ICopyTrading.AgentRegistered(2, follower);
        vm.prank(owner);
        copy.registerAgent(2, follower, agentOwner);
    }

    function test_RegisterAgent_RevertIf_NotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(ICopyTrading.NotAuthorized.selector);
        copy.registerAgent(2, agentAddr, agentOwner);
    }

    // ── Attach / Detach Follower ──

    function test_AttachFollower() public {
        copy.attachFollower(follower, AGENT_ID, 5000);

        ICopyTrading.CopyRelation memory rel = copy.getAgentRelation(AGENT_ID, follower);
        assertEq(rel.follower, follower);
        assertEq(rel.targetAgentId, AGENT_ID);
        assertEq(rel.allocationBps, 5000);
        assertTrue(rel.active);
    }

    function test_DetachFollower() public {
        copy.attachFollower(follower, AGENT_ID, 5000);
        copy.detachFollower(follower, AGENT_ID);

        ICopyTrading.CopyRelation memory rel = copy.getAgentRelation(AGENT_ID, follower);
        assertFalse(rel.active);
    }

    function test_AttachFollower_RevertIf_AgentNotFound() public {
        vm.expectRevert(ICopyTrading.AgentNotFound.selector);
        copy.attachFollower(follower, 999, 5000);
    }

    function test_AttachFollower_RevertIf_ZeroAllocation() public {
        vm.expectRevert(ICopyTrading.ZeroAllocation.selector);
        copy.attachFollower(follower, AGENT_ID, 0);
    }

    function test_AttachFollower_RevertIf_AllocationTooHigh() public {
        vm.expectRevert(ICopyTrading.AllocationTooHigh.selector);
        copy.attachFollower(follower, AGENT_ID, 10001);
    }

    function test_AttachFollower_RevertIf_AlreadyAttached() public {
        copy.attachFollower(follower, AGENT_ID, 5000);
        vm.expectRevert(ICopyTrading.AlreadyAttached.selector);
        copy.attachFollower(follower, AGENT_ID, 5000);
    }

    function test_DetachFollower_RevertIf_NotAttached() public {
        vm.expectRevert(ICopyTrading.NotAttached.selector);
        copy.detachFollower(follower, AGENT_ID);
    }

    // ── Report Position (only agent address) ──

    function test_ReportPosition_ByAgent() public {
        bytes32 refId = keccak256("tx1");
        vm.prank(agentAddr);
        uint256 posId = copy.reportPosition(AGENT_ID, "perp", "BTC-PERP", "LONG", 5000, 72880, 3, refId);

        ICopyTrading.Position memory pos = copy.getPosition(posId);
        assertEq(pos.agentId, AGENT_ID);
        assertEq(pos.venue, "perp");
        assertEq(pos.market, "BTC-PERP");
        assertEq(pos.side, "LONG");
        assertEq(pos.size, 5000);
        assertTrue(pos.open);
    }

    function test_ReportPosition_RevertIf_NotAgentAddress() public {
        vm.prank(stranger);
        vm.expectRevert(ICopyTrading.NotAuthorized.selector);
        copy.reportPosition(AGENT_ID, "perp", "BTC-PERP", "LONG", 5000, 72880, 3, bytes32(0));
    }

    function test_ReportPosition_RevertIf_AgentNotRegistered() public {
        vm.prank(agentAddr);
        vm.expectRevert(ICopyTrading.AgentNotFound.selector);
        copy.reportPosition(999, "perp", "BTC-PERP", "LONG", 5000, 72880, 3, bytes32(0));
    }

    // ── Close Position (only position's agent address) ──

    function test_ClosePosition_ByAgent() public {
        vm.prank(agentAddr);
        uint256 posId = copy.reportPosition(AGENT_ID, "perp", "BTC-PERP", "LONG", 5000, 72880, 3, keccak256("tx1"));

        vm.prank(agentAddr);
        copy.closePosition(posId, 74100, 150);

        ICopyTrading.Position memory pos = copy.getPosition(posId);
        assertEq(pos.exitPrice, 74100);
        assertEq(pos.pnl, 150);
        assertFalse(pos.open);
    }

    function test_ClosePosition_RevertIf_NotAgentAddress() public {
        vm.prank(agentAddr);
        uint256 posId = copy.reportPosition(AGENT_ID, "perp", "BTC-PERP", "LONG", 5000, 72880, 3, keccak256("tx1"));

        vm.prank(stranger);
        vm.expectRevert(ICopyTrading.NotAuthorized.selector);
        copy.closePosition(posId, 74100, 150);
    }

    function test_ClosePosition_RevertIf_NotFound() public {
        vm.expectRevert(ICopyTrading.PositionNotFound.selector);
        copy.closePosition(999, 74100, 150);
    }

    function test_ClosePosition_RevertIf_AlreadyClosed() public {
        vm.prank(agentAddr);
        uint256 posId = copy.reportPosition(AGENT_ID, "perp", "BTC-PERP", "LONG", 5000, 72880, 3, keccak256("tx1"));

        vm.prank(agentAddr);
        copy.closePosition(posId, 74100, 150);

        vm.prank(agentAddr);
        vm.expectRevert(ICopyTrading.AlreadyClosed.selector);
        copy.closePosition(posId, 75000, 200);
    }

    // ── Distribute Fees ──

    function test_DistributeFees_OnProfit() public {
        vm.prank(agentAddr);
        uint256 posId = copy.reportPosition(AGENT_ID, "perp", "BTC-PERP", "LONG", 5000, 72880, 3, keccak256("tx1"));

        vm.prank(agentAddr);
        copy.closePosition(posId, 74100, 1000);

        (uint256 platformShare, uint256 creatorShare) = copy.distributeCopyFees(posId);
        assertEq(platformShare, 5);
        assertEq(creatorShare, 30);
    }

    function test_DistributeFees_RevertIf_NoProfit() public {
        vm.prank(agentAddr);
        uint256 posId = copy.reportPosition(AGENT_ID, "perp", "BTC-PERP", "LONG", 5000, 72880, 3, keccak256("tx1"));

        vm.prank(agentAddr);
        copy.closePosition(posId, 71000, -500);

        vm.expectRevert(ICopyTrading.NoProfit.selector);
        copy.distributeCopyFees(posId);
    }

    function test_DistributeFees_RevertIf_PositionOpen() public {
        vm.prank(agentAddr);
        uint256 posId = copy.reportPosition(AGENT_ID, "perp", "BTC-PERP", "LONG", 5000, 72880, 3, keccak256("tx1"));

        vm.expectRevert(ICopyTrading.AlreadyClosed.selector);
        copy.distributeCopyFees(posId);
    }
}
