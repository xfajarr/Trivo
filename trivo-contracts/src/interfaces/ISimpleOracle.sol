// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ISimpleOracle {
    error NotAuthorized();
    error PriceStale();
    error ZeroPrice();

    struct Price {
        uint256 price;
        uint256 timestamp;
        uint256 lastUpdated;
    }

    function updatePrice(bytes32 pair, uint256 price, uint256 timestamp) external;
    function getPrice(bytes32 pair) external view returns (uint256 price, uint256 timestamp);
    function getMultiplePrices(bytes32[] calldata pairs) external view returns (uint256[] memory prices);

    event PriceUpdated(bytes32 indexed pair, uint256 price, uint256 timestamp);
}
