// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IFeeManager {
    error ZeroAmount();
    error NotAuthorized();
    error NoFeesToWithdraw();
    error InvalidTier();

    struct FeeTier {
        uint8 tier;
        uint16 creatorShareBps;
        uint16 platformShareBps;
    }

    function setAgentCreator(uint256 agentId, address creator) external;
    function depositFee(uint256 agentId, uint256 amount) external;
    function withdrawCreatorFees(uint256 agentId) external returns (uint256);
    function withdrawPlatformFees() external returns (uint256);
    function setFeeTier(uint256 agentId, uint8 tier) external;
    function getPendingFees(uint256 agentId) external view returns (uint256);
    function getPendingPlatformFees() external view returns (uint256);
    function owner() external view returns (address);

    event FeeDeposited(uint256 indexed agentId, uint256 amount);
    event FeesWithdrawn(uint256 indexed agentId, uint256 amount, bool isCreator);
    event FeeTierSet(uint256 indexed agentId, uint8 tier);
}
