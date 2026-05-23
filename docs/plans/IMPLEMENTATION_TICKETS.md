# Trivo Engine Refactor — Implementation Tickets

> **Plan:** [engine-refactor-plan.md](./engine-refactor-plan.md)
> **Deadline:** May 25, 2026
> **Total Estimated:** ~3 hours

---

## 🎯 Ticket Groups

| #   | Group              | Tickets | Est.     | Depends On |
| --- | ------------------ | ------- | -------- | ---------- |
| 1   | Foundation         | 6       | 35 min   | —          |
| 2   | AI Features        | 8       | 1.5 hrs  | Group 1    |
| 3   | Safety & Prompts   | 4       | 35 min   | Group 1    |
| 4   | Wiring & Deploy    | 8       | 50 min   | Groups 2+3 |

---

## Group 1: Foundation (35 min)

### ✅ T-001: Create `engine/types.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/types.ts`
- **Content:** `ThinkingOutput`, `TradeDecision`, `RiskConfig`, `EngineConfig`, `MarketContext`, `SentimentData` interfaces
- **Verify:** TypeScript compiles without errors

### ✅ T-002: Create `engine/index.ts` shell
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/index.ts`
- **Content:** `startEngine()`, `stopEngine()`, `runAgentNow()` — empty implementations
- **Depends:** T-001

### ✅ T-003: Create `engine/tools/registry.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/tools/registry.ts`
- **Content:** `ToolSchema`, `EngineTool`, `ToolRegistry` class with `register()`, `getSchemas()`, `execute()`, `has()`
- **Depends:** T-001

### ✅ T-004: Create `engine/tools/get-price.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/tools/get-price.ts`
- **Content:** `getPriceTool` — calls `contract.service.getPrice()`, returns `{pair, price, timestamp}`
- **Depends:** T-003

### ✅ T-005: Create `engine/tools/open-trade.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/tools/open-trade.ts`
- **Content:** `openTradeTool` — opens position via venue contract, saves to DB, creates feed event
- **Schema:** venue (perp/polymarket/lp), pair, side (long/short), size, leverage
- **Depends:** T-003

### ✅ T-006: Create `engine/tools/close-trade.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/tools/close-trade.ts`
- **Content:** `closeTradeTool` — closes position on-chain, updates DB
- **Schema:** positionId, reason
- **Depends:** T-003

---

## Group 2: AI Features (1.5 hrs)

### ✅ T-007: Create `engine/tools/get-sentiment.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/tools/get-sentiment.ts`
- **Content:** `getSentimentTool` — X/Twitter sentiment analysis
- **Schema:** token (BTC/ETH/SOL), timeframe (1h/4h/24h)
- **Returns:** `{sentiment, score, volume, engagement, topTopics, influentialTweets}`
- **Note:** Use simulated data for hackathon, cache results for 5min
- **Depends:** T-003

### ✅ T-008: Create `engine/providers/asi-one.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/providers/asi-one.ts`
- **Content:** `ASIOneProvider` — OpenAI client at `https://api.asi1.ai/v1`
- **Models:** asi1-mini, asi1, asi1-ultra
- **Features:** ReAct loop, session persistence (`x-session-id`), tool calling
- **Depends:** T-001, T-003

### ✅ T-009: Create `engine/providers/heurist.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/providers/heurist.ts`
- **Content:** `HeuristProvider` — OpenAI client at `https://llm-gateway.heurist.xyz`
- **Models:** hermes-3-llama3.1-8b
- **Features:** ReAct loop, embeddings (`BAAI/bge-large-en-v1.5`)
- **Depends:** T-001, T-003

### ✅ T-010: Create `engine/providers/model-router.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/providers/model-router.ts`
- **Content:** `ModelRouter` — routes tasks by complexity:
  - Simple → asi1-mini (fast/cheap)
  - Standard → asi1 or heurist (balanced)
  - Complex → asi1-ultra (500 tool calls)
- **Depends:** T-008, T-009

### ✅ T-011: Create `engine/memory/semantic-memory.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/memory/semantic-memory.ts`
- **Content:** `SemanticMemory` — store memories with embeddings, search by cosine similarity
- **Features:** Embedding cache, cosine similarity, stores first 50 dims in metadata
- **Depends:** T-009

### ✅ T-012: Create `engine/services/erc8004.service.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/services/erc8004.service.ts`
- **Content:** `ERC8004Service` — calls official Arc registries:
  - `registerAgent(metadataURI)` → IdentityRegistry
  - `recordTradeOutcome(agentId, isWin, score)` → ReputationRegistry
  - `getAgentIdentity(agentId)` → IdentityRegistry
  - `createAgentMetadata(agent)` → JSON metadata
  - `uploadMetadata(metadata)` → data URI (hackathon fallback)
- **Contracts:**
  - IdentityRegistry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
  - ReputationRegistry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`
  - ValidationRegistry: `0x8004Cb1BF31DAf7788923b405b754f57acEB4272`

### ✅ T-013: Delete old contract files
- [x] ✅ Done
- **Remove:** `trivo-contracts/src/AgentIdentity.sol`
- **Remove:** `trivo-contracts/src/interfaces/IAgentIdentity.sol`
- **Remove:** `trivo-contracts/test/AgentIdentity.t.sol`
- **Update:** `trivo-contracts/script/Deploy.s.sol` (remove import + deploy)

### ✅ T-014: Add DB columns for ERC-8004
- [ ] ⬜ Pending
- **SQL:**
  ```sql
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS identity_token_id VARCHAR(78);
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS identity_tx_hash VARCHAR(66);
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS metadata_uri TEXT;
  ```
- **File:** Update `trivo-backend/src/lib/schema.ts`

---

## Group 3: Safety & Prompts (35 min)

### ✅ T-015: Create `engine/thinking/system-prompt.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/thinking/system-prompt.ts`
- **Content:** `buildSystemPrompt(agent)` — returns structured prompt:
  - Agent identity (name, strategy, skills)
  - Risk parameters (leverage, stop loss, spend limit)
  - Thinking framework (OBSERVE→ANALYZE→DECIDE→SAFETY→ABORT)
  - Sentiment interpretation guide
  - Critical rules (5 rules)
  - Response format (JSON)
- **Depends:** T-001

### ✅ T-016: Create `engine/decision/risk-gates.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/decision/risk-gates.ts`
- **Content:** `checkRiskGates()` — 5 gates:
  1. Leverage gate (≤ maxLeverageX)
  2. Position size gate (≤ spendLimitUsd)
  3. Daily loss gate (|Pnl| < maxDailyLossUsd)
  4. Confidence gate (≥ threshold per risk level)
  5. Stop loss gate (≤ stopLossPct)
- **Depends:** T-001

### ✅ T-017: Create `engine/decision/circuit-breaker.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/decision/circuit-breaker.ts`
- **Content:** `CircuitBreaker` class:
  - `recordTradeResult(pnl)` → track consecutive losses
  - `canTrade()` → returns `{canTrade, reason, resumeAt}`
  - `getStatus()` → dailyPnl, winRate, isPaused
  - Auto-reset daily PnL at midnight
  - Pause on: N consecutive losses OR daily loss exceeded
- **Depends:** T-001

### ✅ T-018: Create `engine/decision/decision-engine.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/decision/decision-engine.ts`
- **Content:** `DecisionEngine` class:
  - `evaluate(thinking, agentRiskConfig)` → `TradeDecision | null`
  - Pipeline: Circuit breaker → HOLD check → Risk gates → Build decision
  - `recordResult(pnl)` → update circuit breaker
- **Depends:** T-016, T-017

---

## Group 4: Wiring & Deploy (50 min)

### ✅ T-019: Create `engine/thinking/context-builder.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/thinking/context-builder.ts`
- **Content:** 
  - `buildMarketContext(agentId)` → fetches prices, recent trades, open positions
  - `buildUserPrompt(context)` → formats context for AI consumption
  - `buildContextWithSemanticSearch(agentId, memory, state)` → semantic memory search
- **Depends:** T-001, T-004, T-011

### ✅ T-020: Create `engine/thinking/thinking-engine.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/thinking/thinking-engine.ts`
- **Content:** `ThinkingEngine` class:
  - `run(agent)` → ReAct loop: build context → call AI → handle tool calls → return `ThinkingOutput`
  - `parseResponse(content)` → extract JSON from AI response
  - Up to 5 iterations per cycle
- **Depends:** T-003, T-015, T-019

### ✅ T-021: Create `engine/agent-loop.ts`
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/agent-loop.ts`
- **Content:** `AgentEngine` class:
  - `runAgentCycle(agentId)` — full cycle:
    1. Load agent from DB
    2. Think (ReAct loop) → save reasoning
    3. Evaluate (risk gates + circuit breaker)
    4. Execute tool → save execution
    5. Create feed event → broadcast WebSocket
    6. Record ERC-8004 reputation
  - `start()` — interval loop for all active agents
  - `stop()` — clear interval
- **Depends:** T-005, T-006, T-012, T-018, T-020

### ✅ T-022: Update `engine/index.ts` with full wiring
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/index.ts`
- **Content:** Wire up:
  - Register all tools (getPrice, openTrade, closeTrade, getSentiment)
  - Initialize ModelRouter (ASI:One + Heurist)
  - Initialize ThinkingEngine
  - Initialize DecisionEngine
  - Start AgentEngine loop
- **Depends:** T-007, T-010, T-021

### ✅ T-023: Update `src/index.ts` entry point
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/index.ts`
- **Change:** Replace `startAgentEngineV2()` with `startEngine()` from engine module
- **Depends:** T-022

### ✅ T-024: Create `engine/memory/distill.ts` (optional)
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/memory/distill.ts`
- **Content:** `distillAgentMemory()` — periodic summarization:
  - Load last 20 memories
  - Ask AI to distill insights
  - Store as 'reflection' memory
- **Depends:** T-011
- **Priority:** Low (post-hackathon)

### T-025: Agent creation → ERC-8004 integration
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/routes/agents.ts`
- **Change:** In `POST /api/agents`:
  1. Create metadata JSON
  2. Upload to data URI
  3. Call `erc8004Service.registerAgent()`
  4. Store `identityTokenId`, `identityTxHash`, `metadataURI`
- **Depends:** T-012

### ✅ T-026: Trade execution → ERC-8004 reputation
- [ ] ⬜ Pending
- **File:** `trivo-backend/src/engine/agent-loop.ts`
- **Change:** After trade execution:
  1. Get agent's ERC-8004 identity
  2. Call `erc8004Service.recordTradeOutcome()`
  3. Log Arcscan link
- **Depends:** T-012, T-021

---

## 📊 Progress Summary

| Group   | Tickets            | Done | Pending | Progress |
| ------- | ------------------ | ---- | ------- | -------- |
| 1       | T-001 → T-006      | 6    | 0       | 100%     |
| 2       | T-007 → T-014      | 8    | 0       | 100%     |
| 3       | T-015 → T-018      | 4    | 0       | 100%     |
| 4       | T-019 → T-026      | 7    | 1       | 87%      |
| **Total**   | **26 tickets**         | **25**   | **1**       | **96%**      |

---

## 🔗 Dependencies Graph

```
T-001 ──→ T-002
    ├───→ T-003 ──→ T-004, T-005, T-006, T-007
    ├───→ T-008 ──→ T-010
    ├───→ T-009 ──→ T-010, T-011
    ├───→ T-012 ──→ T-021, T-025, T-026
    ├───→ T-014
    ├───→ T-015 ──→ T-020
    ├───→ T-016 ──→ T-018
    ├───→ T-017 ──→ T-018
    └───→ T-019 ──→ T-020

T-020 ──→ T-021
T-018 ──→ T-021
T-012 ──→ T-021

T-021 ──→ T-022 ──→ T-023
T-007, T-010 ──→ T-022

T-011 ──→ T-024
T-012 ──→ T-025, T-026
```

---

## 🚀 Execution Order

```
Session 1 (35 min): Foundation
  T-001 → T-002 → T-003 → T-004, T-005, T-006

Session 2 (1.5 hrs): AI Features
  T-007 → T-008 → T-009 → T-010 → T-011 → T-012 → T-013 → T-014

Session 3 (35 min): Safety
  T-015 → T-016 → T-017 → T-018

Session 4 (50 min): Wiring
  T-019 → T-020 → T-021 → T-022 → T-023 → T-025 → T-026
  (T-024 optional)

Total: ~3.5 hours
```

---

## 🧪 Testing After Each Session

### After Session 1
```bash
cd trivo-backend && pnpm run typecheck
# All types compile, registry works
```

### After Session 2
```bash
cd trivo-backend && pnpm run dev
# Check: tools registered, providers initialized
```

### After Session 3
```bash
cd trivo-backend && pnpm run dev
# Check: system prompt logs, risk gates block violations
```

### After Session 4
```bash
cd trivo-backend && pnpm run dev
# Check: full agent cycle runs, feed events created, WS broadcasts
# Check Arcscan: agent registered, reputation recorded
cd .. && pnpm run dev  # frontend
# Check: agent appears in feed, identity shown
```
