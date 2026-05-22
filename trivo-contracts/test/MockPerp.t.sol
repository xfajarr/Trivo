// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SimpleOracle} from "../src/SimpleOracle.sol";
import {MockPerp} from "../src/MockPerp.sol";
import {IMockPerp} from "../src/interfaces/IMockPerp.sol";

contract MockPerpTest is Test {
    SimpleOracle public oracle;
    MockPerp public perp;
    address public owner = address(0x1234);
    address public trader = address(0x5678);

    bytes32 public constant BTC = keccak256("BTC/USD");

    function setUp() public {
        vm.prank(owner);
        oracle = new SimpleOracle();
        perp = new MockPerp(address(oracle));

        vm.prank(owner);
        oracle.updatePrice(BTC, 72880, block.timestamp);
    }

    // ── Open Position ──

    function test_OpenPosition_Long() public {
        vm.prank(trader);
        uint256 posId = perp.openPosition(BTC, true, 5000, 3);

        IMockPerp.Position memory pos = perp.getPosition(posId);
        assertEq(pos.trader, trader);
        assertEq(pos.pair, BTC);
        assertTrue(pos.isLong);
        assertEq(pos.size, 5000);
        assertEq(pos.leverage, 3);
        assertEq(pos.margin, 1666);
        assertEq(pos.entryPrice, 72880);
        assertTrue(pos.active);
    }

    function test_OpenPosition_EmitsEvent() public {
        vm.prank(trader);
        vm.expectEmit(true, true, false, true);
        emit IMockPerp.PositionOpened(1, trader, BTC, true, 5000, 3, 72880);
        perp.openPosition(BTC, true, 5000, 3);
    }

    function test_OpenPosition_TracksUserPositions() public {
        vm.startPrank(trader);
        perp.openPosition(BTC, true, 5000, 3);
        perp.openPosition(BTC, false, 3000, 2);
        vm.stopPrank();

        uint256[] memory positions = perp.getUserPositions(trader);
        assertEq(positions.length, 2);
        assertEq(positions[0], 1);
        assertEq(positions[1], 2);
    }

    function test_OpenPosition_RevertIf_ZeroSize() public {
        vm.prank(trader);
        vm.expectRevert(IMockPerp.ZeroSize.selector);
        perp.openPosition(BTC, true, 0, 3);
    }

    function test_OpenPosition_RevertIf_ZeroLeverage() public {
        vm.prank(trader);
        vm.expectRevert(IMockPerp.ZeroLeverage.selector);
        perp.openPosition(BTC, true, 5000, 0);
    }

    function test_OpenPosition_RevertIf_LeverageTooHigh() public {
        vm.prank(trader);
        vm.expectRevert(abi.encodeWithSelector(IMockPerp.LeverageTooHigh.selector, 20));
        perp.openPosition(BTC, true, 5000, 21);
    }

    // ── Close Position ──

    function test_ClosePosition_Long_Profit() public {
        vm.prank(trader);
        uint256 posId = perp.openPosition(BTC, true, 5000, 3);

        vm.prank(owner);
        oracle.updatePrice(BTC, 74100, block.timestamp);

        vm.prank(trader);
        (int256 pnl, uint256 pnlUsd) = perp.closePosition(posId);

        assertTrue(pnl > 0, "Should have profit");
        assertEq(pnlUsd, uint256(pnl));

        IMockPerp.Position memory pos = perp.getPosition(posId);
        assertEq(pos.exitPrice, 74100);
        assertFalse(pos.active);
    }

    function test_ClosePosition_Long_Loss() public {
        vm.prank(trader);
        uint256 posId = perp.openPosition(BTC, true, 5000, 3);

        vm.prank(owner);
        oracle.updatePrice(BTC, 71000, block.timestamp);

        vm.prank(trader);
        (int256 pnl,) = perp.closePosition(posId);

        assertTrue(pnl < 0, "Should have loss");
    }

    function test_ClosePosition_Short_Profit() public {
        vm.prank(trader);
        uint256 posId = perp.openPosition(BTC, false, 5000, 3);

        vm.prank(owner);
        oracle.updatePrice(BTC, 71000, block.timestamp);

        vm.prank(trader);
        (int256 pnl,) = perp.closePosition(posId);

        assertTrue(pnl > 0, "Short should profit on price down");
    }

    function test_ClosePosition_RevertIf_NotFound() public {
        vm.prank(trader);
        vm.expectRevert(IMockPerp.PositionNotFound.selector);
        perp.closePosition(999);
    }

    function test_ClosePosition_RevertIf_NotOwner() public {
        vm.prank(trader);
        uint256 posId = perp.openPosition(BTC, true, 5000, 3);

        vm.prank(address(0x9999));
        vm.expectRevert(IMockPerp.NotPositionOwner.selector);
        perp.closePosition(posId);
    }

    function test_ClosePosition_RevertIf_AlreadyClosed() public {
        vm.prank(trader);
        uint256 posId = perp.openPosition(BTC, true, 5000, 3);

        vm.prank(owner);
        oracle.updatePrice(BTC, 74100, block.timestamp);

        vm.prank(trader);
        perp.closePosition(posId);

        vm.prank(trader);
        vm.expectRevert(IMockPerp.AlreadyClosed.selector);
        perp.closePosition(posId);
    }

    // ── Add Margin ──

    function test_AddMargin_IncreasesMargin() public {
        vm.prank(trader);
        uint256 posId = perp.openPosition(BTC, true, 5000, 3);

        vm.prank(trader);
        perp.addMargin(posId, 1000);

        IMockPerp.Position memory pos = perp.getPosition(posId);
        assertEq(pos.margin, 2666);
    }

    // ── Edge Cases ──

    function test_OpenPosition_Short() public {
        vm.prank(trader);
        uint256 posId = perp.openPosition(BTC, false, 10000, 10);

        IMockPerp.Position memory pos = perp.getPosition(posId);
        assertFalse(pos.isLong);
        assertEq(pos.size, 10000);
        assertEq(pos.leverage, 10);
        assertEq(pos.margin, 1000);
    }
}
