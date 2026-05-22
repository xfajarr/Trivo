// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMockLPV3 {
    error ZeroAmount();
    error PoolNotFound();
    error PositionNotFound();
    error AlreadyRemoved();
    error NotPositionOwner();
    error InvalidTickRange();

    struct Pool {
        bytes32 pair;
        uint24 feeTier;
        uint256 totalLiquidity;
        uint256 accumulatedFeesPerShare;
        uint256 virtualVolume;
    }

    struct Position {
        address lp;
        uint256 poolId;
        int24 tickLower;
        int24 tickUpper;
        uint256 liquidity;
        uint256 amountUsd;
        uint256 feeDebt;
        uint256 feesClaimed;
        bool active;
    }

    function createPool(bytes32 pair, uint24 feeTier) external returns (uint256 poolId);
    function addLiquidity(uint256 poolId, int24 tickLower, int24 tickUpper, uint256 amountUsd) external returns (uint256 positionId);
    function removeLiquidity(uint256 positionId) external returns (uint256 amount, uint256 fees);
    function collectFees(uint256 positionId) external returns (uint256 fees);
    function simulateFeeAccrual(uint256 poolId, uint256 volumeUsd) external;
    function getPool(uint256 poolId) external view returns (Pool memory);
    function getPosition(uint256 positionId) external view returns (Position memory);
    function getUserPositions(address lp) external view returns (uint256[] memory);
    function setCopyTrading(address copyTrading) external;

    event PoolCreated(uint256 indexed poolId, bytes32 pair, uint24 feeTier);
    event LiquidityAdded(uint256 indexed positionId, address indexed lp, uint256 amount, int24 tickLower, int24 tickUpper);
    event LiquidityRemoved(uint256 indexed positionId, uint256 amount, uint256 fees);
    event FeesCollected(uint256 indexed positionId, uint256 fees);
    event FeeAccrued(uint256 indexed poolId, uint256 volume, uint256 feesGenerated);
}
