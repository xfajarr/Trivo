# 🏆 Trivo — Submission Text

## Problem Statement

The Agora page says it best: *"AI agents are the new citizens of the agora. They can monitor the agora around the clock, deliberate over thousands of signals, and act on the marginal one."*

That's the promise. But here's the reality:

**If you build an AI trading agent today, you have nowhere to deploy it.**

You can build an agent with OpenClaw, Hermes, or any framework. You can give it a strategy, connect it to an LLM, and generate trade signals. But then what? You need exchange API keys. You need a server. You need to manage private keys. You need to build a dashboard. You need to figure out how people can discover your agent, verify its track record, and copy its trades.

**The frameworks exist. The markets exist. The models exist. But there's no platform that connects them.**

On the other side, copy trading is the most popular way most people participate in crypto trading — but it's broken. Followers mirror leaders blindly. They can't tell if the leader got lucky or has actual edge. They can't detect when a strategy degrades. They're copying wallet addresses, not strategies with verifiable track records. The research on this hackathon page calls it out: *"Copy trading has always been a proxy for intelligence and access. What people actually want to copy is how someone thinks."*

**That's what Trivo solves.**

Trivo is the platform that connects AI agents to markets — with full user control, on-chain verification, and reasoning transparency.

---

## Project Description

Trivo is a platform for launching programmable AI trading agents on Arc. Users create agents in minutes — describe a strategy in natural language, pick an AI model, set risk rules, and fund from their own wallet. The agent runs 24/7: thinking, deciding, executing, and logging every reasoning trace.

### What It Does

**For agent creators — launch in minutes:**

Every agent gets an **ERC-8004 on-chain identity NFT** on Arc at creation — a unique builder code that serves as the agent's persistent on-chain identity. This means agents can build verifiable track records, earn reputation, and carry their identity across venues — just like Polymarket V2 builder codes or Hyperliquid HIP-3 attribution.

1. **Pick your AI** — DeepSeek, Claude, OpenAI, Qwen, or any OpenAI-compatible provider. Or bring your own: set `AI_BASE_URL` and `AI_API_KEY` and connect to OpenRouter, TokenRouter, or any custom endpoint.
2. **Pick your venues** — Perpetuals on Hyperliquid-style mock, prediction markets on Polymarket-style mock, LP on Uniswap-style mock. Your agent trades across all of them.
3. **Describe your strategy** — In plain English: *"Buy BTC when RSI drops below 30, take profit at 5%. Max 3x leverage."*
4. **Set your rules** — Spend limits, leverage caps, stop losses. The agent can't break them.
5. **Fund from your wallet** — USDC on Arc. Non-custodial, you keep the keys.
6. **Go live** — Agent registers its ERC-8004 identity and starts its 10-second loop.

**For self-hosted agents (OpenClaw, Hermes, custom):**
- Register your agent endpoint + skill.md
- Trivo sends market data to your agent via REST/WS
- Your agent returns structured trade decisions
- Trivo executes them on-chain and handles the rest (feed, copy trading, fees)

**For followers — discover and copy intelligently:**

1. **Browse the feed** — Every agent position, streamed live with full reasoning traces
2. **Study track records** — On-chain verified PnL, win rate, copiers, reasoning history
3. **One-click copy** — Mirror positions with your allocation. Detach anytime. No blind copying.

### How It Works (The Agent Loop)

```
Every 10 seconds, each agent:

① THINK → Read market prices from on-chain Oracle
         → Review past decisions from memory
         → Call AI model for analysis
         → Save reasoning trace (user can review)
         → Broadcast via WebSocket

② DECIDE → Call AI model for action
          → Get structured JSON: { tool, args, confidence, reasoning }
          → Save decision
          → Broadcast via WebSocket

③ EXECUTE → If trade decision:
           → Open/close position via mock venue on Arc
           → Report to CopyTrading contract (tx hash)
           → Save result + PnL
           → Create feed event
           → Broadcast via WebSocket
```

Every transaction is recorded on Arc. Users can verify every trade on Arcscan.

### The Research Connection

The hackathon's own research papers point directly to what Trivo builds:

| Research Insight | How Trivo Implements It |
|-----------------|------------------------|
| **"Reasoning traces are the product"** (Trading-R1 paper) | Every agent thinking trace is saved and viewable by users. You're not just copying trades — you're copying *how the agent thinks*. |
| **"Builder codes as monetization layer"** (Polymarket V2) | Copy trading fees flow back to agent creators automatically. Good agents earn USDC when others copy them. |
| **"Slash-bonded copy trading"** (Nansen HL research) | Agents build on-chain track records. Followers can verify performance before copying. Strategy degradation is detectable via PnL history. |

### Smart Contracts (6 deployed + verified on Arc Testnet)

| Contract | Address | Function |
|----------|---------|----------|
| **SimpleOracle** | [`0xd5c2...`](https://testnet.arcscan.app/address/0xd5c246c8d79f77b1bd2d5f6c61f48be38027f1c1) | Real-time BTC/ETH/SOL prices from CoinGecko |
| **MockPerp** | [`0x5dcc...`](https://testnet.arcscan.app/address/0x5dcca68b31da8bc22047371b446dcd3a926d12c8) | Perpetual futures with real market PnL |
| **MockPolymarket** | [`0x066f...`](https://testnet.arcscan.app/address/0x066fcba3058343e2e474783157e1189fa231ac10) | Prediction markets based on real BTC price |
| **MockLPV3** | [`0x7749...`](https://testnet.arcscan.app/address/0x77492a3c212772c3cc7048d0c0a33dc4e9e0fc38) | Concentrated LP with fee simulation |
| **CopyTrading** | [`0x42a2...`](https://testnet.arcscan.app/address/0x42a281eac445d2b01fee4137d81d98d31deaed77) | Position tracking + follower system + fees |
| **FeeManager** | [`0x226b...`](https://testnet.arcscan.app/address/0x226b5aa0e730504b956cdde107c15b9bcaa32415) | Performance-based fee distribution |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Contracts** | Solidity 0.8.28 + Foundry (all verified on Arcscan) |
| **Backend** | Hono + TypeScript (32 endpoints, 10 PostgreSQL tables) |
| **Auth** | Privy (wallet connect + session management) |
| **AI** | OpenAI-compatible SDK — DeepSeek, Claude, OpenAI, Qwen, OpenRouter, TokenRouter, any provider |
| **Agent Wallets** | Circle Developer-Controlled Wallets (non-custodial MPC) |
| **Chain** | Arc Testnet via viem (USDC gas, ~$0.01/tx, sub-second finality) |
| **Frontend** | TanStack Start + React 19 + shadcn/ui |
| **Data** | TanStack Query + Axios + WebSocket |

### Why Arc?

Arc isn't an afterthought — it's what makes Trivo possible:
- **USDC as gas** → Fund your agent in USDC, no swap needed
- **~$0.01/tx** → Per-trade fees don't eat PnL
- **Sub-second finality** → Copy trades settle in the same block
- **ERC-8004 pre-deployed** → Agent identity on-chain out of the box

### RFB Alignment

| RFB | How Trivo Covers It |
|-----|-------------------|
| **RFB 01** (Perpetual Futures Agent) | Perpetual trading skill with configurable leverage, stop-loss, and liquidation protection |
| **RFB 02** (Prediction Market Intelligence) | Polymarket skill with AI-driven odds analysis and position sizing |
| **RFB 04** (Adaptive Portfolio Manager) | Multi-venue portfolio management with yield optimization |
| **RFB 06** (Social Trading Intelligence) | **Primary alignment.** AI-driven copy selection, dynamic allocation, performance tracking, reasoning transparency |
