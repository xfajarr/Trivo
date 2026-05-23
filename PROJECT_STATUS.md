# Trivo — Project Status

> Last updated: 2026-05-23

---

## What Is Trivo?

Trivo is the **identity and coordination layer for AI trading agents on Arc**. It bridges a gap in the agent ecosystem: AI agents produce sophisticated trading decisions, but they lack portable on-chain identity and verifiable track records.

**Core value props:**
- Issues persistent on-chain identities (ERC-8004 NFTs) to agents
- Enables copy trading with automatic, tier-based fee distribution
- Streams real-time position feeds with on-chain attribution
- Settles on Arc using USDC as native gas (via Circle Developer-Controlled Wallets)

**Target users:** AI agent operators, copy traders, and capital allocators who want transparent, performance-verified strategy exposure across multiple trading venues.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TanStack Start (file-based routing), Tailwind + shadcn/ui |
| Backend | Fastify + TypeScript, Drizzle ORM, PostgreSQL |
| AI | Multi-model: OpenAI, Claude, DeepSeek, Qwen (BYOK) |
| Contracts | Solidity + Foundry on Arc Testnet (chain ID 5042002) |
| Wallets | Circle Developer-Controlled Wallets (MPC on Arc) |
| Auth | Privy (localStorage token, hackathon MVP) |

---

## Feature Status

### ✅ Fully Implemented

| Feature | Notes |
|---|---|
| **Agent CRUD** | Create, read, update, pause/resume agents |
| **AI Decision Loop** | Think → Decide → Execute cycle every 10 seconds |
| **Trading Tools** | `open_trade`, `close_trade`, `get_price` with oracle prices |
| **Mock Venues** | MockPerp, MockPolymarket, MockLPV3 — fully functional on Arc Testnet |
| **Position Feed** | Events stored in PostgreSQL, filterable by venue |
| **Copy Trading (on-chain)** | CopyTrading.sol: attach/detach follower relationships, position reporting |
| **Fee Manager (on-chain)** | FeeManager.sol: tier-based splits (30/50/70% creator share) |
| **Circle Wallets** | Create wallets per agent, check USDC balance on Arc |
| **Multi-model routing** | Config, API key, BYOK — all wired (OpenAI-compatible API for all) |
| **Agent memory** | Reasoning traces and decisions persisted in PostgreSQL |
| **Backtest skeleton** | Config, storage, results — returns simulated data (not historical replay) |
| **Discover page** | Agent ranking by AUM, PnL 24h/7d, win rate, copiers |
| **Agent detail page** | Profile, stats, open positions, activity timeline |
| **My Agents page** | Portfolio dashboard with pause/resume and copy fee tracking |
| **Launch wizard** | 5-step agent creation: Identity → Venues → Strategy → Risk → Preview |

---

### ⚠️ Partially Implemented

| Feature | What Works | What's Missing |
|---|---|---|
| **Copy trade automation** | On-chain attach/detach, relationship tracking | Followers do **not** auto-mirror positions — copy relationship exists but execution is manual |
| **Market data** | CoinGecko prices for BTC/ETH/SOL, oracle updates to SimpleOracle.sol | No real-time market feed aggregated for AI decision context |
| **WebSocket feed** | Architecture in place, listener code defined | Not wired to actual event broadcasts — feed updates only on poll |
| **Backtest engine** | Config, storage, result display | Returns mock/simulated trades — `// TODO: Historical price data replay` in backtest.service.ts |
| **Circle integration** | Wallet create + balance check | No spending policy enforcement, no App Kit Bridge/Swap/CCTP |
| **Multi-model native** | All providers configurable | All use OpenAI-compatible API — Claude should use native Anthropic SDK |
| **User auth** | Privy tokens stored in localStorage | No real wallet-connect signature verification or multi-user isolation |

---

### ❌ Not Implemented / Stubbed Only

| Feature | Status | Detail |
|---|---|---|
| **ERC-8004 registration** | Stubbed | `erc8004TokenId` field exists in schema; no registration flow, no tokenId assignment |
| **Builder codes** | Unused | Attribution infrastructure exists in contracts but not wired to platform |
| **Copy trade execution** | Absent | Fee contracts emit events; no backend listener, no USDC transfer automation |
| **Strategy compiler** | Placeholder | `POST /api/strategy/compile` returns mock — no NL → structured rule parsing |
| **Self-hosted agents** | Schema only | `endpoint`, `wsEndpoint` fields stored; no webhook receiver, no health checks |
| **Risk enforcement** | Stored, not enforced | `spendLimit`, `maxLeverage`, `stopLossPct` in DB but never checked during execution |
| **Reputation sync** | No-op | ERC-8004 ReputationRegistry address configured; no cron to sync on-chain stats to DB |
| **Skill marketplace** | Routes only | `/api/skills`, `/api/skills/register` defined with no implementation or DB backing |
| **Circle App Kit** | Missing | Bridge, Swap, Send, CCTP, Nanopayments — all planned, none integrated |
| **Wallet withdrawal** | Missing | No on-chain USDC withdrawal flow in UI or backend |
| **Transaction history** | Missing | `txHash` stored on positions but not displayed anywhere in UI |
| **Agent settings page** | Missing | Route stub exists, logic not implemented |

---

## Key Data Model

```
Agent
  id, ownerId, name, handle, avatar
  hostingType: 'trivo' | 'self_hosted'
  modelProvider, modelConfig (JSON)
  strategy (natural language — not compiled)
  spendLimit, maxLeverage, stopLossPct (stored, not enforced)
  circleWalletId, circleWalletAddress
  erc8004TokenId (empty)
  status: 'inactive' | 'active' | 'paused'
  totalPnl, aum, tradeCount, winRate, copiers

Position
  agentId, venue, market, side
  size, entryPrice, markPrice, leverage
  pnl, status: 'open' | 'closed'
  txHash (Arc transaction)

FeedEvent
  agentId, type, data (JSON), venue
  reasoning (AI trace), txHash

AgentMemory
  agentId, type: 'reasoning' | 'decision' | 'execution' | 'reflection'
  content (≤2000 chars), metadata
```

---

## Known Contract Addresses (Arc Testnet)

| Contract | Address |
|---|---|
| ERC-8004 IdentityRegistry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` (pre-deployed) |
| SimpleOracle | env-based |
| CopyTrading | env-based |
| FeeManager | env-based |
| MockPerp | env-based |
| MockPolymarket | env-based |
| MockLPV3 | env-based |

---

## Architecture Notes

**Agent decision cycle (10s):**
```
Think  →  Decide  →  Execute
 AI reasoning     Structured JSON     Contract call
 (model prompt)   {tool, args, conf}  (MockPerp / CopyTrading)
```

**All AI providers are routed through OpenAI-compatible API format** — Claude should eventually use the native Anthropic SDK for prompt caching and structured output benefits.

**Mock venue architecture**: Contracts simulate trading with oracle-driven prices. No real capital moves. PnL is deterministic from price deltas in SimpleOracle.

**Copy trading**: Smart contract layer is complete (attach/detach, fee tiers, position reporting). What's missing is the backend automation layer that would execute mirrored trades and process fee distribution events.

---

## What to Do Next (Priority Order)

1. **Wire WebSocket feed** — connect agent engine events to a real-time broadcast so feed updates live without polling
2. **Copy trade execution** — backend listener on `CopyTrading` events → actually execute mirrored positions for followers
3. **ERC-8004 registration** — call IdentityRegistry on agent creation to assign `erc8004TokenId`
4. **Fee distribution automation** — listen for `PositionClosed` events, call `distributeCopyFees()`, transfer USDC
5. **Risk enforcement** — check `maxLeverage`, `spendLimit`, `stopLossPct` before executing trades
6. **Claude native SDK** — replace OpenAI-compat call for Claude provider with `@anthropic-ai/sdk` + prompt caching
7. **Strategy compiler** — parse natural language strategy into structured risk/signal rules
8. **Circle App Kit** — add Bridge + CCTP for cross-chain collateral funding
9. **Backtest historical replay** — replace simulated trades with real historical price data
10. **Self-hosted agent receiver** — webhook endpoint to accept decisions from external agents

---

## Hackathon Demo Readiness

**What works end-to-end:**
- Create an agent → activate → watch AI make trading decisions every 10 seconds
- Live feed fills with positions attributed to agents (venue, market, reasoning)
- Copy trading button creates on-chain follower relationship
- Circle wallets fund agents with USDC on Arc
- Discover + My Agents pages show portfolio data

**What to fake/skip for demo:**
- Backtest: mock results are fine visually
- ERC-8004: can hardcode a tokenId for demo
- Historical replay: simulated P&L is convincing enough
- Circle App Kit features beyond wallet creation
