import { and, desc, eq } from 'drizzle-orm'
import { db } from '../lib/db.js'
import {
  agentMemory,
  agentReflections,
  agentScorecards,
  agents,
  feedEvents,
  positions,
} from '../lib/schema.js'
import type { ThinkingEngine } from './thinking/thinking-engine.js'
import { DecisionEngine } from './decision/decision-engine.js'
import { CircuitBreaker } from './decision/circuit-breaker.js'
import type { ToolRegistry } from './tools/registry.js'
import { broadcastAgentEvent } from '../services/ws.js'
import { erc8004Service } from './services/erc8004.service.js'
import { buildMarketContext } from './thinking/context-builder.js'
import { detectMarketRegime } from './regime/regime-detector.js'
import { runTradingCommittee, type TradingCommitteeResult } from './committee/trading-committee.js'
import { calibrateConfidence } from './confidence/confidence-calibrator.js'
import { deriveDefaultRiskPolicy, loadRiskPolicy } from './risk/risk-policy-loader.js'
import { evaluateRiskConstitution } from './risk/risk-constitution.js'
import { appendDecisionMemory } from './memory/decision-memory.js'
import { buildReflectionSummary } from './memory/reflection-generator.js'
import { buildScorecard } from './scoring/scorecard.service.js'
import { resolveBuiltInSkillPacks } from './skills/skill-pack-resolver.js'
import type { AgentRiskPolicy, CalibratedConfidence, MarketRegimeSnapshot, RiskConstitutionDecision } from './intelligence-types.js'
import type { MarketContext, RiskConfig } from './types.js'

const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxLeverageX: 5,
  stopLossPct: 10,
  spendLimitUsd: 100,
  maxDailyLossUsd: 50,
  pauseOnConsecutiveLosses: 3,
  cooldownMinutes: 30,
  confidenceThresholds: { low: 30, medium: 50, high: 70 },
}

const MAX_POSITIONS = 3
const MIN_TRADE_INTERVAL_MS = 30_000
const MAX_DAILY_TRADES = 50
const INTELLIGENCE_SCORECARD_WINDOW = '7d'

type RecentReflection = {
  wasCorrect: boolean
}

type AgentSnapshot = {
  id: string
  name: string
  skills: string | null
  strategy: string | null
  maxLeverage: string | null
  spendLimit: string | null
  stopLossPct: string | null
  totalPnl: string | null
  winRate: string | null
  tradeCount: string | null
}

type IntelligenceCycleInput = {
  agent: AgentSnapshot
  context: MarketContext
  openPositionCount: number
  minutesSinceLastTrade: number
  recentReflections: RecentReflection[]
  policy: AgentRiskPolicy
}

export type IntelligenceCycleSnapshot = {
  symbol: string
  skillPacks: ReturnType<typeof resolveBuiltInSkillPacks>
  regime: MarketRegimeSnapshot
  committeeDecision: TradingCommitteeResult
  calibration: CalibratedConfidence
  riskDecision: RiskConstitutionDecision
  decisionScorecard: ReturnType<typeof buildScorecard>
  scorecardSignals: {
    confidenceScore: number
    riskScore: number
    regimeScore: number
    skillsScore: number
    memoryScore: number
    committeeScore: number
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function parseNumber(value: string | null | undefined, fallback = 0): number {
  if (value == null || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function countCorrectReflections(reflections: RecentReflection[]): number {
  return reflections.filter((reflection) => reflection.wasCorrect).length
}

function calculateMaxDrawdownPct(recentTrades: MarketContext['recentTrades']): number {
  let cumulative = 0
  let peak = 0
  let maxDrawdown = 0

  for (const trade of recentTrades) {
    cumulative += Number(trade.pnl ?? 0)
    peak = Math.max(peak, cumulative)
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative)
  }

  if (peak <= 0) return 0

  return clampPercent((maxDrawdown / peak) * 100)
}

function buildPerformanceScorecardRow(input: {
  agent: AgentSnapshot
  context: MarketContext
  recentReflections: RecentReflection[]
  decision: TradingCommitteeResult
  pnlDelta: number
  tradeCountDelta: number
}) {
  const realizedPnlUsd = parseNumber(input.agent.totalPnl) + input.pnlDelta
  const totalTrades = Math.max(0, parseNumber(input.agent.tradeCount) + input.tradeCountDelta)
  const realizedPnlScore = clampPercent(realizedPnlUsd)
  const winRateScore = clampPercent(parseNumber(input.agent.winRate, input.context.winRate))
  const maxDrawdownPct = calculateMaxDrawdownPct(input.context.recentTrades)
  const drawdownScore = clampPercent(100 - maxDrawdownPct)
  const reflectionSignal = input.recentReflections.length > 0 ? (countCorrectReflections(input.recentReflections) / input.recentReflections.length) * 100 : 50
  const consistencyScore = clampPercent((winRateScore + reflectionSignal) / 2)
  const riskAdjustedScore = clampPercent(50 + realizedPnlUsd - maxDrawdownPct)
  const explanationScore = clampPercent(
    input.decision.debateSummary.length > 0 && input.decision.reasoning.length > 0 ? 100 : 50,
  )

  const trivoScore = clampPercent(
    realizedPnlScore * 0.3 +
      winRateScore * 0.2 +
      drawdownScore * 0.2 +
      consistencyScore * 0.15 +
      riskAdjustedScore * 0.1 +
      explanationScore * 0.05,
  )

  return {
    window: INTELLIGENCE_SCORECARD_WINDOW,
    trivoScore,
    realizedPnlScore,
    winRateScore,
    drawdownScore,
    consistencyScore,
    riskAdjustedScore,
    explanationScore,
    totalTrades,
    maxDrawdownPct,
    sharpeLikeRatio: totalTrades > 0 ? clampPercent((winRateScore / 100) * Math.max(0, 100 - maxDrawdownPct)) / 10 : 0,
  }
}

export function buildIntelligenceCycle(input: IntelligenceCycleInput): IntelligenceCycleSnapshot {
  const symbol = primarySymbolForAgent(input.agent)
  const skillPacks = resolveBuiltInSkillPacks(input.agent.skills)
  const regime = detectMarketRegime(input.context, symbol, '1h')
  const committeeDecision = runTradingCommittee({
    agentName: input.agent.name,
    strategy: input.agent.strategy,
    skills: input.agent.skills,
    context: input.context,
    symbol,
  })

  const technicalScore = input.context.technicalAnalysis?.[symbol]?.confidence ?? committeeDecision.rawConfidence
  const token = symbol.split('/')[0] ?? 'BTC'
  const sentimentScore = Math.min(100, Math.abs(input.context.sentiment[token]?.score ?? 0) + 40)
  const riskScore = Math.max(0, 100 - input.openPositionCount * 20)
  const memoryScore = input.recentReflections.length > 0 ? clampPercent((countCorrectReflections(input.recentReflections) / input.recentReflections.length) * 100) : 50
  const agreeingReports = committeeDecision.roleReports.filter((report) => report.stance === 'approve' || report.stance === 'bullish' || report.stance === 'bearish').length
  const committeeAgreementScore = Math.round((agreeingReports / Math.max(1, committeeDecision.roleReports.length)) * 100)
  const skillsScore = Math.min(100, 40 + skillPacks.length * 15)

  const calibration = calibrateConfidence({
    rawConfidence: committeeDecision.rawConfidence,
    technicalScore,
    sentimentScore,
    riskScore,
    memoryScore,
    committeeAgreementScore,
  })

  const riskDecision = evaluateRiskConstitution({
    decision: committeeDecision,
    calibratedConfidence: calibration.calibratedConfidence,
    policy: input.policy,
    regime,
    openPositionCount: input.openPositionCount,
    todayPnl: input.context.todayPnl,
    minutesSinceLastTrade: input.minutesSinceLastTrade,
  })

  const decisionScorecard = buildScorecard({
    confidenceScore: calibration.calibratedConfidence,
    riskScore,
    regimeScore: regime.confidence,
    skillsScore,
    memoryScore,
    committeeScore: committeeAgreementScore,
  })

  return {
    symbol,
    skillPacks,
    regime,
    committeeDecision,
    calibration,
    riskDecision,
    decisionScorecard,
    scorecardSignals: {
      confidenceScore: calibration.calibratedConfidence,
      riskScore,
      regimeScore: regime.confidence,
      skillsScore,
      memoryScore,
      committeeScore: committeeAgreementScore,
    },
  }
}

function primarySymbolForAgent(agent: { skills?: string | null; strategy?: string | null }): string {
  const text = `${agent.skills ?? ''} ${agent.strategy ?? ''}`.toLowerCase()
  if (text.includes('eth')) return 'ETH/USD'
  if (text.includes('sol')) return 'SOL/USD'
  return 'BTC/USD'
}

export class AgentRunner {
  private decision: DecisionEngine
  private circuitBreaker: CircuitBreaker
  private lastTradeTime = 0
  private dailyTradeCount = 0
  private dailyResetTime: Date

  constructor(
    private readonly agentId: string,
    private readonly agentName: string,
    private readonly thinking: ThinkingEngine,
    private readonly tools: ToolRegistry,
  ) {
    this.decision = new DecisionEngine(DEFAULT_RISK_CONFIG)
    this.circuitBreaker = new CircuitBreaker(DEFAULT_RISK_CONFIG)
    this.dailyResetTime = new Date()
    this.dailyResetTime.setUTCHours(0, 0, 0, 0)
  }

  async runCycle(): Promise<void> {
    const now = new Date()
    if (now >= new Date(this.dailyResetTime.getTime() + 86400000)) {
      this.dailyTradeCount = 0
      this.dailyResetTime = new Date()
      this.dailyResetTime.setUTCHours(0, 0, 0, 0)
    }

    const { canTrade, reason } = this.circuitBreaker.canTrade()
    if (!canTrade) {
      console.log(`⏸️  [${this.agentName}] Paused: ${reason}`)
      return
    }

    const agent = await db.query.agents.findFirst({ where: eq(agents.id, this.agentId) })
    if (!agent || agent.status !== 'active') return

    const openPositions = await db
      .select()
      .from(positions)
      .where(and(eq(positions.agentId, this.agentId), eq(positions.status, 'open')))
    const currentPositions = openPositions.length

    const timeSinceLastTrade = Date.now() - this.lastTradeTime
    if (this.lastTradeTime > 0 && timeSinceLastTrade < MIN_TRADE_INTERVAL_MS) return
    if (this.dailyTradeCount >= MAX_DAILY_TRADES) return

    const canOpen = currentPositions < MAX_POSITIONS

    console.log(`\n${'─'.repeat(40)}`)
    console.log(
      `🔄 [${this.agentName}] Cycle (${currentPositions}/${MAX_POSITIONS} positions, ${canOpen ? 'can open' : 'FULL'})`,
    )

    broadcastAgentEvent(this.agentId, { event: 'thinking', agentId: this.agentId })

    try {
      const context = await buildMarketContext(this.agentId)
      const recentReflections = await this.loadRecentReflections()
      let policy: AgentRiskPolicy

      try {
        policy = await loadRiskPolicy(this.agentId, agent)
      } catch {
        policy = deriveDefaultRiskPolicy(agent)
      }

      const pipeline = buildIntelligenceCycle({
        agent: {
          id: agent.id,
          name: agent.name,
          skills: agent.skills,
          strategy: agent.strategy,
          maxLeverage: agent.maxLeverage,
          spendLimit: agent.spendLimit,
          stopLossPct: agent.stopLossPct,
          totalPnl: agent.totalPnl,
          winRate: agent.winRate,
          tradeCount: agent.tradeCount,
        },
        context,
        openPositionCount: currentPositions,
        minutesSinceLastTrade: this.minutesSinceLastTrade(),
        recentReflections,
        policy,
      })

      await this.runIntelligenceExecution({
        agent,
        openPositions,
        canOpen,
        context,
        recentReflections,
        pipeline,
      })
    } catch (error) {
      console.error(`   ❌ [${this.agentName}] intelligence pipeline failed`, error)
      await this.runLegacyCycle(agent, openPositions, canOpen)
    }
  }

  private async runIntelligenceExecution(input: {
    agent: Awaited<ReturnType<typeof db.query.agents.findFirst>>
    openPositions: Array<Record<string, unknown>>
    canOpen: boolean
    context: MarketContext
    recentReflections: RecentReflection[]
    pipeline: IntelligenceCycleSnapshot
  }): Promise<void> {
    const { agent, openPositions, canOpen, context, recentReflections, pipeline } = input
    if (!agent) return

    const cycleId = crypto.randomUUID()
    const baseMetadata = {
      rawConfidence: pipeline.calibration.rawConfidence,
      calibratedConfidence: pipeline.calibration.calibratedConfidence,
      riskDecision: pipeline.riskDecision.status,
      regime: pipeline.regime.regime,
      regimeConfidence: pipeline.regime.confidence,
      decisionScorecard: pipeline.decisionScorecard.recommendation,
      skillPacks: pipeline.skillPacks.map((pack) => pack.slug),
    }

    await this.saveMemory('reasoning', pipeline.committeeDecision.reasoning, pipeline.committeeDecision.debateSummary, baseMetadata)

    broadcastAgentEvent(this.agentId, {
      event: 'deciding',
      agentId: this.agentId,
      content: JSON.stringify({
        observation: pipeline.committeeDecision.debateSummary,
        confidence: pipeline.calibration.calibratedConfidence,
        regime: pipeline.regime.regime,
        scorecard: pipeline.decisionScorecard.overallScore,
        recommendation: pipeline.decisionScorecard.recommendation,
      }),
    })

    console.log(
      `   🧠 raw ${pipeline.calibration.rawConfidence}% -> calibrated ${pipeline.calibration.calibratedConfidence}% | ${pipeline.committeeDecision.action} | ${pipeline.riskDecision.status} | score ${pipeline.decisionScorecard.overallScore}`,
    )

    const persistDecision = async (
      status: 'proposed' | 'executed' | 'failed' | 'skipped',
      decision: TradingCommitteeResult = pipeline.committeeDecision,
      pnlDelta = 0,
      tradeCountDelta = 0,
    ) => {
      try {
        await appendDecisionMemory({
          agentId: this.agentId,
          cycleId,
          decision,
          calibration: pipeline.calibration,
          risk: pipeline.riskDecision,
          regime: pipeline.regime,
          status,
        })
      } catch (error) {
        console.warn(`   ⚠️ [${this.agentName}] decision memory persist failed`, error)
      }

      await this.persistPerformanceScorecard({
        agent,
        context,
        recentReflections,
        decision,
        pnlDelta,
        tradeCountDelta,
      })
    }

    if (!pipeline.riskDecision.allowed) {
      await persistDecision('skipped')
      console.log(`   ⛔ ${pipeline.riskDecision.reason}`)
      await this.createFeedEvent('risk_blocked', pipeline.committeeDecision.args ?? {}, pipeline.calibration.calibratedConfidence, pipeline.riskDecision.reason, 0)
      return
    }

    if (pipeline.committeeDecision.action === 'hold') {
      await persistDecision('skipped')
      console.log(`   🤝 Holding`)
      return
    }

    if (pipeline.committeeDecision.action === 'close_trade' && pipeline.committeeDecision.tool === 'close_trade') {
      const closeArgs = (pipeline.committeeDecision.args || {}) as Record<string, unknown>
      const posId = closeArgs.positionId || openPositions[0]?.id

      if (!posId) {
        await persistDecision('skipped')
        return
      }

      try {
        const result = await this.tools.execute('close_trade', {
          positionId: posId,
          reason: pipeline.committeeDecision.reasoning?.slice(0, 200),
          _agentId: this.agentId,
        })
        const resultRecord = result as Record<string, unknown>

        const pnl = Number(resultRecord.pnl ?? 0)
        const pnlPct = Number(resultRecord.pnlPct ?? 0)

        await this.updateAgentPnL(pnl)

        await persistDecision('executed', {
          ...pipeline.committeeDecision,
          args: {
            ...(pipeline.committeeDecision.args ?? {}),
            positionId: posId,
            txHash: (result as Record<string, unknown>).txHash,
          },
        }, pnl, 1)

        await this.persistReflection({
          decisionId: cycleId,
          market: pipeline.symbol,
          side: String(closeArgs.side ?? 'long'),
          pnl,
          pnlPct,
          result: resultRecord,
          reasoning: pipeline.committeeDecision.reasoning,
        })

        await this.saveMemory('execution', `close_trade: ${JSON.stringify(result)}`, pipeline.committeeDecision.reasoning, {
          decisionId: cycleId,
          tool: 'close_trade',
          args: pipeline.committeeDecision.args,
        })

        await this.createFeedEvent('position_closed', closeArgs, pipeline.calibration.calibratedConfidence, pipeline.committeeDecision.reasoning, pnl)
        this.dailyTradeCount++
        this.lastTradeTime = Date.now()

        broadcastAgentEvent(this.agentId, {
          event: 'execution',
          agentId: this.agentId,
          result: { tool: 'close_trade', args: pipeline.committeeDecision.args, outcome: result },
        })
        console.log(`   📈 Closed PnL: $${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`)
        console.log(`   ✅ Done`)
      } catch (error) {
        await persistDecision('failed')
        console.error(`   ❌ [${this.agentName}]`, error)
        broadcastAgentEvent(this.agentId, { event: 'error', agentId: this.agentId, content: String(error) })
      }

      return
    }

    if (pipeline.committeeDecision.action === 'open_trade' && pipeline.committeeDecision.tool) {
      if (!canOpen) {
        await persistDecision('skipped')
        console.log(`   ⚠️ FULL (${openPositions.length}/${MAX_POSITIONS}) — must close one first`)
        return
      }

      try {
        console.log(`   ⚡ ${pipeline.committeeDecision.tool}`)
        const result = await this.tools.execute(pipeline.committeeDecision.tool, { ...pipeline.committeeDecision.args, _agentId: this.agentId })
        const resultRecord = result as Record<string, unknown>

        await persistDecision('executed', {
          ...pipeline.committeeDecision,
          args: {
            ...(pipeline.committeeDecision.args ?? {}),
            positionId: resultRecord.positionId,
            txHash: resultRecord.txHash,
          },
        }, 0, 0)

        await this.saveMemory('execution', `${pipeline.committeeDecision.tool}: ${JSON.stringify(result)}`, pipeline.committeeDecision.reasoning, {
          tool: pipeline.committeeDecision.tool,
          args: pipeline.committeeDecision.args,
          decisionId: cycleId,
        })
        this.dailyTradeCount++
        this.lastTradeTime = Date.now()

        await this.createFeedEvent('position_opened', pipeline.committeeDecision.args ?? {}, pipeline.calibration.calibratedConfidence, pipeline.committeeDecision.reasoning, 0)
        await this.recordERC8004(agent, result)

        broadcastAgentEvent(this.agentId, {
          event: 'execution',
          agentId: this.agentId,
          result: { tool: pipeline.committeeDecision.tool, args: pipeline.committeeDecision.args, outcome: result },
        })
        console.log(`   ✅ Done`)
      } catch (error) {
        await persistDecision('failed')
        console.error(`   ❌ [${this.agentName}]`, error)
        broadcastAgentEvent(this.agentId, { event: 'error', agentId: this.agentId, content: String(error) })
      }
    }
  }

  private async runLegacyCycle(
    agent: Awaited<ReturnType<typeof db.query.agents.findFirst>>,
    openPositions: Array<Record<string, unknown>>,
    canOpen: boolean,
  ) {
    if (!agent) return

    try {
      const output = await this.thinking.run({
        id: agent.id,
        name: agent.name,
        strategy: agent.strategy,
        skills: agent.skills,
        riskConfig: {
          maxLeverage: Number(agent.maxLeverage ?? 5),
          stopLossPct: Number(agent.stopLossPct ?? 10),
          spendLimit: Number(agent.spendLimit ?? 100),
        },
      })

      await this.saveMemory('reasoning', output.reasoning, `${output.observation}\n\n${output.analysis}`, {
        confidence: output.confidence,
        riskLevel: output.riskLevel,
      })

      broadcastAgentEvent(this.agentId, {
        event: 'deciding',
        agentId: this.agentId,
        content: JSON.stringify({ observation: output.observation, confidence: output.confidence }),
      })

      console.log(`   🧠 ${output.confidence}% | ${output.riskLevel} | ${output.action}`)

      if (output.action === 'close_trade' && output.tool === 'close_trade') {
        const closeArgs = (output.args || {}) as Record<string, unknown>
        const posId = closeArgs.positionId || openPositions[0]?.id
        if (posId) {
          const result = await this.tools.execute('close_trade', {
            positionId: posId,
            reason: output.reasoning?.slice(0, 200),
            _agentId: this.agentId,
          })
          const pnl = Number((result as Record<string, unknown>).pnl ?? 0)
          await this.updateAgentPnL(pnl)
          this.dailyTradeCount++
          this.lastTradeTime = Date.now()
          console.log(`   📈 Closed PnL: $${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`)
          await this.createFeedEvent('position_closed', closeArgs, output.confidence, output.reasoning, pnl)
        }
        return
      }

      if (output.action === 'hold') {
        console.log(`   🤝 Holding`)
        return
      }

      if (output.action === 'open_trade') {
        if (!canOpen) {
          console.log(`   ⚠️ FULL (${openPositions.length}/3) — must close one first`)
          return
        }

        const decision = this.decision.evaluate(output, {
          maxLeverageX: Number(agent.maxLeverage ?? 5),
          spendLimitUsd: Number(agent.spendLimit ?? 100),
        })

        if (!decision) return

        console.log(`   ⚡ ${decision.tool}`)
        const result = await this.tools.execute(decision.tool, { ...decision.args, _agentId: this.agentId })

        await this.saveMemory('execution', `${decision.tool}: ${JSON.stringify(result)}`, decision.reasoning, {
          tool: decision.tool,
          args: decision.args,
        })
        this.dailyTradeCount++
        this.lastTradeTime = Date.now()

        await this.createFeedEvent('position_opened', decision.args, decision.confidence, decision.reasoning, 0)
        await this.recordERC8004(agent, result)

        broadcastAgentEvent(this.agentId, {
          event: 'execution',
          agentId: this.agentId,
          result: { tool: decision.tool, args: decision.args, outcome: result },
        })
        console.log(`   ✅ Done`)
      }
    } catch (error) {
      console.error(`   ❌ [${this.agentName}]`, error)
      broadcastAgentEvent(this.agentId, { event: 'error', agentId: this.agentId, content: String(error) })
    }
  }

  private async loadRecentReflections(): Promise<RecentReflection[]> {
    try {
      const rows = (await db
        .select({ wasCorrect: agentReflections.wasCorrect })
        .from(agentReflections)
        .where(eq(agentReflections.agentId, this.agentId))
        .orderBy(desc(agentReflections.createdAt))
        .limit(5)) as Array<{ wasCorrect: string | null }>

      return rows.map((row) => ({ wasCorrect: row.wasCorrect === 'true' }))
    } catch {
      return []
    }
  }

  private minutesSinceLastTrade(): number {
    if (this.lastTradeTime === 0) return 999
    return Math.floor((Date.now() - this.lastTradeTime) / 60_000)
  }

  private async persistPerformanceScorecard(input: {
    agent: AgentSnapshot
    context: MarketContext
    recentReflections: RecentReflection[]
    decision: TradingCommitteeResult
    pnlDelta: number
    tradeCountDelta: number
  }) {
    try {
      const row = buildPerformanceScorecardRow(input)
      await db
        .insert(agentScorecards)
        .values({
          id: crypto.randomUUID(),
          agentId: input.agent.id,
          window: row.window,
          trivoScore: String(row.trivoScore),
          realizedPnlScore: String(row.realizedPnlScore),
          winRateScore: String(row.winRateScore),
          drawdownScore: String(row.drawdownScore),
          consistencyScore: String(row.consistencyScore),
          riskAdjustedScore: String(row.riskAdjustedScore),
          explanationScore: String(row.explanationScore),
          totalTrades: String(row.totalTrades),
          maxDrawdownPct: String(row.maxDrawdownPct),
          sharpeLikeRatio: String(row.sharpeLikeRatio),
        })
        .execute()
    } catch (error) {
      console.warn(`   ⚠️ [${this.agentName}] scorecard update failed`, error)
    }
  }

  private async persistReflection(input: {
    decisionId: string
    market: string
    side: string
    pnl: number
    pnlPct: number
    result: Record<string, unknown>
    reasoning: string
  }) {
    try {
      const reflection = buildReflectionSummary({
        market: input.market,
        side: input.side,
        pnl: input.pnl,
        reasoning: input.reasoning,
        missReasons: input.pnl < 0 ? [String((input.result as Record<string, unknown>).reason ?? input.reasoning)] : undefined,
        nextAction:
          input.pnl < 0
            ? 'Reduce size, wait for stronger confirmation, and tighten risk before the next trade.'
            : 'Keep the thesis, but only scale after confirmation.',
      })

      await db
        .insert(agentReflections)
        .values({
          id: crypto.randomUUID(),
          agentId: this.agentId,
          decisionId: input.decisionId,
          positionId: String(input.result.positionId ?? ''),
          outcomePnl: String(input.pnl.toFixed(2)),
          outcomePnlPct: String(input.pnlPct.toFixed(2)),
          wasCorrect: String(reflection.wasCorrect),
          lesson: reflection.lesson,
          mistakePattern: reflection.mistakePattern,
          improvement: reflection.improvement,
          usableInPrompt: 'true',
        })
        .execute()

      await this.saveMemory('reflection', reflection.summary, reflection.lesson, {
        decisionId: input.decisionId,
        market: input.market,
        side: input.side,
        pnl: input.pnl,
        pnlPct: input.pnlPct,
        outcome: reflection.outcome,
      })
    } catch (error) {
      console.warn(`   ⚠️ [${this.agentName}] reflection update failed`, error)
    }
  }

  private async updateAgentPnL(pnl: number) {
    try {
      const agent = await db.query.agents.findFirst({ where: eq(agents.id, this.agentId) })
      if (agent) {
        const np = Number(agent.totalPnl || 0) + pnl
        const tr = Number(agent.tradeCount || 0) + 1
        await db
          .update(agents)
          .set({ totalPnl: np.toFixed(2), tradeCount: String(tr) })
          .where(eq(agents.id, this.agentId))
          .execute()
      }
    } catch {
      /* ignore */
    }
  }

  getStatus() {
    return {
      agentId: this.agentId,
      agentName: this.agentName,
      dailyTradeCount: this.dailyTradeCount,
      circuitBreaker: this.circuitBreaker.getStatus(),
    }
  }

  private async saveMemory(t: string, c: string, r: string, m: Record<string, unknown>) {
    await db
      .insert(agentMemory)
      .values({
        id: crypto.randomUUID(),
        agentId: this.agentId,
        type: t,
        content: c,
        reasoning: r,
        metadata: JSON.stringify(m),
      })
      .execute()
      .catch(() => {})
  }

  private async createFeedEvent(
    type: string,
    args: Record<string, unknown>,
    confidence: number,
    reasoning: string,
    pnl: number,
  ) {
    const venue = String(args.venue || 'perp')
    const pair = String(args.pair || '-')
    const side =
      venue === 'polymarket'
        ? String(args.side || 'yes').toLowerCase() === 'yes'
          ? 'YES'
          : 'NO'
        : venue === 'lp'
          ? 'ADD'
          : String(args.side || 'long').toUpperCase()

    await db
      .insert(feedEvents)
      .values({
        id: crypto.randomUUID(),
        agentId: this.agentId,
        type,
        venue,
        pair,
        side,
        size: String(args.size || '0'),
        data: JSON.stringify({
          confidence,
          reasoning,
          pnl: pnl.toFixed(2),
          entryPrice: args.entryPrice,
          exitPrice: args.exitPrice,
        }),
      })
      .execute()
      .catch(() => {})
  }

  private async recordERC8004(agent: Record<string, unknown>, result: unknown) {
    try {
      const ercId = agent.erc8004TokenId as string | undefined
      if (ercId) {
        const won = !!(result as Record<string, unknown>)?.success
        await erc8004Service.recordTradeOutcome(ercId, won)
      }
    } catch {
      /* ignore */
    }
  }
}
