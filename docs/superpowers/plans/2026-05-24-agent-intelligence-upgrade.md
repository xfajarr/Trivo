# Agent Intelligence Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Trivo agents into production-ish, auditable trading agents with committee reasoning, deterministic risk approval, persistent reflections, calibrated confidence, scorecards, skill packs, and market regime detection.

**Architecture:** Keep the existing Hono/TypeScript backend and `src/engine/*` runtime. Add focused engine modules plus event-style database records, then extend `AgentRunner` without rewriting tool execution. Build read APIs and minimal frontend surfaces after backend records are stable.

**Tech Stack:** Hono, TypeScript, Drizzle ORM, Vitest, TanStack Start/React, TanStack Query, existing Trivo engine providers/tools, PostgreSQL-compatible text/timestamp schema style.

---

## Scope and sequencing

This plan implements the approved production-ish spec at `docs/superpowers/specs/2026-05-24-agent-intelligence-upgrade-design.md`.

Included:

1. Trading Committee Mode.
2. Risk Constitution Layer.
3. Persistent Decision Memory + Reflection.
4. Confidence Calibration Formula.
5. Agent Scorecard for Copy Trading.
6. Skill Pack System.
7. Market Regime Detector.

Excluded:

- OpenBB sidecar.
- New smart contracts.
- Separate microservice.
- Real exchange execution.

Known repository caveat:

- `trivo-backend/pnpm run check` currently has unrelated lint friction in existing backend files. Each task below uses targeted tests and `pnpm run typecheck`; run full `check` after repo-wide lint cleanup.

---

## File Structure Plan

### Backend schema and shared types

- Modify: `trivo-backend/src/lib/schema.ts`
  - Add `agentDecisions`, `committeeReports`, `agentReflections`, `agentScorecards`, `agentRiskPolicies`, `skillPacks`, `agentSkillPacks`, `marketRegimes`.

- Create: `trivo-backend/src/engine/intelligence-types.ts`
  - Central shared interfaces for regimes, committee roles, calibrated confidence, risk decisions, scorecard values, and skill pack configs.

### Backend intelligence modules

- Create: `trivo-backend/src/engine/regime/regime-detector.ts`
  - Deterministic regime classification from `MarketContext`.

- Create: `trivo-backend/src/engine/committee/roles.ts`
  - Role constants and role output types.

- Create: `trivo-backend/src/engine/committee/committee-runner.ts`
  - Runs compact role analyses and produces a final committee decision.

- Create: `trivo-backend/src/engine/confidence/confidence-calibrator.ts`
  - Converts raw model confidence plus signal scores into calibrated confidence.

- Create: `trivo-backend/src/engine/risk/risk-policy-loader.ts`
  - Loads persisted risk policy or derives safe defaults from agent fields.

- Create: `trivo-backend/src/engine/risk/risk-constitution.ts`
  - Deterministic trade approval/block layer.

- Create: `trivo-backend/src/engine/skills/skill-pack-registry.ts`
  - Built-in skill pack definitions.

- Create: `trivo-backend/src/engine/skills/skill-pack-resolver.ts`
  - Resolves default + agent-selected skill packs.

- Create: `trivo-backend/src/engine/memory/decision-memory.ts`
  - Persists decisions, committee reports, and market regimes.

- Create: `trivo-backend/src/engine/memory/reflection-generator.ts`
  - Generates structured reflections for closed trades.

- Create: `trivo-backend/src/engine/scoring/score-formula.ts`
  - Pure TrivoScore formula.

- Create: `trivo-backend/src/engine/scoring/scorecard-service.ts`
  - Updates and reads agent scorecards.

### Backend route/API

- Create: `trivo-backend/src/routes/intelligence.ts`
  - Read APIs for decisions, reports, reflections, scorecards, skill packs, regimes, and risk policy.

- Modify: `trivo-backend/src/index.ts`
  - Mount `app.route('/api/intelligence', intelligenceRoutes)`.

- Modify: `trivo-backend/src/lib/openapi.ts`
  - Document new intelligence endpoints.

### Backend orchestration

- Modify: `trivo-backend/src/engine/agent-runner.ts`
  - Insert regime detection, skill pack resolving, committee decision, confidence calibration, risk constitution, decision recording, reflection/scorecard updates.

- Modify: `trivo-backend/src/engine/types.ts`
  - Extend `MarketContext` with optional reflections and regime hints.

- Modify: `trivo-backend/src/engine/thinking/context-builder.ts`
  - Load recent usable reflections into context.

### Frontend minimal surfaces

- Create: `trivo-frontend/src/hooks/useIntelligence.ts`
  - TanStack Query hooks for scorecard/latest decisions/regimes/skill packs.

- Modify: `trivo-frontend/src/lib/api.ts`
  - Add `intelligenceApi` client.

- Modify: `trivo-frontend/src/routes/agent.$id.tsx`
  - Add Intelligence tab with latest decision, regime, risk status, scorecard, reflection.

- Modify: `trivo-frontend/src/routes/discover.tsx`
  - Add TrivoScore and skill-pack labels if available.

---

## Task 1: Add intelligence schema and shared types

**Files:**
- Modify: `trivo-backend/src/lib/schema.ts`
- Create: `trivo-backend/src/engine/intelligence-types.ts`
- Test: `trivo-backend/src/engine/__tests__/intelligence-types.test.ts`

### Objective

Create durable event-style tables and shared TypeScript contracts for all intelligence features.

- [ ] **Step 1: Write the shared type smoke test**

Create `trivo-backend/src/engine/__tests__/intelligence-types.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { CommitteeRole, MarketRegime, RiskDecisionStatus } from '../intelligence-types.js'

function acceptsRole(role: CommitteeRole) { return role }
function acceptsRegime(regime: MarketRegime) { return regime }
function acceptsRiskStatus(status: RiskDecisionStatus) { return status }

describe('intelligence shared types', () => {
  it('allows expected committee roles and regimes', () => {
    expect(acceptsRole('technical_analyst')).toBe('technical_analyst')
    expect(acceptsRole('portfolio_manager')).toBe('portfolio_manager')
    expect(acceptsRegime('volatile')).toBe('volatile')
    expect(acceptsRiskStatus('blocked')).toBe('blocked')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
cd trivo-backend
pnpm exec vitest run src/engine/__tests__/intelligence-types.test.ts
```

Expected: fail because `src/engine/intelligence-types.ts` does not exist.

- [ ] **Step 3: Add shared intelligence types**

Create `trivo-backend/src/engine/intelligence-types.ts`:

```ts
import type { ActionType, RiskLevel } from './types.js'

export type CommitteeRole =
  | 'technical_analyst'
  | 'sentiment_analyst'
  | 'risk_analyst'
  | 'bull_researcher'
  | 'bear_researcher'
  | 'portfolio_manager'

export type CommitteeStance =
  | 'bullish'
  | 'bearish'
  | 'neutral'
  | 'risk_off'
  | 'approve'
  | 'reject'

export type MarketRegime =
  | 'trending'
  | 'ranging'
  | 'volatile'
  | 'news_driven'
  | 'low_liquidity'
  | 'mixed'

export type RiskDecisionStatus = 'approved' | 'blocked' | 'degraded'
export type AgentDecisionStatus = 'proposed' | 'executed' | 'failed' | 'skipped'
export type SkillPackCategory = 'analysis' | 'execution' | 'risk' | 'social' | 'copy_trading'

export interface CommitteeRoleReport {
  role: CommitteeRole
  stance: CommitteeStance
  confidence: number
  summary: string
  evidence: Record<string, unknown>
  modelProvider?: string
  latencyMs?: number
}

export interface CommitteeDecision {
  action: ActionType
  tool: string | null
  args: Record<string, unknown> | null
  rawConfidence: number
  riskLevel: RiskLevel
  reasoning: string
  abortConditions: string[]
  roleReports: CommitteeRoleReport[]
  debateSummary: string
  market: string
}

export interface MarketRegimeSnapshot {
  symbol: string
  timeframe: string
  regime: MarketRegime
  trendScore: number
  volatilityScore: number
  liquidityScore: number
  sentimentShockScore: number
  confidence: number
  evidence: Record<string, unknown>
}

export interface CalibratedConfidence {
  rawConfidence: number
  calibratedConfidence: number
  technicalScore: number
  sentimentScore: number
  riskScore: number
  memoryScore: number
  committeeAgreementScore: number
  explanation: string
}

export interface RiskConstitutionDecision {
  allowed: boolean
  status: RiskDecisionStatus
  reason: string
  checks: Array<{ name: string; passed: boolean; detail: string }>
}

export interface AgentRiskPolicy {
  maxOpenPositions: number
  maxLeverageX: number
  maxTradeUsd: number
  maxDailyLossUsd: number
  minConfidenceOpen: number
  minConfidenceClose: number
  cooldownMinutes: number
  blockIfRegime: MarketRegime[]
  requireCommitteeQuorum: number
  enabled: boolean
}

export interface SkillPackDefinition {
  id: string
  name: string
  slug: string
  description: string
  category: SkillPackCategory
  toolNames: string[]
  committeeRoles: CommitteeRole[]
  defaultConfig: Record<string, unknown>
}

export interface ScorecardInput {
  realizedPnlUsd: number
  winRatePct: number
  maxDrawdownPct: number
  consistencyPct: number
  riskAdjustedReturn: number
  explanationCompletenessPct: number
  totalTrades: number
}

export interface ScorecardResult {
  trivoScore: number
  realizedPnlScore: number
  winRateScore: number
  drawdownScore: number
  consistencyScore: number
  riskAdjustedScore: number
  explanationScore: number
}
```

- [ ] **Step 4: Add schema tables**

Modify `trivo-backend/src/lib/schema.ts`. Change the first import to keep existing style:

```ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
```

Append these table definitions after `agentTools`:

```ts
export const agentDecisions = pgTable('agent_decisions', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  cycleId: text('cycle_id').notNull(),
  market: text('market'),
  action: text('action').notNull(),
  toolName: text('tool_name'),
  toolArgs: text('tool_args'),
  rawConfidence: text('raw_confidence'),
  calibratedConfidence: text('calibrated_confidence'),
  riskLevel: text('risk_level'),
  marketRegimeId: text('market_regime_id'),
  committeeSummary: text('committee_summary'),
  riskDecision: text('risk_decision'),
  riskReason: text('risk_reason'),
  finalReasoning: text('final_reasoning'),
  txHash: text('tx_hash'),
  positionId: text('position_id'),
  status: text('status').default('proposed'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const committeeReports = pgTable('committee_reports', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  decisionId: text('decision_id').notNull(),
  cycleId: text('cycle_id').notNull(),
  role: text('role').notNull(),
  stance: text('stance').notNull(),
  confidence: text('confidence'),
  summary: text('summary'),
  evidence: text('evidence'),
  modelProvider: text('model_provider'),
  latencyMs: text('latency_ms'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const agentReflections = pgTable('agent_reflections', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  decisionId: text('decision_id'),
  positionId: text('position_id'),
  outcomePnl: text('outcome_pnl'),
  outcomePnlPct: text('outcome_pnl_pct'),
  wasCorrect: text('was_correct'),
  lesson: text('lesson'),
  mistakePattern: text('mistake_pattern'),
  improvement: text('improvement'),
  usableInPrompt: text('usable_in_prompt').default('true'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const agentScorecards = pgTable('agent_scorecards', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  window: text('window').notNull(),
  trivoScore: text('trivo_score'),
  realizedPnlScore: text('realized_pnl_score'),
  winRateScore: text('win_rate_score'),
  drawdownScore: text('drawdown_score'),
  consistencyScore: text('consistency_score'),
  riskAdjustedScore: text('risk_adjusted_score'),
  explanationScore: text('explanation_score'),
  totalTrades: text('total_trades'),
  maxDrawdownPct: text('max_drawdown_pct'),
  sharpeLikeRatio: text('sharpe_like_ratio'),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const agentRiskPolicies = pgTable('agent_risk_policies', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  maxOpenPositions: text('max_open_positions'),
  maxLeverageX: text('max_leverage_x'),
  maxTradeUsd: text('max_trade_usd'),
  maxDailyLossUsd: text('max_daily_loss_usd'),
  minConfidenceOpen: text('min_confidence_open'),
  minConfidenceClose: text('min_confidence_close'),
  cooldownMinutes: text('cooldown_minutes'),
  blockIfRegime: text('block_if_regime'),
  requireCommitteeQuorum: text('require_committee_quorum'),
  enabled: text('enabled').default('true'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const skillPacks = pgTable('skill_packs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  category: text('category'),
  toolNames: text('tool_names'),
  committeeRoles: text('committee_roles'),
  defaultConfig: text('default_config'),
  enabled: text('enabled').default('true'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const agentSkillPacks = pgTable('agent_skill_packs', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  skillPackId: text('skill_pack_id').notNull(),
  config: text('config'),
  enabled: text('enabled').default('true'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const marketRegimes = pgTable('market_regimes', {
  id: text('id').primaryKey(),
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').notNull(),
  regime: text('regime').notNull(),
  trendScore: text('trend_score'),
  volatilityScore: text('volatility_score'),
  liquidityScore: text('liquidity_score'),
  sentimentShockScore: text('sentiment_shock_score'),
  confidence: text('confidence'),
  evidence: text('evidence'),
  createdAt: timestamp('created_at').defaultNow(),
})
```

- [ ] **Step 5: Run type smoke test and typecheck**

Run:

```bash
cd trivo-backend
pnpm exec vitest run src/engine/__tests__/intelligence-types.test.ts
pnpm run typecheck
```

Expected: test passes and TypeScript passes.

- [ ] **Step 6: Commit schema and types**

```bash
git add trivo-backend/src/lib/schema.ts trivo-backend/src/engine/intelligence-types.ts trivo-backend/src/engine/__tests__/intelligence-types.test.ts
git commit -m "feat(intelligence): add event-style schema"
```

---

## Task 2: Add market regime detector

**Files:**
- Create: `trivo-backend/src/engine/regime/regime-detector.ts`
- Test: `trivo-backend/src/engine/regime/regime-detector.test.ts`

### Objective

Classify market conditions deterministically from existing `MarketContext` without new external providers.

- [ ] **Step 1: Write regime detector tests**

Create `trivo-backend/src/engine/regime/regime-detector.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { MarketContext } from '../types.js'
import { detectMarketRegime } from './regime-detector.js'

function baseContext(overrides: Partial<MarketContext> = {}): MarketContext {
  return {
    prices: { 'BTC/USD': 100 },
    priceChanges: { 'BTC/USD': { hour: 0, day: 0 } },
    sentiment: { BTC: { score: 0, sentiment: 'neutral', volume: 100 } },
    technicalAnalysis: {
      'BTC/USD': {
        timeframes: [{ timeframe: '1h', trend: 'neutral', strength: 40 }],
        supportResistance: { supports: [95], resistances: [105], nearestSupport: 95, nearestResistance: 105, description: 'range' },
        volume: { currentVolume: 100, averageVolume: 100, volumeRatio: 1, trend: 'normal', confirmation: false, description: 'normal' },
        patterns: [],
        fundingRate: { rate: 0, sentiment: 'neutral', description: 'flat' },
        correlation: { pair1: 'BTC', pair2: 'ETH', coefficient: 0.5, trend: 'correlated', description: 'normal' },
        overallBias: 'neutral',
        confidence: 40,
        summary: 'neutral',
      },
    },
    recentTrades: [],
    openPositions: [],
    todayPnl: 0,
    winRate: 0,
    totalTrades: 0,
    ...overrides,
  }
}

describe('detectMarketRegime', () => {
  it('detects trending markets from high trend strength', () => {
    const ctx = baseContext({
      technicalAnalysis: {
        'BTC/USD': {
          ...baseContext().technicalAnalysis!['BTC/USD']!,
          timeframes: [{ timeframe: '1h', trend: 'bullish', strength: 85 }],
          overallBias: 'bullish',
          confidence: 82,
        },
      },
    })

    const result = detectMarketRegime(ctx, 'BTC/USD', '1h')
    expect(result.regime).toBe('trending')
    expect(result.trendScore).toBeGreaterThanOrEqual(80)
  })

  it('detects news-driven markets from sentiment shock', () => {
    const ctx = baseContext({ sentiment: { BTC: { score: 92, sentiment: 'bullish', volume: 900 } } })
    const result = detectMarketRegime(ctx, 'BTC/USD', '1h')
    expect(result.regime).toBe('news_driven')
    expect(result.sentimentShockScore).toBeGreaterThanOrEqual(80)
  })

  it('detects low-liquidity markets from low volume ratio', () => {
    const ta = baseContext().technicalAnalysis!['BTC/USD']!
    const ctx = baseContext({
      technicalAnalysis: {
        'BTC/USD': { ...ta, volume: { ...ta.volume, volumeRatio: 0.2, trend: 'low', description: 'thin' } },
      },
    })
    const result = detectMarketRegime(ctx, 'BTC/USD', '1h')
    expect(result.regime).toBe('low_liquidity')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/regime/regime-detector.test.ts
```

Expected: fail because `regime-detector.ts` does not exist.

- [ ] **Step 3: Implement regime detector**

Create `trivo-backend/src/engine/regime/regime-detector.ts`:

```ts
import type { MarketContext } from '../types.js'
import type { MarketRegimeSnapshot } from '../intelligence-types.js'

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function tokenFromSymbol(symbol: string): string {
  return symbol.split('/')[0] ?? symbol
}

export function detectMarketRegime(
  context: MarketContext,
  symbol = 'BTC/USD',
  timeframe = '1h',
): MarketRegimeSnapshot {
  const ta = context.technicalAnalysis?.[symbol]
  const token = tokenFromSymbol(symbol)
  const sentiment = context.sentiment[token]
  const matchingTf = ta?.timeframes.find((tf) => tf.timeframe === timeframe) ?? ta?.timeframes[0]

  const trendScore = clampScore(Math.max(matchingTf?.strength ?? 0, ta?.confidence ?? 0))
  const volatilityScore = clampScore(
    ta?.patterns.some((pattern) => pattern.strength === 'strong') ? 72 : Math.abs(context.priceChanges[symbol]?.hour ?? 0) * 10,
  )
  const volumeRatio = ta?.volume.volumeRatio ?? 1
  const liquidityScore = clampScore(volumeRatio * 50)
  const sentimentShockScore = clampScore(Math.abs(sentiment?.score ?? 0) * 0.8 + Math.min(sentiment?.volume ?? 0, 1000) / 20)

  const regime = (() => {
    if (sentimentShockScore >= 80) return 'news_driven'
    if (liquidityScore <= 20) return 'low_liquidity'
    if (volatilityScore >= 75) return 'volatile'
    if (trendScore >= 70 && ta?.overallBias !== 'neutral') return 'trending'
    if (trendScore <= 35 && volatilityScore <= 40) return 'ranging'
    return 'mixed'
  })()

  const confidence = clampScore(Math.max(trendScore, volatilityScore, sentimentShockScore, 100 - liquidityScore))

  return {
    symbol,
    timeframe,
    regime,
    trendScore,
    volatilityScore,
    liquidityScore,
    sentimentShockScore,
    confidence,
    evidence: {
      trend: matchingTf,
      overallBias: ta?.overallBias ?? 'neutral',
      volumeRatio,
      sentiment: sentiment ?? null,
    },
  }
}
```

- [ ] **Step 4: Run tests and commit**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/regime/regime-detector.test.ts
pnpm run typecheck
git add trivo-backend/src/engine/regime/regime-detector.ts trivo-backend/src/engine/regime/regime-detector.test.ts
git commit -m "feat(intelligence): detect market regimes"
```

Expected: tests and typecheck pass.

---

## Task 3: Add confidence calibrator

**Files:**
- Create: `trivo-backend/src/engine/confidence/confidence-calibrator.ts`
- Test: `trivo-backend/src/engine/confidence/confidence-calibrator.test.ts`

### Objective

Replace raw model confidence as the execution threshold input with a calibrated signal-weighted score.

- [ ] **Step 1: Write calibration tests**

Create `trivo-backend/src/engine/confidence/confidence-calibrator.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { calibrateConfidence } from './confidence-calibrator.js'

describe('calibrateConfidence', () => {
  it('weights technical, sentiment, risk, memory, and committee agreement scores', () => {
    const result = calibrateConfidence({
      rawConfidence: 80,
      technicalScore: 90,
      sentimentScore: 70,
      riskScore: 80,
      memoryScore: 60,
      committeeAgreementScore: 100,
    })

    expect(result.calibratedConfidence).toBe(83)
    expect(result.explanation).toContain('technical=90')
  })

  it('clamps scores to 0 through 100', () => {
    const result = calibrateConfidence({
      rawConfidence: 120,
      technicalScore: 200,
      sentimentScore: -10,
      riskScore: 100,
      memoryScore: 50,
      committeeAgreementScore: 50,
    })

    expect(result.rawConfidence).toBe(100)
    expect(result.sentimentScore).toBe(0)
    expect(result.calibratedConfidence).toBeLessThanOrEqual(100)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/confidence/confidence-calibrator.test.ts
```

Expected: fail because `confidence-calibrator.ts` does not exist.

- [ ] **Step 3: Implement confidence calibrator**

Create `trivo-backend/src/engine/confidence/confidence-calibrator.ts`:

```ts
import type { CalibratedConfidence } from '../intelligence-types.js'

export interface ConfidenceSignalInput {
  rawConfidence: number
  technicalScore: number
  sentimentScore: number
  riskScore: number
  memoryScore: number
  committeeAgreementScore: number
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function calibrateConfidence(input: ConfidenceSignalInput): CalibratedConfidence {
  const rawConfidence = clamp(input.rawConfidence)
  const technicalScore = clamp(input.technicalScore)
  const sentimentScore = clamp(input.sentimentScore)
  const riskScore = clamp(input.riskScore)
  const memoryScore = clamp(input.memoryScore)
  const committeeAgreementScore = clamp(input.committeeAgreementScore)

  const calibratedConfidence = clamp(
    technicalScore * 0.3 +
    sentimentScore * 0.2 +
    riskScore * 0.2 +
    memoryScore * 0.15 +
    committeeAgreementScore * 0.15,
  )

  return {
    rawConfidence,
    calibratedConfidence,
    technicalScore,
    sentimentScore,
    riskScore,
    memoryScore,
    committeeAgreementScore,
    explanation: `technical=${technicalScore}, sentiment=${sentimentScore}, risk=${riskScore}, memory=${memoryScore}, committee=${committeeAgreementScore}`,
  }
}
```

- [ ] **Step 4: Run tests and commit**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/confidence/confidence-calibrator.test.ts
pnpm run typecheck
git add trivo-backend/src/engine/confidence/confidence-calibrator.ts trivo-backend/src/engine/confidence/confidence-calibrator.test.ts
git commit -m "feat(intelligence): calibrate decision confidence"
```

Expected: tests and typecheck pass.

---

## Task 4: Add risk policy loader and Risk Constitution

**Files:**
- Create: `trivo-backend/src/engine/risk/risk-policy-loader.ts`
- Create: `trivo-backend/src/engine/risk/risk-constitution.ts`
- Test: `trivo-backend/src/engine/risk/risk-constitution.test.ts`

### Objective

Create a deterministic approval layer that blocks unsafe opens and records precise reasons.

- [ ] **Step 1: Write risk constitution tests**

Create `trivo-backend/src/engine/risk/risk-constitution.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { AgentRiskPolicy, CommitteeDecision, MarketRegimeSnapshot } from '../intelligence-types.js'
import { evaluateRiskConstitution } from './risk-constitution.js'

const policy: AgentRiskPolicy = {
  maxOpenPositions: 3,
  maxLeverageX: 2,
  maxTradeUsd: 50,
  maxDailyLossUsd: 25,
  minConfidenceOpen: 65,
  minConfidenceClose: 45,
  cooldownMinutes: 10,
  blockIfRegime: ['low_liquidity'],
  requireCommitteeQuorum: 4,
  enabled: true,
}

const decision: CommitteeDecision = {
  action: 'open_trade',
  tool: 'open_trade',
  args: { size: 50, leverage: 2, pair: 'BTC/USD' },
  rawConfidence: 80,
  riskLevel: 'medium',
  reasoning: 'valid setup',
  abortConditions: [],
  roleReports: [
    { role: 'technical_analyst', stance: 'bullish', confidence: 80, summary: 'up', evidence: {} },
    { role: 'sentiment_analyst', stance: 'bullish', confidence: 70, summary: 'positive', evidence: {} },
    { role: 'risk_analyst', stance: 'approve', confidence: 75, summary: 'ok', evidence: {} },
    { role: 'portfolio_manager', stance: 'approve', confidence: 82, summary: 'approve', evidence: {} },
  ],
  debateSummary: 'bull case wins',
  market: 'BTC/USD',
}

const regime: MarketRegimeSnapshot = {
  symbol: 'BTC/USD',
  timeframe: '1h',
  regime: 'trending',
  trendScore: 80,
  volatilityScore: 30,
  liquidityScore: 60,
  sentimentShockScore: 20,
  confidence: 80,
  evidence: {},
}

describe('evaluateRiskConstitution', () => {
  it('approves a valid open trade', () => {
    const result = evaluateRiskConstitution({ decision, calibratedConfidence: 72, policy, regime, openPositionCount: 1, todayPnl: 0, minutesSinceLastTrade: 20 })
    expect(result.allowed).toBe(true)
    expect(result.status).toBe('approved')
  })

  it('blocks low confidence open trades', () => {
    const result = evaluateRiskConstitution({ decision, calibratedConfidence: 50, policy, regime, openPositionCount: 1, todayPnl: 0, minutesSinceLastTrade: 20 })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('confidence')
  })

  it('blocks regimes listed in the policy', () => {
    const result = evaluateRiskConstitution({ decision, calibratedConfidence: 80, policy, regime: { ...regime, regime: 'low_liquidity' }, openPositionCount: 1, todayPnl: 0, minutesSinceLastTrade: 20 })
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('regime')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/risk/risk-constitution.test.ts
```

Expected: fail because `risk-constitution.ts` does not exist.

- [ ] **Step 3: Implement risk policy loader**

Create `trivo-backend/src/engine/risk/risk-policy-loader.ts`:

```ts
import { db } from '../../lib/db.js'
import { agentRiskPolicies } from '../../lib/schema.js'
import { eq } from 'drizzle-orm'
import type { AgentRiskPolicy, MarketRegime } from '../intelligence-types.js'

function parseBlockedRegimes(value: string | null | undefined): MarketRegime[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as MarketRegime[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean) as MarketRegime[]
  }
}

export function deriveDefaultRiskPolicy(agent: { maxLeverage?: string | null; spendLimit?: string | null; stopLossPct?: string | null }): AgentRiskPolicy {
  const maxLeverageX = Number(agent.maxLeverage ?? 2) || 2
  const maxTradeUsd = Number(agent.spendLimit ?? 50) || 50
  const maxDailyLossUsd = Math.max(25, maxTradeUsd * 0.5)

  return {
    maxOpenPositions: 3,
    maxLeverageX,
    maxTradeUsd,
    maxDailyLossUsd,
    minConfidenceOpen: 65,
    minConfidenceClose: 45,
    cooldownMinutes: 10,
    blockIfRegime: ['low_liquidity'],
    requireCommitteeQuorum: 4,
    enabled: true,
  }
}

export async function loadRiskPolicy(agentId: string, agent: { maxLeverage?: string | null; spendLimit?: string | null; stopLossPct?: string | null }): Promise<AgentRiskPolicy> {
  const row = await db.query.agentRiskPolicies.findFirst({ where: eq(agentRiskPolicies.agentId, agentId) }).catch(() => null)
  if (!row) return deriveDefaultRiskPolicy(agent)

  return {
    maxOpenPositions: Number(row.maxOpenPositions ?? 3),
    maxLeverageX: Number(row.maxLeverageX ?? agent.maxLeverage ?? 2),
    maxTradeUsd: Number(row.maxTradeUsd ?? agent.spendLimit ?? 50),
    maxDailyLossUsd: Number(row.maxDailyLossUsd ?? 25),
    minConfidenceOpen: Number(row.minConfidenceOpen ?? 65),
    minConfidenceClose: Number(row.minConfidenceClose ?? 45),
    cooldownMinutes: Number(row.cooldownMinutes ?? 10),
    blockIfRegime: parseBlockedRegimes(row.blockIfRegime),
    requireCommitteeQuorum: Number(row.requireCommitteeQuorum ?? 4),
    enabled: row.enabled !== 'false',
  }
}
```

- [ ] **Step 4: Implement Risk Constitution**

Create `trivo-backend/src/engine/risk/risk-constitution.ts`:

```ts
import type { AgentRiskPolicy, CommitteeDecision, MarketRegimeSnapshot, RiskConstitutionDecision } from '../intelligence-types.js'

interface RiskConstitutionInput {
  decision: CommitteeDecision
  calibratedConfidence: number
  policy: AgentRiskPolicy
  regime: MarketRegimeSnapshot
  openPositionCount: number
  todayPnl: number
  minutesSinceLastTrade: number
}

function fail(name: string, detail: string, checks: RiskConstitutionDecision['checks']): RiskConstitutionDecision {
  return { allowed: false, status: 'blocked', reason: `${name}: ${detail}`, checks: [...checks, { name, passed: false, detail }] }
}

export function evaluateRiskConstitution(input: RiskConstitutionInput): RiskConstitutionDecision {
  const checks: RiskConstitutionDecision['checks'] = []
  const { decision, policy, regime } = input

  if (!policy.enabled) return fail('policy_enabled', 'risk policy disabled trading', checks)

  checks.push({ name: 'policy_enabled', passed: true, detail: 'risk policy enabled' })

  if (decision.action === 'hold') {
    return { allowed: true, status: 'approved', reason: 'hold does not require trade execution', checks }
  }

  const quorum = decision.roleReports.filter((report) => report.confidence >= 50).length
  if (quorum < policy.requireCommitteeQuorum) {
    return fail('committee_quorum', `quorum ${quorum} below required ${policy.requireCommitteeQuorum}`, checks)
  }
  checks.push({ name: 'committee_quorum', passed: true, detail: `quorum ${quorum}` })

  if (policy.blockIfRegime.includes(regime.regime)) {
    return fail('market_regime', `regime ${regime.regime} is blocked`, checks)
  }
  checks.push({ name: 'market_regime', passed: true, detail: `regime ${regime.regime} allowed` })

  if (input.todayPnl < -policy.maxDailyLossUsd) {
    return fail('daily_loss', `daily PnL ${input.todayPnl} below -${policy.maxDailyLossUsd}`, checks)
  }
  checks.push({ name: 'daily_loss', passed: true, detail: `daily PnL ${input.todayPnl}` })

  if (input.minutesSinceLastTrade < policy.cooldownMinutes) {
    return fail('cooldown', `${input.minutesSinceLastTrade}m since last trade below ${policy.cooldownMinutes}m`, checks)
  }
  checks.push({ name: 'cooldown', passed: true, detail: `${input.minutesSinceLastTrade}m since last trade` })

  if (decision.action === 'open_trade') {
    if (input.openPositionCount >= policy.maxOpenPositions) return fail('max_open_positions', `${input.openPositionCount} open positions`, checks)

    const args = decision.args ?? {}
    const size = Number(args.size ?? args.sizeUsd ?? 0)
    const leverage = Number(args.leverage ?? 1)

    if (size > policy.maxTradeUsd) return fail('max_trade_usd', `size ${size} exceeds ${policy.maxTradeUsd}`, checks)
    if (leverage > policy.maxLeverageX) return fail('max_leverage', `leverage ${leverage} exceeds ${policy.maxLeverageX}`, checks)
    if (input.calibratedConfidence < policy.minConfidenceOpen) return fail('confidence', `confidence ${input.calibratedConfidence} below ${policy.minConfidenceOpen}`, checks)

    checks.push({ name: 'max_open_positions', passed: true, detail: `${input.openPositionCount}/${policy.maxOpenPositions}` })
    checks.push({ name: 'max_trade_usd', passed: true, detail: `size ${size}` })
    checks.push({ name: 'max_leverage', passed: true, detail: `leverage ${leverage}` })
    checks.push({ name: 'confidence', passed: true, detail: `confidence ${input.calibratedConfidence}` })
  }

  if (decision.action === 'close_trade' && input.calibratedConfidence < policy.minConfidenceClose) {
    return fail('close_confidence', `confidence ${input.calibratedConfidence} below ${policy.minConfidenceClose}`, checks)
  }

  return { allowed: true, status: 'approved', reason: 'all risk constitution checks passed', checks }
}
```

- [ ] **Step 5: Run tests and commit**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/risk/risk-constitution.test.ts
pnpm run typecheck
git add trivo-backend/src/engine/risk/risk-policy-loader.ts trivo-backend/src/engine/risk/risk-constitution.ts trivo-backend/src/engine/risk/risk-constitution.test.ts
git commit -m "feat(intelligence): add risk constitution"
```

Expected: tests and typecheck pass.

---

## Task 5: Add skill pack registry and resolver

**Files:**
- Create: `trivo-backend/src/engine/skills/skill-pack-registry.ts`
- Create: `trivo-backend/src/engine/skills/skill-pack-resolver.ts`
- Test: `trivo-backend/src/engine/skills/skill-pack-resolver.test.ts`

### Objective

Represent strategy capabilities as product-level skill packs and resolve default packs for every active agent.

- [ ] **Step 1: Write resolver tests**

Create `trivo-backend/src/engine/skills/skill-pack-resolver.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { BUILT_IN_SKILL_PACKS } from './skill-pack-registry.js'
import { resolveBuiltInSkillPacks } from './skill-pack-resolver.js'

describe('skill pack resolver', () => {
  it('defines required built-in skill packs', () => {
    const slugs = BUILT_IN_SKILL_PACKS.map((pack) => pack.slug)
    expect(slugs).toContain('technical-momentum')
    expect(slugs).toContain('sentiment-reader')
    expect(slugs).toContain('risk-guard')
    expect(slugs).toContain('copy-trading-scout')
    expect(slugs).toContain('market-regime-adapter')
  })

  it('always includes risk guard and market regime adapter', () => {
    const packs = resolveBuiltInSkillPacks('perp')
    const slugs = packs.map((pack) => pack.slug)
    expect(slugs).toContain('risk-guard')
    expect(slugs).toContain('market-regime-adapter')
  })

  it('includes sentiment reader when agent skills mention sentiment or prediction', () => {
    const packs = resolveBuiltInSkillPacks('prediction,sentiment')
    const slugs = packs.map((pack) => pack.slug)
    expect(slugs).toContain('sentiment-reader')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/skills/skill-pack-resolver.test.ts
```

Expected: fail because skill pack files do not exist.

- [ ] **Step 3: Add built-in skill pack registry**

Create `trivo-backend/src/engine/skills/skill-pack-registry.ts`:

```ts
import type { SkillPackDefinition } from '../intelligence-types.js'

export const BUILT_IN_SKILL_PACKS: SkillPackDefinition[] = [
  {
    id: 'technical-momentum',
    name: 'Technical Momentum',
    slug: 'technical-momentum',
    description: 'Uses technical analysis, trend strength, and support/resistance for directional setups.',
    category: 'analysis',
    toolNames: ['get_price'],
    committeeRoles: ['technical_analyst', 'portfolio_manager'],
    defaultConfig: { preferredMarkets: ['BTC/USD', 'ETH/USD', 'SOL/USD'] },
  },
  {
    id: 'sentiment-reader',
    name: 'Sentiment Reader',
    slug: 'sentiment-reader',
    description: 'Uses social and market sentiment to confirm or fade directional bias.',
    category: 'social',
    toolNames: ['get_sentiment'],
    committeeRoles: ['sentiment_analyst'],
    defaultConfig: { timeframe: '4h' },
  },
  {
    id: 'risk-guard',
    name: 'Risk Guard',
    slug: 'risk-guard',
    description: 'Applies deterministic risk rules before execution.',
    category: 'risk',
    toolNames: [],
    committeeRoles: ['risk_analyst'],
    defaultConfig: { strict: true },
  },
  {
    id: 'copy-trading-scout',
    name: 'Copy Trading Scout',
    slug: 'copy-trading-scout',
    description: 'Evaluates copy-trading suitability using scorecard and consistency signals.',
    category: 'copy_trading',
    toolNames: [],
    committeeRoles: ['portfolio_manager'],
    defaultConfig: { minTrivoScore: 60 },
  },
  {
    id: 'market-regime-adapter',
    name: 'Market Regime Adapter',
    slug: 'market-regime-adapter',
    description: 'Adapts trade size and confidence requirements to trending, volatile, and low-liquidity regimes.',
    category: 'analysis',
    toolNames: [],
    committeeRoles: ['technical_analyst', 'risk_analyst'],
    defaultConfig: { reduceSizeInVolatileRegime: true },
  },
]
```

- [ ] **Step 4: Add resolver**

Create `trivo-backend/src/engine/skills/skill-pack-resolver.ts`:

```ts
import { BUILT_IN_SKILL_PACKS } from './skill-pack-registry.js'
import type { SkillPackDefinition } from '../intelligence-types.js'

function bySlug(slug: string): SkillPackDefinition {
  const pack = BUILT_IN_SKILL_PACKS.find((item) => item.slug === slug)
  if (!pack) throw new Error(`Missing built-in skill pack: ${slug}`)
  return pack
}

export function resolveBuiltInSkillPacks(agentSkills: string | null | undefined): SkillPackDefinition[] {
  const skillText = (agentSkills ?? '').toLowerCase()
  const slugs = new Set<string>(['risk-guard', 'market-regime-adapter', 'technical-momentum'])

  if (skillText.includes('prediction') || skillText.includes('sentiment') || skillText.includes('polymarket')) {
    slugs.add('sentiment-reader')
  }

  if (skillText.includes('copy')) {
    slugs.add('copy-trading-scout')
  }

  return [...slugs].map(bySlug)
}
```

- [ ] **Step 5: Run tests and commit**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/skills/skill-pack-resolver.test.ts
pnpm run typecheck
git add trivo-backend/src/engine/skills/skill-pack-registry.ts trivo-backend/src/engine/skills/skill-pack-resolver.ts trivo-backend/src/engine/skills/skill-pack-resolver.test.ts
git commit -m "feat(intelligence): add skill packs"
```

Expected: tests and typecheck pass.

---

## Task 6: Add score formula and scorecard service

**Files:**
- Create: `trivo-backend/src/engine/scoring/score-formula.ts`
- Create: `trivo-backend/src/engine/scoring/scorecard-service.ts`
- Test: `trivo-backend/src/engine/scoring/score-formula.test.ts`

### Objective

Create transparent scorecard math for copy trading rankings.

- [ ] **Step 1: Write score formula tests**

Create `trivo-backend/src/engine/scoring/score-formula.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { calculateScorecard } from './score-formula.js'

describe('calculateScorecard', () => {
  it('calculates weighted TrivoScore from sub-scores', () => {
    const result = calculateScorecard({
      realizedPnlUsd: 120,
      winRatePct: 60,
      maxDrawdownPct: 10,
      consistencyPct: 70,
      riskAdjustedReturn: 1.2,
      explanationCompletenessPct: 80,
      totalTrades: 10,
    })

    expect(result.trivoScore).toBeGreaterThan(60)
    expect(result.winRateScore).toBe(60)
    expect(result.explanationScore).toBe(80)
  })

  it('dampens low sample size agents', () => {
    const result = calculateScorecard({
      realizedPnlUsd: 1000,
      winRatePct: 100,
      maxDrawdownPct: 0,
      consistencyPct: 100,
      riskAdjustedReturn: 5,
      explanationCompletenessPct: 100,
      totalTrades: 1,
    })

    expect(result.trivoScore).toBeLessThan(70)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/scoring/score-formula.test.ts
```

Expected: fail because `score-formula.ts` does not exist.

- [ ] **Step 3: Implement score formula**

Create `trivo-backend/src/engine/scoring/score-formula.ts`:

```ts
import type { ScorecardInput, ScorecardResult } from '../intelligence-types.js'

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function calculateScorecard(input: ScorecardInput): ScorecardResult {
  const sampleMultiplier = Math.min(1, Math.max(0.25, input.totalTrades / 10))
  const realizedPnlScore = clamp(50 + Math.tanh(input.realizedPnlUsd / 250) * 50)
  const winRateScore = clamp(input.winRatePct)
  const drawdownScore = clamp(100 - input.maxDrawdownPct * 3)
  const consistencyScore = clamp(input.consistencyPct)
  const riskAdjustedScore = clamp(50 + input.riskAdjustedReturn * 20)
  const explanationScore = clamp(input.explanationCompletenessPct)

  const weighted =
    realizedPnlScore * 0.3 +
    winRateScore * 0.2 +
    drawdownScore * 0.2 +
    consistencyScore * 0.15 +
    riskAdjustedScore * 0.1 +
    explanationScore * 0.05

  return {
    trivoScore: clamp(weighted * sampleMultiplier),
    realizedPnlScore,
    winRateScore,
    drawdownScore,
    consistencyScore,
    riskAdjustedScore,
    explanationScore,
  }
}
```

- [ ] **Step 4: Implement scorecard service**

Create `trivo-backend/src/engine/scoring/scorecard-service.ts`:

```ts
import { db } from '../../lib/db.js'
import { agentDecisions, agentScorecards, positions } from '../../lib/schema.js'
import { eq } from 'drizzle-orm'
import { calculateScorecard } from './score-formula.js'

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export async function updateAgentScorecard(agentId: string, window: '24h' | '7d' | '30d' | 'all' = 'all') {
  const agentPositions = await db.select().from(positions).where(eq(positions.agentId, agentId)).catch(() => [])
  const decisions = await db.select().from(agentDecisions).where(eq(agentDecisions.agentId, agentId)).catch(() => [])

  const closed = agentPositions.filter((position) => position.status === 'closed')
  const pnls = closed.map((position) => Number(position.pnl ?? 0))
  const wins = pnls.filter((pnl) => pnl > 0).length
  const realizedPnlUsd = pnls.reduce((sum, pnl) => sum + pnl, 0)
  const winRatePct = closed.length > 0 ? (wins / closed.length) * 100 : 0
  const maxDrawdownPct = Math.abs(Math.min(0, ...pnls))
  const consistencyPct = pnls.length > 0 ? Math.max(0, 100 - Math.abs(avg(pnls) - realizedPnlUsd / Math.max(1, pnls.length))) : 0
  const riskAdjustedReturn = realizedPnlUsd / Math.max(1, maxDrawdownPct || 1)
  const explained = decisions.filter((decision) => (decision.committeeSummary ?? '').length > 0 && (decision.riskDecision ?? '').length > 0).length
  const explanationCompletenessPct = decisions.length > 0 ? (explained / decisions.length) * 100 : 0

  const score = calculateScorecard({ realizedPnlUsd, winRatePct, maxDrawdownPct, consistencyPct, riskAdjustedReturn, explanationCompletenessPct, totalTrades: closed.length })

  const row = {
    id: crypto.randomUUID(),
    agentId,
    window,
    trivoScore: String(score.trivoScore),
    realizedPnlScore: String(score.realizedPnlScore),
    winRateScore: String(score.winRateScore),
    drawdownScore: String(score.drawdownScore),
    consistencyScore: String(score.consistencyScore),
    riskAdjustedScore: String(score.riskAdjustedScore),
    explanationScore: String(score.explanationScore),
    totalTrades: String(closed.length),
    maxDrawdownPct: String(maxDrawdownPct),
    sharpeLikeRatio: String(riskAdjustedReturn),
    updatedAt: new Date(),
  }

  await db.insert(agentScorecards).values(row).execute().catch(() => {})
  return row
}
```

- [ ] **Step 5: Run tests and commit**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/scoring/score-formula.test.ts
pnpm run typecheck
git add trivo-backend/src/engine/scoring/score-formula.ts trivo-backend/src/engine/scoring/scorecard-service.ts trivo-backend/src/engine/scoring/score-formula.test.ts
git commit -m "feat(intelligence): calculate agent scorecards"
```

Expected: tests and typecheck pass.

---

## Task 7: Add decision memory and reflection generator

**Files:**
- Create: `trivo-backend/src/engine/memory/decision-memory.ts`
- Create: `trivo-backend/src/engine/memory/reflection-generator.ts`
- Modify: `trivo-backend/src/engine/types.ts`
- Modify: `trivo-backend/src/engine/thinking/context-builder.ts`
- Test: `trivo-backend/src/engine/memory/reflection-generator.test.ts`

### Objective

Persist decision artifacts and inject structured lessons into future cycles.

- [ ] **Step 1: Write reflection generator tests**

Create `trivo-backend/src/engine/memory/reflection-generator.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildReflectionText } from './reflection-generator.js'

describe('buildReflectionText', () => {
  it('creates positive reflection for profitable decisions', () => {
    const result = buildReflectionText({ market: 'BTC/USD', side: 'long', pnl: 12, reasoning: 'trend confirmed' })
    expect(result.wasCorrect).toBe(true)
    expect(result.lesson).toContain('worked')
  })

  it('creates improvement reflection for losing decisions', () => {
    const result = buildReflectionText({ market: 'ETH/USD', side: 'short', pnl: -8, reasoning: 'weak sentiment' })
    expect(result.wasCorrect).toBe(false)
    expect(result.improvement).toContain('Reduce size')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/memory/reflection-generator.test.ts
```

Expected: fail because `reflection-generator.ts` does not export `buildReflectionText`.

- [ ] **Step 3: Implement decision memory persistence**

Create `trivo-backend/src/engine/memory/decision-memory.ts`:

```ts
import { db } from '../../lib/db.js'
import { agentDecisions, committeeReports, marketRegimes } from '../../lib/schema.js'
import type { CalibratedConfidence, CommitteeDecision, MarketRegimeSnapshot, RiskConstitutionDecision } from '../intelligence-types.js'

export async function recordMarketRegime(snapshot: MarketRegimeSnapshot): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(marketRegimes).values({
    id,
    symbol: snapshot.symbol,
    timeframe: snapshot.timeframe,
    regime: snapshot.regime,
    trendScore: String(snapshot.trendScore),
    volatilityScore: String(snapshot.volatilityScore),
    liquidityScore: String(snapshot.liquidityScore),
    sentimentShockScore: String(snapshot.sentimentShockScore),
    confidence: String(snapshot.confidence),
    evidence: JSON.stringify(snapshot.evidence),
  }).execute().catch(() => {})
  return id
}

export async function recordDecision(input: {
  agentId: string
  cycleId: string
  decision: CommitteeDecision
  calibration: CalibratedConfidence
  risk: RiskConstitutionDecision
  marketRegimeId: string
  status: 'proposed' | 'executed' | 'failed' | 'skipped'
}): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(agentDecisions).values({
    id,
    agentId: input.agentId,
    cycleId: input.cycleId,
    market: input.decision.market,
    action: input.risk.allowed ? input.decision.action : 'blocked',
    toolName: input.decision.tool,
    toolArgs: JSON.stringify(input.decision.args ?? {}),
    rawConfidence: String(input.calibration.rawConfidence),
    calibratedConfidence: String(input.calibration.calibratedConfidence),
    riskLevel: input.decision.riskLevel,
    marketRegimeId: input.marketRegimeId,
    committeeSummary: input.decision.debateSummary,
    riskDecision: input.risk.status,
    riskReason: input.risk.reason,
    finalReasoning: input.decision.reasoning,
    status: input.status,
  }).execute().catch(() => {})

  await db.insert(committeeReports).values(input.decision.roleReports.map((report) => ({
    id: crypto.randomUUID(),
    agentId: input.agentId,
    decisionId: id,
    cycleId: input.cycleId,
    role: report.role,
    stance: report.stance,
    confidence: String(report.confidence),
    summary: report.summary,
    evidence: JSON.stringify(report.evidence),
    modelProvider: report.modelProvider,
    latencyMs: report.latencyMs ? String(report.latencyMs) : undefined,
  }))).execute().catch(() => {})

  return id
}
```

- [ ] **Step 4: Implement reflection generator**

Create `trivo-backend/src/engine/memory/reflection-generator.ts`:

```ts
import { db } from '../../lib/db.js'
import { agentReflections } from '../../lib/schema.js'

export interface ReflectionInput {
  market: string
  side: string
  pnl: number
  reasoning: string
}

export function buildReflectionText(input: ReflectionInput) {
  const wasCorrect = input.pnl > 0
  const direction = `${input.side.toUpperCase()} ${input.market}`

  return {
    wasCorrect,
    lesson: wasCorrect
      ? `${direction} worked because the thesis held: ${input.reasoning.slice(0, 160)}`
      : `${direction} failed because the thesis did not hold: ${input.reasoning.slice(0, 160)}`,
    mistakePattern: wasCorrect ? 'none' : 'entered before confirmation or ignored adverse risk context',
    improvement: wasCorrect ? 'Keep requiring signal alignment before increasing size.' : 'Reduce size, require stronger committee agreement, and wait for confirmation in similar setups.',
  }
}

export async function createTradeReflection(input: {
  agentId: string
  decisionId?: string
  positionId?: string
  market: string
  side: string
  pnl: number
  pnlPct: number
  reasoning: string
}) {
  const reflection = buildReflectionText({ market: input.market, side: input.side, pnl: input.pnl, reasoning: input.reasoning })
  const row = {
    id: crypto.randomUUID(),
    agentId: input.agentId,
    decisionId: input.decisionId,
    positionId: input.positionId,
    outcomePnl: String(input.pnl),
    outcomePnlPct: String(input.pnlPct),
    wasCorrect: String(reflection.wasCorrect),
    lesson: reflection.lesson,
    mistakePattern: reflection.mistakePattern,
    improvement: reflection.improvement,
    usableInPrompt: 'true',
  }

  await db.insert(agentReflections).values(row).execute().catch(() => {})
  return row
}
```

- [ ] **Step 5: Extend MarketContext with reflections**

Modify `trivo-backend/src/engine/types.ts`, inside `MarketContext` add:

```ts
  reflections?: Array<{ lesson: string; improvement: string; wasCorrect: boolean; timestamp: string }>
  regimeHint?: string
```

- [ ] **Step 6: Load reflections in context builder**

Modify `trivo-backend/src/engine/thinking/context-builder.ts` import:

```ts
import { agentMemory, agentReflections, positions } from '../../lib/schema.js'
```

After `openPositions`, add:

```ts
  const reflections = await db.select()
    .from(agentReflections)
    .where(eq(agentReflections.agentId, agentId))
    .orderBy(desc(agentReflections.createdAt))
    .limit(5)
```

Add this property to the returned object:

```ts
    reflections: reflections.map((reflection) => ({
      lesson: reflection.lesson ?? '',
      improvement: reflection.improvement ?? '',
      wasCorrect: reflection.wasCorrect === 'true',
      timestamp: reflection.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
```

In `buildUserPrompt`, before `## Task`, add:

```ts
  const reflectionLines = context.reflections && context.reflections.length > 0
    ? context.reflections.map((reflection) => `- ${reflection.wasCorrect ? 'Worked' : 'Improve'}: ${reflection.lesson} Next: ${reflection.improvement}`).join('\n')
    : 'No structured reflections yet'
```

Then include in the returned prompt before `## Task`:

```txt
## Lessons From Previous Decisions
${reflectionLines}
```

- [ ] **Step 7: Run tests and commit**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/memory/reflection-generator.test.ts
pnpm run typecheck
git add trivo-backend/src/engine/memory/decision-memory.ts trivo-backend/src/engine/memory/reflection-generator.ts trivo-backend/src/engine/memory/reflection-generator.test.ts trivo-backend/src/engine/types.ts trivo-backend/src/engine/thinking/context-builder.ts
git commit -m "feat(intelligence): persist decisions and reflections"
```

Expected: tests and typecheck pass.

---

## Task 8: Add Trading Committee runner

**Files:**
- Create: `trivo-backend/src/engine/committee/roles.ts`
- Create: `trivo-backend/src/engine/committee/committee-runner.ts`
- Test: `trivo-backend/src/engine/committee/committee-runner.test.ts`

### Objective

Produce a committee decision from current market context using deterministic role summaries first, with room for provider-backed prompts afterward.

- [ ] **Step 1: Write committee tests**

Create `trivo-backend/src/engine/committee/committee-runner.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { MarketContext } from '../types.js'
import { runTradingCommittee } from './committee-runner.js'

const context: MarketContext = {
  prices: { 'BTC/USD': 100 },
  priceChanges: { 'BTC/USD': { hour: 1, day: 3 } },
  sentiment: { BTC: { score: 55, sentiment: 'bullish', volume: 200 } },
  technicalAnalysis: {
    'BTC/USD': {
      timeframes: [{ timeframe: '1h', trend: 'bullish', strength: 80 }],
      supportResistance: { supports: [95], resistances: [110], nearestSupport: 95, nearestResistance: 110, description: 'near support' },
      volume: { currentVolume: 200, averageVolume: 100, volumeRatio: 2, trend: 'high', confirmation: true, description: 'confirming' },
      patterns: [{ name: 'breakout', type: 'bullish', strength: 'strong', description: 'breakout' }],
      fundingRate: { rate: 0.01, sentiment: 'neutral', description: 'normal' },
      correlation: { pair1: 'BTC', pair2: 'ETH', coefficient: 0.8, trend: 'correlated', description: 'normal' },
      overallBias: 'bullish',
      confidence: 80,
      summary: 'bullish',
    },
  },
  recentTrades: [],
  openPositions: [],
  todayPnl: 0,
  winRate: 0,
  totalTrades: 0,
}

describe('runTradingCommittee', () => {
  it('returns role reports and a final decision', () => {
    const result = runTradingCommittee({ agentName: 'Demo', strategy: 'Trade BTC momentum', skills: 'perp', context, symbol: 'BTC/USD' })

    expect(result.roleReports).toHaveLength(6)
    expect(result.roleReports.map((report) => report.role)).toContain('portfolio_manager')
    expect(['open_trade', 'hold']).toContain(result.action)
    expect(result.market).toBe('BTC/USD')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/committee/committee-runner.test.ts
```

Expected: fail because committee files do not exist.

- [ ] **Step 3: Add role constants**

Create `trivo-backend/src/engine/committee/roles.ts`:

```ts
import type { CommitteeRole } from '../intelligence-types.js'

export const COMMITTEE_ROLES: CommitteeRole[] = [
  'technical_analyst',
  'sentiment_analyst',
  'risk_analyst',
  'bull_researcher',
  'bear_researcher',
  'portfolio_manager',
]
```

- [ ] **Step 4: Implement committee runner**

Create `trivo-backend/src/engine/committee/committee-runner.ts`:

```ts
import type { CommitteeDecision, CommitteeRoleReport } from '../intelligence-types.js'
import type { MarketContext } from '../types.js'
import { COMMITTEE_ROLES } from './roles.js'

interface CommitteeInput {
  agentName: string
  strategy: string | null
  skills: string | null
  context: MarketContext
  symbol: string
}

function tokenFromSymbol(symbol: string): string {
  return symbol.split('/')[0] ?? symbol
}

function report(role: CommitteeRoleReport['role'], stance: CommitteeRoleReport['stance'], confidence: number, summary: string, evidence: Record<string, unknown>): CommitteeRoleReport {
  return { role, stance, confidence, summary, evidence, modelProvider: 'deterministic-v1', latencyMs: 0 }
}

export function runTradingCommittee(input: CommitteeInput): CommitteeDecision {
  const ta = input.context.technicalAnalysis?.[input.symbol]
  const token = tokenFromSymbol(input.symbol)
  const sentiment = input.context.sentiment[token]
  const openPositionCount = input.context.openPositions.length
  const bullishTechnical = ta?.overallBias === 'bullish' && (ta.confidence ?? 0) >= 60
  const bearishTechnical = ta?.overallBias === 'bearish' && (ta.confidence ?? 0) >= 60
  const bullishSentiment = (sentiment?.score ?? 0) > 20
  const bearishSentiment = (sentiment?.score ?? 0) < -20

  const roleReports: CommitteeRoleReport[] = [
    report('technical_analyst', bullishTechnical ? 'bullish' : bearishTechnical ? 'bearish' : 'neutral', ta?.confidence ?? 50, ta?.summary ?? 'No strong technical edge.', { technicalAnalysis: ta ?? null }),
    report('sentiment_analyst', bullishSentiment ? 'bullish' : bearishSentiment ? 'bearish' : 'neutral', Math.min(100, Math.abs(sentiment?.score ?? 0) + 40), sentiment ? `${sentiment.sentiment} sentiment score ${sentiment.score}` : 'Neutral sentiment.', { sentiment: sentiment ?? null }),
    report('risk_analyst', openPositionCount >= 3 ? 'risk_off' : 'approve', openPositionCount >= 3 ? 80 : 70, `${openPositionCount} open positions.`, { openPositionCount, todayPnl: input.context.todayPnl }),
    report('bull_researcher', bullishTechnical || bullishSentiment ? 'bullish' : 'neutral', bullishTechnical && bullishSentiment ? 82 : 55, 'Bull case checks trend and sentiment alignment.', { bullishTechnical, bullishSentiment }),
    report('bear_researcher', bearishTechnical || bearishSentiment ? 'bearish' : 'neutral', bearishTechnical && bearishSentiment ? 82 : 55, 'Bear case checks downside or reason to avoid longs.', { bearishTechnical, bearishSentiment }),
    report('portfolio_manager', bullishTechnical && bullishSentiment && openPositionCount < 3 ? 'approve' : 'reject', bullishTechnical && bullishSentiment ? 78 : 52, 'Portfolio manager chooses action after committee review.', { strategy: input.strategy, skills: input.skills }),
  ]

  const pm = roleReports.find((item) => item.role === 'portfolio_manager')!
  const shouldOpenLong = pm.stance === 'approve' && bullishTechnical && bullishSentiment
  const shouldOpenShort = pm.stance === 'approve' && bearishTechnical && bearishSentiment

  const action = shouldOpenLong || shouldOpenShort ? 'open_trade' : 'hold'
  const side = shouldOpenShort ? 'short' : 'long'

  return {
    action,
    tool: action === 'open_trade' ? 'open_trade' : null,
    args: action === 'open_trade' ? { venue: 'perp', pair: input.symbol, side, size: 50, leverage: 2 } : null,
    rawConfidence: pm.confidence,
    riskLevel: pm.confidence >= 75 ? 'medium' : 'low',
    reasoning: action === 'open_trade' ? `Committee approved ${side} ${input.symbol}: ${pm.summary}` : 'Committee did not find enough aligned edge to trade.',
    abortConditions: ['risk policy blocks trade', 'market regime changes', 'price invalidates setup'],
    roleReports: COMMITTEE_ROLES.map((role) => roleReports.find((item) => item.role === role)!),
    debateSummary: `Technical=${roleReports[0]!.stance}, Sentiment=${roleReports[1]!.stance}, Risk=${roleReports[2]!.stance}, PM=${pm.stance}`,
    market: input.symbol,
  }
}
```

- [ ] **Step 5: Run tests and commit**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/committee/committee-runner.test.ts
pnpm run typecheck
git add trivo-backend/src/engine/committee/roles.ts trivo-backend/src/engine/committee/committee-runner.ts trivo-backend/src/engine/committee/committee-runner.test.ts
git commit -m "feat(intelligence): add trading committee"
```

Expected: tests and typecheck pass.

---

## Task 9: Integrate intelligence pipeline into AgentRunner

**Files:**
- Modify: `trivo-backend/src/engine/agent-runner.ts`
- Test: `trivo-backend/src/engine/agent-runner.intelligence.test.ts`

### Objective

Use the new pipeline in live cycles while preserving existing tool execution and fallback behavior.

- [ ] **Step 1: Write integration test for blocked risk decision**

Create `trivo-backend/src/engine/agent-runner.intelligence.test.ts` with a small targeted unit for behavior extracted from the runner:

```ts
import { describe, expect, it } from 'vitest'
import { evaluateRiskConstitution } from './risk/risk-constitution.js'

describe('AgentRunner intelligence integration behavior', () => {
  it('uses Risk Constitution to block open trades before tool execution', () => {
    const risk = evaluateRiskConstitution({
      decision: {
        action: 'open_trade',
        tool: 'open_trade',
        args: { pair: 'BTC/USD', side: 'long', size: 500, leverage: 10 },
        rawConfidence: 80,
        riskLevel: 'high',
        reasoning: 'oversized trade',
        abortConditions: [],
        roleReports: [
          { role: 'technical_analyst', stance: 'bullish', confidence: 80, summary: 'up', evidence: {} },
          { role: 'sentiment_analyst', stance: 'bullish', confidence: 80, summary: 'positive', evidence: {} },
          { role: 'risk_analyst', stance: 'approve', confidence: 80, summary: 'ok', evidence: {} },
          { role: 'portfolio_manager', stance: 'approve', confidence: 80, summary: 'approve', evidence: {} },
        ],
        debateSummary: 'approved but too large',
        market: 'BTC/USD',
      },
      calibratedConfidence: 80,
      policy: {
        maxOpenPositions: 3,
        maxLeverageX: 2,
        maxTradeUsd: 50,
        maxDailyLossUsd: 25,
        minConfidenceOpen: 65,
        minConfidenceClose: 45,
        cooldownMinutes: 0,
        blockIfRegime: [],
        requireCommitteeQuorum: 4,
        enabled: true,
      },
      regime: { symbol: 'BTC/USD', timeframe: '1h', regime: 'trending', trendScore: 80, volatilityScore: 20, liquidityScore: 80, sentimentShockScore: 20, confidence: 80, evidence: {} },
      openPositionCount: 0,
      todayPnl: 0,
      minutesSinceLastTrade: 99,
    })

    expect(risk.allowed).toBe(false)
    expect(risk.reason).toContain('max_trade_usd')
  })
})
```

- [ ] **Step 2: Run integration behavior test**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/agent-runner.intelligence.test.ts
```

Expected: pass after prior risk task. This protects the behavior before modifying `AgentRunner`.

- [ ] **Step 3: Add imports to AgentRunner**

Modify `trivo-backend/src/engine/agent-runner.ts` imports:

```ts
import { buildMarketContext } from './thinking/context-builder.js'
import { detectMarketRegime } from './regime/regime-detector.js'
import { runTradingCommittee } from './committee/committee-runner.js'
import { calibrateConfidence } from './confidence/confidence-calibrator.js'
import { loadRiskPolicy } from './risk/risk-policy-loader.js'
import { evaluateRiskConstitution } from './risk/risk-constitution.js'
import { recordDecision, recordMarketRegime } from './memory/decision-memory.js'
import { createTradeReflection } from './memory/reflection-generator.js'
import { updateAgentScorecard } from './scoring/scorecard-service.js'
```

Keep the existing `ThinkingEngine` import because it remains the degraded fallback.

- [ ] **Step 4: Add helper methods in AgentRunner**

Inside `AgentRunner` class, before `runCycle`, add:

```ts
  private primarySymbolForAgent(agent: { skills?: string | null; strategy?: string | null }): string {
    const text = `${agent.skills ?? ''} ${agent.strategy ?? ''}`.toLowerCase()
    if (text.includes('eth')) return 'ETH/USD'
    if (text.includes('sol')) return 'SOL/USD'
    return 'BTC/USD'
  }

  private minutesSinceLastTrade(): number {
    if (this.lastTradeTime === 0) return 999
    return Math.floor((Date.now() - this.lastTradeTime) / 60_000)
  }
```

- [ ] **Step 5: Replace the thinking output block with intelligence pipeline**

In `runCycle`, replace the current block beginning with:

```ts
      const output = await this.thinking.run({
```

through the `if (output.action === 'open_trade')` branch with this structure:

```ts
      const symbol = this.primarySymbolForAgent(agent)
      const context = await buildMarketContext(this.agentId)
      const regime = detectMarketRegime(context, symbol, '1h')
      const marketRegimeId = await recordMarketRegime(regime)
      const committeeDecision = runTradingCommittee({
        agentName: agent.name,
        strategy: agent.strategy,
        skills: agent.skills,
        context,
        symbol,
      })

      const technicalScore = context.technicalAnalysis?.[symbol]?.confidence ?? committeeDecision.rawConfidence
      const token = symbol.split('/')[0] ?? 'BTC'
      const sentimentScore = Math.min(100, Math.abs(context.sentiment[token]?.score ?? 0) + 40)
      const riskScore = Math.max(0, 100 - currentPositions * 20)
      const memoryScore = context.reflections?.some((reflection) => reflection.wasCorrect) ? 70 : 50
      const agreeingReports = committeeDecision.roleReports.filter((report) => report.stance === 'approve' || report.stance === 'bullish' || report.stance === 'bearish').length
      const committeeAgreementScore = Math.round((agreeingReports / Math.max(1, committeeDecision.roleReports.length)) * 100)

      const calibration = calibrateConfidence({
        rawConfidence: committeeDecision.rawConfidence,
        technicalScore,
        sentimentScore,
        riskScore,
        memoryScore,
        committeeAgreementScore,
      })

      const policy = await loadRiskPolicy(this.agentId, agent)
      const riskDecision = evaluateRiskConstitution({
        decision: committeeDecision,
        calibratedConfidence: calibration.calibratedConfidence,
        policy,
        regime,
        openPositionCount: currentPositions,
        todayPnl: context.todayPnl,
        minutesSinceLastTrade: this.minutesSinceLastTrade(),
      })

      await this.saveMemory('reasoning', committeeDecision.reasoning, committeeDecision.debateSummary, {
        rawConfidence: calibration.rawConfidence,
        calibratedConfidence: calibration.calibratedConfidence,
        riskDecision: riskDecision.status,
        regime: regime.regime,
      })

      broadcastAgentEvent(this.agentId, {
        event: 'deciding', agentId: this.agentId,
        content: JSON.stringify({ observation: committeeDecision.debateSummary, confidence: calibration.calibratedConfidence, regime: regime.regime }),
      })

      console.log(`   🧠 raw ${calibration.rawConfidence}% -> calibrated ${calibration.calibratedConfidence}% | ${committeeDecision.action} | ${riskDecision.status}`)

      const decisionId = await recordDecision({
        agentId: this.agentId,
        cycleId: crypto.randomUUID(),
        decision: committeeDecision,
        calibration,
        risk: riskDecision,
        marketRegimeId,
        status: riskDecision.allowed ? 'proposed' : 'skipped',
      })

      if (!riskDecision.allowed) {
        console.log(`   ⛔ ${riskDecision.reason}`)
        await this.createFeedEvent('risk_blocked', committeeDecision.args ?? {}, calibration.calibratedConfidence, riskDecision.reason, 0)
        return
      }

      if (committeeDecision.action === 'hold') {
        console.log(`   🤝 Holding`)
        return
      }

      if (committeeDecision.action === 'close_trade' && committeeDecision.tool === 'close_trade') {
        const closeArgs = (committeeDecision.args || {}) as Record<string, unknown>
        const posId = closeArgs.positionId || openPositions[0]?.id
        if (posId) {
          const result = await this.tools.execute('close_trade', { positionId: posId, reason: committeeDecision.reasoning?.slice(0, 200), _agentId: this.agentId })
          const pnl = parseFloat((result as Record<string, unknown>).pnl as string) || 0
          await this.updateAgentPnL(pnl)
          await createTradeReflection({ agentId: this.agentId, decisionId, positionId: String(posId), market: symbol, side: String(closeArgs.side ?? 'long'), pnl, pnlPct: 0, reasoning: committeeDecision.reasoning })
          await updateAgentScorecard(this.agentId)
          this.dailyTradeCount++; this.lastTradeTime = Date.now()
          await this.createFeedEvent('position_closed', closeArgs, calibration.calibratedConfidence, committeeDecision.reasoning, pnl)
        }
        return
      }

      if (committeeDecision.action === 'open_trade' && committeeDecision.tool) {
        if (!canOpen) {
          console.log(`   ⚠️ FULL (${currentPositions}/${MAX_POSITIONS}) — must close one first`)
          return
        }

        console.log(`   ⚡ ${committeeDecision.tool}`)
        const result = await this.tools.execute(committeeDecision.tool, { ...committeeDecision.args, _agentId: this.agentId })

        await this.saveMemory('execution', `${committeeDecision.tool}: ${JSON.stringify(result)}`, committeeDecision.reasoning, { tool: committeeDecision.tool, args: committeeDecision.args, decisionId })
        this.dailyTradeCount++; this.lastTradeTime = Date.now()

        await this.createFeedEvent('position_opened', committeeDecision.args ?? {}, calibration.calibratedConfidence, committeeDecision.reasoning, 0)
        await this.recordERC8004(agent, result)
        await updateAgentScorecard(this.agentId)

        broadcastAgentEvent(this.agentId, { event: 'execution', agentId: this.agentId, result: { tool: committeeDecision.tool, args: committeeDecision.args, outcome: result } })
        console.log(`   ✅ Done`)
      }
```

This replacement intentionally keeps old `ThinkingEngine` available for a separate fallback task if committee throws before a decision is made. The catch block already protects runtime crashes.

- [ ] **Step 6: Run tests and typecheck**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/agent-runner.intelligence.test.ts
pnpm run typecheck
```

Expected: tests and typecheck pass. If TypeScript reports property names from Drizzle query helpers, update imports and table names to match exported schema names from Task 1.

- [ ] **Step 7: Commit runner integration**

```bash
git add trivo-backend/src/engine/agent-runner.ts trivo-backend/src/engine/agent-runner.intelligence.test.ts
git commit -m "feat(intelligence): integrate committee pipeline"
```

---

## Task 10: Add intelligence API routes

**Files:**
- Create: `trivo-backend/src/routes/intelligence.ts`
- Modify: `trivo-backend/src/index.ts`
- Test: `trivo-backend/src/__tests__/intelligence.test.ts`

### Objective

Expose decision, committee, reflection, scorecard, skill-pack, regime, and risk-policy records.

- [ ] **Step 1: Write intelligence route tests**

Create `trivo-backend/src/__tests__/intelligence.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

const selectLimit = vi.fn().mockResolvedValue([])
const selectWhere = vi.fn(() => ({ orderBy: vi.fn(() => ({ limit: selectLimit })), limit: selectLimit }))
const selectFrom = vi.fn(() => ({ where: selectWhere, orderBy: vi.fn(() => ({ limit: selectLimit })) }))

vi.mock('../lib/db', () => ({
  db: { select: vi.fn(() => ({ from: selectFrom })), query: { agentRiskPolicies: { findFirst: vi.fn().mockResolvedValue(null) } } },
}))

describe('intelligence routes', () => {
  it('returns built-in skill packs', async () => {
    const { intelligenceRoutes } = await import('../routes/intelligence')
    const res = await intelligenceRoutes.request('/skill-packs')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.skillPacks.map((pack: { slug: string }) => pack.slug)).toContain('risk-guard')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trivo-backend
pnpm exec vitest run src/__tests__/intelligence.test.ts
```

Expected: fail because `routes/intelligence.ts` does not exist.

- [ ] **Step 3: Implement intelligence routes**

Create `trivo-backend/src/routes/intelligence.ts`:

```ts
import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { db } from '../lib/db.js'
import { agentDecisions, agentReflections, agentRiskPolicies, agentScorecards, agentSkillPacks, committeeReports, marketRegimes } from '../lib/schema.js'
import { BUILT_IN_SKILL_PACKS } from '../engine/skills/skill-pack-registry.js'
import { deriveDefaultRiskPolicy } from '../engine/risk/risk-policy-loader.js'

export const intelligenceRoutes = new Hono()

intelligenceRoutes.get('/skill-packs', (c) => c.json({ skillPacks: BUILT_IN_SKILL_PACKS }))

intelligenceRoutes.get('/agents/:id/decisions', async (c) => {
  const id = c.req.param('id')
  const rows = await db.select().from(agentDecisions).where(eq(agentDecisions.agentId, id)).orderBy(desc(agentDecisions.createdAt)).limit(25)
  return c.json({ decisions: rows })
})

intelligenceRoutes.get('/agents/:id/committee-reports', async (c) => {
  const id = c.req.param('id')
  const rows = await db.select().from(committeeReports).where(eq(committeeReports.agentId, id)).orderBy(desc(committeeReports.createdAt)).limit(50)
  return c.json({ reports: rows })
})

intelligenceRoutes.get('/agents/:id/reflections', async (c) => {
  const id = c.req.param('id')
  const rows = await db.select().from(agentReflections).where(eq(agentReflections.agentId, id)).orderBy(desc(agentReflections.createdAt)).limit(25)
  return c.json({ reflections: rows })
})

intelligenceRoutes.get('/agents/:id/scorecard', async (c) => {
  const id = c.req.param('id')
  const rows = await db.select().from(agentScorecards).where(eq(agentScorecards.agentId, id)).orderBy(desc(agentScorecards.updatedAt)).limit(4)
  return c.json({ scorecards: rows })
})

intelligenceRoutes.get('/scorecards', async (c) => {
  const rows = await db.select().from(agentScorecards).orderBy(desc(agentScorecards.updatedAt)).limit(100)
  return c.json({ scorecards: rows, window: c.req.query('window') ?? 'all' })
})

intelligenceRoutes.get('/agents/:id/skill-packs', async (c) => {
  const id = c.req.param('id')
  const rows = await db.select().from(agentSkillPacks).where(eq(agentSkillPacks.agentId, id)).limit(50)
  return c.json({ skillPacks: rows })
})

intelligenceRoutes.get('/market-regimes', async (c) => {
  const rows = await db.select().from(marketRegimes).orderBy(desc(marketRegimes.createdAt)).limit(50)
  return c.json({ regimes: rows, symbol: c.req.query('symbol') ?? null, timeframe: c.req.query('timeframe') ?? null })
})

intelligenceRoutes.get('/agents/:id/risk-policy', async (c) => {
  const id = c.req.param('id')
  const row = await db.query.agentRiskPolicies.findFirst({ where: eq(agentRiskPolicies.agentId, id) }).catch(() => null)
  return c.json({ policy: row ?? deriveDefaultRiskPolicy({}) })
})
```

- [ ] **Step 4: Mount intelligence routes**

Modify `trivo-backend/src/index.ts`.

Add import near route imports:

```ts
import { intelligenceRoutes } from './routes/intelligence'
```

Add route mount after market route:

```ts
app.route('/api/intelligence', intelligenceRoutes)
```

- [ ] **Step 5: Run tests and commit**

```bash
cd trivo-backend
pnpm exec vitest run src/__tests__/intelligence.test.ts
pnpm run typecheck
git add trivo-backend/src/routes/intelligence.ts trivo-backend/src/index.ts trivo-backend/src/__tests__/intelligence.test.ts
git commit -m "feat(api): expose intelligence records"
```

Expected: tests and typecheck pass.

---

## Task 11: Add OpenAPI docs for intelligence API

**Files:**
- Modify: `trivo-backend/src/lib/openapi.ts`

### Objective

Keep `/api/docs.json` aligned with the new intelligence endpoints.

- [ ] **Step 1: Add intelligence paths**

Modify `trivo-backend/src/lib/openapi.ts` inside the `paths` object. Add compact entries for:

```ts
      '/api/intelligence/skill-packs': { get: { tags: ['Intelligence'], summary: 'List built-in skill packs', responses: { '200': { description: 'Skill packs' } } } },
      '/api/intelligence/agents/{id}/decisions': { get: { tags: ['Intelligence'], summary: 'List agent decisions', parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }], responses: { '200': { description: 'Agent decisions' } } } },
      '/api/intelligence/agents/{id}/committee-reports': { get: { tags: ['Intelligence'], summary: 'List committee reports', parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }], responses: { '200': { description: 'Committee reports' } } } },
      '/api/intelligence/agents/{id}/reflections': { get: { tags: ['Intelligence'], summary: 'List agent reflections', parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }], responses: { '200': { description: 'Agent reflections' } } } },
      '/api/intelligence/agents/{id}/scorecard': { get: { tags: ['Intelligence'], summary: 'Get agent scorecard', parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }], responses: { '200': { description: 'Agent scorecard' } } } },
      '/api/intelligence/scorecards': { get: { tags: ['Intelligence'], summary: 'List scorecards', parameters: [{ name: 'window', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Scorecards' } } } },
      '/api/intelligence/market-regimes': { get: { tags: ['Intelligence'], summary: 'List market regimes', parameters: [{ name: 'symbol', in: 'query', schema: { type: 'string' } }, { name: 'timeframe', in: 'query', schema: { type: 'string' } }], responses: { '200': { description: 'Market regimes' } } } },
      '/api/intelligence/agents/{id}/risk-policy': { get: { tags: ['Intelligence'], summary: 'Get agent risk policy', parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }], responses: { '200': { description: 'Risk policy' } } } },
```

- [ ] **Step 2: Verify docs JSON compiles**

Run:

```bash
cd trivo-backend
pnpm run typecheck
```

Expected: TypeScript passes.

- [ ] **Step 3: Commit docs update**

```bash
git add trivo-backend/src/lib/openapi.ts
git commit -m "docs(api): document intelligence endpoints"
```

---

## Task 12: Add frontend intelligence client and hooks

**Files:**
- Modify: `trivo-frontend/src/lib/api.ts`
- Create: `trivo-frontend/src/hooks/useIntelligence.ts`

### Objective

Provide typed frontend access to intelligence data.

- [ ] **Step 1: Add API client types and methods**

Modify `trivo-frontend/src/lib/api.ts`. Append:

```ts
export interface AgentDecisionRecord {
  id: string
  agentId: string
  action: string
  calibratedConfidence?: string
  riskDecision?: string
  riskReason?: string
  committeeSummary?: string
  finalReasoning?: string
  createdAt?: string
}

export interface AgentScorecardRecord {
  id: string
  agentId: string
  window: string
  trivoScore?: string
  winRateScore?: string
  drawdownScore?: string
  consistencyScore?: string
  riskAdjustedScore?: string
  explanationScore?: string
  updatedAt?: string
}

export interface MarketRegimeRecord {
  id: string
  symbol: string
  timeframe: string
  regime: string
  confidence?: string
  createdAt?: string
}

export const intelligenceApi = {
  decisions: (agentId: string) => api.get<{ decisions: AgentDecisionRecord[] }>(`/api/intelligence/agents/${agentId}/decisions`).then((r) => r.data),
  scorecard: (agentId: string) => api.get<{ scorecards: AgentScorecardRecord[] }>(`/api/intelligence/agents/${agentId}/scorecard`).then((r) => r.data),
  regimes: (params?: { symbol?: string; timeframe?: string }) => api.get<{ regimes: MarketRegimeRecord[] }>('/api/intelligence/market-regimes', { params }).then((r) => r.data),
  skillPacks: () => api.get<{ skillPacks: Array<{ slug: string; name: string; description: string }> }>('/api/intelligence/skill-packs').then((r) => r.data),
}
```

- [ ] **Step 2: Add TanStack Query hooks**

Create `trivo-frontend/src/hooks/useIntelligence.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { intelligenceApi } from '@/lib/api'

export function useAgentDecisions(agentId: string) {
  return useQuery({
    queryKey: ['intelligence-decisions', agentId],
    queryFn: () => intelligenceApi.decisions(agentId),
    enabled: !!agentId,
    refetchInterval: 15_000,
  })
}

export function useAgentScorecard(agentId: string) {
  return useQuery({
    queryKey: ['intelligence-scorecard', agentId],
    queryFn: () => intelligenceApi.scorecard(agentId),
    enabled: !!agentId,
    refetchInterval: 30_000,
  })
}

export function useMarketRegimes(symbol = 'BTC/USD', timeframe = '1h') {
  return useQuery({
    queryKey: ['market-regimes', symbol, timeframe],
    queryFn: () => intelligenceApi.regimes({ symbol, timeframe }),
    refetchInterval: 30_000,
  })
}

export function useSkillPacks() {
  return useQuery({
    queryKey: ['skill-packs'],
    queryFn: intelligenceApi.skillPacks,
    staleTime: 60_000,
  })
}
```

- [ ] **Step 3: Build frontend**

```bash
cd trivo-frontend
bun run build
```

Expected: build passes.

- [ ] **Step 4: Commit frontend client**

```bash
git add trivo-frontend/src/lib/api.ts trivo-frontend/src/hooks/useIntelligence.ts
git commit -m "feat(frontend): add intelligence data hooks"
```

---

## Task 13: Add Agent Detail Intelligence tab

**Files:**
- Modify: `trivo-frontend/src/routes/agent.$id.tsx`

### Objective

Show latest decision, risk status, confidence, regime, reflection indicator, and scorecard on the agent detail page.

- [ ] **Step 1: Import hooks**

Modify `trivo-frontend/src/routes/agent.$id.tsx` imports:

```ts
import { useAgentDecisions, useAgentScorecard, useMarketRegimes } from '@/hooks/useIntelligence'
```

- [ ] **Step 2: Load intelligence data inside `AgentDetail` before early returns**

After `const candles = useMarketCandles(primarySymbol, timeframe, 160);`, add:

```ts
  const decisionsQuery = useAgentDecisions(id);
  const scorecardQuery = useAgentScorecard(id);
  const regimeQuery = useMarketRegimes(primarySymbol, '1h');
```

- [ ] **Step 3: Add Intelligence tab trigger**

In the `TabsList`, add:

```tsx
<TabsTrigger value="intelligence">Intelligence</TabsTrigger>
```

- [ ] **Step 4: Add Intelligence tab content**

Before the existing `chat` tab content, add:

```tsx
          <TabsContent value="intelligence" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">Latest Decision</div>
                <div className="mt-2 font-display text-lg font-semibold">
                  {decisionsQuery.data?.decisions?.[0]?.action?.toUpperCase() ?? 'WAITING'}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {decisionsQuery.data?.decisions?.[0]?.committeeSummary ?? 'No committee decision recorded yet.'}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">Risk Status</div>
                <div className="mt-2 font-display text-lg font-semibold">
                  {decisionsQuery.data?.decisions?.[0]?.riskDecision?.toUpperCase() ?? 'UNKNOWN'}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {decisionsQuery.data?.decisions?.[0]?.riskReason ?? 'Risk Constitution has not evaluated this agent yet.'}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="ticker text-[10px] uppercase tracking-widest text-muted-foreground">Trivo Score</div>
                <div className="mt-2 font-display text-lg font-semibold text-neon">
                  {scorecardQuery.data?.scorecards?.[0]?.trivoScore ?? '—'}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Regime: {regimeQuery.data?.regimes?.[0]?.regime ?? 'waiting'}
                </p>
              </div>
            </div>
          </TabsContent>
```

- [ ] **Step 5: Build frontend and commit**

```bash
cd trivo-frontend
bun run build
git add trivo-frontend/src/routes/agent.\$id.tsx
git commit -m "feat(frontend): show agent intelligence tab"
```

Expected: build passes and agent detail page renders with Intelligence tab.

---

## Task 14: Manual verification

**Files:**
- No code changes unless bugs are found.

### Objective

Verify the production-ish intelligence flow runs safely with the existing demo setup.

- [ ] **Step 1: Run targeted backend tests**

```bash
cd trivo-backend
pnpm exec vitest run src/engine/__tests__/intelligence-types.test.ts
pnpm exec vitest run src/engine/regime/regime-detector.test.ts
pnpm exec vitest run src/engine/confidence/confidence-calibrator.test.ts
pnpm exec vitest run src/engine/risk/risk-constitution.test.ts
pnpm exec vitest run src/engine/skills/skill-pack-resolver.test.ts
pnpm exec vitest run src/engine/scoring/score-formula.test.ts
pnpm exec vitest run src/engine/memory/reflection-generator.test.ts
pnpm exec vitest run src/engine/committee/committee-runner.test.ts
pnpm exec vitest run src/__tests__/intelligence.test.ts
pnpm run typecheck
```

Expected: all targeted tests and typecheck pass.

- [ ] **Step 2: Run frontend build**

```bash
cd trivo-frontend
bun run build
```

Expected: build passes.

- [ ] **Step 3: Start backend and frontend**

```bash
cd trivo-backend
pnpm run dev
```

In another terminal:

```bash
cd trivo-frontend
bun run dev
```

Expected:

- backend starts on port 3000.
- frontend starts on port 8080 or next available port.
- no repeating engine crash loop.

- [ ] **Step 4: Verify intelligence APIs**

```bash
curl http://localhost:3000/api/intelligence/skill-packs | python3 -m json.tool
curl http://localhost:3000/api/intelligence/scorecards | python3 -m json.tool
curl 'http://localhost:3000/api/intelligence/market-regimes?symbol=BTC/USD&timeframe=1h' | python3 -m json.tool
```

Expected:

- skill packs response includes `technical-momentum`, `risk-guard`, `market-regime-adapter`.
- scorecards response is valid JSON even if empty.
- regimes response is valid JSON even if empty before a cycle.

- [ ] **Step 5: Wait for one agent cycle**

Wait 60-90 seconds with an active agent.

Then run:

```bash
curl http://localhost:3000/api/agents | python3 -m json.tool
curl http://localhost:3000/api/intelligence/agents/<AGENT_ID>/decisions | python3 -m json.tool
curl http://localhost:3000/api/intelligence/agents/<AGENT_ID>/committee-reports | python3 -m json.tool
curl http://localhost:3000/api/intelligence/agents/<AGENT_ID>/scorecard | python3 -m json.tool
```

Expected:

- decisions response has at least one row after a cycle.
- committee reports response has role rows.
- scorecard response returns valid JSON; it may be empty until trade execution or scorecard update runs.

- [ ] **Step 6: Verify frontend**

Open:

```txt
http://localhost:8081/agent/<AGENT_ID>
```

Expected:

- page renders without terminal error.
- Intelligence tab appears.
- Latest Decision, Risk Status, Trivo Score cards render.

- [ ] **Step 7: Document verification result**

Append a section to `SESSION_SUMMARY.md`:

```md
## Agent Intelligence Upgrade Verification — 2026-05-24

- Backend targeted tests: PASS/FAIL with command output summary.
- Backend typecheck: PASS/FAIL with command output summary.
- Frontend build: PASS/FAIL with command output summary.
- Runtime cycle: PASS/FAIL with observed agent ID and decision count.
- Intelligence tab: PASS/FAIL with observed route.
- Known caveats: repo-wide lint blockers remain unrelated unless fixed.
```

Replace `PASS/FAIL` entries with actual results from the commands.

- [ ] **Step 8: Commit verification note**

```bash
git add SESSION_SUMMARY.md
git commit -m "chore: verify agent intelligence upgrade"
```

---

## Self-Review Checklist

- Spec coverage:
  - Trading Committee Mode: Tasks 8 and 9.
  - Risk Constitution Layer: Tasks 4 and 9.
  - Persistent Decision Memory + Reflection: Task 7 and Task 9 close path.
  - Confidence Calibration Formula: Tasks 3 and 9.
  - Agent Scorecard for Copy Trading: Task 6 and Task 10 API.
  - Skill Pack System: Task 5 and Task 10 API.
  - Market Regime Detector: Task 2 and Task 9.
  - Frontend intelligence display: Tasks 12 and 13.
  - OpenBB skipped: explicitly excluded in scope.

- Placeholder scan:
  - Placeholder markers are absent.
  - Incomplete-step markers are absent.
  - All code steps include concrete snippets or exact commands.

- Type consistency:
  - Shared types in Task 1 match function signatures in later tasks.
  - Table names in Task 1 match imports in later tasks.
  - API response property names match frontend hooks.
