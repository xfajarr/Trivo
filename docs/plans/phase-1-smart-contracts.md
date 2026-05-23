# 🏗️ Phase 1 — Smart Contracts Implementation Plan

> **Project:** Trivo  
> **Target:** Arc Testnet (Chain ID: 5042002)  
> **Stack:** Foundry + Solidity 0.8.28  
> **Pattern:** Real market data → Mock execution on-testnet → On-chain PnL  
> **Total Contracts:** 6  

---

## Contract Dependency Graph

```
SimpleOracle          (no deps)
    │
    ├──► MockPerp         (depends: SimpleOracle → for price)
    ├──► MockPolymarket   (depends: SimpleOracle → for resolve check)
    └──► MockLPV3         (depends: SimpleOracle → for price)
           │
           ▼
      CopyTrading      (depends: —)
           │
           ▼
      FeeManager       (depends: —)
```

**Deploy order:** SimpleOracle → MockPerp · MockPolymarket · MockLPV3 → CopyTrading → FeeManager

---

## Task 1.1: SimpleOracle.sol

**Goal:** On-chain price feed that gets updated from backend (real market data)

### Interface

```solidity
interface ISimpleOracle {
    function updatePrice(bytes32 pair, uint256 price, uint256 timestamp) external;
    function getPrice(bytes32 pair) external view returns (uint256 price, uint256 timestamp, uint256 lastUpdated);
    function getMultiplePrices(bytes32[] calldata pairs) external view returns (uint256[] memory prices);
    
    event PriceUpdated(bytes32 indexed pair, uint256 price, uint256 timestamp);
}
```

### State

```solidity
mapping(bytes32 => Price) public prices;

struct Price {
    uint256 price;      // in USD, 2 decimals (e.g., 72880 = $72,880)
    uint256 timestamp;  // unix
    uint256 lastUpdated; // block.timestamp
}
```

### Price Pairs

```
bytes32 constant BTC = keccak256("BTC/USD");
bytes32 constant ETH = keccak256("ETH/USD");
bytes32 constant SOL = keccak256("SOL/USD");
```

### Functions

| Function | Description | Access |
|----------|-------------|--------|
| `updatePrice(pair, price, timestamp)` | Update price from backend | Owner/Backend signer |
| `getPrice(pair)` | Get latest price | Anyone |
| `getMultiplePrices(pairs[])` | Batch read | Anyone |

### Tests
- Update price → check storage
- Update price → event emitted with correct values
- Get price before update → revert (or return 0)
- Multiple prices → correct array
- Only owner can update

---

## Task 1.2: MockPerp.sol

**Goal:** Mock perpetual futures — open/close positions with leverage, PnL based on real price movement from Oracle

### Interface

```solidity
interface IMockPerp {
    function openPosition(bytes32 pair, bool isLong, uint256 sizeUsd, uint256 leverage) external returns (uint256 positionId);
    function closePosition(uint256 positionId) external returns (int256 pnl, uint256 pnlUsd);
    function addMargin(uint256 positionId, uint256 amount) external;
    function getPosition(uint256 positionId) external view returns (Position memory);
    function getUserPositions(address trader) external view returns (uint256[] memory);
    
    event PositionOpened(uint256 indexed id, address indexed trader, bytes32 pair, bool isLong, uint256 size, uint256 leverage, uint256 entryPrice);
    event PositionClosed(uint256 indexed id, int256 pnl, uint256 pnlUsd, uint256 exitPrice);
}
```

### Position State

```solidity
struct Position {
    address trader;
    bytes32 pair;
    bool isLong;
    uint256 size;           // USD notional
    uint256 leverage;
    uint256 margin;          // size / leverage
    uint256 entryPrice;      // from oracle at open
    uint256 exitPrice;
    int256  pnl;            // realized PnL
    uint256 openedAt;
    uint256 closedAt;
    bool    active;
}
```

### PnL Calculation

```solidity
function calculatePnl(uint256 entryPrice, uint256 exitPrice, uint256 size, bool isLong) public pure returns (int256) {
    uint256 priceDiff = exitPrice > entryPrice ? exitPrice - entryPrice : entryPrice - exitPrice;
    uint256 pnlRaw = (size * priceDiff) / entryPrice;
    
    if (isLong) {
        return exitPrice >= entryPrice ? int256(pnlRaw) : -int256(pnlRaw);
    } else {
        return exitPrice <= entryPrice ? int256(pnlRaw) : -int256(pnlRaw);
    }
}
```

### Functions

| Function | Description |
|----------|-------------|
| `openPosition(pair, isLong, size, leverage)` | Open new position, get price from SimpleOracle |
| `closePosition(id)` | Close position, calc PnL from current oracle price |
| `addMargin(id, amount)` | Add margin to avoid liquidation |
| `getPosition(id)` | View position details |
| `getUserPositions(trader)` | List user's active positions |

### Integration Points
- Reads price from `SimpleOracle` address (set at deploy)
- Calls `CopyTrading.reportPosition()` after open (if CopyTrading address is set)
- Calls `CopyTrading.distributeCopyFees()` after close

### Tests
- Open LONG BTC → entry price matches oracle
- Close LONG BTC after price up → positive PnL
- Close LONG BTC after price down → negative PnL
- Open SHORT → correct direction
- Leverage calculation correct (5k at 3x = 1,666 margin)
- Revert: close already-closed position
- Revert: open with 0 size

---

## Task 1.3: MockPolymarket.sol

**Goal:** Mock prediction market — YES/NO outcome with odds, resolve based on real outcome

### Interface

```solidity
interface IMockPolymarket {
    function createMarket(string calldata question, uint256 yesOdds, uint256 noOdds, uint256 resolveAfter) external returns (uint256 marketId);
    function buyOutcome(uint256 marketId, bool isYes, uint256 amount) external returns (uint256 shares);
    function resolveMarket(uint256 marketId, bool outcome) external;
    function claim(uint256 marketId) external returns (uint256 payout);
    function getMarket(uint256 marketId) external view returns (Market memory);
    
    event MarketCreated(uint256 indexed id, string question, uint256 yesOdds, uint256 noOdds);
    event OutcomeBought(uint256 indexed marketId, address indexed trader, bool isYes, uint256 amount, uint256 shares);
    event MarketResolved(uint256 indexed marketId, bool outcome);
}
```

### Market State

```solidity
struct Market {
    string question;
    uint256 yesOdds;        // 0-100 (e.g., 62 = 62%)
    uint256 noOdds;         // 0-100
    uint256 yesPool;        // total YES shares bought
    uint256 noPool;         // total NO shares bought
    uint256 resolveAfter;   // timestamp when can resolve
    bool resolved;
    bool outcome;           // true = YES won, false = NO won
    address creator;        // who created the market (backend)
}

struct UserPosition {
    uint256 shares;
    bool isYes;
    bool claimed;
}
```

### PnL calculation for prediction markets
```
User buys YES at 62% for $500 → gets ~806 shares ($500 / 0.62)
Market resolves YES → shares worth $1 each → payout $806
PnL = $806 - $500 = +$306

User buys YES at 62% for $500 → gets ~806 shares
Market resolves NO → shares worth $0 → payout $0
PnL = $0 - $500 = -$500
```

### Functions

| Function | Description |
|----------|-------------|
| `createMarket(question, yesOdds, noOdds, resolveAfter)` | Create market (backend only) |
| `buyOutcome(marketId, isYes, amount)` | Buy outcome shares |
| `resolveMarket(marketId, outcome)` | Resolve (backend only, based on real Polymarket result) |
| `claim(marketId)` | Claim payout after resolve |
| `getMarket(marketId)` | View market details |

### Tests
- Create market → correct state
- Buy YES at 50% → correct shares calculation
- Resolve YES → YES holders can claim profit
- Resolve NO → NO holders win, YES holders lose
- Claim after resolved → correct payout
- Revert: buy after resolved
- Revert: resolve already resolved market

---

## Task 1.4: MockLPV3.sol

**Goal:** Mock concentrated liquidity pool — add/remove liquidity, fee earning simulation

### Interface

```solidity
interface IMockLPV3 {
    function createPool(bytes32 pair, uint24 feeTier, uint160 sqrtPriceX96) external returns (uint256 poolId);
    function addLiquidity(uint256 poolId, int24 tickLower, int24 tickUpper, uint256 amountUsd) external returns (uint256 positionId);
    function removeLiquidity(uint256 positionId) external returns (uint256 amountUsd, uint256 feesEarned);
    function collectFees(uint256 positionId) external returns (uint256 fees);
    function simulateFeeAccrual(uint256 poolId, uint256 volumeUsd) external;
    
    event PoolCreated(uint256 indexed poolId, bytes32 pair, uint24 feeTier);
    event LiquidityAdded(uint256 indexed positionId, address indexed lp, uint256 amount, int24 tickLower, int24 tickUpper);
    event LiquidityRemoved(uint256 indexed positionId, uint256 amount, uint256 fees);
}
```

### State

```solidity
struct Pool {
    bytes32 pair;
    uint24 feeTier;       // 500 = 0.05%, 3000 = 0.30%, 10000 = 1.00%
    uint160 sqrtPriceX96; // current sqrt price
    uint256 totalLiquidity;
    uint256 accumulatedFeesPerLiquidity; // for fee calculation
    uint256 virtualVolume; // simulated volume for fee generation
}

struct Position {
    address lp;
    uint256 poolId;
    int24 tickLower;
    int24 tickUpper;
    uint256 liquidity;  // amount of liquidity provided
    uint256 amountUsd;  // USD value at deposit
    uint256 feeDebt;    // fee tracking
    uint256 feesClaimed;
    bool active;
}
```

### Fee Calculation

```solidity
// Simulate fee accrual based on virtual volume
function simulateFeeAccrual(uint256 poolId, uint256 volumeUsd) external {
    Pool storage pool = pools[poolId];
    uint256 feesGenerated = (volumeUsd * pool.feeTier) / 1_000_000;
    pool.virtualVolume += volumeUsd;
    pool.accumulatedFeesPerLiquidity += (feesGenerated * 1e18) / pool.totalLiquidity;
}
```

### Functions

| Function | Description |
|----------|-------------|
| `createPool(pair, feeTier, sqrtPriceX96)` | Create pool (backend only) |
| `addLiquidity(poolId, tickLower, tickUpper, amountUsd)` | Add concentrated LP |
| `removeLiquidity(positionId)` | Remove LP + collect fees |
| `collectFees(positionId)` | Claim earned fees |
| `simulateFeeAccrual(poolId, volumeUsd)` | Simulate trading volume (backend calls periodically) |

### Tests
- Create pool → correct state
- Add liquidity → position created
- Simulate fee accrual → fees accumulate
- Remove liquidity → get back principal + fees
- Multiple LPs → proportional fee distribution
- Revert: remove already-removed position

---

## Task 1.5: CopyTrading.sol

**Goal:** Core copy trading primitive — attach followers, mirror positions, distribute fees

### Interface

```solidity
interface ICopyTrading {
    function attachFollower(address follower, uint256 targetAgentId, uint256 allocationBps) external;
    function detachFollower(address follower, uint256 targetAgentId) external;
    function reportPosition(uint256 agentId, string calldata venue, string calldata market, string calldata side, uint256 size, uint256 entryPrice, uint256 leverage, bytes32 refId) external returns (uint256 positionId);
    function closePosition(uint256 positionId, uint256 exitPrice, int256 pnl) external;
    function distributeCopyFees(uint256 positionId) external;
    function setFeeConfig(uint16 platformFeeBps, uint16 minCreatorFeeBps, uint16 maxCreatorFeeBps) external;
    
    event FollowerAttached(address indexed follower, uint256 indexed targetAgentId, uint256 allocationBps);
    event FollowerDetached(address indexed follower, uint256 indexed targetAgentId);
    event PositionReported(uint256 indexed positionId, uint256 indexed agentId, string venue);
    event PositionClosed(uint256 indexed positionId, int256 pnl, uint256 feeDistribution);
}
```

### State

```solidity
struct CopyRelation {
    address follower;
    uint256 targetAgentId;
    uint256 allocationBps;  // % of size to mirror (100 = 100%)
    bool active;
    uint256 startedAt;
    uint256 totalCopied;    // total USD copied
    uint256 totalPnl;
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
    bytes32 refId;        // unique reference (venue tx hash)
    uint256 exitPrice;
    int256  pnl;
    bool    open;
    uint256 openedAt;
    uint256 closedAt;
}

struct FeeConfig {
    address platformFeeRecipient;
    uint16 platformFeeBps;       // 50 = 0.5%
    uint16 minCreatorFeeBps;     // 100 = 1%
    uint16 maxCreatorFeeBps;     // 500 = 5%
}
```

### Functions

| Function | Description |
|----------|-------------|
| `attachFollower(follower, targetAgentId, allocationBps)` | Start copy relationship |
| `detachFollower(follower, targetAgentId)` | Stop copy relationship |
| `reportPosition(agentId, venue, market, side, size, entryPrice, leverage, refId)` | Record new position |
| `closePosition(positionId, exitPrice, pnl)` | Close position, trigger fee distribution |
| `distributeCopyFees(positionId)` | Calculate and distribute fees |
| `setFeeConfig(...)` | Admin only |

### Fee Distribution Logic

```solidity
function distributeCopyFees(uint256 positionId) external {
    Position storage pos = positions[positionId];
    require(!pos.open, "Position still open");
    
    uint256 totalProfit = pos.pnl > 0 ? uint256(pos.pnl) : 0;
    if (totalProfit == 0) return;
    
    uint256 platformFee = (totalProfit * feeConfig.platformFeeBps) / 10000;
    uint256 creatorFee = calculateCreatorFee(totalProfit, performance);
    
    // Transfer to platform
    // Transfer to agent creator
    // Distribute remaining to followers based on allocation
}
```

### Tests
- Attach follower → relation created
- Detach follower → relation removed
- Report position → position stored
- Close position with profit → fees distributed
- Close position with loss → no fees
- Multiple followers → correct allocation
- Revert: double attach
- Revert: non-owner detach

---

## Task 1.6: FeeManager.sol

**Goal:** Handle platform fee collection, creator payout, performance tiers

### Interface

```solidity
interface IFeeManager {
    function depositFee(uint256 agentId, uint256 amount) external;
    function withdrawCreatorFees(uint256 agentId) external returns (uint256);
    function withdrawPlatformFees() external returns (uint256);
    function setFeeTier(uint256 agentId, uint8 tier) external;
    function getPendingFees(uint256 agentId) external view returns (uint256);
    
    event FeeDeposited(uint256 indexed agentId, uint256 amount);
    event FeesWithdrawn(uint256 indexed agentId, uint256 amount, bool isCreator);
}
```

### Fee Tiers

```solidity
struct FeeTier {
    uint8 tier;              // 0=basic, 1=standard, 2=premium
    uint16 creatorShareBps;  // e.g., 6000 = 60%
    uint16 platformShareBps; // e.g., 4000 = 40%
}
```

### Tests
- Deposit fee → balance updated
- Withdraw creator fees → correct amount
- Withdraw platform fees → admin only
- Set fee tier → tier updated
- Multiple deposits → accumulation correct

---

## Task 1.7: Integration Tests

### Test Scenarios

#### Scenario A: Full Perp Trade + Copy
```
1. SimpleOracle.updatePrice(BTC, 72880)
2. MockPerp.openPosition(BTC, LONG, 5000, 3)  → position #1
3. MockPerp → CopyTrading.reportPosition(...)
4. CopyTrading.attachFollower(follower, agent, 50%)
5. SimpleOracle.updatePrice(BTC, 74100)
6. MockPerp.closePosition(1) → PnL: +$xxx
7. CopyTrading.distributeCopyFees(1)
```

#### Scenario B: Polymarket Trade
```
1. MockPolymarket.createMarket("BTC>$73k?", 62, 38)
2. MockPolymarket.buyOutcome(1, YES, 500)
3. MockPolymarket.resolveMarket(1, true)
4. MockPolymarket.claim(1) → payout +$306
```

#### Scenario C: LP + Fee Earning
```
1. MockLPV3.createPool(ETH/USDC, 500)
2. MockLPV3.addLiquidity(1, -100, 100, 10000)
3. MockLPV3.simulateFeeAccrual(1, 100000)
4. MockLPV3.collectFees(1) → fees > 0
```

---

## Task 1.8: Deploy Script (Deploy.s.sol)

### Flow

```solidity
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy SimpleOracle
        SimpleOracle oracle = new SimpleOracle();
        oracle.transferOwnership(deployer);
        
        // 2. Deploy MockPerp
        MockPerp perp = new MockPerp(address(oracle));
        
        // 3. Deploy MockPolymarket
        MockPolymarket poly = new MockPolymarket();
        
        // 4. Deploy MockLPV3
        MockLPV3 lp = new MockLPV3(address(oracle));
        
        // 5. Deploy CopyTrading
        CopyTrading copy = new CopyTrading(deployer);
        
        // 6. Deploy FeeManager
        FeeManager fee = new FeeManager(deployer);
        
        // 7. Link contracts
        perp.setCopyTrading(address(copy));
        poly.setCopyTrading(address(copy));
        lp.setCopyTrading(address(copy));
        copy.setFeeManager(address(fee));
        
        // 8. Print addresses
        console.log("SimpleOracle:     ", address(oracle));
        console.log("MockPerp:         ", address(perp));
        console.log("MockPolymarket:   ", address(poly));
        console.log("MockLPV3:         ", address(lp));
        console.log("CopyTrading:      ", address(copy));
        console.log("FeeManager:       ", address(fee));
        
        vm.stopBroadcast();
    }
}
```

---

## Task 1.9: Deploy to Arc Testnet

### Commands

```bash
# Set env
export RPC_KEY=swrm_bfc179c6535721b8d00f83ce99c3ed9a6401b038561071e72b21f1a86d276ce3
export DEPLOYER_PRIVATE_KEY=0xyour_private_key

# Deploy
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "https://rpc.testnet.arc-node.thecanteenapp.com/v1/$RPC_KEY" \
  --broadcast -vvv

# Verify (one by one or via script)
forge verify-contract <ADDRESS> src/SimpleOracle.sol:SimpleOracle \
  --chain 5042002 \
  --verifier-url "https://testnet.arcscan.app/api" \
  --verifier sourcify
```

### Post-Deploy
- Save contract addresses to `trivo-backend/.env`
- Create backend service to periodically push real market data to SimpleOracle
- Create backend service to periodically push real Polymarket data to MockPolymarket

---

## 🔷 File Structure (Result)

```
trivo-contracts/
├── src/
│   ├── SimpleOracle.sol
│   ├── MockPerp.sol
│   ├── MockPolymarket.sol
│   ├── MockLPV3.sol
│   ├── CopyTrading.sol
│   ├── FeeManager.sol
│   └── interfaces/
│       ├── ISimpleOracle.sol
│       ├── IMockPerp.sol
│       ├── IMockPolymarket.sol
│       ├── IMockLPV3.sol
│       ├── ICopyTrading.sol
│       └── IFeeManager.sol
├── test/
│   ├── SimpleOracle.t.sol
│   ├── MockPerp.t.sol
│   ├── MockPolymarket.t.sol
│   ├── MockLPV3.t.sol
│   ├── CopyTrading.t.sol
│   ├── FeeManager.t.sol
│   └── Integration.t.sol        # cross-contract scenarios
├── script/
│   └── Deploy.s.sol
├── foundry.toml
└── .env
```

---

## 🔷 Total Effort Estimate

| Task | Files | Tests | Est Time |
|------|-------|-------|----------|
| 1.1 SimpleOracle | 1 + 1 | 4-5 tests | ~30 min |
| 1.2 MockPerp | 1 + 1 | 6-7 tests | ~45 min |
| 1.3 MockPolymarket | 1 + 1 | 6-7 tests | ~45 min |
| 1.4 MockLPV3 | 1 + 1 | 5-6 tests | ~40 min |
| 1.5 CopyTrading | 1 + 1 | 7-8 tests | ~50 min |
| 1.6 FeeManager | 1 + 1 | 4-5 tests | ~25 min |
| 1.7 Integration | — + 1 | 3 scenarios | ~20 min |
| 1.8 Deploy Script | 1 | — | ~15 min |
| 1.9 Deploy to Arc | — | — | ~10 min |
| **Total** | **13-14 files** | **~40 tests** | **~5 hours** |
