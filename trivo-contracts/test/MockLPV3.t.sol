// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockLPV3} from "../src/MockLPV3.sol";
import {IMockLPV3} from "../src/interfaces/IMockLPV3.sol";

contract MockLPV3Test is Test {
    MockLPV3 public lp;
    address public backend = address(0x1234);
    address public trader = address(0x5678);

    bytes32 public constant ETH_USDC = keccak256("ETH/USDC");
    uint256 public poolId;

    function setUp() public {
        vm.prank(backend);
        lp = new MockLPV3();

        vm.prank(backend);
        poolId = lp.createPool(ETH_USDC, 500); // 0.05% fee tier
    }

    // ── Create Pool ──

    function test_CreatePool() public {
        IMockLPV3.Pool memory p = lp.getPool(poolId);
        assertEq(p.pair, ETH_USDC);
        assertEq(p.feeTier, 500);
        assertEq(p.totalLiquidity, 0);
    }

    function test_CreatePool_EmitsEvent() public {
        vm.prank(backend);
        vm.expectEmit(true, false, false, true);
        emit IMockLPV3.PoolCreated(2, ETH_USDC, 500);
        lp.createPool(ETH_USDC, 500);
    }

    // ── Add Liquidity ──

    function test_AddLiquidity() public {
        vm.prank(trader);
        uint256 posId = lp.addLiquidity(poolId, -1000, 1000, 10000);

        IMockLPV3.Position memory pos = lp.getPosition(posId);
        assertEq(pos.lp, trader);
        assertEq(pos.poolId, poolId);
        assertEq(pos.liquidity, 10000);
        assertEq(pos.amountUsd, 10000);
        assertTrue(pos.active);

        IMockLPV3.Pool memory p = lp.getPool(poolId);
        assertEq(p.totalLiquidity, 10000);
    }

    function test_AddLiquidity_EmitsEvent() public {
        vm.prank(trader);
        vm.expectEmit(true, true, false, true);
        emit IMockLPV3.LiquidityAdded(1, trader, 10000, -1000, 1000);
        lp.addLiquidity(poolId, -1000, 1000, 10000);
    }

    function test_AddLiquidity_RevertIf_ZeroAmount() public {
        vm.prank(trader);
        vm.expectRevert(IMockLPV3.ZeroAmount.selector);
        lp.addLiquidity(poolId, -1000, 1000, 0);
    }

    function test_AddLiquidity_RevertIf_InvalidRange() public {
        vm.prank(trader);
        vm.expectRevert(IMockLPV3.InvalidTickRange.selector);
        lp.addLiquidity(poolId, 1000, -1000, 10000); // lower > upper
    }

    function test_AddLiquidity_RevertIf_PoolNotFound() public {
        vm.prank(trader);
        vm.expectRevert(IMockLPV3.PoolNotFound.selector);
        lp.addLiquidity(999, -1000, 1000, 10000);
    }

    // ── Remove Liquidity ──

    function test_RemoveLiquidity() public {
        vm.prank(trader);
        uint256 posId = lp.addLiquidity(poolId, -1000, 1000, 10000);

        vm.prank(trader);
        (uint256 amount, uint256 fees) = lp.removeLiquidity(posId);

        assertEq(amount, 10000);
        assertEq(fees, 0); // no fees accrued yet

        IMockLPV3.Pool memory p = lp.getPool(poolId);
        assertEq(p.totalLiquidity, 0);
    }

    function test_RemoveLiquidity_RevertIf_NotOwner() public {
        vm.prank(trader);
        uint256 posId = lp.addLiquidity(poolId, -1000, 1000, 10000);

        vm.prank(address(0x9999));
        vm.expectRevert(IMockLPV3.NotPositionOwner.selector);
        lp.removeLiquidity(posId);
    }

    // ── Fee Accrual + Collection ──

    function test_SimulateFeeAccrual() public {
        vm.prank(backend);
        lp.simulateFeeAccrual(poolId, 1_000_000); // $1M volume

        IMockLPV3.Pool memory p = lp.getPool(poolId);
        assertEq(p.virtualVolume, 1_000_000);
    }

    function test_CollectFees_AfterAccrual() public {
        vm.prank(trader);
        uint256 posId = lp.addLiquidity(poolId, -1000, 1000, 10000);

        // Simulate $1M volume at 0.05% = $500 fees generated
        vm.prank(backend);
        lp.simulateFeeAccrual(poolId, 1_000_000);

        // Our LP has 100% of liquidity, so gets all $500 fees
        // minus 10000 * 0.05 per liquidity precision
        vm.prank(trader);
        uint256 fees = lp.collectFees(posId);

        assertTrue(fees > 0);
        assertApproxEqAbs(fees, 500 * 1e18 / 1e18, 1); // ~500 (precision)
    }

    function test_MultipleLPs_ProportionalFees() public {
        address lp2 = address(0x9999);

        vm.prank(trader);
        uint256 posId1 = lp.addLiquidity(poolId, -1000, 1000, 10000); // 2/3 of pool

        vm.prank(lp2);
        uint256 posId2 = lp.addLiquidity(poolId, -1000, 1000, 5000);  // 1/3 of pool

        // $1.5M volume at 0.05% = $750 fees
        vm.prank(backend);
        lp.simulateFeeAccrual(poolId, 1_500_000);

        // LP1 has 10000/15000 = 66.7% → ~$500
        vm.prank(trader);
        uint256 fees1 = lp.collectFees(posId1);

        // LP2 has 5000/15000 = 33.3% → ~$250
        vm.prank(lp2);
        uint256 fees2 = lp.collectFees(posId2);

        assertApproxEqAbs(fees1 + fees2, 750, 2);
        assertTrue(fees1 > fees2);
    }

    function test_CollectFees_RevertIf_Removed() public {
        vm.prank(trader);
        uint256 posId = lp.addLiquidity(poolId, -1000, 1000, 10000);

        vm.prank(trader);
        lp.removeLiquidity(posId);

        vm.prank(trader);
        vm.expectRevert(IMockLPV3.AlreadyRemoved.selector);
        lp.collectFees(posId);
    }

    // ── User Positions ──

    function test_GetUserPositions() public {
        vm.startPrank(trader);
        lp.addLiquidity(poolId, -1000, 1000, 5000);
        lp.addLiquidity(poolId, -500, 500, 3000);
        vm.stopPrank();

        uint256[] memory positions = lp.getUserPositions(trader);
        assertEq(positions.length, 2);
    }
}
