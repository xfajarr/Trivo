// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IMockPolymarket} from "./interfaces/IMockPolymarket.sol";

/// @title MockPolymarket
/// @notice Mock prediction market — YES/NO with odds, resolved from real outcome
contract MockPolymarket is IMockPolymarket {
    address public backend;
    address public copyTrading;
    uint256 public constant MIN_RESOLVE_WINDOW = 1 minutes;

    uint256 private _nextMarketId;
    mapping(uint256 => Market) private _markets;
    mapping(uint256 => mapping(address => UserPosition)) private _positions;

    constructor() {
        backend = msg.sender;
    }

    modifier onlyBackend() {
        if (msg.sender != backend) revert NotCreatedByBackend();
        _;
    }

    /// @inheritdoc IMockPolymarket
    function createMarket(string calldata question, uint256 yesOdds, uint256 noOdds) external onlyBackend returns (uint256 marketId) {
        if (yesOdds + noOdds != 100) revert InvalidOdds();
        if (yesOdds == 0 || noOdds == 0) revert InvalidOdds();

        marketId = ++_nextMarketId;
        _markets[marketId] = Market({
            question: question,
            yesOdds: yesOdds,
            noOdds: noOdds,
            resolveAfter: block.timestamp + MIN_RESOLVE_WINDOW,
            resolved: false,
            outcome: false
        });

        emit MarketCreated(marketId, question, yesOdds, noOdds);
    }

    /// @inheritdoc IMockPolymarket
    function buyOutcome(uint256 marketId, bool isYes, uint256 amount) external returns (uint256 shares) {
        if (amount == 0) revert ZeroAmount();
        Market storage market = _markets[marketId];
        if (market.resolveAfter == 0) revert MarketNotFound();
        if (market.resolved) revert MarketAlreadyResolved();

        uint256 odds = isYes ? market.yesOdds : market.noOdds;
        shares = (amount * 100) / odds;  // shares = amount / (odds/100)

        _positions[marketId][msg.sender] = UserPosition({
            shares: shares,
            isYes: isYes,
            claimed: false
        });

        emit OutcomeBought(marketId, msg.sender, isYes, amount, shares);
    }

    /// @inheritdoc IMockPolymarket
    function resolveMarket(uint256 marketId, bool outcome) external onlyBackend {
        Market storage market = _markets[marketId];
        if (market.resolveAfter == 0) revert MarketNotFound();
        if (market.resolved) revert MarketAlreadyResolved();

        market.resolved = true;
        market.outcome = outcome;

        emit MarketResolved(marketId, outcome);
    }

    /// @inheritdoc IMockPolymarket
    function claim(uint256 marketId) external returns (uint256 payout) {
        Market storage market = _markets[marketId];
        if (market.resolveAfter == 0) revert MarketNotFound();
        if (!market.resolved) revert MarketNotResolved();

        UserPosition storage pos = _positions[marketId][msg.sender];
        if (pos.claimed) revert AlreadyClaimed();
        if (pos.shares == 0) revert ZeroAmount();

        pos.claimed = true;

        // If user bet on winning outcome, shares = payout
        // If user bet on losing outcome, payout = 0
        if (pos.isYes == market.outcome) {
            payout = pos.shares;
        }

        emit Claimed(marketId, msg.sender, payout);
    }

    /// @inheritdoc IMockPolymarket
    function getMarket(uint256 marketId) external view returns (Market memory) {
        if (_markets[marketId].resolveAfter == 0) revert MarketNotFound();
        return _markets[marketId];
    }

    /// @inheritdoc IMockPolymarket
    function getUserPosition(uint256 marketId, address user) external view returns (UserPosition memory) {
        return _positions[marketId][user];
    }

    /// @inheritdoc IMockPolymarket
    function setCopyTrading(address copyTrading_) external onlyBackend {
        copyTrading = copyTrading_;
    }

    /// @notice Transfer backend role
    function transferBackend(address newBackend) external onlyBackend {
        backend = newBackend;
    }
}
