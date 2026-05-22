// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {SimpleOracle} from "../src/SimpleOracle.sol";
import {ISimpleOracle} from "../src/interfaces/ISimpleOracle.sol";

contract SimpleOracleTest is Test {
    SimpleOracle public oracle;
    address public owner = address(0x1234);
    address public stranger = address(0x5678);

    bytes32 public constant BTC = keccak256("BTC/USD");

    function setUp() public {
        vm.prank(owner);
        oracle = new SimpleOracle();
    }

    function test_Constructor_SetsOwner() public view {
        assertEq(oracle.owner(), owner);
    }

    function test_UpdatePrice_StoresCorrectly() public {
        vm.prank(owner);
        oracle.updatePrice(BTC, 72880, block.timestamp);

        (uint256 price, uint256 ts) = oracle.getPrice(BTC);
        assertEq(price, 72880);
        assertEq(ts, block.timestamp);
    }

    function test_UpdatePrice_EmitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit ISimpleOracle.PriceUpdated(BTC, 72880, block.timestamp);
        oracle.updatePrice(BTC, 72880, block.timestamp);
    }

    function test_UpdatePrice_RevertIf_ZeroPrice() public {
        vm.prank(owner);
        vm.expectRevert(ISimpleOracle.ZeroPrice.selector);
        oracle.updatePrice(BTC, 0, block.timestamp);
    }

    function test_UpdatePrice_RevertIf_NotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(ISimpleOracle.NotAuthorized.selector);
        oracle.updatePrice(BTC, 72880, block.timestamp);
    }

    function test_GetPrice_RevertIf_NotSet() public {
        vm.expectRevert(ISimpleOracle.ZeroPrice.selector);
        oracle.getPrice(bytes32("UNKNOWN"));
    }

    function test_GetPrice_RevertIf_Stale() public {
        vm.prank(owner);
        oracle.updatePrice(BTC, 72880, block.timestamp);

        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert(ISimpleOracle.PriceStale.selector);
        oracle.getPrice(BTC);
    }

    function test_GetMultiplePrices_ReturnsCorrect() public {
        vm.prank(owner);
        oracle.updatePrice(BTC, 72880, block.timestamp);
        vm.prank(owner);
        oracle.updatePrice(keccak256("ETH/USD"), 3508, block.timestamp);

        bytes32[] memory pairs = new bytes32[](2);
        pairs[0] = BTC;
        pairs[1] = keccak256("ETH/USD");

        uint256[] memory prices = oracle.getMultiplePrices(pairs);
        assertEq(prices[0], 72880);
        assertEq(prices[1], 3508);
    }

    function test_TransferOwnership() public {
        vm.prank(owner);
        oracle.transferOwnership(stranger);
        assertEq(oracle.owner(), stranger);
    }

    function test_TransferOwnership_RevertIf_NotOwner() public {
        vm.prank(stranger);
        vm.expectRevert(ISimpleOracle.NotAuthorized.selector);
        oracle.transferOwnership(stranger);
    }
}
