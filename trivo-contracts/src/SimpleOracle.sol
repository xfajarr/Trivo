// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ISimpleOracle} from "./interfaces/ISimpleOracle.sol";

/// @title SimpleOracle
/// @notice On-chain price feed updated from backend with real market data
/// @dev No require — uses custom errors
contract SimpleOracle is ISimpleOracle {
    address public owner;

    bytes32 public constant BTC = keccak256("BTC/USD");
    bytes32 public constant ETH = keccak256("ETH/USD");
    bytes32 public constant SOL = keccak256("SOL/USD");

    uint256 public constant MAX_STALE = 1 hours;

    mapping(bytes32 => Price) private _prices;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    /// @inheritdoc ISimpleOracle
    function updatePrice(bytes32 pair, uint256 price, uint256 timestamp) external onlyOwner {
        if (price == 0) revert ZeroPrice();
        _prices[pair] = Price({price: price, timestamp: timestamp, lastUpdated: block.timestamp});
        emit PriceUpdated(pair, price, timestamp);
    }

    /// @inheritdoc ISimpleOracle
    function getPrice(bytes32 pair) external view returns (uint256 price, uint256 timestamp) {
        Price memory p = _prices[pair];
        if (p.price == 0) revert ZeroPrice();
        if (block.timestamp > p.lastUpdated + MAX_STALE) revert PriceStale();
        return (p.price, p.timestamp);
    }

    /// @inheritdoc ISimpleOracle
    function getMultiplePrices(bytes32[] calldata pairs) external view returns (uint256[] memory prices) {
        prices = new uint256[](pairs.length);
        for (uint256 i = 0; i < pairs.length; i++) {
            (uint256 price,) = this.getPrice(pairs[i]);
            prices[i] = price;
        }
    }

    /// @notice Transfer contract ownership
    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}
