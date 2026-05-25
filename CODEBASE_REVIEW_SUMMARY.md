# Trivo Codebase Review Summary

_Last reviewed: 2026-05-24_

## TL;DR

Trivo is an AI trading-agent platform for the Agora Agents Hackathon. The repo is split into:

- `trivo-contracts/` — Foundry Solidity contracts deployed to Arc Testnet.
- `trivo-backend/` — Hono + TypeScript API, trading engine, DB, Circle wallet, Arc/viem, AI providers, realtime price feed.
- `trivo-frontend/` — TanStack Start + React 19 app with Privy auth, API-backed app pages, charts, wallet UI, and agent launch/discovery flows.

The product is mostly demo-complete for: launching agents, showing agents/feed/positions, running AI trading loops, mock on-chain execution, ERC-8004 identity registration, and Arc/Circle integrations. Main remaining work is around real money movement, production-grade copy trading, OpenAPI/docs freshness, WebSocket client delivery, and replacing remaining simulated/mock UX paths.

---

## Product I Learned

Trivo is the identity and execution layer for AI trading agents on Arc. A user can launch a programmable trading agent, choose AI model/strategy/skills, get an on-chain identity, attach a Circle wallet, and participate in a social/copy-trading feed. Trading uses real market data where possible, but venue execution is mock/simulated on Arc contracts.

Core narrative:

1. User connects wallet with Privy.
2. User launches an agent from the frontend wizard.
3. Backend creates the agent DB record, bootstraps memory/session, attempts ERC-8004 registration, and attempts Circle wallet creation.
4. Engine loops through active agents, builds context, asks AI/heuristics for decisions, enforces risk gates/circuit breakers, opens/closes positions through tool abstractions, writes feed/memory/position data, and records PnL.
5. Frontend shows live feed, discover table, agent detail, charts, wallet card, and portfolio PnL.

---

## Repo Structure

```txt
trivo/
├── trivo-frontend/      # TanStack Start React app
├── trivo-backend/       # Hono TypeScript API + agent engine
├── trivo-contracts/     # Foundry Solidity contracts
├── docs/                # roadmap/plans
├── AGENTS.md            # project context for agents
├── PRD.md               # product requirements
└── PROJECT_STATUS.md    # existing status doc
```

---

# Frontend: `trivo-frontend/`

## Stack

- TanStack Start / TanStack Router
- React 19 + TypeScript
- Tailwind CSS v4 + shadcn/Radix components
- TanStack Query
- Privy React Auth
- Axios API client
- Framer Motion
- `lightweight-charts` v5
- viem/wagmi dependencies available

Scripts in `package.json`:

- `dev`
- `build`
- `build:dev`
- `preview`
- `lint`
- `format`

Notably missing: dedicated `test` and `typecheck` scripts.

## Main App Routes

- `/` — landing page. Polished marketing page, but still mostly static/hardcoded.
- `/feed` — live activity feed using real API hooks.
- `/discover` — agent discovery table using real agents + PnL hooks.
- `/launch` — multi-step launch wizard using `useCreateAgent()`.
- `/my-agents` — portfolio dashboard using agents + PnL + status mutation.
- `/agent/$id` — agent detail with positions, history, chart, wallet card, and Train chat.

## Key Frontend Features Done

- Global app shell with nav, mobile bottom nav, route transitions, toaster.
- Privy auth provider wired to backend verify endpoint.
- Arc Testnet chain config present.
- API-backed hooks for:
  - agents
  - feed
  - positions
  - wallets
  - memory/traces
  - PnL
- Launch wizard posts to backend and creates agents.
- Discover/feed/my-agents/agent-detail pages mostly use real backend data.
- Agent detail has:
  - chart component
  - open positions
  - trade history
  - Train chat tab
  - wallet card
- Shared PnL hook polls every 10s.
- Feed and positions polling are implemented.

## Frontend Still Mocked / Incomplete

- Landing page still uses hardcoded `AGENTS`, `STATS`, feature copy, and fake links like `/agent/1`.
- `src/lib/mock-data.ts` remains and is still imported by older components.
- Copy-trade UI mostly shows local toasts/state; it does not appear to call `copyApi.attach/detach` from active flows.
- Wallet fund/transfer UI is mostly simulated toast behavior, not actual Circle/on-chain transfer.
- `CreateAgentModal` advertises self-hosted agents, but both choices route to `/launch`; real self-hosted flow is not implemented.
- Strategy compile/train and backtest API wrappers exist but no visible full page flow consumes them.
- `useWebSocket()` exists but appears unused by pages/components.
- Agent chart generates simulated OHLC candles around trade/price data, so it is visually useful but not authoritative historical market data.

## Frontend Risks / Notes

- Hardcoded Arc RPC URL/key is bundled in frontend chain config.
- Auth token is stored in `localStorage`; acceptable for hackathon velocity, but XSS-sensitive.
- Some fetches use relative `/api/...` while the Axios client uses `VITE_API_URL`; deployment with split domains may break if not standardized.
- Frontend calls newer backend routes like `/api/pnl`, `/api/chat`, `/api/positions/history`, `/api/wallets/usdc`, which must stay aligned with backend/OpenAPI.

---

# Backend: `trivo-backend/`

## Stack

- Hono + `@hono/node-server`
- TypeScript ESM
- Drizzle ORM + Postgres
- Privy server auth
- Circle Developer-Controlled Wallets SDK
- viem for Arc Testnet contract reads/writes
- OpenAI-compatible SDK
- `ws` for outbound realtime price feeds
- zod validation
- Vitest tests
- Scalar OpenAPI UI

Scripts in `package.json`:

- `dev`
- `build`
- `start`
- `typecheck`
- `test`
- `test:watch`
- `lint`
- `lint:fix`
- `format`
- `check`

## Backend API Surface

Mounted route groups include:

- Health: `/`, `/health`
- Auth: `/api/auth/verify`, `/api/auth/me`
- Agents: `/api/agents`, `/api/agents/:id`, update/status
- Feed: `/api/feed`
- Positions: `/api/positions`, `/api/positions/history/:agentId`
- PnL: `/api/pnl/agents/:id`
- Copy: attach/detach/relations
- Wallets: create, balance, deposit, withdraw stub, public USDC balance
- Memory: agent/user memory
- Thinking traces
- Strategy compile/train
- Model config
- Backtest
- Chat: general and per-agent chat
- Docs: `/api/docs`, `/api/docs.json`

## DB Model

Drizzle schema defines 10 tables:

- `users`
- `agents`
- `agent_sessions`
- `agent_memory`
- `user_memory`
- `positions`
- `copy_relations`
- `feed_events`
- `skills`
- `agent_tools`

Supports:

- agent identity fields (`erc8004TokenId`, tx hash, metadata URI)
- Circle wallet id/address
- model config and skills
- memory/session data
- positions and feed
- copy relations

## Engine / Services Learned

There are two engine generations:

1. New engine under `src/engine/`:
   - `AgentEngine`
   - `AgentRunner`
   - Thinking engine
   - ReAct/provider abstraction
   - risk gates
   - circuit breaker
   - tools (`get_price`, `open_trade`, `close_trade`, sentiment, TA)
   - semantic memory/distillation
   - ERC-8004 service

2. Older service engine under `src/services/agent-engine-v2.ts` and `src/services/tools/*`:
   - appears legacy/unused from `index.ts`
   - creates drift risk because two similar stacks coexist

Startup currently:

- starts cron jobs
- starts realtime price feed
- starts new agent engine after delay

Cron jobs:

- market data every 60s
- PnL watcher every 60s
- old agent-processing job disabled

## Backend Features Done

- Hono API skeleton with most product endpoints.
- Privy auth middleware and backend user upsert.
- Agent create/list/get/update/status.
- Agent creation bootstraps session and memory.
- Agent creation attempts ERC-8004 identity registration.
- Circle wallet service exists and can create Arc Testnet SCA wallets.
- Contract service integrates Arc Testnet via viem.
- Oracle, mock perp, mock polymarket, mock LP, copy trading ABI calls exist.
- Realtime outbound WebSocket price feed caches live prices/market data.
- AI trading engine with risk checks, position caps, and tool execution.
- PnL watcher closes positions after price movement threshold.
- Feed events and position records are persisted.
- Per-agent chat/training route exists.
- Tests exist and reportedly cover config/contracts/tools/types/flow/decision/e2e/comprehensive cases.

## Backend Incomplete / Stubbed

- Backtest service is simulated; historical replay is TODO-level.
- Strategy compile/train is heuristic/stubbed and does not fully persist trained strategies.
- Wallet withdraw endpoint is a stub response, not real transfer.
- FeeManager integration is mocked/stubbed in backend contract service.
- Internal client WebSocket broadcast service exists, but I did not find HTTP upgrade/server wiring to connect frontend clients to `subscribeAgent()`.
- OpenAPI spec is stale/incomplete versus actual routes.
- Many route filters load rows then filter in memory, not DB-level queries.
- Thinking traces are in-memory only.

## Backend Important Bug Found

In `src/routes/agents.ts`, Circle wallet creation is currently inside the ERC-8004 `catch` block.

That means:

- If ERC-8004 registration succeeds, wallet creation is skipped.
- If ERC-8004 registration fails, wallet creation is attempted.

This contradicts the intended behavior that every agent should get a Circle wallet. Wallet creation should run independently after the ERC-8004 try/catch.

## Backend Risks / Notes

- `.env` exists locally; make sure secrets are not committed.
- `erc8004Service` singleton requires deployer private key at import time, making optional private key effectively required in some flows.
- `PUT /api/agents/:id` spreads arbitrary request body into DB update; needs stricter validation.
- Multiple failures are swallowed and replaced with mock tx hashes / fallbacks. Good for demos, risky for production observability.
- DB schema uses many `text` fields for numeric/boolean/domain values; acceptable for hackathon, weak for correctness.
- No obvious DB indexes/foreign keys in schema.

---

# Contracts: `trivo-contracts/`

## Stack

- Foundry
- Solidity `0.8.28`
- EVM `cancun`
- Arc Testnet RPC + Arcscan verifier configured
- OpenZeppelin and forge-std remappings

Makefile supports:

- build
- test
- gas test
- deploy to Arc
- verify on Arc

## Contract Inventory

### `SimpleOracle.sol`

Owner-updated oracle for:

- `BTC/USD`
- `ETH/USD`
- `SOL/USD`

Features:

- update price
- read price
- read multiple prices
- stale price protection via max staleness
- owner transfer

### `MockPerp.sol`

Mock perpetual futures venue.

Features:

- open long/short
- close position
- add margin
- calculates PnL from oracle entry/exit price
- max leverage guard
- user position tracking

### `MockPolymarket.sol`

Mock prediction market.

Features:

- backend creates market
- users buy YES/NO outcome
- backend resolves market
- users claim payouts

### `MockLPV3.sol`

Mock concentrated liquidity venue.

Features:

- create pool
- add liquidity
- remove liquidity
- simulate fee accrual
- collect proportional fees

### `CopyTrading.sol`

Copy trading primitive.

Features:

- register agents
- attach/detach followers
- report agent positions
- close reported positions
- calculate fee split for profitable copied positions

### `FeeManager.sol`

Fee accounting contract.

Features:

- creator/platform fee accounting
- creator withdrawal
- platform withdrawal
- fee tiers:
  - Basic: 30/70
  - Standard: 50/50
  - Premium: 70/30

## Contract Tests

Test suite has 89 tests across:

- `SimpleOracle.t.sol`
- `MockPerp.t.sol`
- `MockPolymarket.t.sol`
- `MockLPV3.t.sol`
- `CopyTrading.t.sol`
- `FeeManager.t.sol`
- `Integration.t.sol`

Covered flows include oracle reads/staleness, perp PnL, prediction market buy/resolve/claim, LP fees, copy/follower lifecycle, fee tiers, and integration scenarios.

## Deployed Arc Testnet Contracts

- SimpleOracle: `0xd5c246c8d79f77b1bd2d5f6c61f48be38027f1c1`
- MockPerp: `0x5dcca68b31da8bc22047371b446dcd3a926d12c8`
- MockPolymarket: `0x066fcba3058343e2e474783157e1189fa231ac10`
- MockLPV3: `0x77492a3c212772c3cc7048d0c0a33dc4e9e0fc38`
- CopyTrading: `0x42a281eac445d2b01fee4137d81d98d31deaed77`
- FeeManager: `0x226b5aa0e730504b956cdde107c15b9bcaa32415`

Deploy script links:

- each mock venue to CopyTrading
- CopyTrading to FeeManager

## Contract Features Done

- Six core contracts implemented.
- Deployment script exists.
- Arc Testnet config exists.
- Tests cover all main contract flows.
- Custom errors used broadly instead of `require`.
- Mock venue execution supports the demo story.
- Copy-trading and fee-accounting primitives exist.

## Contract Incomplete / Gaps

- No actual ERC20/USDC custody or transfer settlement; values are internal mock accounting.
- `CopyTrading.distributeCopyFees` calculates/emits shares but does not transfer funds or call `FeeManager.depositFee`.
- Venue contracts store `copyTrading` address but do not automatically report positions to CopyTrading.
- `MockPolymarket.MIN_RESOLVE_WINDOW` exists but is not enforced during resolution.
- README is still generic Foundry boilerplate/stale.
- Stale artifacts appear to exist for `AgentIdentity.sol` without matching source.

## Contract Risks / Notes

- Anyone can attach/detach copy relations for any follower address because `attachFollower`/`detachFollower` accept follower param and do not require `msg.sender == follower`.
- `CopyTrading.registerAgent` lacks duplicate and zero-address checks.
- `CopyTrading.setFeeConfig` lacks sanity bounds.
- `FeeManager.depositFee` is permissionless and not backed by token transfer in current mock design.
- Some ownership/backend transfer functions lack zero-address checks.
- `MockPolymarket.buyOutcome` overwrites prior user position for same market instead of accumulating.

---

# Feature Completion Matrix

| Area | Status | Notes |
|---|---:|---|
| Smart contracts | Mostly done | Mock contracts deployed/tested; real USDC settlement not built |
| Arc Testnet integration | Done for demo | viem + deployed contract addresses wired |
| ERC-8004 identity | Mostly done | Backend registers to official Arc registries; should improve error/config handling |
| Circle wallet creation | Partially done | Service exists, but agent route bug makes creation conditional on ERC-8004 failure |
| Privy auth | Mostly done | FE/BE wired; token storage should be hardened later |
| Agent launch | Mostly done | Wizard + backend create works; self-hosted is not really implemented |
| AI engine | Mostly done | New ReAct/risk-gated loop exists; old engine drift remains |
| Market data | Partially done | CoinGecko + realtime WS cache; historical candles still simulated |
| PnL | Mostly done | Real-ish PnL from current/oracle prices; accounting still mock execution |
| Feed | Mostly done | API-backed; copy interactions not fully wired |
| Discover | Mostly done | API-backed table and filters |
| My Agents | Partially done | API-backed; needs stricter user filtering/ownership UX |
| Agent detail | Mostly done | Data, chart, positions/history/chat/wallet; chart candles simulated |
| Copy trading | Partially done | Contracts/API exist, UI not fully wired, no real settlement |
| Wallet funding/withdraw | Not done | UI/stub only for actual money movement |
| Backtesting | Stubbed | Simulated service, no historical replay |
| Strategy training | Stubbed | Heuristic compile/train, limited persistence |
| OpenAPI/docs | Partially done | Docs route exists, spec stale/incomplete |
| Tests | Good coverage for hackathon | 89 contract tests + backend tests; frontend lacks test script |

---

# Highest Priority Fixes Before Demo

1. **Fix agent wallet creation bug**  
   Move Circle wallet creation outside the ERC-8004 catch block so every created agent attempts wallet creation.

2. **Wire copy trading buttons to real API**  
   Feed/agent copy actions should call `copyApi.attach/detach`, not just local toasts.

3. **Replace landing fake links/stats**  
   Landing page should either use real agents/stats or avoid fake `/agent/1` links.

4. **Clarify wallet funding state**  
   If real funding is not ready, label it clearly as deposit instructions / demo mode. If ready, wire actual Circle transfer/deposit flow.

5. **Fix OpenAPI docs drift**  
   Add newer routes: chat, PnL, positions history, wallet USDC, model routes.

6. **Clean engine duplication**  
   Mark old `agent-engine-v2` and `services/tools/*` as legacy or remove after verifying no consumers.

7. **Run full verification**  
   - backend: `pnpm run check`
   - contracts: `forge test`
   - frontend: `bun run build` and `bun run lint`

---

# What Is Actually Demo-Ready

Demo-ready paths:

- Landing/navigation polish
- Connect wallet via Privy
- Launch Trivo-hosted agent
- Agent appears in Discover/My Agents
- Backend agent engine can run active agents
- Feed can show activity
- Agent detail can show chart, positions/history, wallet, training chat
- Arc contracts exist and are deployed
- ERC-8004 identity registration path exists
- Mock trading/copy/fee primitives are deployed and tested

Not fully demo-ready unless fixed/labeled:

- Real wallet funding/withdrawal
- Self-hosted agent launch
- Copy trade button real execution
- Real chart historical candles
- Backtest lab
- Fully accurate API docs

---

# Final Assessment

This is a strong hackathon-grade full-stack demo: the architecture is broad, the UI is polished, contracts are deployed/tested, and backend has real agent/market/Arc/Circle primitives. The main issue is not lack of features; it is consistency and truthfulness between UI promises and backend/contract reality.

For judging, emphasize:

- Arc Testnet deployment
- ERC-8004 identity
- Circle wallet integration intent/service
- AI agent reasoning/risk engine
- social/copy trading primitive
- realtime market-informed execution

For engineering cleanup, prioritize the wallet-creation bug, copy API wiring, stale docs, and removing/marking legacy engine paths.
