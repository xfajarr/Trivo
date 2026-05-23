# 🗺️ TRIVO — Complete Feature Map

> **Hackathon:** Agora Agents Hackathon — Canteen × Circle × Arc
> **Deadline:** May 25, 2026
> **Chain:** Arc Testnet (Chain ID: 5042002)
> **Stack:** Solidity (Foundry) + Hono (Backend) + TanStack Start (Frontend)

---

## 1. Smart Contracts (Arc Chain)

| Contract | Fungsi | Prioritas |
|----------|--------|-----------|
| **AgentRegistry** | Register agent, update config, status lifecycle (Inactive/Active/Paused/Slashed) | 🔴 Wajib |
| **AgentVault** | Hold agent funds, spending limits, deposit/withdraw | 🔴 Wajib |
| **CopyTrading** | Attach follower ke agent, mirror positions, fee distribution | 🔴 Wajib |
| **BuilderCode** | Issuance bytes32 builder codes — identity layer buat tiap agent (Polymarket V2 style) | 🟡 Lanjut |
| **FeeManager** | Platform fee %, builder fee %, referral tracking | 🟡 Lanjut |

### On-chain Data Model

```
AgentRegistry:
  agentId → {
    owner,
    name,
    handle,
    strategyIpfsCid,
    modelProvider,
    modelConfig,
    skills[],
    rules { spendLimit, leverageCap, stopLoss },
    hostingType: "trivo" | "self_hosted",
    selfHostedEndpoint?,
    totalPnl,
    aum,
    tradeCount,
    status,
    builderCode
  }

AgentVault:
  agentId → { balance, allocatedBalance, spendingLimit, dailyUsed }

CopyTradeRel:
  follower → agentId → { allocation, active, startedAt, totalCopied, totalPnl }
```

---

## 2. Backend API (Hono — Node Server)

### Core Services

| Service | Endpoints | Fungsi |
|---------|-----------|--------|
| **Agent Service** | `GET/POST/PUT /api/agents` | CRUD agent, sync dengan smart contract |
| **Position Service** | `GET /api/positions`, `/api/agents/:id/positions` | Track agent positions (from contract + off-chain) |
| **Feed Service** | `GET /api/feed`, `POST /api/feed/action` | Agent actions feed, filter by venue |
| **Copy Trade** | `POST /api/copy/attach`, `POST /api/copy/detach` | Attach/detach copy trading, relay signals |
| **User/Wallet** | `GET /api/user/profile`, `POST /api/user/sync` | Wallet connect, user agents list |
| **Model Gateway** | `POST /api/agent/:id/invoke` | Proxy ke AI model (DeepSeek/Claude/etc.) |
| **Strategy Compiler** | `POST /api/strategy/compile` | Natural language → structured agent rules |
| **Backtest Engine** | `POST /api/backtest/run`, `GET /api/backtest/:id` | Historical simulation (mode test) |
| **Skill Registry** | `GET /api/skills`, `POST /api/agent/skills/register` | Skill marketplace — register skill.md |

---

## 3. Frontend Pages (TanStack Start)

| Route | Halaman | Fitur | Status |
|-------|---------|-------|--------|
| `/` | **Feed** | Live feed agent actions, filter venue, copy trade, top performers | ✅ Existing |
| `/discover` | **Discover** | Tabel ranking agent by AUM/PnL/win rate, skill badges | ✅ Existing |
| `/launch` | **Launch Agent** | Wizard: Identity → Model & Skills → Rules & Risk → Review | ✅ Existing |
| `/my-agents` | **My Agents** | Portfolio dashboard, pause/resume, settings | ✅ Existing |
| `/agent/$id` | **Agent Detail** | Profile, stats, positions, copy, follow, trades | ✅ Existing |
| `/agent/$id/settings` | **Agent Settings** 🆕 | Update model, skills, rules, spend limit | 🆕 Baru |
| `/backtest` | **Backtest Lab** 🆕 | Historical simulation, performance metrics | 🆕 Baru |
| `/skills` | **Skill Marketplace** 🆕 | Browse skills, register custom (self-hosted) | 🆕 Baru |

### Launch Wizard Detail

| Step | Content | Status |
|------|---------|--------|
| **1. Identity** | Name, username, avatar, hosting type (Trivo/Self-hosted), if self-hosted: endpoint + skill.md | ✅/🆕 |
| **2. AI Model** | Model selection (DeepSeek/Claude/OpenAI/Qwen), BYOK, model config (temp, tokens) | 🆕 |
| **3. Skills** | Multi-select: ⚡ Perpetual, 💧 LP, 🎯 Polymarket, 📊 Funding Rate, 🔄 Arbitrage, 🌾 Yield | 🆕 |
| **4. Rules & Risk** | Spend limit, max leverage, stop loss, NL strategy, auto-post, copy fee % | ✅/🆕 |
| **5. Review & Deploy** | Summary → deploy contract → activate backend | ✅ |

---

## 4. Agent Runtime Architecture

```
                    TRIVO PLATFORM
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  ┌─────────────────┐    ┌──────────────────────────┐     │
  │  │ TRIVO-HOSTED    │    │ SELF-HOSTED              │     │
  │  │ Agent Runtime   │    │ (Hermes/OpenClaw/Custom) │     │
  │  │                 │    │                          │     │
  │  │ Model Gateway:  │    │ skill.md defines         │     │
  │  │ DeepSeek, Claude│    │ agent capabilities       │     │
  │  │ OpenAI, Qwen    │    │ + trading logic          │     │
  │  │                 │    │                          │     │
  │  │ Skills + Rules  │    │ POST /decide → return    │     │
  │  │ Engine          │    │ structured trade decision│     │
  │  └─────────────────┘    └──────────────────────────┘     │
  │                                                          │
  │  ┌──────────────────────────────────────────────────┐    │
  │  │           SHARED LAYER                            │    │
  │  │  ┌──────────┐ ┌───────────┐ ┌──────────────┐    │    │
  │  │  │ Feed     │ │ Copy      │ │ Backtest     │    │    │
  │  │  │ Service  │ │ Trading   │ │ Engine       │    │    │
  │  │  │          │ │ Relay     │ │              │    │    │
  │  │  └──────────┘ └───────────┘ └──────────────┘    │    │
  │  └──────────────────────────────────────────────────┘    │
  │                                                          │
  │  ┌──────────────────────────────────────────────────┐    │
  │  │          SETTLEMENT LAYER (ARC)                   │    │
  │  │  AgentRegistry │ AgentVault │ CopyTrading        │    │
  │  └──────────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow Scenarios

### A: Launch Agent → Live
```
User Input (NL Strategy)
  → Frontend Launch Wizard
  → Backend compile strategy → agent rules
  → Deploy AgentRegistry + AgentVault on Arc (tx)
  → Backend create agent record
  → Agent appears in Feed + Discover
  → Agent starts trading (Trivo) or awaits signals (Self-hosted)
```

### B: Copy Trading
```
User sees position in Feed
  → Click "Copy Trade"
  → Backend attach: follower → agentId → allocation %
  → Follower agent mirrors positions
  → Copy fee % goes to original creator
  → On-chain via CopyTrading contract
```

### C: Backtest Mode
```
User enters Backtest Lab
  → Select agent config / template
  → Set parameters: pair, timeframe, strategy
  → Backend runs simulation on historical data
  → Results: PnL curve, Sharpe, max drawdown, win rate
  → If satisfied → deploy as live agent
```

---

## 6. Priority Matrix (2-Day Sprint)

| Feature | Effort | Impact | Priority |
|---------|--------|--------|----------|
| 🔴 AgentRegistry contract | Medium | High (Core) | **Day 1** |
| 🔴 AgentVault contract | Medium | High (Funds) | **Day 1** |
| 🔴 CopyTrading contract | Medium | High (RFB 06) | **Day 1** |
| 🔴 Backend agent CRUD API | Low | High (Data) | **Day 1** |
| 🔴 Launch → deploy flow | Medium | High (UX) | **Day 1** |
| 🟡 Natural language strategy | Medium | High (AI) | **Day 2** |
| 🟡 Feed + copy trade real | Medium | High (Traction) | **Day 2** |
| 🟡 AI Model integration (1) | Medium | High (AI) | **Day 2** |
| 🟡 Circle/Arc tooling demo | Low | Medium (20%) | **Day 2** |
| 🟢 Self-hosted agent reg | Low | Medium | Day 2 if |
| 🟢 Backtest Lab | High | Medium | Skip |
| 🟢 Skill marketplace | Medium | Low | Skip |

---

## 7. Hackathon Alignment

### Judging Criteria Mapping

| Criteria | Weight | Trivo Strategy |
|----------|--------|----------------|
| **Agentic Sophistication** | 30% | Natural language → structured strategy → AI model executes decisions |
| **Traction** | 30% | Launch agent real → feed populated → copy trading aktivitas |
| **Circle/Arc Tooling** | 20% | AgentRegistry + AgentVault on Arc, USDC gas, App Kit integration |
| **Innovation** | 20% | Builder code registry + copy trading — exactly what the research calls "the missing piece" |

### RFB Alignment

| RFB | Relevance | Trivo Feature |
|-----|-----------|---------------|
| **RFB 01** — Perpetual Futures Agent | High | ⚡ Perpetual skill |
| **RFB 02** — Prediction Market Intelligence | High | 🎯 Polymarket skill |
| **RFB 04** — Adaptive Portfolio Manager | Medium | 🌾 Yield + Portfolio skills |
| **RFB 06** — Social Trading Intelligence | **Perfect** | Copy trading + feed + agent ranking |

---

## 8. Key Differentiators

| Against | Trivo Edge |
|---------|------------|
| **Moss** | Platform web-based (bukan Chrome ext), on-chain agent registry, copy trading primitive |
| **Fomo** | AI agent (bukan manual trade), programmable strategy, on-chain settlement |
| **Knidos** | Multi-agent platform (bukan single fund), user-launched agents, marketplace |

> *"Trivo is the Identity Layer for AI Trading Agents on Arc — a registry + copy-trading primitive that gives every AI agent persistent on-chain identity (builder codes)."*
