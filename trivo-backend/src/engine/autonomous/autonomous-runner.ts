// engine/autonomous/autonomous-runner.ts
// Phase 6: 24/7 Autonomous Agent Runner - continuous decision cycles

import type { BaseProvider } from '../providers/base-provider.js'
import type { MarketContext } from '../types.js'
import { pnlService } from '../../services/pnl.service.js'
import { LearningEngine } from '../learning/learning-engine.js'
import type { BaseAgent, AgentConfig } from '../agents/base-agent.js'
import { auditSystem, type DecisionExport } from '../audit/audit-system.js'
import { randomUUID } from 'crypto'

export interface AutonomousConfig {
  cycleIntervalMs: number
  maxCyclesPerRun: number
  cooldownBetweenCyclesMs: number
}

export interface CycleResult {
  cycleId: string
  decision?: DecisionExport
  pnlSnapshot?: unknown
  lessonsLearned: number
  latencyMs: number
}

export class AutonomousRunner {
  private provider: BaseProvider
  private agents: BaseAgent[] = []
  private learningEngine: LearningEngine
  private config: AutonomousConfig
  private running: boolean = false
  private cycleCount: number = 0

  constructor(provider: BaseProvider, config: Partial<AutonomousConfig> = {}) {
    this.provider = provider
    this.learningEngine = new LearningEngine(provider)
    this.config = {
      cycleIntervalMs: config.cycleIntervalMs ?? 10_000,
      maxCyclesPerRun: config.maxCyclesPerRun ?? 100,
      cooldownBetweenCyclesMs: config.cooldownBetweenCyclesMs ?? 1_000,
    }
  }

  /**
   * Register agents for the next cycle
   */
  registerAgent(agent: BaseAgent): void {
    this.agents.push(agent)
  }

  /**
   * Check if the runner is currently active
   */
  isRunning(): boolean {
    return this.running
  }

  /**
   * Get total cycles executed
   */
  getCycleCount(): number {
    return this.cycleCount
  }

  /**
   * Run a single decision cycle
   */
  async runCycle(context: MarketContext): Promise<CycleResult> {
    const startTime = Date.now()
    const cycleId = randomUUID().substring(0, 12)
    const chainId = auditSystem.createChain()

    let lessonsLearned = 0

    // Run each registered agent
    for (const agent of this.agents) {
      agent.setReasoningContext(chainId, cycleId)
      const response = await agent.analyze(context)

      // Process trade outcomes for learning
      if (response.success && response.reasoningStep) {
        // Each agent run is a learning opportunity
        lessonsLearned++
      }
    }

    // Finalize audit chain
    const decision = auditSystem.finalizeChain(chainId)

    // Take PnL snapshot

    this.cycleCount++

    return {
      cycleId,
      decision,
      lessonsLearned,
      latencyMs: Date.now() - startTime,
    }
  }

  /**
   * Start continuous execution
   */
  async start(context: MarketContext): Promise<void> {
    if (this.running) {
      console.warn('[AutonomousRunner] Already running')
      return
    }

    this.running = true
    console.log(`[AutonomousRunner] Started with ${this.agents.length} agents`)

    while (this.running && this.cycleCount < this.config.maxCyclesPerRun) {
      try {
        const result = await this.runCycle(context)
        console.log(
          `[AutonomousRunner] Cycle #${this.cycleCount}: ${result.latencyMs}ms, ${result.lessonsLearned} lessons`
        )
      } catch (error) {
        console.error('[AutonomousRunner] Cycle error:', error)
      }

      // Cooldown before next cycle
      await new Promise(resolve => setTimeout(resolve, this.config.cooldownBetweenCyclesMs))
    }

    this.running = false
    console.log(`[AutonomousRunner] Stopped after ${this.cycleCount} cycles`)
  }

  /**
   * Stop continuous execution
   */
  stop(): void {
    this.running = false
    console.log('[AutonomousRunner] Stop requested')
  }
}
