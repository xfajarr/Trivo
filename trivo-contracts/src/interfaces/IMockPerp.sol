// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMockPerp {
    error ZeroSize();
    error ZeroLeverage();
    error PositionNotFound();
    error AlreadyClosed();
    error NotPositionOwner();
    error LeverageTooHigh(uint256 maxLeverage);

    struct Position {
        address trader;
        bytes32 pair;
        bool isLong;
        uint256 size;
        uint256 leverage;
        uint256 margin;
        uint256 entryPrice;
        uint256 exitPrice;
        int256 pnl;
        uint256 openedAt;
        uint256 closedAt;
        bool active;
    }

    function openPosition(bytes32 pair, bool isLong, uint256 sizeUsd, uint256 leverage) external returns (uint256 positionId);
    function closePosition(uint256 positionId) external returns (int256 pnl, uint256 pnlUsd);
    function addMargin(uint256 positionId, uint256 amount) external;
    function getPosition(uint256 positionId) external view returns (Position memory);
    function getUserPositions(address trader) external view returns (uint256[] memory);
    function setCopyTrading(address copyTrading) external;
    function maxLeverage() external view returns (uint256);

    event PositionOpened(uint256 indexed id, address indexed trader, bytes32 pair, bool isLong, uint256 size, uint256 leverage, uint256 entryPrice);
    event PositionClosed(uint256 indexed id, int256 pnl, uint256 pnlUsd, uint256 exitPrice);
    event MarginAdded(uint256 indexed id, uint256 amount);
}
