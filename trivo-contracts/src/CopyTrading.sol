// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ICopyTrading} from "./interfaces/ICopyTrading.sol";

contract CopyTrading is ICopyTrading {
    address public owner;
    address public feeManager;
    uint256 public constant MAX_ALLOCATION_BPS = 10000;

    uint256 private _nextPositionId;

    mapping(uint256 => address) public agentAddresses;
    mapping(uint256 => address) public agentOwners;
    mapping(uint256 => mapping(address => CopyRelation)) public relations;
    mapping(uint256 => Position) private _positions;

    FeeConfig public feeConfig;

    constructor(address platformFeeRecipient) {
        owner = msg.sender;
        feeConfig = FeeConfig({
            platformFeeRecipient: platformFeeRecipient,
            platformFeeBps: 50,
            minCreatorFeeBps: 100,
            maxCreatorFeeBps: 500
        });
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotAuthorized();
        _;
    }

    /// @inheritdoc ICopyTrading
    function maxAllocationBps() external pure returns (uint256) {
        return MAX_ALLOCATION_BPS;
    }

    /// @inheritdoc ICopyTrading
    function registerAgent(uint256 agentId, address agentAddress, address agentOwner) external onlyOwner {
        agentAddresses[agentId] = agentAddress;
        agentOwners[agentId] = agentOwner;
        emit AgentRegistered(agentId, agentAddress);
    }

    /// @inheritdoc ICopyTrading
    function attachFollower(address follower, uint256 targetAgentId, uint256 allocationBps) external {
        if (agentAddresses[targetAgentId] == address(0)) revert AgentNotFound();
        if (allocationBps == 0) revert ZeroAllocation();
        if (allocationBps > MAX_ALLOCATION_BPS) revert AllocationTooHigh();
        if (relations[targetAgentId][follower].active) revert AlreadyAttached();

        relations[targetAgentId][follower] = CopyRelation({
            follower: follower,
            targetAgentId: targetAgentId,
            allocationBps: allocationBps,
            active: true,
            startedAt: block.timestamp,
            totalCopied: 0,
            totalPnl: 0
        });

        emit FollowerAttached(follower, targetAgentId, allocationBps);
    }

    /// @inheritdoc ICopyTrading
    function detachFollower(address follower, uint256 targetAgentId) external {
        if (!relations[targetAgentId][follower].active) revert NotAttached();
        relations[targetAgentId][follower].active = false;
        emit FollowerDetached(follower, targetAgentId);
    }

    /// @inheritdoc ICopyTrading
    function reportPosition(uint256 agentId, string calldata venue, string calldata market, string calldata side, uint256 size, uint256 entryPrice, uint256 leverage, bytes32 refId) external returns (uint256 positionId) {
        // Check agent exists first, then authorization
        address agentAddr = agentAddresses[agentId];
        if (agentAddr == address(0)) revert AgentNotFound();
        if (msg.sender != agentAddr) revert NotAuthorized();

        positionId = ++_nextPositionId;
        _positions[positionId] = Position({
            agentId: agentId,
            agentAddress: msg.sender,
            venue: venue,
            market: market,
            side: side,
            size: size,
            entryPrice: entryPrice,
            leverage: leverage,
            refId: refId,
            exitPrice: 0,
            pnl: 0,
            open: true,
            openedAt: block.timestamp,
            closedAt: 0
        });

        emit PositionReported(positionId, agentId, venue, market, side);
    }

    /// @inheritdoc ICopyTrading
    function closePosition(uint256 positionId, uint256 exitPrice, int256 pnl) external {
        Position storage pos = _positions[positionId];
        if (pos.agentAddress == address(0)) revert PositionNotFound();
        if (msg.sender != pos.agentAddress) revert NotAuthorized();
        if (!pos.open) revert AlreadyClosed();

        pos.exitPrice = exitPrice;
        pos.pnl = pnl;
        pos.open = false;
        pos.closedAt = block.timestamp;

        emit PositionClosedEv(positionId, pnl);
    }

    /// @inheritdoc ICopyTrading
    function distributeCopyFees(uint256 positionId) external returns (uint256 platformShare, uint256 creatorShare) {
        Position storage pos = _positions[positionId];
        if (pos.agentAddress == address(0)) revert PositionNotFound();
        if (pos.open) revert AlreadyClosed();

        uint256 totalProfit = pos.pnl > 0 ? uint256(pos.pnl) : 0;
        if (totalProfit == 0) revert NoProfit();

        platformShare = (totalProfit * feeConfig.platformFeeBps) / 10000;
        uint256 creatorFeeBps = (feeConfig.minCreatorFeeBps + feeConfig.maxCreatorFeeBps) / 2;
        creatorShare = (totalProfit * creatorFeeBps) / 10000;

        emit FeesDistributed(positionId, platformShare, creatorShare);
    }

    /// @inheritdoc ICopyTrading
    function getAgentRelation(uint256 agentId, address follower) external view returns (CopyRelation memory) {
        return relations[agentId][follower];
    }

    /// @inheritdoc ICopyTrading
    function getPosition(uint256 positionId) external view returns (Position memory) {
        if (_positions[positionId].agentAddress == address(0)) revert PositionNotFound();
        return _positions[positionId];
    }

    /// @inheritdoc ICopyTrading
    function setFeeConfig(uint16 platformFeeBps, uint16 minCreatorFeeBps, uint16 maxCreatorFeeBps) external onlyOwner {
        feeConfig = FeeConfig({
            platformFeeRecipient: feeConfig.platformFeeRecipient,
            platformFeeBps: platformFeeBps,
            minCreatorFeeBps: minCreatorFeeBps,
            maxCreatorFeeBps: maxCreatorFeeBps
        });
    }

    /// @inheritdoc ICopyTrading
    function setFeeManager(address feeManager_) external onlyOwner {
        feeManager = feeManager_;
    }
}
