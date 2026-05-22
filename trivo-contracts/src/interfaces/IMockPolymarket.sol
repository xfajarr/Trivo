// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMockPolymarket {
    error ZeroAmount();
    error MarketNotFound();
    error MarketAlreadyResolved();
    error MarketNotResolved();
    error AlreadyClaimed();
    error NotCreatedByBackend();
    error InvalidOdds();

    struct Market {
        string question;
        uint256 yesOdds;
        uint256 noOdds;
        uint256 resolveAfter;
        bool resolved;
        bool outcome;
    }

    struct UserPosition {
        uint256 shares;
        bool isYes;
        bool claimed;
    }

    function createMarket(string calldata question, uint256 yesOdds, uint256 noOdds) external returns (uint256 marketId);
    function buyOutcome(uint256 marketId, bool isYes, uint256 amount) external returns (uint256 shares);
    function resolveMarket(uint256 marketId, bool outcome) external;
    function claim(uint256 marketId) external returns (uint256 payout);
    function getMarket(uint256 marketId) external view returns (Market memory);
    function getUserPosition(uint256 marketId, address user) external view returns (UserPosition memory);
    function setCopyTrading(address copyTrading) external;

    event MarketCreated(uint256 indexed id, string question, uint256 yesOdds, uint256 noOdds);
    event OutcomeBought(uint256 indexed marketId, address indexed trader, bool isYes, uint256 amount, uint256 shares);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event Claimed(uint256 indexed marketId, address indexed user, uint256 payout);
}
