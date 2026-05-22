// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IMockPerp} from "./interfaces/IMockPerp.sol";
import {ISimpleOracle} from "./interfaces/ISimpleOracle.sol";

/// @title MockPerp
/// @notice Mock perpetual futures — PnL based on real Oracle price movement
contract MockPerp is IMockPerp {
    error OnlyOwner();

    ISimpleOracle public oracle;
    address public copyTrading;
    address public owner;
    uint256 public constant MAX_LEVERAGE = 20;

    uint256 private _nextPositionId;
    mapping(uint256 => Position) private _positions;
    mapping(address => uint256[]) private _userPositions;

    constructor(address oracle_) {
        oracle = ISimpleOracle(oracle_);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /// @inheritdoc IMockPerp
    function maxLeverage() external pure returns (uint256) {
        return MAX_LEVERAGE;
    }

    /// @inheritdoc IMockPerp
    function openPosition(bytes32 pair, bool isLong, uint256 sizeUsd, uint256 leverage) external returns (uint256 positionId) {
        if (sizeUsd == 0) revert ZeroSize();
        if (leverage == 0) revert ZeroLeverage();
        if (leverage > MAX_LEVERAGE) revert LeverageTooHigh(MAX_LEVERAGE);

        (uint256 price,) = oracle.getPrice(pair);

        positionId = ++_nextPositionId;
        uint256 margin = sizeUsd / leverage;

        _positions[positionId] = Position({
            trader: msg.sender,
            pair: pair,
            isLong: isLong,
            size: sizeUsd,
            leverage: leverage,
            margin: margin,
            entryPrice: price,
            exitPrice: 0,
            pnl: 0,
            openedAt: block.timestamp,
            closedAt: 0,
            active: true
        });

        _userPositions[msg.sender].push(positionId);

        emit PositionOpened(positionId, msg.sender, pair, isLong, sizeUsd, leverage, price);
    }

    /// @inheritdoc IMockPerp
    function closePosition(uint256 positionId) external returns (int256 pnl, uint256 pnlUsd) {
        Position storage pos = _positions[positionId];
        if (pos.trader == address(0)) revert PositionNotFound();
        if (pos.trader != msg.sender) revert NotPositionOwner();
        if (!pos.active) revert AlreadyClosed();

        (uint256 currentPrice,) = oracle.getPrice(pos.pair);

        pnl = _calculatePnl(pos.entryPrice, currentPrice, pos.size, pos.isLong);
        pnlUsd = pnl >= 0 ? uint256(pnl) : uint256(-pnl);

        pos.exitPrice = currentPrice;
        pos.pnl = pnl;
        pos.active = false;
        pos.closedAt = block.timestamp;

        emit PositionClosed(positionId, pnl, pnlUsd, currentPrice);
    }

    /// @inheritdoc IMockPerp
    function addMargin(uint256 positionId, uint256 amount) external {
        Position storage pos = _positions[positionId];
        if (pos.trader == address(0)) revert PositionNotFound();
        if (pos.trader != msg.sender) revert NotPositionOwner();
        if (!pos.active) revert AlreadyClosed();

        pos.margin += amount;
        emit MarginAdded(positionId, amount);
    }

    /// @inheritdoc IMockPerp
    function getPosition(uint256 positionId) external view returns (Position memory) {
        if (_positions[positionId].trader == address(0)) revert PositionNotFound();
        return _positions[positionId];
    }

    /// @inheritdoc IMockPerp
    function getUserPositions(address trader) external view returns (uint256[] memory) {
        return _userPositions[trader];
    }

    /// @inheritdoc IMockPerp
    function setCopyTrading(address copyTrading_) external onlyOwner {
        copyTrading = copyTrading_;
    }

    function _calculatePnl(uint256 entryPrice, uint256 exitPrice, uint256 size, bool isLong) internal pure returns (int256) {
        if (entryPrice == 0) return 0;

        uint256 priceDiff = exitPrice > entryPrice ? exitPrice - entryPrice : entryPrice - exitPrice;
        uint256 pnlRaw = (size * priceDiff) / entryPrice;

        if (isLong) {
            return exitPrice >= entryPrice ? int256(pnlRaw) : -int256(pnlRaw);
        } else {
            return exitPrice <= entryPrice ? int256(pnlRaw) : -int256(pnlRaw);
        }
    }
}
