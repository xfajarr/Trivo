# Trivo Agent Intelligence Upgrade Design

**Date:** 2026-05-24  
**Status:** Draft for review  
**Decision:** Production-ish implementation using integrated backend modules with event-style records  
**Scope:** Trading Committee Mode, Risk Constitution, Persistent Decision Memory + Reflection, Confidence Calibration, Agent Scorecard, Skill Pack System, Market Regime Detector  
**Explicitly out of scope:** OpenBB sidecar and any external Python data platform integration.

---

## 1. Goal

Upgrade Trivo agents from a single LLM trading loop into auditable, production-ish trading agents that make decisions through structured roles, deterministic risk checks, persistent learning, calibrated confidence, transparent copy-trading scores, configurable skill packs, and market regime awareness.

The upgrade should improve demo credibility and long-term architecture without splitting the backend into a separate service. The existing Hono/TypeScript backend remains the runtime boundary.

---

## 2. Current Behavior

Current backend flow:

```txt
AgentRunner
  -> ThinkingEngine.run()
  -> DecisionEngine.evaluate()
  -> ToolRegistry.execute(open_trade | close_trade)
  -> save agent_memory/feed_events
```

Current strengths:

- `src/engine/*` is already the canonical engine path.
- Risk gates exist for leverage, size, daily loss, confidence, and stop loss.
- `agent_memory` can store reasoning/execution records.
- `MarketContext` already includes prices, sentiment, technical analysis, recent trades, and open positions.
- `skills` and `agent_tools` tables exist and can support future skill packs.

Current gaps:

- One monolithic thinking result, no analyst committee or debate.
- Confidence comes from the model and is not calibrated from signals.
- Risk policy is basic and not persisted per agent.
- Memory is not outcome-aware; closed trades do not generate structured reflections.
- Copy-trading ranking uses basic PnL/win-rate fields only.
- Skills are tool-level records, not product-level strategy packs.
- Market condition is a prompt hint, not a first-class regime record.

---

## 3. Design Principles

1. **Event-style records, not full event sourcing:** persist every important cycle artifact in explicit tables, but avoid a full projection/event bus rewrite.
2. **Deterministic risk before execution:** LLM output proposes, policy approves or blocks.
3. **Explainable decisions:** every final trade/hold should be traceable to analyst outputs, regime, confidence formula, and risk decision.
4. **Graceful fallback:** if an analyst role fails, the cycle can continue with a degraded committee report unless required roles are missing.
5. **Incremental compatibility:** keep the existing `AgentRunner`, tools, positions, feed, and frontend routes working.
6. **No OpenBB dependency:** use existing market data, contract prices, sentiment tool, and deterministic technical analysis.

---

## 4. Target Architecture

```txt
AgentRunner
  -> MarketContextBuilder
  -> MarketRegimeDetector
  -> TradingCommittee
       -> Technical Analyst
       -> Sentiment Analyst
       -> Risk Analyst
       -> Bull Researcher
       -> Bear Researcher
       -> Portfolio Manager
  -> ConfidenceCalibrator
  -> RiskConstitution
  -> DecisionRecorder
  -> Tool Execution
  -> ReflectionGenerator
  -> ScorecardUpdater
```

New backend modules:

```txt
trivo-backend/src/engine/committee/
  roles.ts
  committee-runner.ts
  committee-prompts.ts

trivo-backend/src/engine/risk/
  risk-constitution.ts
  risk-policy-loader.ts

trivo-backend/src/engine/memory/
  reflection-generator.ts
  decision-memory.ts

trivo-backend/src/engine/scoring/
  scorecard-service.ts
  score-formula.ts

trivo-backend/src/engine/skills/
  skill-pack-registry.ts
  skill-pack-resolver.ts

trivo-backend/src/engine/regime/
  regime-detector.ts

trivo-backend/src/routes/intelligence.ts
```

Existing `AgentRunner` remains the orchestrator, but each concern moves into a focused service.

---

## 5. Database Design

Use Drizzle tables in `src/lib/schema.ts`. Migrations can be generated after schema changes.

### 5.1 `agent_decisions`

Stores one row per agent cycle decision.

Fields:

- `id`
- `agentId`
- `cycleId`
- `market`
- `action`: `open_trade | close_trade | hold | blocked`
- `toolName`
- `toolArgs` JSON string
- `rawConfidence`
- `calibratedConfidence`
- `riskLevel`
- `marketRegimeId`
- `committeeSummary`
- `riskDecision`: `approved | blocked | degraded`
- `riskReason`
- `finalReasoning`
- `txHash`
- `positionId`
- `status`: `proposed | executed | failed | skipped`
- `createdAt`

### 5.2 `committee_reports`

Stores role-level outputs for a decision cycle.

Fields:

- `id`
- `agentId`
- `decisionId`
- `cycleId`
- `role`: `technical_analyst | sentiment_analyst | risk_analyst | bull_researcher | bear_researcher | portfolio_manager`
- `stance`: `bullish | bearish | neutral | risk_off | approve | reject`
- `confidence`
- `summary`
- `evidence` JSON string
- `modelProvider`
- `latencyMs`
- `createdAt`

### 5.3 `agent_reflections`

Stores structured learning after a position is closed or after a decision ages out.

Fields:

- `id`
- `agentId`
- `decisionId`
- `positionId`
- `outcomePnl`
- `outcomePnlPct`
- `wasCorrect`
- `lesson`
- `mistakePattern`
- `improvement`
- `usableInPrompt`: `true | false`
- `createdAt`

### 5.4 `agent_scorecards`

Stores copy-trading ranking metrics.

Fields:

- `id`
- `agentId`
- `window`: `24h | 7d | 30d | all`
- `trivoScore`
- `realizedPnlScore`
- `winRateScore`
- `drawdownScore`
- `consistencyScore`
- `riskAdjustedScore`
- `explanationScore`
- `totalTrades`
- `maxDrawdownPct`
- `sharpeLikeRatio`
- `updatedAt`

### 5.5 `agent_risk_policies`

Stores deterministic policy per agent.

Fields:

- `id`
- `agentId`
- `maxOpenPositions`
- `maxLeverageX`
- `maxTradeUsd`
- `maxDailyLossUsd`
- `minConfidenceOpen`
- `minConfidenceClose`
- `cooldownMinutes`
- `blockIfRegime`: comma-separated regimes or JSON string
- `requireCommitteeQuorum`
- `enabled`
- `createdAt`
- `updatedAt`

Default policy is derived from `agents.maxLeverage`, `agents.spendLimit`, and `agents.stopLossPct` if no row exists.

### 5.6 `skill_packs`

Product-level skill bundles.

Fields:

- `id`
- `name`
- `slug`
- `description`
- `category`: `analysis | execution | risk | social | copy_trading`
- `toolNames` JSON string
- `committeeRoles` JSON string
- `defaultConfig` JSON string
- `enabled`
- `createdAt`

Initial built-in packs:

- `technical-momentum`
- `sentiment-reader`
- `risk-guard`
- `copy-trading-scout`
- `market-regime-adapter`

### 5.7 `agent_skill_packs`

Agent to skill pack mapping.

Fields:

- `id`
- `agentId`
- `skillPackId`
- `config` JSON string
- `enabled`
- `createdAt`

### 5.8 `market_regimes`

Stores detected market regime snapshots.

Fields:

- `id`
- `symbol`
- `timeframe`
- `regime`: `trending | ranging | volatile | news_driven | low_liquidity | mixed`
- `trendScore`
- `volatilityScore`
- `liquidityScore`
- `sentimentShockScore`
- `confidence`
- `evidence` JSON string
- `createdAt`

---

## 6. Feature Design

### 6.1 Trading Committee Mode

Each cycle runs role-specific analyses before the final decision.

Roles:

1. **Technical Analyst**: reads prices, candles, enhanced TA, support/resistance, trend.
2. **Sentiment Analyst**: reads `get_sentiment`, social/news-style summary, crowd skew.
3. **Risk Analyst**: evaluates current exposure, open positions, daily PnL, policy risk.
4. **Bull Researcher**: argues best long/yes/add case.
5. **Bear Researcher**: argues best short/no/reduce/hold case.
6. **Portfolio Manager**: final action proposal with tool args.

Mode control:

- Default for new agents: `committee`.
- Fallback mode: if committee fails, use existing `ThinkingEngine.run()` and mark decision `degraded`.
- A simple agent config can opt into `single` later, but not required for first implementation.

Output shape:

```ts
interface CommitteeDecision {
  action: 'open_trade' | 'close_trade' | 'hold'
  tool: string | null
  args: Record<string, unknown> | null
  rawConfidence: number
  riskLevel: 'low' | 'medium' | 'high'
  reasoning: string
  abortConditions: string[]
  roleReports: CommitteeRoleReport[]
  debateSummary: string
}
```

### 6.2 Risk Constitution Layer

The Risk Constitution is a deterministic approval layer after committee output and confidence calibration.

Checks:

- max open positions
- max trade size
- max leverage
- minimum calibrated confidence
- daily loss limit
- cooldown
- blocked market regimes
- required committee quorum
- required Portfolio Manager approval

Return shape:

```ts
interface RiskDecision {
  allowed: boolean
  status: 'approved' | 'blocked' | 'degraded'
  reason: string
  checks: Array<{ name: string; passed: boolean; detail: string }>
}
```

Blocked trades are stored in `agent_decisions` with `action = blocked`, and optionally emitted to feed as a risk event.

### 6.3 Persistent Decision Memory + Reflection

Two memory layers:

1. Existing `agent_memory`: lightweight context snippets.
2. New `agent_reflections`: structured outcome learning.

Reflection trigger:

- On `close_trade` success.
- Or periodic job scans recently closed positions without reflections.

Reflection content:

```txt
What was decided?
Why was it decided?
What happened?
Was the thesis correct?
What should change next time?
```

Prompt injection:

- `buildMarketContext` should load the last 5 usable reflections.
- Committee roles should see concise lessons, not raw logs.

### 6.4 Confidence Calibration Formula

Do not trust raw model confidence directly. Calculate calibrated confidence from independent scores.

Initial formula:

```txt
calibratedConfidence =
  0.30 * technicalScore +
  0.20 * sentimentScore +
  0.20 * riskScore +
  0.15 * memoryScore +
  0.15 * committeeAgreementScore
```

Score sources:

- `technicalScore`: enhanced TA confidence and trend alignment.
- `sentimentScore`: sentiment magnitude and agreement with proposed side.
- `riskScore`: inverse of exposure/risk pressure.
- `memoryScore`: recent reflections supporting or warning against this setup.
- `committeeAgreementScore`: role quorum and Bull/Bear/PM alignment.

Action thresholds:

- `< 55`: hold or block open trades.
- `55–69`: small trade only.
- `70–84`: normal trade allowed.
- `85+`: high conviction, still capped by risk policy.

The calibrated score is persisted on `agent_decisions`.

### 6.5 Agent Scorecard for Copy Trading

Scorecard powers Discover ranking and copy trading trust.

Initial `TrivoScore` formula:

```txt
TrivoScore =
  0.30 * realizedPnlScore +
  0.20 * winRateScore +
  0.20 * drawdownScore +
  0.15 * consistencyScore +
  0.10 * riskAdjustedScore +
  0.05 * explanationScore
```

Scoring rules:

- clamp all sub-scores to `0–100`.
- realized PnL should be windowed and dampened so one huge win does not dominate.
- drawdown score decreases as max drawdown grows.
- explanation score uses decision completeness: committee reports present, risk decision present, final reasoning non-empty.

Update triggers:

- after trade close
- after decision execution
- scheduled every 5 minutes for active agents

New API:

```txt
GET /api/intelligence/agents/:id/scorecard
GET /api/intelligence/scorecards?window=7d
```

Frontend use:

- Discover sort: best risk-adjusted, safest, most consistent.
- Agent detail: show score breakdown.

### 6.6 Skill Pack System

Skill packs are product-facing bundles that map to tools, committee roles, and default configs.

Initial packs:

1. `technical-momentum`
   - roles: Technical Analyst, Portfolio Manager
   - tools: get_price, technical-analysis
2. `sentiment-reader`
   - roles: Sentiment Analyst
   - tools: get_sentiment
3. `risk-guard`
   - roles: Risk Analyst
   - tools: none required; deterministic checks
4. `copy-trading-scout`
   - roles: Portfolio Manager extension
   - tools: scorecard reads later
5. `market-regime-adapter`
   - roles: Technical Analyst, Risk Analyst
   - tools: regime detector

Rules:

- Every active agent gets `risk-guard` and `market-regime-adapter` by default.
- Launch wizard can select optional packs later.
- Existing `agents.skills` remains as a text fallback during migration.

New API:

```txt
GET /api/intelligence/skill-packs
GET /api/intelligence/agents/:id/skill-packs
PUT /api/intelligence/agents/:id/skill-packs
```

### 6.7 Market Regime Detector

Classifies each symbol/timeframe before committee analysis.

Initial deterministic detector:

```txt
trendScore = normalized moving-average slope
volatilityScore = ATR-like range / price
liquidityScore = volume ratio proxy
sentimentShockScore = abs(sentiment score) + sentiment volume spike
```

Regime mapping:

- `trending`: high trend, moderate volatility
- `ranging`: low trend, low/moderate volatility
- `volatile`: high volatility
- `news_driven`: high sentiment shock
- `low_liquidity`: low volume/liquidity proxy
- `mixed`: no clear classification

Risk integration:

- volatile -> reduce size or require higher confidence
- low_liquidity -> block or reduce size
- news_driven -> require sentiment + technical agreement

---

## 7. API Design

Create `src/routes/intelligence.ts`.

Endpoints:

```txt
GET /api/intelligence/agents/:id/decisions
GET /api/intelligence/agents/:id/decisions/:decisionId
GET /api/intelligence/agents/:id/committee-reports
GET /api/intelligence/agents/:id/reflections
GET /api/intelligence/agents/:id/scorecard
GET /api/intelligence/scorecards?window=7d
GET /api/intelligence/skill-packs
GET /api/intelligence/agents/:id/skill-packs
PUT /api/intelligence/agents/:id/skill-packs
GET /api/intelligence/market-regimes?symbol=BTC/USD&timeframe=1h
GET /api/intelligence/agents/:id/risk-policy
PUT /api/intelligence/agents/:id/risk-policy
```

Authentication:

- Reads can be public except private agent config if needed later.
- Writes require auth and agent ownership.

OpenAPI:

- Add all endpoints to `src/lib/openapi.ts` after implementation.

---

## 8. Frontend Design

Initial frontend surfaces:

### Agent detail

Add an “Intelligence” section or tab with:

- current market regime
- latest committee vote
- calibrated confidence
- risk approval/block reason
- latest reflection
- scorecard breakdown

### Discover

Enhance agent cards with:

- TrivoScore
- risk-adjusted score
- consistency score
- active skill packs

### Launch wizard

Later phase:

- choose skill packs
- configure risk policy
- preview “agent constitution” before launch

Frontend implementation can be phased after backend tables/services exist.

---

## 9. Error Handling

- If one analyst role fails, store a failed report and continue if quorum is met.
- If Portfolio Manager fails, fallback to hold.
- If calibration fails, use conservative confidence `0` and block opens.
- If risk policy load fails, use safe default policy.
- If scorecard update fails, do not block trading; log and retry later.
- If reflection generation fails, position close still succeeds.

---

## 10. Testing Strategy

Backend unit tests:

- `committee-runner.test.ts`: role outputs compose into a final decision.
- `risk-constitution.test.ts`: blocks leverage, size, low confidence, cooldown, max positions.
- `confidence-calibrator.test.ts`: formula produces expected scores and thresholds.
- `regime-detector.test.ts`: classifies trending/ranging/volatile/news-driven fixtures.
- `scorecard-service.test.ts`: score formula and clamping.
- `skill-pack-resolver.test.ts`: default packs and agent overrides.
- `reflection-generator.test.ts`: creates reflection for closed position.

Integration tests:

- Agent cycle stores `agent_decisions` and `committee_reports`.
- Blocked trade stores decision but does not execute tool.
- Closed trade creates reflection and updates scorecard.
- Intelligence API returns scorecard/decisions/reflections.

Verification commands:

```bash
cd trivo-backend
pnpm run typecheck
pnpm exec vitest run src/engine
pnpm exec vitest run src/routes/intelligence.test.ts
```

Full existing `pnpm run check` should be run after known repo-wide lint blockers are fixed or explicitly documented.

---

## 11. Rollout Plan

### Phase 1 — Data model and read APIs

- Add tables.
- Add intelligence routes.
- Seed built-in skill packs.
- Add scorecard read endpoint with empty/default response.

### Phase 2 — Regime, calibration, and risk constitution

- Implement regime detector.
- Implement confidence calibrator.
- Replace/extend existing risk gates with Risk Constitution.
- Persist blocked/approved decisions.

### Phase 3 — Trading Committee

- Add committee roles.
- Run committee in `AgentRunner`.
- Store committee reports.
- Fallback to current thinking engine on failure.

### Phase 4 — Reflection and scorecards

- Generate reflections after close.
- Inject last reflections into context.
- Update scorecard service.

### Phase 5 — Frontend intelligence surfaces

- Agent detail Intelligence tab.
- Discover score badges/sorting.
- Skill pack display.

---

## 12. Acceptance Criteria

- Active agent cycles create an `agent_decisions` row.
- Committee mode stores role-level `committee_reports`.
- Open trades only execute after Risk Constitution approval.
- Low confidence or over-limit decisions are persisted as blocked and do not execute tools.
- Closed positions generate at least one `agent_reflections` row.
- Scorecards are generated for active agents and available through API.
- Skill packs can be listed and assigned to an agent.
- Market regimes are detected and persisted.
- Agent detail can display latest decision, risk status, confidence, regime, and scorecard.
- Existing open/close trade tools continue to work.
- No OpenBB sidecar or dependency is introduced.

---

## 13. Scope Boundaries

Included:

- Backend schema, services, routes, and tests.
- Minimal frontend display for intelligence outputs.
- Built-in skill packs.
- Deterministic risk/calibration/regime logic.

Not included:

- OpenBB sidecar.
- Real exchange execution.
- New smart contracts.
- Full event-sourcing rewrite.
- Separate microservice.
- Paid external data providers.

---

## 14. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Committee increases latency | Run roles with limited rounds and allow degraded fallback |
| Too many LLM calls | Start with compact prompts and optionally combine Bull/Bear in one call |
| DB schema grows quickly | Keep JSON fields for evidence/tool args while core fields stay queryable |
| Risk layer blocks too much trading | Emit clear block reasons and tune defaults after demo data |
| Scorecard can be gamed by few trades | Minimum-trade dampening and drawdown/consistency weights |
| Prompt context too large | Inject summaries/reflections, not raw full reports |

---

## 15. Implementation Recommendation

Proceed with Option A: integrated production module with event-style records.

Do not rewrite the whole engine. Extend `AgentRunner` step-by-step:

1. Load context and regime.
2. Run committee or fallback thinking.
3. Calibrate confidence.
4. Apply Risk Constitution.
5. Persist decision/report records.
6. Execute tool if approved.
7. Generate reflection and update scorecard asynchronously when relevant.
