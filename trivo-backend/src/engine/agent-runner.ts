import { db } from '../lib/db.js'
import { agents, agentMemory, feedEvents } from '../lib/schema.js'
import { eq } from 'drizzle-orm'
import type { ThinkingEngine } from './thinking/thinking-engine.js'
import { DecisionEngine } from './decision/decision-engine.js'
import { CircuitBreaker } from './decision/circuit-breaker.js'
import type { ToolRegistry } from './tools/registry.js'
import { broadcastAgentEvent } from '../services/ws.js'
import { erc8004Service } from './services/erc8004.service.js'
import type { RiskConfig } from './types.js'

const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxLeverageX: 5, stopLossPct: 10, spendLimitUsd: 100, maxDailyLossUsd: 50,
  pauseOnConsecutiveLosses: 3, cooldownMinutes: 30,
  confidenceThresholds: { low: 30, medium: 50, high: 70 },
}

/**
 * AgentRunner — SINGLE RESPONSIBILITY: runs one agent cycle
 * SOLID-S: Only handles the agent cycle logic
 * SOLID-D: Depends on ThinkingEngine + ToolRegistry abstractions
 */
export class AgentRunner {
  private decision: DecisionEngine
  private circuitBreaker: CircuitBreaker

  constructor(
    private readonly agentId: string,
    private readonly agentName: string,
    private readonly thinking: ThinkingEngine,
    private readonly tools: ToolRegistry,
  ) {
    this.decision = new DecisionEngine(DEFAULT_RISK_CONFIG)
    this.circuitBreaker = new CircuitBreaker(DEFAULT_RISK_CONFIG)
  }

  async runCycle(): Promise<void> {
    // Circuit breaker check
    const { canTrade, reason } = this.circuitBreaker.canTrade()
    if (!canTrade) {
      console.log(`⏸️  [${this.agentName}] Paused: ${reason}`)
      return
    }

    const agent = await db.query.agents.findFirst({ where: eq(agents.id, this.agentId) })
    if (!agent || agent.status !== 'active') return

    console.log(`\n${'─'.repeat(40)}`)
    console.log(`🔄 [${this.agentName}] Cycle`)

    broadcastAgentEvent(this.agentId, { event: 'thinking', agentId: this.agentId })

    try {
      // 1. Think
      const output = await this.thinking.run({
        id: agent.id, name: agent.name, strategy: agent.strategy, skills: agent.skills,
        riskConfig: {
          maxLeverage: Number(agent.maxLeverage ?? 5),
          stopLossPct: Number(agent.stopLossPct ?? 10),
          spendLimit: Number(agent.spendLimit ?? 100),
        },
      })

      // 2. Save reasoning
      await this.saveMemory('reasoning', output.reasoning, `${output.observation}\n\n${output.analysis}`, {
        confidence: output.confidence, riskLevel: output.riskLevel,
      })

      broadcastAgentEvent(this.agentId, {
        event: 'deciding', agentId: this.agentId,
        content: JSON.stringify({ observation: output.observation, confidence: output.confidence }),
      })

      console.log(`   🧠 ${output.confidence}% | ${output.riskLevel}`)

      // 3. Evaluate
      const decision = this.decision.evaluate(output, {
        maxLeverageX: Number(agent.maxLeverage ?? 5),
        spendLimitUsd: Number(agent.spendLimit ?? 100),
      })

      if (!decision) {
        broadcastAgentEvent(this.agentId, { event: 'deciding', agentId: this.agentId, content: 'HOLD or blocked' })
        return
      }

      // 4. Execute
      console.log(`   ⚡ ${decision.tool}`)
      const result = await this.tools.execute(decision.tool, decision.args)

      // 5. Save execution
      await this.saveMemory('execution', `${decision.tool}: ${JSON.stringify(result)}`, decision.reasoning, {
        tool: decision.tool, args: decision.args,
      })

      // 6. Feed event
      await this.createFeedEvent(decision.tool, decision.args, decision.confidence, decision.reasoning)

      // 7. ERC-8004
      await this.recordERC8004(agent, result)

      // 8. Update circuit breaker
      this.circuitBreaker.recordTradeResult(((result as unknown as { pnlUsd?: number }).pnlUsd ?? 0))

      broadcastAgentEvent(this.agentId, {
        event: 'execution', agentId: this.agentId,
        result: { tool: decision.tool, args: decision.args, outcome: result },
      })

      console.log(`   ✅ [${this.agentName}] Done`)
    } catch (error) {
      console.error(`   ❌ [${this.agentName}]`, error)
      broadcastAgentEvent(this.agentId, { event: 'error', agentId: this.agentId, content: String(error) })
    }
  }

  getStatus() {
    return {
      agentId: this.agentId,
      agentName: this.agentName,
      circuitBreaker: this.circuitBreaker.getStatus(),
    }
  }

  private async saveMemory(type: string, content: string, reasoning: string, meta: Record<string, unknown>) {
    await db.insert(agentMemory).values({
      id: crypto.randomUUID(), agentId: this.agentId, type, content, reasoning,
      metadata: JSON.stringify(meta),
    }).execute().catch((err: Error) => console.error('Memory:', err.message))
  }

  private async createFeedEvent(tool: string, args: Record<string, unknown>, confidence: number, reasoning: string) {
    await db.insert(feedEvents).values({
      id: crypto.randomUUID(), agentId: this.agentId,
      type: tool === 'open_trade' ? 'position_opened' : 'position_closed',
      venue: String(args.venue ?? ''), pair: String(args.pair ?? ''),
      side: String(args.side ?? ''), size: String(args.size ?? '0'),
      data: JSON.stringify({ confidence, reasoning }),
    }).execute().catch((err: Error) => console.error('Feed:', err.message))
  }

  private async recordERC8004(agent: Record<string, unknown>, result: unknown) {
    try {
      const ercId = agent.erc8004TokenId as string | undefined
      if (ercId) {
        const won = !!(result as Record<string, unknown>)?.success
        const repTx = await erc8004Service.recordTradeOutcome(ercId, won)
        console.log(`   📊 ERC-8004: ${won ? 'WIN' : 'LOSS'} — ${repTx.slice(0, 40)}`)
      }
    } catch (err) { console.warn('   ⚠️ ERC-8004:', (err as Error).message) }
  }
}
