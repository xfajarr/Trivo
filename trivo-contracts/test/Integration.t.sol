// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SimpleOracle} from "../src/SimpleOracle.sol";
import {MockPerp} from "../src/MockPerp.sol";
import {MockPolymarket} from "../src/MockPolymarket.sol";
import {MockLPV3} from "../src/MockLPV3.sol";
import {CopyTrading} from "../src/CopyTrading.sol";
import {FeeManager} from "../src/FeeManager.sol";
import {ICopyTrading} from "../src/interfaces/ICopyTrading.sol";

contract IntegrationTest is Test {
    SimpleOracle public oracle;
    MockPerp public perp;
    MockPolymarket public poly;
    MockLPV3 public lp;
    CopyTrading public copy;
    FeeManager public fee;

    address public owner = address(0x1234);
    address public agentOwner_ = address(0x7777);
    address public trader = address(0x5678);
    address public follower = address(0x9999);

    bytes32 public constant BTC = keccak256("BTC/USD");
    uint256 public constant AGENT_ID = 1;

    function setUp() public {
        vm.startPrank(owner);
        oracle = new SimpleOracle();
        perp = new MockPerp(address(oracle));
        poly = new MockPolymarket();
        lp = new MockLPV3();
        copy = new CopyTrading(owner);
        fee = new FeeManager(owner);
        vm.stopPrank();

        // Link contracts (prank as owner/deployer of each)
        vm.prank(owner);
        perp.setCopyTrading(address(copy));

        vm.prank(owner); // MockPolymarket backend = deployer = owner
        poly.setCopyTrading(address(copy));

        vm.prank(owner); // MockLPV3 backend = deployer = owner
        lp.setCopyTrading(address(copy));

        vm.prank(owner);
        copy.setFeeManager(address(fee));

        // Register agent: agentAddr = perp contract, owner = agentOwner_
        vm.prank(owner);
        copy.registerAgent(AGENT_ID, address(perp), agentOwner_);

        // Register agent creator in FeeManager
        vm.prank(owner);
        fee.setAgentCreator(AGENT_ID, agentOwner_);

        // Set initial price
        vm.prank(owner);
        oracle.updatePrice(BTC, 10000, block.timestamp);
    }

    function test_Scenario_FullPerpTradeWithCopy() public {
        // Attach follower
        copy.attachFollower(follower, AGENT_ID, 5000);

        // Open perp position via MockPerp
        vm.prank(trader);
        uint256 perpPosId = perp.openPosition(BTC, true, 100000, 3);

        // Report position to CopyTrading — must be from agent address (perp contract)
        vm.prank(address(perp));
        uint256 copyPosId = copy.reportPosition(AGENT_ID, "perp", "BTC-PERP", "LONG", 100000, 10000, 3, keccak256("trade1"));

        // Price up
        vm.prank(owner);
        oracle.updatePrice(BTC, 15000, block.timestamp);

        // Close perp position
        vm.prank(trader);
        perp.closePosition(perpPosId);

        // Close CopyTrading position — must be from agent address (perp)
        vm.prank(address(perp));
        copy.closePosition(copyPosId, 15000, 50000);

        // Distribute fees
        (uint256 platformShare, uint256 creatorShare) = copy.distributeCopyFees(copyPosId);
        assertEq(platformShare, 250);
        assertEq(creatorShare, 1500);
    }

    function test_Scenario_PolymarketTrade() public {
        vm.prank(owner);
        uint256 marketId = poly.createMarket("BTC > $73k?", 62, 38);

        vm.prank(trader);
        poly.buyOutcome(marketId, true, 500);

        vm.prank(owner);
        poly.resolveMarket(marketId, true);

        vm.prank(trader);
        uint256 payout = poly.claim(marketId);
        assertTrue(payout > 500);
    }

    function test_Scenario_LPWithFees() public {
        vm.prank(owner);
        uint256 poolId = lp.createPool(keccak256("ETH/USDC"), 500);

        vm.prank(trader);
        uint256 posId = lp.addLiquidity(poolId, -1000, 1000, 10000);

        vm.prank(owner);
        lp.simulateFeeAccrual(poolId, 1_000_000);

        vm.prank(trader);
        uint256 fees = lp.collectFees(posId);
        assertTrue(fees > 0);
    }

    function test_Scenario_FollowerLifecycle() public {
        copy.attachFollower(follower, AGENT_ID, 5000);

        ICopyTrading.CopyRelation memory rel = copy.getAgentRelation(AGENT_ID, follower);
        assertTrue(rel.active);

        copy.detachFollower(follower, AGENT_ID);

        rel = copy.getAgentRelation(AGENT_ID, follower);
        assertFalse(rel.active);
    }

    function test_Scenario_FeeTiers() public {
        // Deposit fees (callable by anyone)
        vm.prank(address(copy));
        fee.depositFee(AGENT_ID, 1000);
        assertEq(fee.getPendingFees(AGENT_ID), 300);

        // Only agentOwner_ can withdraw
        vm.prank(agentOwner_);
        uint256 withdrawn = fee.withdrawCreatorFees(AGENT_ID);
        assertEq(withdrawn, 300);
        assertEq(fee.getPendingFees(AGENT_ID), 0);
    }
}
