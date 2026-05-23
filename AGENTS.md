# Trivo — AI Trading Agent Platform

> **Hackathon:** Agora Agents Hackathon — Canteen × Circle × Arc  
> **Deadline:** May 25, 2026  
> **Chain:** Arc Testnet (Chain ID: 5042002)  
> **Repo:** `/Users/xfajarr/Hackathon/trivo/`

---

## 🎯 Product Overview

Trivo is the **Identity Layer for AI Trading Agents on Arc**. A platform where users launch programmable AI agents with persistent on-chain identity (ERC-8004), configure trading skills and AI models, and participate in a copy trading network — all settled on Arc with USDC.

**One-liner:** *Launch your own AI trading agent in minutes, fund it with USDC, and automatically copy the best traders on the platform — no coding required.*

### Key Differentiators
- Agent identity via ERC-8004 (on-chain NFT + builder code)
- Circle Dev-Controlled Wallets (user-custody MPC + spending policies)
- Multi-model AI (DeepSeek, Claude, OpenAI, Qwen, BYOK)
- Copy trading with on-chain attribution and fee distribution
- Real market data (CoinGecko) → Mock execution on Arc → On-chain PnL

---

## 📁 Project Structure

```
trivo/
├── trivo-contracts/          # Foundry (Solidity)
│   ├── src/
│   │   ├── SimpleOracle.sol      # Price feed (BTC/ETH/SOL)
│   │   ├── MockPerp.sol          # Perpetual futures mock
│   │   ├── MockPolymarket.sol    # Prediction market mock
│   │   ├── MockLPV3.sol          # Concentrated LP mock
│   │   ├── CopyTrading.sol       # Copy trading primitive
│   │   ├── FeeManager.sol        # Fee distribution
│   │   └── interfaces/           # All contract interfaces
│   ├── test/                     # 89 Foundry tests
│   └── script/Deploy.s.sol       # Deploy script
│
├── trivo-backend/            # Hono + TypeScript API
│   └── src/
│       ├── index.ts              # Entry point (32 routes)
│       ├── config.ts             # Environment validation (zod)
│       ├── lib/
│       │   ├── db.ts             # Drizzle ORM client
│       │   ├── schema.ts         # 10 PostgreSQL tables
│       │   └── openapi.ts        # OpenAPI 3.1 spec
│       ├── routes/               # 14 route files
│       │   ├── auth.ts           # Privy wallet auth
│       │   ├── agents.ts         # Agent CRUD
│       │   ├── feed.ts           # Activity feed
│       │   ├── positions.ts      # Trading positions
│       │   ├── copy.ts           # Copy trading
│       │   ├── wallets.ts        # Circle wallet
│       │   ├── memory.ts         # Agent/user memory
│       │   ├── strategy.ts       # NL strategy compiler
│       │   ├── models.ts         # AI model config
│       │   ├── backtest.ts       # Backtest engine
│       │   ├── thinking.ts       # Thinking traces
│       │   └── health.ts         # Health check
│       ├── services/             # 12 service files
│       │   ├── cron.ts           # Cron scheduler (3 jobs)
│       │   ├── agent-engine-v2.ts # AI agent loop (10s)
│       │   ├── contract.service.ts # viem → Arc
│       │   ├── market-data.service.ts # CoinGecko + Polymarket
│       │   ├── wallet.service.ts # Circle SDK
│       │   ├── backtest.service.ts # Historical sim
│       │   ├── thinking.service.ts # Reasoning traces
│       │   ├── ws.ts             # WebSocket server
│       │   ├── decision-engine.service.ts # Rule-based fallback
│       │   ├── models/           # AI providers
│       │   │   ├── provider.ts       # getEffectiveConfig()
│       │   │   ├── openai-provider.ts # OpenAI-compatible
│       │   │   └── byok-provider.ts  # Bring your own key
│       │   └── tools/            # Tool system
│       │       ├── registry.ts       # Tool registry
│       │       ├── get-price.tool.ts # get_price
│       │       ├── open-trade.tool.ts # open_trade
│       │       └── close-trade.tool.ts # close_trade
│       ├── middleware/auth.ts    # Privy token verification
│       └── types/index.ts       # Shared TypeScript types
│
├── trivo-frontend/           # TanStack Start + React 19
│   └── src/
│       ├── lib/
│       │   ├── api.ts           # Axios client
│       │   ├── types.ts         # FE types
│       │   ├── constants.ts     # Venues, labels
│       │   └── utils.ts         # cn, fmtUSD, fmtPct
│       ├── hooks/               # 7 custom hooks
│       │   ├── useAuth.ts       # Auth context
│       │   ├── useAgents.ts     # TanStack Query
│       │   ├── useFeed.ts       # Feed with filter
│       │   ├── usePositions.ts  # Open positions
│       │   ├── useWallet.ts     # Balance + create
│       │   ├── useMemory.ts     # Memory + traces
│       │   └── useWebSocket.ts  # Real-time events
│       ├── providers/
│       │   └── AuthProvider.tsx # Auth context provider
│       ├── routes/
│       │   ├── index.tsx        # Landing page (/)
│       │   ├── feed.tsx         # Feed (/feed)
│       │   ├── discover.tsx     # Discover (/discover)
│       │   ├── launch.tsx       # Launch wizard (/launch)
│       │   ├── my-agents.tsx    # My agents (/my-agents)
│       │   └── agent.$id.tsx    # Agent detail (/agent/:id)
│       └── components/          # shadcn/ui components
│
├── docs/
│   ├── implementation-roadmap.md
│   └── plans/
│       ├── phase-1-smart-contracts.md
│       ├── phase-2-backend.md
│       ├── phase-3-mock-engine.md
│       └── phase-5-ai-gateway.md
│
├── PRD.md                      # Product Requirements Document
├── AGENTS.md                   # This file
├── SESSION_SUMMARY.md          # Session summary
└── SESSION_SUMMARY.html        # Visual session summary
```

---

## ✅ Status Summary

| Phase | What | Status | % |
|-------|------|--------|---|
| **1** | Smart Contracts (Foundry) | 6 contracts deployed + verified on Arc | 100% |
| **2** | Backend Core (Hono) | 32 endpoints, 10 DB tables, Circle SDK | 100% |
| **3** | Mock Trading Engine | Market data, scheduler, PnL watcher, tools | 100% |
| **4** | Frontend Integration | Architecture refactored, routes not yet connected | 40% |
| **5** | AI Model Gateway | OpenAI-compatible, agent loop 10s, WS, backtest | 100% |
| **6** | Self-Hosted Agent | Not started | 0% |

### Stats
- **Tests:** 121 (89 contract + 32 backend)
- **ESLint:** 0 errors, 0 warnings
- **Typecheck:** 0 errors
- **API Endpoints:** 32
- **Database Tables:** 10
- **Smart Contracts:** 6
- **Deploy Cost:** ~0.42 USDC

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contracts** | Solidity 0.8.28 + Foundry |
| **Backend** | Hono + TypeScript + tsx |
| **Database** | PostgreSQL + Drizzle ORM |
| **Auth** | Privy (wallet connect) |
| **AI SDK** | OpenAI-compatible (openai npm) |
| **Wallet** | Circle Developer-Controlled Wallets |
| **Chain** | Arc Testnet (viem) |
| **Frontend** | TanStack Start + React 19 |
| **UI** | shadcn/ui + Tailwind CSS v4 |
| **State** | TanStack Query + Axios |
| **WebSocket** | ws + @hono/node-server |

---

## 📜 Smart Contracts (Arc Testnet)

| Contract | Address | Functions | Arcscan |
|----------|---------|-----------|---------|
| **SimpleOracle** | `0xd5c246c8d79f77b1bd2d5f6c61f48be38027f1c1` | updatePrice/getPrice/getMultiplePrices | [🔗](https://testnet.arcscan.app/address/0xd5c246c8d79f77b1bd2d5f6c61f48be38027f1c1) |
| **MockPerp** | `0x5dcca68b31da8bc22047371b446dcd3a926d12c8` | openPosition/closePosition/addMargin | [🔗](https://testnet.arcscan.app/address/0x5dcca68b31da8bc22047371b446dcd3a926d12c8) |
| **MockPolymarket** | `0x066fcba3058343e2e474783157e1189fa231ac10` | createMarket/buyOutcome/resolveMarket/claim | [🔗](https://testnet.arcscan.app/address/0x066fcba3058343e2e474783157e1189fa231ac10) |
| **MockLPV3** | `0x77492a3c212772c3cc7048d0c0a33dc4e9e0fc38` | createPool/addLiquidity/collectFees/simulateFeeAccrual | [🔗](https://testnet.arcscan.app/address/0x77492a3c212772c3cc7048d0c0a33dc4e9e0fc38) |
| **CopyTrading** | `0x42a281eac445d2b01fee4137d81d98d31deaed77` | registerAgent/reportPosition/closePosition/attachFollower/detachFollower/distributeCopyFees | [🔗](https://testnet.arcscan.app/address/0x42a281eac445d2b01fee4137d81d98d31deaed77) |
| **FeeManager** | `0x226b5aa0e730504b956cdde107c15b9bcaa32415` | depositFee/withdrawCreatorFees/withdrawPlatformFees/setFeeTier | [🔗](https://testnet.arcscan.app/address/0x226b5aa0e730504b956cdde107c15b9bcaa32415) |

### Contract Architecture
```
SimpleOracle ← CoinGecko (price feed)
  ├── MockPerp (perpetuals)
  ├── MockPolymarket (prediction)
  └── MockLPV3 (LP)
        │
        ▼
  CopyTrading (position + copy)
        │
        ▼
  FeeManager (fee distribution)
```

### Security Patterns
- **No `require`** — all contracts use custom errors
- **Access control** — `reportPosition()` only by agent address, `closePosition()` only by position opener
- **Agent owners** — tracked via `agentOwners` + `agentCreators` mappings
- **Fee withdrawal** — only agent creator can withdraw their fees

---

## ⚙️ Backend Architecture

### Cron Jobs

| Job | Interval | Description |
|-----|----------|-------------|
| **market-data** | 60s | CoinGecko → SimpleOracle + Polymarket market creation + LP fee accrual |
| **agent-processing** | 30s | Process active agents (rule-based fallback) |
| **pnl-watcher** | 60s | Close positions when price moves >2% |
| **agent-engine-v2** | 10s | AI agent loop: THINK → DECIDE → EXECUTE |

### Agent Engine v2 (10s loop)
```
1. Load market data (Oracle prices)
2. Load agent memory (last 5 entries)
3. Call LLM.think() → Save reasoning trace → Broadcast WS
4. Call LLM.decide() → Structured JSON decision → Broadcast WS
5. Execute via tool → Save result + txHash → Feed event → Broadcast WS
```

### AI Model Configuration
Priority: Per-agent config > Env vars > Built-in defaults

```env
# Global env vars
AI_PROVIDER=openrouter        # Provider name
AI_BASE_URL=https://openrouter.ai/api/v1  # Any OpenAI-compatible endpoint
AI_MODEL=anthropic/claude-sonnet         # Model name
AI_API_KEY=sk-...                        # API key
OPENAI_API_KEY=sk-...                    # Fallback key
```

### Tool System
3 registered tools with JSON Schema parameter validation:
- `get_price` — Fetch current price from Oracle
- `open_trade` — Open position via venue contract
- `close_trade` — Close position + distribute fees

### Database Tables (10)
`users`, `agents`, `agent_sessions`, `agent_memory`, `user_memory`, `positions`, `copy_relations`, `feed_events`, `skills`, `agent_tools`

---

## 🔌 API Endpoints (32)

### Auth
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/verify` | — |
| GET | `/api/auth/me` | ✅ |

### Agents
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/agents` | — |
| POST | `/api/agents` | ✅ |
| GET | `/api/agents/:id` | — |
| PUT | `/api/agents/:id` | ✅ |
| PATCH | `/api/agents/:id/status` | ✅ |

### Feed, Positions, Copy
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/feed` | — |
| GET | `/api/positions` | — |
| POST | `/api/copy/attach` | ✅ |
| POST | `/api/copy/detach` | — |
| GET | `/api/copy/relations/:id` | — |

### Wallets
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/wallets/create` | ✅ |
| GET | `/api/wallets/:id/balance` | — |
| GET | `/api/wallets/:id/deposit` | — |
| POST | `/api/wallets/withdraw` | ✅ |

### Memory & Thinking
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/agents/:id/memory` | — |
| POST | `/api/agents/:id/memory` | ✅ |
| GET | `/api/agents/:id/traces` | — |
| GET/POST | `/api/user/memory` | ✅ |

### Strategy & Models
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/strategy/compile` | — |
| POST | `/api/strategy/train` | — |
| GET | `/api/models` | — |
| GET | `/api/models/agents/:id` | — |
| PUT | `/api/models/agents/:id` | ✅ |

### Other
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/backtest/run` | Backtest simulation |
| GET | `/api/docs` | Scalar UI docs |
| GET | `/api/docs.json` | OpenAPI spec |
| GET | `/health` | Health check |

---

## 💻 Frontend Architecture

### Hooks (TanStack Query)
| Hook | Query Key | Auto-refetch | Description |
|------|-----------|--------------|-------------|
| `useAuth()` | — | — | Auth context + Privy |
| `useAgents()` | `['agents']` | 30s | Agent list + top performers |
| `useAgent(id)` | `['agent', id]` | — | Single agent detail |
| `useFeed()` | `['feed', filter]` | 15s | Feed events + venue filter |
| `usePositions()` | `['positions']` | 30s | Open positions |
| `useWallet(id)` | `['wallet', id]` | 30s | Balance + create |
| `useAgentMemory(id)` | `['agent-memory', id]` | — | Agent memory |
| `useThinkingTraces(id)` | `['thinking-traces']` | 10s | Real-time reasoning |
| `useWebSocket(id)` | — | instant | WS agent events |

### Routes
- `/` — Landing page (trivo.xyz)
- `/feed` — Live feed (app.trivo.xyz)
- `/discover` — Agent discovery
- `/launch` — Launch wizard
- `/my-agents` — Portfolio dashboard
- `/agent/:id` — Agent detail

### Providers
- `AuthProvider` — Global auth state
- `QueryClientProvider` — TanStack Query

---

## 🔑 Environment Variables

```env
# === Required ===
PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/trivo
PRIVY_APP_ID=xxx
PRIVY_APP_SECRET=xxx

# Arc Chain
ARC_RPC_URL=https://rpc.testnet.arc-node.thecanteenapp.com/v1/<key>
ARC_CHAIN_ID=5042002
DEPLOYER_PRIVATE_KEY=0x...

# Deployed Contracts
SIMPLE_ORACLE=0xd5c246c8d79f77b1bd2d5f6c61f48be38027f1c1
COPY_TRADING=0x42a281eac445d2b01fee4137d81d98d31deaed77
MOCK_PERP=0x5dcca68b31da8bc22047371b446dcd3a926d12c8
MOCK_POLYMARKET=0x066fcba3058343e2e474783157e1189fa231ac10
MOCK_LPV3=0x77492a3c212772c3cc7048d0c0a33dc4e9e0fc38
FEE_MANAGER=0x226b5aa0e730504b956cdde107c15b9bcaa32415

# === Optional ===
CIRCLE_API_KEY=TEST_API_KEY:...
CIRCLE_ENTITY_SECRET=...
AI_PROVIDER=openrouter
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=anthropic/claude-sonnet
AI_API_KEY=sk-...
OPENAI_API_KEY=sk-...
```

---

## 🚀 Quick Start Commands

```bash
# Backend
cd trivo-backend
pnpm install
pnpm run dev            # Start server on :3000

# Frontend
cd trivo-frontend
bun install
bun run dev             # Start dev server on :5173

# Contracts
cd trivo-contracts
forge build             # Compile
forge test              # Run 89 tests
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC --broadcast

# Database
psql -d trivo -c "\dt"  # List tables
psql -d trivo -c "SELECT COUNT(*) FROM feed_events;"
```

---

## 🧪 Test Commands

```bash
# Backend
cd trivo-backend
pnpm run check          # typecheck + lint + test
pnpm run test           # vitest (32 tests)
pnpm run lint           # eslint
pnpm run format         # prettier

# Contracts
cd trivo-contracts
forge test              # 89 tests
forge test --match-contract MockPerpTest -vvv  # Specific test
```

---

## ❌ What's Not Built Yet

### Phase 4: Frontend Integration (HIGH priority)
The frontend routes still use `mock-data.ts`. Need to:
1. Install `@privy-io/react-auth` for wallet connect
2. Create API client calls in all routes
3. Replace `AGENTS`, `POSITIONS` mock data with `useAgents()`, `useFeed()` hooks
4. Create new pages: Agent Settings, Wallet, Backtest Lab

### Phase 6: Self-Hosted Agent (MEDIUM priority)
- Self-hosted agent registration (endpoint + skill.md parsing)
- REST/WS proxy to external agent
- Skill Marketplace

### Polish
- Circle Agent Wallet creation on agent deployment (SDK ready, needs frontend trigger)
- Verify WebSocket connection from frontend
- DB data persistence verification (cron services)

---

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `docs/implementation-roadmap.md` | Full project roadmap |
| `docs/plans/phase-1-smart-contracts.md` | Contract design + tests |
| `docs/plans/phase-2-backend.md` | Backend architecture |
| `docs/plans/phase-3-mock-engine.md` | Mock engine + scheduler |
| `docs/plans/phase-5-ai-gateway.md` | AI model integration |
| `PRD.md` | Product Requirements Document |
| `trivo-current-state.html` | Visual state overview |
| `SESSION_SUMMARY.md` | Session summary |
| `SESSION_SUMMARY.html` | Visual session summary |
| `trivo-feature-map.html` | Feature map visualization |
| `trivo-feature-map.md` | Feature map document |

---

## 👥 Team Notes

- Build for **Agora Agents Hackathon** (Canteen × Circle × Arc)
- Submission deadline: **May 25, 2026**
- Judging criteria: Agentic Sophistication (30%), Traction (30%), Circle/Arc Tooling (20%), Innovation (20%)
- RFB 06 (Social Trading Intelligence) is the primary alignment
- Landing page: trivo.xyz, App: app.trivo.xyz
