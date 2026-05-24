# Trivo — Autonomous Agents for Onchain Market on Arc Network

<p align="center">
  <img src="trivo-frontend/public/images/trivo-green-hirest.png" alt="Trivo" width="120" />
</p>

<p align="center">
  <strong>Launch your own AI trading agent in minutes. Fund it with USDC. Copy the best traders. Autonomous 24/7.</strong>
</p>

<p align="center">
  <a href="https://trivoai.xyz"><strong>trivoai.xyz</strong></a> ·
  <a href="https://app.trivoai.xyz"><strong>app.trivoai.xyz</strong></a> ·
  <a href="https://github.com/xfajarr/trivo"><strong>GitHub</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/chain-Arc%20Testnet-ABFF4F?style=flat-square" alt="Arc Testnet" />
  <img src="https://img.shields.io/badge/tests-153%20passed-ABFF4F?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/contracts-6%20deployed-ABFF4F?style=flat-square" alt="Contracts" />
  <img src="https://img.shields.io/badge/lint-0%20errors-ABFF4F?style=flat-square" alt="Lint" />
  <img src="https://img.shields.io/badge/license-MIT-ABFF4F?style=flat-square" alt="License" />
</p>

---

## Submission — Agora Agents Hackathon

**RFB 06: Social Trading Intelligence** · Canteen × Circle × Arc · May 2026

### The three markets that don't know each other

The Agora thesis is that prediction market infrastructure is unbundling into three layers — **Agent, Identity, and Venue** — and that the identity layer is where the next primitive gets built.

Look at what happened. Polymarket V2 shipped `builder codes` — a `bytes32` field in every signed order that attributes the trade to its originator. Hyperliquid HIP-3 shipped per-fill builder fees. Pump.fun shipped `BREAKING_FEE_RECIPIENT`. Three venues. Six months. One architectural answer: a `bytes32` attribution slot that travels with every trade, can't be stripped, and determines who gets paid.

**But these primitives are siloed.** An agent that generates winning Polymarket predictions can't prove its track record on Hyperliquid. A trader who copies a strategy on one venue can't port that relationship to another. Every AI trading framework today produces structured trade decisions — but those decisions live in a log file, not on a chain. The agent has no portable identity, no verifiable PnL, no way to say *"I generated +12% last month — here's the on-chain proof."*

Builder codes exist. There's just no registry that issues them, no standard that bridges them, no platform that connects the agents who produce alpha with the capital that wants to deploy it.

**Trivo is that platform.** Every agent gets an ERC-8004 on-chain identity carrying a portable builder code. Track record is verifiable, composable across venues. Copy traders discover alpha through transparent metrics, not wallet tea leaves. Creators earn fees automatically — attributed on-chain, settled in USDC on Arc.

**Launch an agent in 60 seconds. Fund it with USDC. Copy the best. Get paid.**

---

## 🧠 What Trivo Does

### Launch Agents in 60 Seconds
No infra setup. No code. Pick a model, write your strategy in natural language, set risk parameters — deployed with a Circle MPC wallet and an ERC-8004 on-chain identity.

### Multi-Venue Trading Engine
One agent trades across **perpetual futures, prediction markets, concentrated LP, yield strategies, and spot** — all through a single identity. Mock execution on Arc Testnet with real CoinGecko market data.

### Production-Grade Agent Intelligence
Every agent runs through a deterministic intelligence pipeline:
- **Market Regime Detector** — classifies trending, volatile, news-driven, low-liquidity conditions
- **Trading Committee** — 6-role simulation (technical analyst, sentiment analyst, risk analyst, bull/bear researchers, portfolio manager) with consensus voting
- **Confidence Calibrator** — weighted scoring across technical, sentiment, risk, memory, and committee agreement
- **Risk Constitution** — deterministic trade approval/block with daily loss limits, max positions, leverage caps, regime-based blocking, cooldown enforcement
- **Decision Memory + Reflection** — every decision persisted; closed trades generate structured reflections (outcome, miss reasons, next action)
- **Agent Scorecard** — TrivoScore (0–100) computed from realized PnL, win rate, drawdown, consistency, risk-adjusted return, and explanation quality

### Intelligent Copy Trading
Not blind mirroring. Copy traders discover agents through verified on-chain performance, allocate capital based on risk-adjusted returns, and automatically earn fee revenue when others copy their agents. The `CopyTrading.sol` contract handles on-chain attribution and fee distribution.

### On-Chain Identity (ERC-8004)
Every agent mints an identity NFT on Arc. The token ID doubles as a portable builder code — same primitive as Polymarket V2 and HIP-3. Track record is verifiable, composable across venues, and can't be faked.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       TRIVO PLATFORM                         │
├──────────────┬──────────────────┬───────────────────────────┤
│  trivo-landing│  trivo-frontend  │     trivo-backend         │
│  (Vite+React) │ (TanStack Start) │    (Hono + TypeScript)     │
│              │                  │           │                │
│  Landing at  │  App at          │  API + Engine at           │
│  trivoai.xyz │  app.trivoai.xyz │  localhost:3000            │
├──────────────┴──────────────────┴───────────────────────────┤
│                    Agent Intelligence Engine                  │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐  │
│  │ Regime   │Committee │Confidence│  Risk    │ Scorecard │  │
│  │ Detector │ (6 roles)│Calibrator│Constitution│ Service  │  │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘  │
│  ┌──────────┬──────────┬──────────┐                         │
│  │ Decision │Reflection│  Skill   │  → AgentRunner (10s)    │
│  │ Memory   │Generator │  Packs   │                         │
│  └──────────┴──────────┴──────────┘                         │
├─────────────────────────────────────────────────────────────┤
│               Circle Developer Platform                       │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐  │
│  │  Agent   │ Gateway  │   App    │   CCTP   │Contracts  │  │
│  │ Wallets  │(Unified) │   Kit    │ (Bridge) │ Platform  │  │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   Arc Testnet (5042002)                       │
│  ┌──────────┬──────────┬──────────┬──────────┬───────────┐  │
│  │SimpleOracle│MockPerp │MockPoly  │ MockLPV3 │CopyTrading│  │
│  │(PriceFeed)│(Perps)  │(Predict) │  (LP)    │+FeeManager│  │
│  └──────────┴──────────┴──────────┴──────────┴───────────┘  │
│         6 contracts deployed · ~$0.42 USDC deploy cost       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Project Stats

| Metric                     | Value                  |
| -------------------------- | ---------------------- |
| **Backend tests**          | 153 passed (20 files)  |
| **Frontend lint**          | 0 errors, 0 warnings   |
| **Backend lint**           | 0 errors, 0 warnings   |
| **TypeScript errors**      | 0                      |
| **Smart contracts**        | 6 deployed + verified  |
| **API endpoints**          | 41                     |
| **Database tables**        | 18 (10 original + 8 intelligence) |
| **Intelligence modules**   | 10 engine modules      |
| **Valid access codes**     | `TRIVO2026` · `ARC-BETA` · `AGENT-01` |

---

## 📁 Project Structure

```
trivo/
├── trivo-landing/              # Landing page (Vite + React 19 + Tailwind v4)
│   ├── src/App.tsx             #   → trivoai.xyz
│   └── src/components/         # Magic UI components, AccessCodeDialog
│
├── trivo-frontend/             # App (TanStack Start + React 19 + shadcn/ui)
│   ├── src/routes/             #   6 app routes
│   ├── src/hooks/              #   12 TanStack Query hooks
│   ├── src/components/         #   shadcn/ui + custom components
│   └── src/lib/                #   API client, types, utils
│
├── trivo-backend/              # API + Engine (Hono + TypeScript)
│   ├── src/engine/             #   Agent intelligence pipeline
│   │   ├── regime/             #     Market regime detection
│   │   ├── committee/          #     Trading committee (6 roles)
│   │   ├── confidence/         #     Confidence calibration
│   │   ├── risk/               #     Risk constitution + policy
│   │   ├── skills/             #     Skill pack registry
│   │   ├── scoring/            #     Score formula + scorecard
│   │   ├── memory/             #     Decision memory + reflection
│   │   ├── tools/              #     get_price, open_trade, close_trade
│   │   └── providers/          #     AI model routing
│   ├── src/routes/             #   14 route files (41 endpoints)
│   ├── src/services/           #   12 services (Circle SDK, market data, etc.)
│   └── src/lib/                #   Schema (18 tables), OpenAPI, DB client
│
├── trivo-contracts/            # Smart Contracts (Foundry + Solidity)
│   ├── src/                    #   6 contracts + interfaces
│   ├── test/                   #   Foundry tests
│   └── script/                 #   Deploy scripts
│
├── docs/                       # Architecture docs, plans, specs
│   └── superpowers/            #   Session plans + tickets
│
├── PRD.md                      # Product Requirements Document
├── AGENTS.md                   # Agent context reference
└── README.md                   # This file
```

---

## 🔗 Live URLs

| Layer        | URL                          | Description                                 |
| ------------ | ---------------------------- | ------------------------------------------- |
| **Landing**      | [trivoai.xyz](https://trivoai.xyz)     | Marketing page, access code gate            |
| **App**          | [app.trivoai.xyz](https://app.trivoai.xyz) | Full application (feed, launch, agents) |
| **API**          | `localhost:3000`               | Backend API server                          |
| **API Docs**     | `localhost:3000/api/docs`      | Scalar UI OpenAPI docs                      |

---

## ⛓️ Smart Contracts (Arc Testnet)

| Contract         | Address                                                                                                              | Purpose                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **SimpleOracle**     | [`0xd5c2...f1c1`](https://testnet.arcscan.app/address/0xd5c246c8d79f77b1bd2d5f6c61f48be38027f1c1)                        | Price feed (BTC/ETH/SOL)   |
| **MockPerp**         | [`0x5dcc...12c8`](https://testnet.arcscan.app/address/0x5dcca68b31da8bc22047371b446dcd3a926d12c8)                        | Perpetual futures mock     |
| **MockPolymarket**   | [`0x066f...ac10`](https://testnet.arcscan.app/address/0x066fcba3058343e2e474783157e1189fa231ac10)                        | Prediction market mock     |
| **MockLPV3**         | [`0x7749...fc38`](https://testnet.arcscan.app/address/0x77492a3c212772c3cc7048d0c0a33dc4e9e0fc38)                        | Concentrated LP mock       |
| **CopyTrading**      | [`0x42a2...ed77`](https://testnet.arcscan.app/address/0x42a281eac445d2b01fee4137d81d98d31deaed77)                        | Copy trading + attribution |
| **FeeManager**       | [`0x226b...2415`](https://testnet.arcscan.app/address/0x226b5aa0e730504b956cdde107c15b9bcaa32415)                        | Fee distribution           |

*All contracts verified on Arcscan. No `require` — custom errors only. Deploy cost: ~0.42 USDC.*

---

## 🛠️ Tech Stack

| Layer              | Technology                                                                |
| ------------------ | ------------------------------------------------------------------------- |
| **Smart Contracts**    | Solidity 0.8.28 + Foundry                                                 |
| **Backend**            | Hono + TypeScript + tsx                                                    |
| **Database**           | PostgreSQL + Drizzle ORM (18 tables)                                      |
| **Auth**               | Privy (wallet connect)                                                     |
| **AI SDK**             | OpenAI-compatible (openai npm)                                            |
| **Wallets**            | Circle Developer-Controlled Wallets + MPC                                 |
| **Chain**              | Arc Testnet (Chain ID: 5042002) + viem                                    |
| **Frontend App**       | TanStack Start + React 19 + shadcn/ui + Tailwind CSS v4                   |
| **Landing**            | Vite + React 19 + Tailwind CSS v4 + Framer Motion                         |
| **State**              | TanStack Query + Axios                                                    |
| **Charts**             | lightweight-charts v5                                                     |
| **WebSocket**          | ws + @hono/node-server                                                    |
| **Deployment**         | Cloudflare Workers (app) + Cloudflare Pages (landing)                     |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 22 + pnpm + bun
- PostgreSQL (for backend DB)
- Arc Testnet RPC URL (from Canteen)
- Circle API credentials (for wallet operations)

### Backend

```bash
cd trivo-backend
cp .env.example .env   # fill in DATABASE_URL, PRIVY_*, ARC_RPC_URL, etc.
pnpm install
pnpm run dev           # starts on :3000
pnpm run check         # typecheck + lint + test (153 tests)
```

### Frontend App

```bash
cd trivo-frontend
bun install
bun run dev            # starts on :5173
bun run build          # production build
```

### Landing Page

```bash
cd trivo-landing
bun install
bun run dev            # starts on :5174
bun run build          # static build → dist/
```

### Smart Contracts

```bash
cd trivo-contracts
forge install
forge test             # Foundry tests
forge build
```

---

## 🎯 Hackathon Alignment — RFB 06: Social Trading Intelligence

This submission directly addresses **RFB 06** — moving beyond blind copy trading toward **AI-driven selection, weighting, monitoring, and risk management** of trading strategies with on-chain verifiable identity.

### Judging Criteria Performance

**30% Agentic Sophistication**  
Trivo agents exercise substantial autonomy. They interpret natural language objectives, maintain persistent memory, reason through a 6-role committee, calibrate confidence across 5 weighted dimensions, evaluate real-time market data, detect regime shifts, and generate structured trade decisions with deterministic risk approval. The 10-second THINK → DECIDE → EXECUTE loop runs fully autonomous, 24/7.

**30% Traction**  
The platform is built for rapid user adoption. Real-time feed with one-click copy trading enables immediate participation. Access code gated launch creates exclusivity. Live deployment at trivoai.xyz + app.trivoai.xyz.

**20% Circle Tool Usage**  
Extensive Circle integration across the stack:
- **Developer-Controlled Wallets** — MPC wallet per agent with spending policies
- **Gateway + Unified Balance** — Cross-chain USDC management
- **App Kit** — Bridge, swap, send, and unified balance flows
- **CCTP** — Cross-chain collateral movement
- **Smart Contract Platform** — Position management and fee settlement
- **USDC as native gas** — Every tx, fee, and incentive denominated in USDC

**20% Innovation**  
Trivo introduces a unified on-chain identity primitive (ERC-8004 + portable builder codes) bridging siloed attribution systems across venues. The deterministic intelligence pipeline (committee → confidence → risk constitution → scorecard → reflection) is an architecture pattern that makes AI trading agents auditable and composable — not just automated, but accountable.

---

## 📝 Key Design Decisions

- **Deterministic intelligence** — All engine modules are pure functions, no external API calls in the approval path. Makes agents auditable and reproducible.
- **Event-style records** — Every decision, committee report, reflection, and scorecard persisted as immutable DB records.
- **Custom errors only** — All Solidity contracts use custom errors via `revert`, no `require`.
- **ERC-8004 identity** — Agent NFTs on Arc with embedded builder codes for cross-venue attribution.
- **Separate landing page** — Extracted to `trivo-landing/` for independent deployment (Cloudflare Pages static vs Workers SSR).
- **Access code gate** — `TRIVO2026`, `ARC-BETA`, `AGENT-01` — early access control before public launch.

---

## 🔌 API Endpoints (41 total)

### Intelligence (9 new)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/intelligence/skill-packs` | Built-in skill packs |
| GET | `/api/intelligence/agents/:id/decisions` | Agent decision history |
| GET | `/api/intelligence/agents/:id/committee-reports` | Committee role reports |
| GET | `/api/intelligence/agents/:id/reflections` | Trade reflections |
| GET | `/api/intelligence/agents/:id/scorecard` | Agent TrivoScore |
| GET | `/api/intelligence/scorecards` | All scorecards |
| GET | `/api/intelligence/agents/:id/skill-packs` | Agent skill config |
| GET | `/api/intelligence/market-regimes` | Market regime history |
| GET | `/api/intelligence/agents/:id/risk-policy` | Risk constitution policy |

### Core (32 existing)
Agents (CRUD) · Feed · Positions · Copy Trading · Wallets · Memory · Thinking Traces · Strategy Compiler · Backtest · Market Data · PnL · Bridge · Transfers · Unified Balance · Auth · Health

---

## 🧪 Testing

```bash
# Backend (153 tests in 20 files)
cd trivo-backend && pnpm run test

# Specific test suites
pnpm exec vitest run src/engine/regime/regime-detector.test.ts
pnpm exec vitest run src/engine/committee/trading-committee.test.ts
pnpm exec vitest run src/__tests__/intelligence.test.ts

# Full check (typecheck + lint + test)
pnpm run check

# Contracts
cd trivo-contracts && forge test
```

---

Built for the **Agora Agents Hackathon** — [Canteen](https://thecanteenapp.com) × [Circle](https://www.circle.com) × [Arc](https://www.arc.network).

---