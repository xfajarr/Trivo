# 🗺️ Trivo Implementation Roadmap

> **PRD Referensi:** `/PRD.md`  
> **Feature Map:** `/trivo-feature-map.md`  
> **Updated:** May 23, 2026

---

## 🔷 Phase 1: Smart Contracts (Foundry)

**Goal:** Deploy 6 contracts on Arc — core copy trading + mock venues + fee manager.
**Target:** Setiap agent action menghasilkan on-chain transaction di Arcscan.

### Contract List

| # | Contract | Fungsi | Lines (est) | Deploy ke Arc? |
|---|----------|--------|-------------|----------------|
| 1.1 | **SimpleOracle.sol** | Price feed (BTC/ETH/SOL) — update price, query price | ~50 | ✅ |
| 1.2 | **MockPerp.sol** | Open/close perpetual positions, leverage, margin, funding rate simulation, PnL | ~150 | ✅ |
| 1.3 | **MockPolymarket.sol** | YES/NO prediction markets, odds, resolve outcome, builder code attribution | ~150 | ✅ |
| 1.4 | **MockLPV3.sol** | Concentrated liquidity pools, add/remove liquidity, fee earning, range | ~120 | ✅ |
| 1.5 | **CopyTrading.sol** | Mirror positions, attach/detach follower, fee distribution | ~200 | ✅ |
| 1.6 | **FeeManager.sol** | Platform fee collection, tier-based creator payout, withdraw | ~80 | ✅ |
| 1.7 | **Tests** | `forge test` untuk semua contract | ~300 | — |
| 1.8 | **Deploy Script** | Deploy semua contract + setup ke Arc testnet | ~50 | ✅ |
| 1.9 | **Arcscan Verification** | Verified source code | — | ✅ |

### On-Chain Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                        ARC CHAIN (5042002)                         │
│                                                                    │
│                         ┌─────────────────┐                       │
│                         │  SimpleOracle    │                       │
│                         │  (BTC: $72,880)  │                       │
│                         └────────┬────────┘                       │
│                                  │ price                           │
│         ┌────────────────────────┼────────────────────┐           │
│         ▼                        ▼                    ▼           │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │  MockPerp    │  │  MockPolymarket  │  │   MockLPV3       │    │
│  │              │  │                  │  │                  │    │
│  │ openPosition │  │ buyOutcome       │  │ addLiquidity     │    │
│  │ closePosition│  │ resolve          │  │ removeLiquidity  │    │
│  │ addMargin    │  │ claim            │  │ collectFees      │    │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘    │
│         │                   │                      │              │
│         └───────────────────┼──────────────────────┘              │
│                             ▼                                     │
│                    ┌────────────────┐                             │
│                    │  CopyTrading   │                             │
│                    │                │                             │
│                    │ reportPosition │                             │
│                    │ distributeFees │                             │
│                    │ attachFollower │                             │
│                    └────────┬───────┘                             │
│                             │                                      │
│                    ┌────────▼───────┐                             │
│                    │  FeeManager    │                             │
│                    │                │                             │
│                    │ platformFee    │                             │
│                    │ creatorPayout  │                             │
│                    └────────────────┘                             │
└────────────────────────────────────────────────────────────────────┘
```

### Agent Trade Cycle (tx count per cycle)

| Step | Contract | Function | Gas (~USDC) |
|------|----------|----------|-------------|
| 1 | MockPerp | `openPosition()` | 0.006 |
| 2 | MockPerp → CopyTrading | `reportPosition()` | 0.008 |
| 3 | MockPerp | `closePosition()` | 0.006 |
| 4 | CopyTrading | `distributeCopyFees()` | 0.010 |
| 5 | FeeManager | `collectPlatformFee()` | 0.006 |
| **Total** | **5 tx per trade** | | **~$0.036** |

Arcscan bakal penuh transaksi — judges bisa liat setiap action agent.

---

## 🔷 Phase 2: Backend Core (Hono)

**Goal:** Agent CRUD + wallet integration + feed service

### Modules

| # | Module | Key Files | Depends On |
|---|--------|-----------|------------|
| 2.1 | **DB Setup** | `src/lib/db.ts`, `src/lib/schema.ts` | — |
| 2.2 | **Agent Service** | `src/routes/agents.ts`, `src/services/agent.service.ts` | 2.1 |
| 2.3 | **User/Auth** | `src/routes/auth.ts`, `src/services/auth.service.ts` | 2.1 |
| 2.4 | **Wallet Service** | `src/routes/wallets.ts`, `src/services/wallet.service.ts` | 2.2 |
| 2.5 | **Position Service** | `src/routes/positions.ts`, `src/services/position.service.ts` | 2.2 |
| 2.6 | **Feed Service** | `src/routes/feed.ts`, `src/services/feed.service.ts` | 2.5 |
| 2.7 | **Copy Trade Service** | `src/routes/copy.ts`, `src/services/copy.service.ts` | 2.2, 2.5 |
| 2.8 | **Strategy Compiler** | `src/services/strategy.service.ts` | — |

### Key Deliverables
- ✅ PostgreSQL schema (agents, users, positions, copy_relations, skills)
- ✅ REST API: CRUD agents, auth, positions, feed, copy trades
- ✅ Circle Agent Wallet creation + funding
- ✅ Real-time feed (WebSocket)
- ✅ Strategy compiler: NL input → structured rules

---

## 🔷 Phase 3: Mock Trading Engine (Backend)

**Goal:** Run agent decision loop → call real mock venue contracts on Arc → feed populated with real on-chain data

### Modules

| # | Module | Key Files | Depends On |
|---|--------|-----------|------------|
| 3.1 | **Market Data Generator** | `src/services/mock/market-data.ts` | — |
| 3.2 | **Contract Connector (viem)** | `src/services/mock/contract-connector.ts` | Phase 1 |
| 3.3 | **Agent Scheduler** | `src/services/mock/agent-scheduler.ts` | 3.1, 3.2 |
| 3.4 | **PnL Calculator** | `src/services/mock/pnl.ts` | 3.1 |
| 3.5 | **Backend → Contract Sync** | `src/services/mock/sync-service.ts` | 3.2 |

### Agent Scheduler Flow

```
setInterval (30 detik):
  For each active agent:
    1. Market Data Generator → current prices
    2. AI Model (atau rule-based) → trade decision
    3. Contract Connector → call MockPerp.openPosition() on Arc
    4. Transaction confirmed → emit event
    5. Feed Service → broadcast new position
    6. Copy Service → check followers → mirror via CopyTrading
```

### Key Deliverables
- ✅ Periodic agent decision execution
- ✅ Real contract calls to Arc — tx hash in every response
- ✅ Automatic PnL tracking via contract events
- ✅ Feed populated with on-chain verified data

---

## 🔷 Phase 4: Frontend Integration (TanStack Start)

**Goal:** Connect existing UI to real backend + on-chain data

### Modules

| # | Module | Key Files | Depends On |
|---|--------|-----------|------------|
| 4.1 | **API Client** | `src/lib/api.ts` | Phase 2 |
| 4.2 | **Auth/Wallet Connect** | `src/lib/wallet.ts`, `src/hooks/useWallet.ts` | 4.1 |
| 4.3 | **Launch Wizard Enhancement** | `src/routes/launch.tsx` | 4.1 |
| 4.4 | **Agent Settings Page** | `src/routes/agent.$id.settings.tsx` | 4.1 |
| 4.5 | **Wallet Page** | `src/routes/wallet.tsx` | 4.2 |
| 4.6 | **Feed → Real Data** | `src/routes/index.tsx` | 4.1, Phase 3 |
| 4.7 | **Replace Mock Data** | `src/lib/mock-data.ts` → all routes | 4.1 |

### Key Deliverables
- ✅ Launch wizard deploy agent + register ERC-8004
- ✅ Feed displays positions with Arcscan links (tx hash)
- ✅ Wallet connect + agent wallet management
- ✅ Agent detail shows on-chain stats from ReputationRegistry

---

## 🔷 Phase 5: AI Model Gateway

**Goal:** Connect agents to real AI models

### Modules

| # | Module | Key Files | Depends On |
|---|--------|-----------|------------|
| 5.1 | **Model Provider Interface** | `src/services/models/provider.ts` | — |
| 5.2 | **DeepSeek Provider** | `src/services/models/deepseek.ts` | 5.1 |
| 5.3 | **Claude Provider** | `src/services/models/claude.ts` | 5.1 |
| 5.4 | **OpenAI Provider** | `src/services/models/openai.ts` | 5.1 |
| 5.5 | **BYOK Provider** | `src/services/models/byok.ts` | 5.1 |
| 5.6 | **Model Gateway Route** | `src/routes/models.ts` | 5.1–5.5 |
| 5.7 | **Agent Decision Loop** | `src/services/agent-engine.ts` | 5.6, Strategy |

---

## 🔷 Phase 6: Advanced Features

**Goal:** Backtest + self-hosted support

### Modules

| # | Module | Key Files | Depends On |
|---|--------|-----------|------------|
| 6.1 | **Backtest Service** | `src/services/backtest.service.ts` | Phase 3 |
| 6.2 | **Backtest Routes** | `src/routes/backtest.ts` | 6.1 |
| 6.3 | **Frontend: Backtest Lab** | `src/routes/backtest.tsx` | 6.2 |
| 6.4 | **Self-Hosted Registration** | `src/services/skills.service.ts` | Phase 2 |
| 6.5 | **Agent Proxy (REST/WS)** | `src/services/agent-proxy.ts` | 6.4 |
| 6.6 | **Skill Marketplace** | `src/routes/skills.tsx` | 6.4 |

---

## 🔷 Dependency Graph

```
Phase 1 (Smart Contracts)
─────────────────────────────────────────────────
SimpleOracle → MockPerp · MockPolymarket · MockLPV3
                   ↓              ↓              ↓
              CopyTrading ←────────┼──────────────
                   ↓               │
              FeeManager           │
                   │               │
                   ▼               ▼
              Phase 2 (Backend) ──► Phase 3 (Mock Engine)
                                        │
                                        ▼
                                   Phase 4 (Frontend)
                                        │
                                   ┌────┴────┐
                                   ▼         ▼
                              Phase 5     Phase 6
                              (AI GW)     (Backtest +
                                           Self-Hosted)
```

---

## 🔷 Quick Win Priority

| Priority | Phase | Module | Why |
|----------|-------|--------|-----|
| 🥇 P0 | 1.1 | **SimpleOracle.sol** | Foundation — semua mock venue butuh price |
| 🥇 P0 | 1.2–1.4 | **Mock Venues (3)** | Agent bisa "trade" on-chain |
| 🥇 P0 | 1.5–1.6 | **CopyTrading + FeeManager** | Core + RFB 06 |
| 🥇 P0 | 1.8 | **Deploy to Arc** | Bukti on-chain activity |
| 🥇 P0 | 2.2 | **Agent Service API** | Backend core |
| 🥇 P0 | 3.3 | **Agent Scheduler** | Agent auto-trade → feed terisi |
| 🥇 P0 | 4.3 | **Launch Wizard** | User launch agent beneran |
| 🥇 P0 | 4.6 | **Feed real data** | Traction signal + Arcscan links |
| 🥈 P1 | 2.4 | **Wallet Service** | Circle Agent Wallet |
| 🥈 P1 | 2.7 | **Copy Trade API** | RFB 06 |
| 🥈 P1 | 5.7 | **Agent Decision Loop** | Agentic sophistication |
| 🥉 P2 | 5.1–5.6 | **AI Model Providers** | Real AI |
| 🥉 P2 | 6.x | **Backtest + Self-Hosted** | Nice to have |

---

## 📁 File Structure (Target)

```
trivo/
├── trivo-contracts/           # Foundry
│   ├── src/
│   │   ├── CopyTrading.sol
│   │   ├── FeeManager.sol
│   │   ├── SimpleOracle.sol        # 🆕 price feed
│   │   ├── MockPerp.sol            # 🆕 perpetual mock
│   │   ├── MockPolymarket.sol      # 🆕 prediction mock
│   │   ├── MockLPV3.sol            # 🆕 LP mock
│   │   └── interfaces/
│   ├── test/
│   │   ├── CopyTrading.t.sol
│   │   ├── FeeManager.t.sol
│   │   ├── SimpleOracle.t.sol      # 🆕
│   │   ├── MockPerp.t.sol          # 🆕
│   │   ├── MockPolymarket.t.sol    # 🆕
│   │   └── MockLPV3.t.sol          # 🆕
│   ├── script/
│   │   └── Deploy.s.sol
│   └── foundry.toml
│
├── trivo-backend/             # Hono API
│   └── src/
│       ├── index.ts
│       ├── lib/
│       │   ├── db.ts
│       │   └── schema.ts
│       ├── routes/
│       │   ├── agents.ts
│       │   ├── auth.ts
│       │   ├── positions.ts
│       │   ├── feed.ts
│       │   ├── copy.ts
│       │   ├── wallets.ts
│       │   ├── models.ts
│       │   ├── backtest.ts
│       │   └── skills.ts
│       ├── services/
│       │   ├── agent.service.ts
│       │   ├── auth.service.ts
│       │   ├── position.service.ts
│       │   ├── feed.service.ts
│       │   ├── copy.service.ts
│       │   ├── wallet.service.ts
│       │   ├── strategy.service.ts
│       │   ├── agent-engine.ts
│       │   ├── backtest.service.ts
│       │   ├── mock/
│       │   │   ├── market-data.ts
│       │   │   ├── contract-connector.ts    # 🆕 viem ke Arc
│       │   │   ├── agent-scheduler.ts
│       │   │   ├── pnl.ts
│       │   │   └── sync-service.ts          # 🆕 sync on-chain → DB
│       │   └── models/
│       │       ├── provider.ts
│       │       ├── deepseek.ts
│       │       ├── claude.ts
│       │       ├── openai.ts
│       │       ├── qwen.ts
│       │       └── byok.ts
│       └── types/
│           └── index.ts
│
└── trivo-frontend/           # TanStack Start
    └── src/
        ├── lib/
        │   ├── api.ts
        │   └── wallet.ts
        ├── hooks/
        │   └── useWallet.ts
        ├── routes/
        │   ├── index.tsx
        │   ├── launch.tsx
        │   ├── agent.$id.tsx
        │   ├── agent.$id.settings.tsx
        │   ├── wallet.tsx
        │   ├── backtest.tsx
        │   └── skills.tsx
        └── components/
            └── ...
```
