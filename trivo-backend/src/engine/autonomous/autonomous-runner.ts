// engine/autonomous/autonomous-runner.ts
// Phase 6: 24/7 Autonomous Agent Runner with lifecycle state machine

import type { BaseProvider } from '../providers/base-provider.js'
import type { MarketContext } from '../types.js'
import { LearningEngine } from '../learning/learning-engine.js'
import type { BaseAgent } from '../agents/base-agent.js'
import { auditSystem, type DecisionExport } from '../audit/audit-system.js'
import { eventStore, EventType } from './event-store.js'
import { watchdog } from './watchdog.js'
import { selfHealer } from './self-healer.js'
import { randomUUID } from 'crypto'

export enum LifecycleState {
  SLEEPING = 'SLEEPING',
  WAKING = 'WAKING',
  ANALYZING = 'ANALYZING',
  DECIDING = 'DECIDING',
  EXECUTING = 'EXECUTING',
  RECOVERING = 'RECOVERING',
  SHUTTING_DOWN = 'SHUTTING_DOWN',
  ERROR = 'ERROR',
}

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
  private state: LifecycleState = LifecycleState.SLEEPING
  private stateChangedAt: number = Date.now()

  constructor(provider: BaseProvider, config: Partial<AutonomousConfig> = {}) {
    this.provider = provider
    this.learningEngine = new LearningEngine(provider)
    this.config = {
      cycleIntervalMs: config.cycleIntervalMs ?? 10_000,
      maxCyclesPerRun: config.maxCyclesPerRun ?? 100,
      cooldownBetweenCyclesMs: config.cooldownBetweenCyclesMs ?? 1_000,
    }
  }

  getState(): LifecycleState { return this.state }
  isRunning(): boolean { return this.running }
  getCycleCount(): number { return this.cycleCount }

  registerAgent(agent: BaseAgent): void {
    this.agents.push(agent)
  }

  private setState(newState: LifecycleState): void {
    const prev = this.state
    this.state = newState
    this.stateChangedAt = Date.now()
    console.log(`[AutonomousRunner] State: ${prev} → ${newState}`)
  }

  async runCycle(context: MarketContext): Promise<CycleResult> {
    const startTime = Date.now()
    const cycleId = randomUUID().substring(0, 12)
    const chainId = auditSystem.createChain()

    this.setState(LifecycleState.WAKING)
    let lessonsLearned = 0

    // Run each registered agent
    for (const agent of this.agents) {
      agent.setReasoningContext(chainId, cycleId)
      watchdog.ping(cycleId)

      this.setState(LifecycleState.ANALYZING)
      const response = await agent.analyze(context).catch(async (err) => {
        const strategy = await selfHealer.recover(cycleId, err)
        if (strategy === 'retry') {
          this.setState(LifecycleState.RECOVERING)
          return agent.analyze(context)
        }
        this.setState(LifecycleState.ERROR)
        eventStore.append('system', EventType.ERROR, { cycleId, error: String(err), agentId: cycleId })
        throw err
      })

      this.setState(LifecycleState.DECIDING)
      if (response.success && response.reasoningStep) {
        lessonsLearned++
      }
    }

    this.setState(LifecycleState.EXECUTING)
    const decision = auditSystem.finalizeChain(chainId)

    this.cycleCount++
    this.setState(LifecycleState.SLEEPING)

    return {
      cycleId,
      decision,
      lessonsLearned,
      latencyMs: Date.now() - startTime,
    }
  }

  async start(context: MarketContext): Promise<void> {
    if (this.running) {
      console.warn('[AutonomousRunner] Already running')
      return
    }

    this.running = true
    this.setState(LifecycleState.WAKING)
    console.log(`[AutonomousRunner] Started with ${this.agents.length} agents`)

    // Start watchdog
    watchdog.start((agentId, silenceMs) => {
      console.warn(`[AutonomousRunner] Watchdog fired for ${agentId}: ${silenceMs}ms silence`)
      selfHealer.degrade(agentId)
    })

    while (this.running && this.cycleCount < this.config.maxCyclesPerRun) {
      try {
        const result = await this.runCycle(context)
        eventStore.append('system', EventType.CYCLE_END, {
          cycleId: result.cycleId,
          latency: result.latencyMs,
          lessons: result.lessonsLearned,
        })
        console.log(
          `[AutonomousRunner] Cycle #${this.cycleCount}: ${result.latencyMs}ms, ${result.lessonsLearned} lessons`
        )
      } catch (error) {
        this.setState(LifecycleState.ERROR)
        console.error('[AutonomousRunner] Cycle error:', error)
        await selfHealer.recover('system', error as Error)
      }

      await new Promise(resolve => setTimeout(resolve, this.config.cooldownBetweenCyclesMs))
    }

    this.setState(LifecycleState.SHUTTING_DOWN)
    watchdog.stop()
    this.running = false
    console.log(`[AutonomousRunner] Stopped after ${this.cycleCount} cycles`)
  }

  stop(): void {
    this.setState(LifecycleState.SHUTTING_DOWN)
    this.running = false
    watchdog.stop()
    console.log('[AutonomousRunner] Stop requested')
  }
}

