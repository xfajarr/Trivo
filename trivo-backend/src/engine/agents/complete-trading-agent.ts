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
import { BullResearcherAgent } from './researchers/bull-researcher.js'
import { BearResearcherAgent } from './researchers/bear-researcher.js'
import { TraderAgent, type TraderProposal } from './trader.js'
import { PortfolioManagerAgent, type PortfolioDecision } from './portfolio-manager.js'
import { auditSystem } from '../audit/audit-system.js'
import { z } from 'zod'

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
  totalLatencyMs: number
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

  async runFullCycle(context: MarketContext): Promise<FullCycleResult> {
    const cycleId = auditSystem.createChain()
    const startTime = Date.now()
    const phases: CyclePhaseResult[] = []

    // Phase 1: Parallel Analysts
    const p1Start = Date.now()
    try {
      const [technical, sentiment, onchain, macro] = await Promise.all([
        this.runPhase('technical_analyst', () => this.technicalAnalyst.analyze(context)),
        this.runPhase('sentiment_analyst', () => this.sentimentAnalyst.analyze(context)),
        this.runPhase('onchain_analyst', () => this.onchainAnalyst.analyze(context)),
        this.runPhase('macro_analyst', () => this.macroAnalyst.analyze(context)),
      ])
      phases.push({ phase: 'analysts', status: 'success', latencyMs: Date.now() - p1Start })

      // Add analyst reasoning to audit chain
      for (const result of [technical, sentiment, onchain, macro]) {
        if (result.reasoningStep) {
          auditSystem.addReasoningStep(result.reasoningStep)
        }
      }
    } catch (error) {
      phases.push({ phase: 'analysts', status: 'error', latencyMs: Date.now() - p1Start, error: String(error) })
    }

    // Phase 2: Bull + Bear Research
    const p2Start = Date.now()
    let bullResult = null
    let bearResult = null
    try {
      ;[bullResult, bearResult] = await Promise.all([
        this.runPhase('bull_research', () => this.bullResearcher.analyze(context)),
        this.runPhase('bear_research', () => this.bearResearcher.analyze(context)),
      ])
      phases.push({ phase: 'research', status: 'success', latencyMs: Date.now() - p2Start })
    } catch (error) {
      phases.push({ phase: 'research', status: 'error', latencyMs: Date.now() - p2Start, error: String(error) })
    }

    // Phase 3: Trader decision
    const p3Start = Date.now()
    let traderProposal: TraderProposal | null = null
    try {
      const traderResponse = await this.runPhase('trader', () => this.trader.analyze(context))
      if (traderResponse.success && traderResponse.data) {
        traderProposal = traderResponse.data as TraderProposal
      }
      phases.push({ phase: 'trader', status: traderProposal ? 'success' : 'error', latencyMs: Date.now() - p3Start })
    } catch (error) {
      phases.push({ phase: 'trader', status: 'error', latencyMs: Date.now() - p3Start, error: String(error) })
    }

    // Phase 4: Portfolio Manager
    const p4Start = Date.now()
    let finalDecision: PortfolioDecision | null = null
    try {
      const pmResponse = await this.runPhase('portfolio_manager', () => this.portfolioManager.analyze(context))
      if (pmResponse.success && pmResponse.data) {
        finalDecision = pmResponse.data as PortfolioDecision
      }
      phases.push({ phase: 'portfolio_manager', status: finalDecision ? 'success' : 'error', latencyMs: Date.now() - p4Start })
    } catch (error) {
      phases.push({ phase: 'portfolio_manager', status: 'error', latencyMs: Date.now() - p4Start, error: String(error) })
    }

    // Finalize audit
    auditSystem.finalizeChain(cycleId)

    return {
      cycleId,
      phases,
      finalDecision,
      traderProposal,
      totalLatencyMs: Date.now() - startTime,
    }
  }

  private async runPhase<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn()
  }
}
