// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IMockLPV3} from "./interfaces/IMockLPV3.sol";

/// @title MockLPV3
/// @notice Mock concentrated liquidity pool — LP positions with simulated fee earning
contract MockLPV3 is IMockLPV3 {
    address public backend;
    address public copyTrading;

    uint256 private _nextPoolId;
    uint256 private _nextPositionId;

    mapping(uint256 => Pool) private _pools;
    mapping(uint256 => Position) private _positions;
    mapping(address => uint256[]) private _userPositions;

    constructor() {
        backend = msg.sender;
    }

    modifier onlyBackend() {
        if (msg.sender != backend) revert NotPositionOwner();
        _;
    }

    /// @inheritdoc IMockLPV3
    function createPool(bytes32 pair, uint24 feeTier) external onlyBackend returns (uint256 poolId) {
        poolId = ++_nextPoolId;
        _pools[poolId] = Pool({
            pair: pair,
            feeTier: feeTier,
            totalLiquidity: 0,
            accumulatedFeesPerShare: 0,
            virtualVolume: 0
        });

        emit PoolCreated(poolId, pair, feeTier);
    }

    /// @inheritdoc IMockLPV3
    function addLiquidity(uint256 poolId, int24 tickLower, int24 tickUpper, uint256 amountUsd) external returns (uint256 positionId) {
        if (amountUsd == 0) revert ZeroAmount();
        if (tickLower >= tickUpper) revert InvalidTickRange();
        Pool storage pool = _pools[poolId];
        if (pool.pair == bytes32(0)) revert PoolNotFound();

        positionId = ++_nextPositionId;

        _positions[positionId] = Position({
            lp: msg.sender,
            poolId: poolId,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidity: amountUsd,
            amountUsd: amountUsd,
            feeDebt: pool.accumulatedFeesPerShare,
            feesClaimed: 0,
            active: true
        });

        pool.totalLiquidity += amountUsd;
        _userPositions[msg.sender].push(positionId);

        emit LiquidityAdded(positionId, msg.sender, amountUsd, tickLower, tickUpper);
    }

    /// @inheritdoc IMockLPV3
    function removeLiquidity(uint256 positionId) external returns (uint256 amount, uint256 fees) {
        Position storage pos = _positions[positionId];
        if (pos.lp == address(0)) revert PositionNotFound();
        if (pos.lp != msg.sender) revert NotPositionOwner();
        if (!pos.active) revert AlreadyRemoved();

        // Collect pending fees first
        fees = _calculatePendingFees(pos);
        pos.feesClaimed += fees;

        amount = pos.amountUsd;
        Pool storage pool = _pools[pos.poolId];
        pool.totalLiquidity -= pos.liquidity;

        pos.active = false;

        emit LiquidityRemoved(positionId, amount, fees);
    }

    /// @inheritdoc IMockLPV3
    function collectFees(uint256 positionId) external returns (uint256 fees) {
        Position storage pos = _positions[positionId];
        if (pos.lp == address(0)) revert PositionNotFound();
        if (pos.lp != msg.sender) revert NotPositionOwner();
        if (!pos.active) revert AlreadyRemoved();

        fees = _calculatePendingFees(pos);
        pos.feeDebt = _pools[pos.poolId].accumulatedFeesPerShare;
        pos.feesClaimed += fees;

        emit FeesCollected(positionId, fees);
    }

    /// @inheritdoc IMockLPV3
    function simulateFeeAccrual(uint256 poolId, uint256 volumeUsd) external onlyBackend {
        Pool storage pool = _pools[poolId];
        if (pool.pair == bytes32(0)) revert PoolNotFound();

        uint256 feesGenerated = (volumeUsd * pool.feeTier) / 1_000_000;
        pool.virtualVolume += volumeUsd;

        if (pool.totalLiquidity > 0) {
            pool.accumulatedFeesPerShare += (feesGenerated * 1e18) / pool.totalLiquidity;
        }

        emit FeeAccrued(poolId, volumeUsd, feesGenerated);
    }

    /// @inheritdoc IMockLPV3
    function getPool(uint256 poolId) external view returns (Pool memory) {
        if (_pools[poolId].pair == bytes32(0)) revert PoolNotFound();
        return _pools[poolId];
    }

    /// @inheritdoc IMockLPV3
    function getPosition(uint256 positionId) external view returns (Position memory) {
        if (_positions[positionId].lp == address(0)) revert PositionNotFound();
        return _positions[positionId];
    }

    /// @inheritdoc IMockLPV3
    function getUserPositions(address lp) external view returns (uint256[] memory) {
        return _userPositions[lp];
    }

    /// @inheritdoc IMockLPV3
    function setCopyTrading(address copyTrading_) external onlyBackend {
        copyTrading = copyTrading_;
    }

    /// @notice Calculate pending fees for a position since last collection
    function _calculatePendingFees(Position storage pos) internal view returns (uint256) {
        Pool storage pool = _pools[pos.poolId];
        uint256 delta = pool.accumulatedFeesPerShare - pos.feeDebt;
        return (pos.liquidity * delta) / 1e18;
    }
}
