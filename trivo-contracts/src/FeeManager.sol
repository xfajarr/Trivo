// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IFeeManager} from "./interfaces/IFeeManager.sol";

/// @title FeeManager
/// @notice Handle platform fee collection and creator payout with performance tiers
contract FeeManager is IFeeManager {
    address public owner;

    mapping(uint256 => uint256) private _creatorFees;
    mapping(uint256 => address) public agentCreators;  // 🆕 who owns each agent's fees
    uint256 private _platformFees;
    mapping(uint256 => uint8) private _feeTiers;

    FeeTier[3] public feeTiers;

    constructor(address owner_) {
        owner = owner_;
        feeTiers[0] = FeeTier(0, 3000, 7000);  // Basic:   30% creator, 70% platform
        feeTiers[1] = FeeTier(1, 5000, 5000);  // Standard: 50% creator, 50% platform
        feeTiers[2] = FeeTier(2, 7000, 3000);  // Premium:  70% creator, 30% platform
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    /// @inheritdoc IFeeManager
    function setAgentCreator(uint256 agentId, address creator) external onlyOwner {
        agentCreators[agentId] = creator;
    }

    /// @inheritdoc IFeeManager
    function depositFee(uint256 agentId, uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        uint8 tier = _feeTiers[agentId];
        FeeTier memory ft = feeTiers[tier];

        uint256 creatorShare = (amount * ft.creatorShareBps) / 10000;
        uint256 platformShare = (amount * ft.platformShareBps) / 10000;

        _creatorFees[agentId] += creatorShare;
        _platformFees += platformShare;

        emit FeeDeposited(agentId, amount);
    }

    /// @inheritdoc IFeeManager
    function withdrawCreatorFees(uint256 agentId) external returns (uint256) {
        // 🛡️ Only the registered creator can withdraw their fees
        if (msg.sender != agentCreators[agentId]) revert NotAuthorized();

        uint256 amount = _creatorFees[agentId];
        if (amount == 0) revert NoFeesToWithdraw();

        _creatorFees[agentId] = 0;
        emit FeesWithdrawn(agentId, amount, true);

        return amount;
    }

    /// @inheritdoc IFeeManager
    function withdrawPlatformFees() external onlyOwner returns (uint256) {
        uint256 amount = _platformFees;
        if (amount == 0) revert NoFeesToWithdraw();

        _platformFees = 0;
        emit FeesWithdrawn(0, amount, false);

        return amount;
    }

    /// @inheritdoc IFeeManager
    function setFeeTier(uint256 agentId, uint8 tier) external onlyOwner {
        if (tier >= 3) revert InvalidTier();
        _feeTiers[agentId] = tier;
        emit FeeTierSet(agentId, tier);
    }

    /// @inheritdoc IFeeManager
    function getPendingFees(uint256 agentId) external view returns (uint256) {
        return _creatorFees[agentId];
    }

    /// @inheritdoc IFeeManager
    function getPendingPlatformFees() external view returns (uint256) {
        return _platformFees;
    }
}
