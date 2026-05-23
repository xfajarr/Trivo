# 📋 PRD: Trivo — The Identity Layer for AI Trading Agents on Arc

> **Project:** Trivo  
> **Hackathon:** Agora Agents Hackathon — Canteen × Circle × Arc  
> **Deadline:** May 25, 2026  
> **Chain:** Arc Testnet (Chain ID: 5042002)  
> **Status:** Draft v1.0

---

## Problem Statement

### The Three Markets That Don't Know Each Other

The Agora thesis is that prediction market infrastructure is unbundling into three layers — Agent, Identity, and Venue — and that the identity layer is where the next primitive gets built. Polymarket V2 shipped `builder codes` (a `bytes32` field in every signed order that attributes the trade to its originator). Hyperliquid HIP-3 shipped per-fill builder fees. Pump.fun shipped `BREAKING_FEE_RECIPIENT`. All three venues converged on the same architectural answer in a six-month window — a `bytes32` attribution slot that travels with every trade, can't be stripped, and determines who gets paid.

**But these attribution primitives are siloed.** An agent that generates winning Polymarket predictions can't prove its track record on Hyperliquid. A trader who copies a strategy on one venue can't port that relationship to another. Builder codes exist but there's no registry that issues them, no standard that bridges them, no platform that connects the agents who produce alpha with the capital that wants to deploy it.

### The Current State is Broken for Everyone

**For AI agents:** Every trading framework (TradingAgents, AlpacaTradingAgent, crypto variants) produces structured trade decisions backed by reasoning traces. But those traces live in a log file, not on a chain. The agent has no portable identity, no verifiable PnL, no way to say "I generated +12% on Polymarket last month — here's the on-chain proof." Its reputation resets to zero every time it switches venues.

**For capital allocators (copy traders):** Copy trading today is blind. You follow a wallet address, not a strategy. You can't tell whether the trader got lucky or has edge. You can't detect when their strategy degrades. You can't diversify across multiple alpha sources with automated rebalancing. The only signal you have is "they made money" — and by the time you see it, the alpha is gone.

**For the venues:** Polymarket, Hyperliquid, and Uniswap all want AI agents trading on their books. But every integration is bespoke — different SDKs, different attribution schemes, different fee models. There's no identity layer that abstracts the venue plumbing so an agent can deploy across all of them with a single on-chain identity.

### The Infrastructure Gap

Arc makes the economics viable for the first time. Sub-second deterministic finality means a copy trade can settle in the same block as the original. ~$0.01 transaction fees in USDC mean that per-trade platform fees, builder fees, and copy-fee splits don't erode PnL. USDC as native gas means every cost is denominated in dollars — no volatile token to budget around.

**But the platform that connects AI agents to capital allocators on Arc doesn't exist yet.** The unbundling has happened at the protocol level, but there's no consumer surface that lets a user:
1. Launch an AI trading agent with one click (no infra setup)
2. Configure it with natural language (no code)
3. Fund it with USDC (same asset as gas)
4. Watch it trade on Polymarket, Hyperliquid, and Uniswap — all attributed to a single on-chain identity
5. Let others discover, follow, and copy that agent — with fees flowing back to the creator automatically

**That's Trivo.**

---

## Solution

**Trivo is the Identity Layer for AI Trading Agents on Arc.** A platform where users launch programmable AI agents with persistent on-chain identity (ERC-8004), configure trading skills and models, and participate in a copy trading network with on-chain attribution and automatic fee distribution.

### Key Differentiators

| Dimension | Trivo |
|-----------|-------|
| **Agent Identity** | ERC-8004 on-chain identity NFT + builder code — portable across venues |
| **Agent Wallets** | Circle Agent Wallets — MPC, user-custody, spending policies |
| **Copy Trading** | On-chain smart contract with dynamic fee split — not blind, performance-aware |
| **AI Models** | Multi-model (DeepSeek, Claude, OpenAI, Qwen) + BYOK |
| **Hosting** | Trivo-hosted (decision engine) + Self-hosted (Hermes/OpenClaw) |
| **Settlement** | Arc chain — USDC native, ~$0.01/tx, sub-second finality |
| **Attribution** | Builder code per agent — same primitive as Polymarket V2 / HIP-3 |
| **Venues** | Polymarket · Hyperliquid · Uniswap (expandable) |

---

## User Stories

### Agent Launch & Management

1. As a user, I want to create an AI trading agent with a name and username, so that it has a unique identity on the platform.
2. As a user, I want to choose between Trivo-hosted and self-hosted agent deployment, so that I can control my infrastructure or use Trivo's runtime.
3. As a user, I want to configure my agent's AI model (DeepSeek, Claude, OpenAI, Qwen) or bring my own API key (BYOK), so that the agent uses my preferred intelligence.
4. As a user, I want to select trading skills for my agent (perpetual, LP, Polymarket, funding rate arbitrage, DeFi yield), so that it can operate across multiple venues.
5. As a user, I want to define my agent's strategy using natural language, so that the AI interprets my intent and generates structured trading rules.
6. As a user, I want to set risk parameters (spend limit, max leverage, stop loss) for my agent, so that it operates within my risk tolerance.
7. As a user, I want my agent to have its own wallet with spending policies, so that funds are segregated and controlled.
8. As a user, I want to register my agent on-chain via ERC-8004 IdentityRegistry, so that it has a verifiable, portable on-chain identity NFT with a unique builder code.
9. As a user, I want to pause or reactivate my agent at any time, so that I can stop trading during volatile periods.
10. As a user, I want to update my agent's configuration (model, skills, rules) after deployment, so that I can optimize its performance.

### Self-Hosted Agents

11. As a developer, I want to register my self-hosted agent (Hermes, OpenClaw, or custom) with Trivo by providing an endpoint URL and skill.md, so that my agent appears in the Trivo ecosystem with its on-chain identity.
12. As a self-hosted agent operator, I want Trivo to send market data and context to my agent's endpoint via REST or WebSocket, so that my agent can make trading decisions.
13. As a self-hosted agent operator, I want my agent to return structured trade decisions to Trivo, so that the platform can validate and execute them on-chain.

### AI Model & Skill Configuration

14. As a user, I want to configure individual skill parameters per venue (e.g., which DEX for LP, which prediction markets for Polymarket), so that my agent operates precisely.
15. As a user, I want to see what skills are available in the Skill Marketplace, so that I can choose the right capabilities for my agent.
16. As a developer, I want to publish my own skill definition (skill.md) to the Skill Marketplace, so that other agents can use my trading logic.

### Copy Trading (RFB 06 — Social Trading Intelligence)

17. As a user browsing the feed, I want to see every position opened by every agent in real-time, so that I can discover profitable strategies with verified on-chain track records.
18. As a user, I want to copy-trade any agent's position with one click, so that my agent mirrors their trade automatically — the copy is attributed on-chain via the builder code.
19. As a user, I want to set allocation size when copy-trading an agent, so that I control how much capital is deployed.
20. As a user, I want to stop copy-trading an agent at any time, so that I can disconnect from degrading strategies — detected via on-chain PnL tracking.
21. As an agent creator, I want to earn copy trading fees when other users copy my agent's trades, so that I'm incentivized to build profitable strategies and my alpha is monetized.
22. As a user, I want the copy trading fee to be dynamic based on the agent's risk level and performance tier, so that fees reflect strategy quality — not a flat rate.

### Feed & Social

23. As a user, I want to filter the feed by venue (perp, prediction, LP, yield, spot), so that I see relevant activity.
24. As a user, I want to see top-performing agents ranked by on-chain verified AUM, PnL, and win rate, so that I can identify the best traders to follow based on cryptographic proof.
25. As a user, I want to view an agent's detailed profile including all open positions, historical performance, and stats — all verifiable on Arc — so that I can evaluate before copying.
26. As a user, I want to follow agents without copy-trading, so that I can track their performance in my feed.

### Backtesting

27. As a user, I want to run backtests on historical data with my agent configuration before deploying live, so that I can validate my strategy without risking capital.
28. As a user, I want to see backtest results including PnL curve, Sharpe ratio, max drawdown, and win rate, so that I can evaluate strategy performance before going live.

### Wallet & Funding

29. As a user, I want to connect my wallet (Rabby, MetaMask) to Trivo, so that I can sign transactions and manage funds.
30. As a user, I want to fund my agent's wallet via direct USDC deposit on Arc, so that it has capital to trade — same asset as gas, no swap needed.
31. As a user, I want to fund my agent's wallet via Circle App Kit Bridge from other chains, so that I can move USDC from Ethereum/Solana/Base without manual bridging.
32. As a user, I want to withdraw funds from my agent's wallet at any time, so that I maintain control of my capital.

---

## Implementation Decisions

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TRIVO PLATFORM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────┐    ┌────────────────────────────┐  │
│  │    TRIVO-HOSTED AGENT   │    │    SELF-HOSTED AGENT       │  │
│  │                         │    │    (Hermes/OpenClaw/Custom) │  │
│  │  ┌───────────────────┐  │    │                            │  │
│  │  │ Model Gateway:    │  │    │  POST /decide (REST)       │  │
│  │  │ DeepSeek/Claude/  │  │    │  or WebSocket stream       │  │
│  │  │ OpenAI/Qwen/BYOK  │  │    │  Return structured         │  │
│  │  └───────────────────┘  │    │  trade decision            │  │
│  │                         │    └────────────────────────────┘  │
│  │  Skills Engine          │                                     │
│  │  + Rules Engine         │                                     │
│  │  + Decision Log         │                                     │
│  └─────────────────────────┘                                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                 SHARED PLATFORM LAYER                       │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐  │  │
│  │  │ Feed     │ │ Copy      │ │ Backtest │ │ Strategy   │  │  │
│  │  │ Service  │ │ Trading   │ │ Engine   │ │ Compiler   │  │  │
│  │  │          │ │ Relay     │ │ (hist)   │ │ (NL→Rules) │  │  │
│  │  └──────────┘ └───────────┘ └──────────┘ └────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              CIRCLE INFRASTRUCTURE LAYER                    │  │
│  │  ┌──────────────┐ ┌──────────┐ ┌───────────────────────┐  │  │
│  │  │ Agent        │ │ App Kit  │ │ CCTP / Gateway       │  │  │
│  │  │ Wallets      │ │ Bridge   │ │ Nanopayments         │  │  │
│  │  │ (MPC +       │ │ Swap     │ │ Paymaster            │  │  │
│  │  │  Policies)   │ │ Send     │ │                      │  │  │
│  │  └──────────────┘ └──────────┘ └───────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  SETTLEMENT LAYER (ARC)                     │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │  │
│  │  │ ERC-8004     │ │ CopyTrading  │ │ FeeManager       │  │  │
│  │  │ IdentityReg  │ │ Contract     │ │ Platform + Copy  │  │  │
│  │  │ ReputationReg│ │              │ │ Fees             │  │  │
│  │  │ ValidationReg│ │              │ │                  │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Contracts (Arc)

#### Existing ERC-8004 Contracts (Already Deployed on Arc)

| Contract | Address | Purpose |
|----------|---------|---------|
| **IdentityRegistry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Register agent identity NFT, store metadata URI, issue builder code |
| **ReputationRegistry** | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Record reputation events — on-chain PnL, trade count, win rate |
| **ValidationRegistry** | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` | Request/respond validation credentials |

Every agent on Trivo gets an ERC-8004 identity NFT. The metadata URI points to IPFS with agent config, skills, model info. The `tokenId` becomes the agent's **builder code** — the same `bytes32` primitive that Polymarket V2, Hyperliquid HIP-3, and Pump.fun use.

#### New Contracts (Deployed by Trivo)

**Contract: CopyTrading**

Purpose: On-chain copy trading primitive — attach followers to agents, track mirrored positions, distribute fees based on performance.

Key state:
```solidity
mapping(address => mapping(uint256 => CopyRelation)) public copyRelations;
// follower => agentId => CopyRelation { allocation, active, startedAt, totalCopied, totalPnl }

mapping(uint256 => Position) public positions;
// positionId => Position { agentId, venue, market, side, size, entryPrice, openedAt, closedAt }

struct FeeConfig {
    address platformFeeRecipient;
    uint16 platformFeeBps;       // 50 = 0.5%
    uint16 minCreatorFeeBps;     // 100 = 1%
    uint16 maxCreatorFeeBps;     // 500 = 5%
    uint16 performanceTierCount; // 3 tiers: conservative, balanced, aggressive
}
```

Key functions:
- `attachFollower(follower, agentId, allocationBps)` — start copy relationship
- `detachFollower(follower, agentId)` — stop copy relationship
- `reportPosition(agentId, positionData)` — agent reports a new position
- `distributeCopyFees(positionId)` — distribute platform + creator fees on close

**Contract: FeeManager**

Purpose: Handle platform fee collection, creator fee distribution based on performance tier.

```solidity
mapping(address => uint256) public pendingFees;
mapping(uint256 => FeeTier) public feeTiers;
```

### Agent Wallet Architecture

Trivo integrates with **Circle Agent Wallets** (user-controlled wallets, 2-of-2 MPC):

1. **Agent creation:** Trivo backend creates a Circle Agent Wallet via Circle's API
2. **Spending policies:** Daily USDC limit, contract address allowlist, max per-tx value
3. **Funding:** User deposits USDC directly on Arc or via App Kit Bridge
4. **Execution:** Agent runtime submits trades via Agent Wallet or direct tx
5. **Gas:** Transactions are gas-sponsored by Circle (capped — subject to change)

### Backend Modules (Hono + TypeScript)

| Module | Responsibility | Key Endpoints |
|--------|---------------|---------------|
| **Agent Service** | CRUD agents, sync ERC-8004 registration | `GET/POST/PUT /api/agents`, `POST /api/agents/:id/register` |
| **Wallet Service** | Circle Agent Wallet integration, funding | `POST /api/wallets/create`, `POST /api/wallets/fund`, `POST /api/wallets/withdraw` |
| **Model Gateway** | Proxy AI model requests, manage API keys | `POST /api/agent/:id/decide`, `GET /api/models` |
| **Strategy Compiler** | Parse natural language → structured rules | `POST /api/strategy/compile` |
| **Skill Registry** | List/register trading skills | `GET /api/skills`, `POST /api/skills/register` |
| **Position Service** | Track positions on-chain + off-chain | `GET /api/positions`, `GET /api/agents/:id/positions` |
| **Feed Service** | Real-time agent activity feed | `GET /api/feed` (WebSocket for live) |
| **Copy Trade Service** | Manage copy relationships | `POST /api/copy/attach`, `POST /api/copy/detach` |
| **Backtest Engine** | Historical simulation | `POST /api/backtest/run`, `GET /api/backtest/:id` |
| **User Service** | Auth, wallet connect | `POST /api/auth/wallet`, `GET /api/user/profile` |

### Frontend Pages (TanStack Start + React 19)

| Route | Page | Key Features |
|-------|------|-------------|
| `/` | **Feed** | Real-time agent positions, venue filter, copy trade with one click, top performers sidebar — all on-chain verified |
| `/discover` | **Discover** | Agent ranking table (AUM/PnL/win rate/copiers), skill badges, search — data sourced from Arc + ERC-8004 |
| `/launch` | **Launch Wizard** | 5-step: Identity → Model → Skills → Rules → Review → Deploy + register ERC-8004 |
| `/my-agents` | **My Agents** | Portfolio dashboard, agent cards, pause/resume, settings, copy fee earned |
| `/agent/$id` | **Agent Detail** | Profile, ERC-8004 identity, stats grid, open positions, copy/follow, on-chain history |
| `/agent/$id/settings` | **Agent Settings** 🆕 | Update model, skills, rules, risk params, wallet management |
| `/backtest` | **Backtest Lab** 🆕 | Config panel, historical sim, results (Sharpe, drawdown, PnL curve) |
| `/skills` | **Skill Marketplace** 🆕 | Browse skills, skill detail, register custom skill (skill.md upload) |
| `/wallet` | **Wallet** 🆕 | Agent wallet balance, deposit (direct + App Kit Bridge), withdraw, tx history |

### Data Model

```typescript
// Agent (off-chain record, synced with ERC-8004 on-chain)
interface Agent {
  id: string;
  erc8004TokenId: bigint;  // ERC-8004 identity NFT token ID → serves as builder code
  owner: `0x${string}`;      // wallet address
  circleWalletId: string;  // Circle Agent Wallet ID

  // Identity
  name: string;
  handle: string;
  avatar: string;
  metadataUri: string;     // IPFS URI — stored on ERC-8004

  // Hosting
  hostingType: 'trivo' | 'self_hosted';
  selfHostedEndpoint?: string;
  selfHostedWsEndpoint?: string;

  // AI Model
  modelProvider: 'deepseek' | 'claude' | 'openai' | 'qwen' | 'byok';
  modelConfig: {
    modelName?: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    apiKey?: string;       // encrypted, for BYOK
  };

  // Skills
  skills: Skill[];

  // Rules
  rules: AgentRules;

  // Status
  status: 'inactive' | 'active' | 'paused';
  createdAt: number;
  updatedAt: number;

  // Performance (synced from ERC-8004 ReputationRegistry)
  totalPnl: number;
  aum: number;
  tradeCount: number;
  winRate: number;
  copiers: number;
}

interface AgentRules {
  spendLimit: number;       // USDC max total
  dailySpendLimit: number;  // USDC daily
  maxLeverage: number;
  stopLossPct: number;
  strategy: string;         // natural language strategy
  allowedVenues: Venue[];
  autoPost: boolean;
  allowCopy: boolean;
  copyFeeBps: number;       // fee in bps for copy traders
}

interface Skill {
  id: string;
  name: string;
  description: string;
  venue: Venue;
  config: Record<string, unknown>;
  skillMdCid?: string;      // IPFS CID (self-hosted)
}

type Venue = 'perp' | 'prediction' | 'lp' | 'yield' | 'spot';

interface Position {
  id: string;
  agentId: string;
  agentAddress: `0x${string}`;
  venue: Venue;
  market: string;
  side: 'LONG' | 'SHORT' | 'YES' | 'NO' | 'ADD' | 'REMOVE' | 'BUY' | 'SELL';
  size: number;
  entryPrice: number;
  markPrice?: number;
  leverage?: number;
  pnl?: number;
  pnlPct?: number;
  openedAt: number;
  closedAt?: number;
  copies: number;
  status: 'open' | 'closed';
  txHash: string;            // on-chain transaction on Arc
}

interface CopyRelation {
  id: string;
  followerAgentId: string;
  targetAgentId: string;
  allocationBps: number;
  active: boolean;
  startedAt: number;
  totalCopied: number;
  totalPnl: number;
}
```

### Data Storage

- **PostgreSQL** for off-chain: agents, users, skills, backtest results, feed cache
- **Arc chain** for on-chain: ERC-8004 identities, copy relations, positions, fees
- **IPFS** for agent metadata (ERC-8004 tokenURI) and skill.md files
- **Redis** (optional) for real-time feed pub/sub

### Integration Points

| Integration | Purpose | Tool |
|------------|---------|------|
| **Agent Identity** | Register agent, issue builder code | ERC-8004 IdentityRegistry (Arc) |
| **Agent Reputation** | On-chain PnL, trade history | ERC-8004 ReputationRegistry (Arc) |
| **Agent Wallet** | Agent fund mgmt, spending policies | Circle Agent Wallets |
| **Cross-chain Funding** | Deposit from other chains | Circle App Kit Bridge |
| **Token Swap** | Swap on Arc | Circle App Kit Swap |
| **USDC Transfer** | Send/receive | Circle App Kit Send |
| **AI Models** | Decision intelligence | DeepSeek, Claude, OpenAI, Qwen APIs |
| **Polymarket** | Prediction market trading | Polymarket V2 CLOB SDK |
| **Hyperliquid** | Perpetual futures | Hyperliquid SDK |
| **Uniswap** | Spot/LP trading | Uniswap V3 SDK |

### Agentic Sophistication (Judging Criteria: 30%)

The AI agent's decision-making loop follows the multi-agent architecture pattern:

1. **Market Observation** — agent receives price feeds, order books, news, sentiment
2. **Research** — agent analyzes data against its configured strategy
3. **Decision** — AI produces structured trade decision (market, side, size, price, rationale with reasoning trace)
4. **Validation** — decision checked against AgentRules (spend limit, leverage, stop loss)
5. **Execution** — trade submitted through venue SDK
6. **Recording** — position on-chain + decision hash → ERC-8004 ReputationRegistry

The key difference from rule-based automation: the AI **decides what to trade and when**, interprets natural language strategy, and generates verifiable reasoning traces. The agent is not executing a fixed algorithm — it's making contextual decisions based on market conditions.

---

## Testing Decisions

### Testing Principles

- Test external behavior, not implementation details
- On-chain contracts: test state transitions, access control, edge cases
- Backend API: test request/response contracts, error handling
- Focus on integration tests for critical paths (launch agent → trade → copy)

### Test Coverage

**Smart Contracts (Foundry)**
- CopyTrading: attach/detach follower, fee distribution, access control
- FeeManager: fee calculation, withdrawal, tier changes
- ERC-8004 integration: registration flow through IdentityRegistry

**Backend (Vitest)**
- Agent Service: CRUD operations, validation, ERC-8004 sync
- Strategy Compiler: natural language → structured rules parsing
- Model Gateway: request proxying, error handling, key management
- Copy Trade Service: attach/detach lifecycle

**Frontend (Testing Library)**
- Launch Wizard: state transitions, form validation, submission
- Feed: filter behavior, copy trade action
- Agent Detail: data display, stats calculation

---

## Out of Scope

- Custom trading venue integrations beyond Polymarket, Hyperliquid, Uniswap (future)
- Mobile native app (mobile web sufficient for v1)
- Token launch or platform token (revenue comes from fees, not token)
- DAO/governance (v1 is platform-operated; community governance is future)
- LEI/formal KYC (Circle's compliance handles sanctions screening)
- On-chain order book (Trivo uses venue operators' matching engines)
- Staking/restaking (no native staking mechanism)

---

## Further Notes

### Hackathon Alignment

**RFB 06 (Social Trading Intelligence)** — Perfect match. Trivo's copy trading with AI-driven allocation, on-chain attribution, and performance-based fee structure directly addresses the RFB.

**RFB 01 (Perpetual Futures Agent)** — The perpetual skill covers this.

**RFB 02 (Prediction Market Intelligence)** — The Polymarket skill covers this.

**RFB 04 (Adaptive Portfolio Manager)** — Yield + portfolio skills cover this.

### Judging Criteria

| Criteria | Weight | Trivo |
|----------|--------|-------|
| **Agentic Sophistication** | 30% | AI decides **what** and **when** — NL strategy → structured decisions → reasoning traces |
| **Traction** | 30% | Users launch real agents → feed populated → copy trading volume |
| **Circle/Arc Tooling** | 20% | ERC-8004 (existing on Arc!) + Agent Wallets + App Kit + CCTP |
| **Innovation** | 20% | Builder code registry + copy trading — "the missing piece" per the unbundling thesis |

### Arc-Specific Advantages

| Arc Feature | Why It Matters for Trivo |
|-------------|--------------------------|
| **USDC as gas** | User funds agent wallet → same USDC pays for gas → no swap needed |
| **~$0.01/tx** | Per-trade platform fee, copy fee split, builder fee all viable — doesn't erode PnL |
| **Sub-second finality** | Copy trade settles in same block as original — true real-time mirroring |
| **ERC-8004 pre-deployed** | Agent identity infra already on Arc — no deploy needed |

### Revenue Model

| Fee Type | Rate | Payer | Recipient |
|----------|------|-------|-----------|
| **Platform fee** | 0.5% per trade | Agent owner | Trivo |
| **Copy trading fee** | 1–5% (dynamic, based on performance tier) | Copy trader | Creator (70%) + Trivo (30%) |
| **BYOK surcharge** | Free | BYOK user | — |

### Risk Considerations

- Agent wallets use Circle's built-in spending policies (daily limits, contract allowlists)
- Self-hosted agents verified before appearing in feed
- Circuit breaker: platform admin can pause specific agents or venues
- All trades logged on-chain + off-chain for auditability

---

