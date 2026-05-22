// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {MockPolymarket} from "../src/MockPolymarket.sol";
import {IMockPolymarket} from "../src/interfaces/IMockPolymarket.sol";

contract MockPolymarketTest is Test {
    MockPolymarket public poly;
    address public backend = address(0x1234);
    address public trader = address(0x5678);

    function setUp() public {
        vm.prank(backend);
        poly = new MockPolymarket();
    }

    // ── Create Market ──

    function test_CreateMarket() public {
        vm.prank(backend);
        uint256 mid = poly.createMarket("BTC > $73k?", 62, 38);

        IMockPolymarket.Market memory m = poly.getMarket(mid);
        assertEq(m.question, "BTC > $73k?");
        assertEq(m.yesOdds, 62);
        assertEq(m.noOdds, 38);
        assertFalse(m.resolved);
    }

    function test_CreateMarket_EmitsEvent() public {
        vm.prank(backend);
        vm.expectEmit(true, false, false, true);
        emit IMockPolymarket.MarketCreated(1, "BTC > $73k?", 62, 38);
        poly.createMarket("BTC > $73k?", 62, 38);
    }

    function test_CreateMarket_RevertIf_InvalidOdds() public {
        vm.prank(backend);
        vm.expectRevert(IMockPolymarket.InvalidOdds.selector);
        poly.createMarket("Bad?", 50, 30); // sum != 100
    }

    function test_CreateMarket_RevertIf_NotBackend() public {
        vm.prank(trader);
        vm.expectRevert(IMockPolymarket.NotCreatedByBackend.selector);
        poly.createMarket("Test?", 50, 50);
    }

    // ── Buy Outcome ──

    function test_BuyOutcome_YES() public {
        vm.prank(backend);
        uint256 mid = poly.createMarket("BTC > $73k?", 50, 50);

        vm.prank(trader);
        uint256 shares = poly.buyOutcome(mid, true, 500);

        // shares = (500 * 100) / 50 = 1000
        assertEq(shares, 1000);

        IMockPolymarket.UserPosition memory pos = poly.getUserPosition(mid, trader);
        assertEq(pos.shares, 1000);
        assertTrue(pos.isYes);
        assertFalse(pos.claimed);
    }

    function test_BuyOutcome_RevertIf_ZeroAmount() public {
        vm.prank(backend);
        uint256 mid = poly.createMarket("Test?", 50, 50);

        vm.prank(trader);
        vm.expectRevert(IMockPolymarket.ZeroAmount.selector);
        poly.buyOutcome(mid, true, 0);
    }

    function test_BuyOutcome_RevertIf_NotFound() public {
        vm.prank(trader);
        vm.expectRevert(IMockPolymarket.MarketNotFound.selector);
        poly.buyOutcome(999, true, 100);
    }

    function test_BuyOutcome_RevertIf_AlreadyResolved() public {
        vm.prank(backend);
        uint256 mid = poly.createMarket("Test?", 50, 50);

        vm.prank(backend);
        poly.resolveMarket(mid, true);

        vm.prank(trader);
        vm.expectRevert(IMockPolymarket.MarketAlreadyResolved.selector);
        poly.buyOutcome(mid, true, 100);
    }

    // ── Resolve + Claim ──

    function test_ResolveAndClaim_Winner() public {
        vm.prank(backend);
        uint256 mid = poly.createMarket("BTC > $73k?", 62, 38);

        vm.prank(trader);
        uint256 shares = poly.buyOutcome(mid, true, 500);

        vm.prank(backend);
        poly.resolveMarket(mid, true);

        vm.prank(trader);
        uint256 payout = poly.claim(mid);

        // User put $500 at 62% odds
        // shares = (500 * 100) / 62 = 806
        // Since YES won, payout = shares = 806
        // PnL = 806 - 500 = +306
        assertEq(payout, shares);
        assertTrue(payout > 500);
    }

    function test_ResolveAndClaim_Loser() public {
        vm.prank(backend);
        uint256 mid = poly.createMarket("BTC > $73k?", 62, 38);

        vm.prank(trader);
        poly.buyOutcome(mid, true, 500);

        vm.prank(backend);
        poly.resolveMarket(mid, false); // NO wins, user had YES

        vm.prank(trader);
        uint256 payout = poly.claim(mid);

        assertEq(payout, 0); // lost everything
    }

    function test_Claim_RevertIf_NotResolved() public {
        vm.prank(backend);
        uint256 mid = poly.createMarket("Test?", 50, 50);

        vm.prank(trader);
        poly.buyOutcome(mid, true, 500);

        vm.prank(trader);
        vm.expectRevert(IMockPolymarket.MarketNotResolved.selector);
        poly.claim(mid);
    }

    function test_Claim_RevertIf_AlreadyClaimed() public {
        vm.prank(backend);
        uint256 mid = poly.createMarket("Test?", 50, 50);

        vm.prank(trader);
        poly.buyOutcome(mid, true, 500);

        vm.prank(backend);
        poly.resolveMarket(mid, true);

        vm.prank(trader);
        poly.claim(mid);

        vm.prank(trader);
        vm.expectRevert(IMockPolymarket.AlreadyClaimed.selector);
        poly.claim(mid);
    }

    function test_ResolveMarket_EmitsEvent() public {
        vm.prank(backend);
        uint256 mid = poly.createMarket("Test?", 50, 50);

        vm.prank(backend);
        vm.expectEmit(true, false, false, true);
        emit IMockPolymarket.MarketResolved(mid, true);
        poly.resolveMarket(mid, true);
    }

    function test_Claim_EmitsEvent() public {
        vm.prank(backend);
        uint256 mid = poly.createMarket("Test?", 50, 50);

        vm.prank(trader);
        poly.buyOutcome(mid, true, 500);

        vm.prank(backend);
        poly.resolveMarket(mid, true);

        vm.prank(trader);
        vm.expectEmit(true, true, false, true);
        emit IMockPolymarket.Claimed(mid, trader, 1000);
        poly.claim(mid);
    }
}
