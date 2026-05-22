// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICopyTrading {
    error NotAuthorized();
    error AgentNotFound();
    error PositionNotFound();
    error AlreadyClosed();
    error AlreadyAttached();
    error NotAttached();
    error ZeroAllocation();
    error AllocationTooHigh();
    error NoProfit();

    struct CopyRelation {
        address follower;
        uint256 targetAgentId;
        uint256 allocationBps;
        bool active;
        uint256 startedAt;
        uint256 totalCopied;
        int256 totalPnl;
    }

    struct Position {
        uint256 agentId;
        address agentAddress;
        string venue;
        string market;
        string side;
        uint256 size;
        uint256 entryPrice;
        uint256 leverage;
        bytes32 refId;
        uint256 exitPrice;
        int256 pnl;
        bool open;
        uint256 openedAt;
        uint256 closedAt;
    }

    struct FeeConfig {
        address platformFeeRecipient;
        uint16 platformFeeBps;
        uint16 minCreatorFeeBps;
        uint16 maxCreatorFeeBps;
    }

    function attachFollower(address follower, uint256 targetAgentId, uint256 allocationBps) external;
    function detachFollower(address follower, uint256 targetAgentId) external;
    function reportPosition(uint256 agentId, string calldata venue, string calldata market, string calldata side, uint256 size, uint256 entryPrice, uint256 leverage, bytes32 refId) external returns (uint256 positionId);
    function closePosition(uint256 positionId, uint256 exitPrice, int256 pnl) external;
    function distributeCopyFees(uint256 positionId) external returns (uint256 platformShare, uint256 creatorShare);
    function getAgentRelation(uint256 agentId, address follower) external view returns (CopyRelation memory);
    function getPosition(uint256 positionId) external view returns (Position memory);
    function setFeeConfig(uint16 platformFeeBps, uint16 minCreatorFeeBps, uint16 maxCreatorFeeBps) external;
    function setFeeManager(address feeManager) external;
    function registerAgent(uint256 agentId, address agentAddress, address agentOwner) external;
    function maxAllocationBps() external view returns (uint256);

    event AgentRegistered(uint256 indexed agentId, address indexed agentAddress);
    event FollowerAttached(address indexed follower, uint256 indexed targetAgentId, uint256 allocationBps);
    event FollowerDetached(address indexed follower, uint256 indexed targetAgentId);
    event PositionReported(uint256 indexed positionId, uint256 indexed agentId, string venue, string market, string side);
    event PositionClosedEv(uint256 indexed positionId, int256 pnl);
    event FeesDistributed(uint256 indexed positionId, uint256 platformShare, uint256 creatorShare);
}
