// engine/agents/complete-trading-agent.ts
// Phase 6 - Ticket O2: Complete Trading Agent
// Full end-to-end flow: analysts → research → trader → pm → execute → learn

import type { BaseProvider } from '../providers/base-provider.js'
import type { MarketContext } from '../types.js'
import { BaseAgent, type AgentConfig, type AgentResponse } from './base-agent.js'
import { TechnicalAnalystAgent } from './analysts/technical-analyst.js'
import { SentimentAnalystAgent } from './analysts/sentiment-analyst.js'
import { OnChainAnalystAgent } from './analysts/onchain-analyst.js'
import { MacroAnalystAgent } from './analysts/macro-analyst.js'
import { BullResearcherAgent, type CompactAnalystReport } from './researchers/bull-researcher.js'
import { BearResearcherAgent } from './researchers/bear-researcher.js'
import { TraderAgent, type TraderProposal } from './trader.js'
import { PortfolioManagerAgent, type PortfolioDecision } from './portfolio-manager.js'
import { auditSystem } from '../audit/audit-system.js'
import { eventStore, EventType } from '../autonomous/event-store.js'
import { db } from '../../lib/db.js'
import { positions, feedEvents } from '../../lib/schema.js'
import { randomUUID } from 'crypto'

export interface CyclePhaseResult {
  phase: string
  status: 'success' | 'error' | 'skipped'
  latencyMs: number
  error?: string
}

export interface FullCycleResult {
  cycleId: string
  phases: CyclePhaseResult[]
  finalDecision: PortfolioDecision | null
  traderProposal: TraderProposal | null
  executed: boolean
  tradeResult?: ExecutionResult
  totalLatencyMs: number
}

export interface ExecutionResult {
  success: boolean
  tradeId?: string
  txHash?: string
  error?: string
}

const SYSTEM_PROMPT = `You are the Complete Trading Agent orchestrator — you run the full trading cycle.
You coordinate: analysts, researchers, trader, and portfolio manager.
You ensure the reasoning chain is complete and auditable.
You record trade outcomes for learning.`

export class CompleteTradingAgent extends BaseAgent {
  private technicalAnalyst: TechnicalAnalystAgent
  private sentimentAnalyst: SentimentAnalystAgent
  private onchainAnalyst: OnChainAnalystAgent
  private macroAnalyst: MacroAnalystAgent
  private bullResearcher: BullResearcherAgent
  private bearResearcher: BearResearcherAgent
  private trader: TraderAgent
  private portfolioManager: PortfolioManagerAgent

  constructor(provider: BaseProvider) {
    const config: AgentConfig = {
      name: 'Complete Trading Agent',
      role: 'orchestrator',
      specialty: 'End-to-end trading cycle orchestration',
      systemPrompt: SYSTEM_PROMPT,
    }
    super(provider, config)

    // Initialize all sub-agents with same provider
    this.technicalAnalyst = new TechnicalAnalystAgent(provider)
    this.sentimentAnalyst = new SentimentAnalystAgent(provider)
    this.onchainAnalyst = new OnChainAnalystAgent(provider)
    this.macroAnalyst = new MacroAnalystAgent(provider)
    this.bullResearcher = new BullResearcherAgent(provider)
    this.bearResearcher = new BearResearcherAgent(provider)
    this.trader = new TraderAgent(provider)
    this.portfolioManager = new PortfolioManagerAgent(provider)
  }

  async analyze(_context: MarketContext): Promise<AgentResponse<unknown>> {
    return { success: false, error: 'Use runFullCycle() instead', latencyMs: 0 }
  }

  async runFullCycle(context: MarketContext, agentId?: string): Promise<FullCycleResult> {
    const cycleId = auditSystem.createChain()
    const startTime = Date.now()
    const phases: CyclePhaseResult[] = []
    let executed = false
    let tradeResult: ExecutionResult | undefined

    // Derive primary market from context prices (default to BTC/USD)
    const priceKeys = Object.keys(context.prices)
    const primaryMarket = priceKeys[0] ?? 'BTC/USD'

    // Emit cycle start event
    if (agentId) {
      eventStore.append(agentId, EventType.CYCLE_START, { cycleId })
    }

    // ── Phase 1: Parallel Analysts ────────────────────────────────────
    const p1Start = Date.now()
    const compactReports: CompactAnalystReport[] = []

    try {
      const [technical, sentiment, onchain, macro] = await Promise.all([
        this.runPhase('technical_analyst', () => this.technicalAnalyst.analyze(context)),
        this.runPhase('sentiment_analyst', () => this.sentimentAnalyst.analyze(context)),
        this.runPhase('onchain_analyst', () => this.onchainAnalyst.analyze(context)),
        this.runPhase('macro_analyst', () => this.macroAnalyst.analyze(context)),
      ])
      phases.push({ phase: 'analysts', status: 'success', latencyMs: Date.now() - p1Start })

      // Build compact reports for downstream agents
      for (const result of [technical, sentiment, onchain, macro]) {
        if (result.success && result.data) {
          compactReports.push({
            role: result.reasoningStep?.agent_role || 'analyst',
            stance: String((result.data as Record<string, unknown>).trend || (result.data as Record<string, unknown>).overall_sentiment || 'neutral'),
            confidence: Number((result.data as Record<string, unknown>).confidence || 50),
            summary: String((result.data as Record<string, unknown>).summary || ''),
          })
        }
        if (result.reasoningStep) {
          auditSystem.addReasoningStep(result.reasoningStep)
        }
      }
    } catch (error) {
      phases.push({ phase: 'analysts', status: 'error', latencyMs: Date.now() - p1Start, error: String(error) })
    }

    // ── Phase 2: Bull + Bear Research (with analyst reports) ──────────
    const p2Start = Date.now()
    let bullResult: string | null = null
    let bearResult: string | null = null

    try {
      const [bullResponse, bearResponse] = await Promise.all([
        this.runPhase('bull_research', () => this.bullResearcher.analyzeWithData(context, compactReports, '')),
        this.runPhase('bear_research', () => this.bearResearcher.analyzeWithData(context, compactReports, '')),
      ])

      if (bullResponse.success && bullResponse.data) {
        const data = bullResponse.data as Record<string, unknown>
        bullResult = `BULL CASE: ${data.strongest_bull_case || data.summary}\nConfidence: ${data.confidence}%\nCatalysts: ${(data.catalyst as string[] || []).join(', ')}`
      }
      if (bearResponse.success && bearResponse.data) {
        const data = bearResponse.data as Record<string, unknown>
        bearResult = `BEAR CASE: ${data.strongest_bear_case || data.summary}\nConfidence: ${data.confidence}%\nRisks: ${(data.key_risks as string[] || []).join(', ')}`
      }

      phases.push({ phase: 'research', status: 'success', latencyMs: Date.now() - p2Start })
    } catch (error) {
      phases.push({ phase: 'research', status: 'error', latencyMs: Date.now() - p2Start, error: String(error) })
    }

    // Build research plan from both cases
    const researchPlan = [bullResult, bearResult].filter(Boolean).join('\n\n')

    // ── Phase 3: Trader decision (with research + analyst reports) ────
    const p3Start = Date.now()
    let traderProposal: TraderProposal | null = null

    try {
      const traderResponse = await this.runPhase('trader', () =>
        this.trader.analyzeWithResearch(context, researchPlan, compactReports)
      )
      if (traderResponse.success && traderResponse.data) {
        traderProposal = traderResponse.data as TraderProposal
        console.log(`   📋 Trader: ${traderProposal.action.toUpperCase()} conviction=${traderProposal.conviction} | ${traderProposal.reasoning.slice(0, 80)}`)
      }
      phases.push({ phase: 'trader', status: traderProposal ? 'success' : 'error', latencyMs: Date.now() - p3Start })
    } catch (error) {
      phases.push({ phase: 'trader', status: 'error', latencyMs: Date.now() - p3Start, error: String(error) })
    }

    // ── Phase 4: Portfolio Manager (with proposal + research) ─────────
    const p4Start = Date.now()
    let finalDecision: PortfolioDecision | null = null

    try {
      const traderProposalStr = traderProposal
        ? `Action: ${traderProposal.action}\nEntry: ${traderProposal.entry_price}\nStop: ${traderProposal.stop_loss}\nTarget: ${traderProposal.take_profit}\nSize: ${traderProposal.position_size}\nConfidence: ${traderProposal.conviction}`
        : 'No trader proposal available'

      const pmResponse = await this.runPhase('portfolio_manager', () =>
        this.portfolioManager.analyzeWithProposal(context, traderProposalStr, researchPlan)
      )
      if (pmResponse.success && pmResponse.data) {
        finalDecision = pmResponse.data as PortfolioDecision
        phases.push({ phase: 'portfolio_manager', status: 'success', latencyMs: Date.now() - p4Start })
      }
    } catch (error) {
      phases.push({ phase: 'portfolio_manager', status: 'error', latencyMs: Date.now() - p4Start, error: String(error) })
    }

    if (finalDecision) {
      console.log(`   🎯 PM: rating=${finalDecision.rating} conviction=${finalDecision.conviction}`)
    }

    const openPositionCount = context.openPositions.length
    // ── Phase 5: Execute if approved ──────────────────────────────────
    if (finalDecision && this.shouldExecute(finalDecision, traderProposal, openPositionCount)) {
      const p5Start = Date.now()
      try {
        tradeResult = await this.executeTrade(finalDecision, traderProposal, agentId, primaryMarket)
        executed = tradeResult.success

        if (tradeResult.success && agentId) {
          await this.recordTradeOutcome(finalDecision, traderProposal, tradeResult)
          eventStore.append(agentId, EventType.DECISION_EXECUTED, {
            cycleId,
            tradeId: tradeResult.tradeId,
            txHash: tradeResult.txHash,
          })
        }
        phases.push({
          phase: 'execution',
          status: tradeResult.success ? 'success' : 'error',
          latencyMs: Date.now() - p5Start,
          error: tradeResult.error,
        })
      } catch (error) {
        phases.push({ phase: 'execution', status: 'error', latencyMs: Date.now() - p5Start, error: String(error) })
        if (agentId) {
          eventStore.append(agentId, EventType.ERROR, { cycleId, error: String(error) })
        }
      }
    } else if (finalDecision) {
      phases.push({ phase: 'execution', status: 'skipped', latencyMs: 0 })
      if (agentId) {
        eventStore.append(agentId, EventType.DECISION_REJECTED, { cycleId, rating: finalDecision.rating })
      }
    }

    // Finalize audit
    auditSystem.finalizeChain(cycleId)

    // Emit cycle end event
    if (agentId) {
      eventStore.append(agentId, EventType.CYCLE_END, {
        cycleId,
        totalTime: Date.now() - startTime,
        phases: phases.map(p => p.phase),
        executed,
      })
    }

    return {
      cycleId,
      phases,
      finalDecision,
      traderProposal,
      executed,
      tradeResult,
      totalLatencyMs: Date.now() - startTime,
    }
  }

  /**
   * Check if a decision should be executed
   * Made more permissive for demo: no positions = always trade if conviction >= 40
   */
  private shouldExecute(decision: PortfolioDecision, proposal: TraderProposal | null, openPositionCount = 0): boolean {
    if (!proposal || proposal.action === 'hold') {
      console.log(`   🤝 Holding: ${proposal?.action === 'hold' ? 'Trader returned hold' : 'No proposal'}`)
      return false
    }

    // Demo mode: if no open positions and conviction >= 40, always trade
    if (openPositionCount === 0 && proposal.conviction >= 40) {
      console.log(`   ⚡ Executing: no positions + conviction ${proposal.conviction}`)
      return true
    }

    // Sell decisions are always worth executing
    if (decision.rating === 'sell' || decision.rating === 'underweight') return true

    // Buy decisions need decent conviction
    if (decision.rating === 'buy' || decision.rating === 'overweight') {
      return decision.conviction >= 50 && proposal.conviction >= 50
    }

    // Fallback: execute if conviction is high enough
    return proposal.conviction >= 60
  }

  /**
   * Execute a trade (store in DB position)
   */
  private async executeTrade(
    decision: PortfolioDecision,
    proposal: TraderProposal | null,
    agentId?: string,
    primaryMarket: string = 'BTC/USD'
  ): Promise<ExecutionResult> {
    try {
      if (!proposal) {
        return { success: false, error: 'No trader proposal to execute' }
      }

      const tradeId = randomUUID()
      const entryPrice = proposal.entry_price || 0

      // Create position in DB
      await db.insert(positions).values({
        id: tradeId,
        agentId: agentId || 'unknown',
        venue: 'mock',
        market: primaryMarket,
        side: proposal.action === 'buy' ? 'LONG' : 'SHORT',
        size: proposal.position_size,
        entryPrice: entryPrice.toString(),
        markPrice: entryPrice.toString(),
        leverage: (proposal.leverage || 1).toString(),
        pnl: '0',
        status: 'open',
        reasoning: proposal.reasoning,
        decisionId: this.currentDecisionId || '',
        fees: '0',
        netPnl: '0',
      })

      // Create feed event
      await db.insert(feedEvents).values({
        id: randomUUID(),
        agentId: agentId || 'unknown',
        type: 'position_open',
        data: JSON.stringify({
          action: proposal.action,
          size: proposal.position_size,
          entryPrice,
          conviction: proposal.conviction,
        }),
        venue: 'mock',
        pair: primaryMarket,
        side: proposal.action === 'buy' ? 'LONG' : 'SHORT',
        size: proposal.position_size,
        reasoning: proposal.reasoning,
      })

      // Emit trade opened event
      if (agentId) {
        eventStore.append(agentId, EventType.TRADE_OPENED, {
          tradeId,
          action: proposal.action,
          size: proposal.position_size,
          entryPrice,
        })
      }

      return { success: true, tradeId }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Record trade outcome for learning/reflection
   */
  private async recordTradeOutcome(
    _decision: PortfolioDecision,
    _proposal: TraderProposal | null,
    _result: ExecutionResult
  ): Promise<void> {
    // Outcome is recorded when position is closed (via pnl.service.ts)
    // This method is a hook for post-execution processing
  }

  private async runPhase<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn()
  }
}
