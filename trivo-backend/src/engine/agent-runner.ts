import { db } from '../lib/db.js'
import { agents, agentMemory, feedEvents, positions } from '../lib/schema.js'
import { eq, and } from 'drizzle-orm'
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

const MAX_CONCURRENT_POSITIONS = 2
const MIN_TRADE_INTERVAL_MS = 30_000
const MAX_LOSS_STREAK_PAUSE = 3
const MAX_DAILY_TRADES = 50

export class AgentRunner {
  private decision: DecisionEngine
  private circuitBreaker: CircuitBreaker
  private lastTradeTime = 0
  private consecutiveLosses = 0
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
    // Reset daily counters
    const now = new Date()
    if (now >= new Date(this.dailyResetTime.getTime() + 86400000)) {
      this.dailyTradeCount = 0
      this.dailyResetTime = new Date()
      this.dailyResetTime.setUTCHours(0, 0, 0, 0)
    }

    const { canTrade, reason } = this.circuitBreaker.canTrade()
    if (!canTrade) { console.log(`⏸️  [${this.agentName}] Paused: ${reason}`); return }

    const agent = await db.query.agents.findFirst({ where: eq(agents.id, this.agentId) })
    if (!agent || agent.status !== 'active') return

    // Check open positions
    const openPositions = await db.select().from(positions)
      .where(and(eq(positions.agentId, this.agentId), eq(positions.status, 'open')))
    const currentPositions = openPositions.length

    // 💰 If we have open positions, try to close them first
    if (currentPositions > 0 && this.dailyTradeCount > 0) {
      // Every few cycles, check if we should close
      const shouldClose = Math.random() > 0.5
      if (shouldClose) {
        // Close oldest position
        const pos = openPositions[0]
        if (pos) {
          console.log(`   🔄 [${this.agentName}] Trying to close position ${pos.id}`)
          try {
            const result = await this.tools.execute('close_trade', { 
              positionId: pos.id, 
              reason: 'Taking profit or cutting loss' 
            })
            const tradePnl = parseFloat((result as Record<string, unknown>).pnl as string) || 0
            await this.updateAgentPnL(tradePnl)
            this.dailyTradeCount++
            console.log(`   📈 PnL: $${tradePnl >= 0 ? '+' : ''}${tradePnl.toFixed(2)}`)
            this.lastTradeTime = Date.now()
            return
          } catch (err) {
            console.error(`   ❌ Close failed:`, (err as Error).message)
          }
        }
      }
    }

    // 💰 Money management checks
    if (currentPositions >= MAX_CONCURRENT_POSITIONS) {
      console.log(`💰 [${this.agentName}] Max positions (${MAX_CONCURRENT_POSITIONS}) reached`)
      return
    }

    const timeSinceLastTrade = Date.now() - this.lastTradeTime
    if (this.lastTradeTime > 0 && timeSinceLastTrade < MIN_TRADE_INTERVAL_MS) return

    if (this.dailyTradeCount >= MAX_DAILY_TRADES) {
      console.log(`💰 [${this.agentName}] Daily limit (${MAX_DAILY_TRADES}) reached`)
      return
    }

    console.log(`\n${'─'.repeat(40)}`)
    console.log(`🔄 [${this.agentName}] Cycle (#${this.dailyTradeCount + 1}, positions: ${currentPositions}/${MAX_CONCURRENT_POSITIONS})`)

    broadcastAgentEvent(this.agentId, { event: 'thinking', agentId: this.agentId })

    try {
      const output = await this.thinking.run({
        id: agent.id, name: agent.name, strategy: agent.strategy, skills: agent.skills,
        riskConfig: {
          maxLeverage: Number(agent.maxLeverage ?? 5),
          stopLossPct: Number(agent.stopLossPct ?? 10),
          spendLimit: Number(agent.spendLimit ?? 100),
        },
      })

      await this.saveMemory('reasoning', output.reasoning, `${output.observation}\n\n${output.analysis}`, {
        confidence: output.confidence, riskLevel: output.riskLevel,
      })

      broadcastAgentEvent(this.agentId, {
        event: 'deciding', agentId: this.agentId,
        content: JSON.stringify({ observation: output.observation, confidence: output.confidence }),
      })

      console.log(`   🧠 ${output.confidence}% | ${output.riskLevel}`)

      const decision = this.decision.evaluate(output, {
        maxLeverageX: Number(agent.maxLeverage ?? 5),
        spendLimitUsd: Number(agent.spendLimit ?? 100),
      })

      if (!decision) {
        broadcastAgentEvent(this.agentId, { event: 'deciding', agentId: this.agentId, content: 'HOLD or blocked' })
        return
      }

      console.log(`   ⚡ ${decision.tool}`)
      const result = await this.tools.execute(decision.tool, decision.args)

      await this.saveMemory('execution', `${decision.tool}: ${JSON.stringify(result)}`, decision.reasoning, {
        tool: decision.tool, args: decision.args,
      })

      this.lastTradeTime = Date.now()
      this.dailyTradeCount++

      const tradePnl = parseFloat((result as Record<string, unknown>).pnl as string) || 0

      // UPDATE agent's totalPnl in DB
      await this.updateAgentPnL(tradePnl)

      if (tradePnl < 0) {
        this.consecutiveLosses++
        if (this.consecutiveLosses >= MAX_LOSS_STREAK_PAUSE) {
          console.log(`💰 [${this.agentName}] ${MAX_LOSS_STREAK_PAUSE} consecutive losses — pausing`)
          await db.update(agents).set({ status: 'paused' }).where(eq(agents.id, this.agentId)).execute()
          return
        }
      } else {
        this.consecutiveLosses = 0
      }

      console.log(`   📈 PnL: $${tradePnl >= 0 ? '+' : ''}${tradePnl.toFixed(2)} | Streak: ${this.consecutiveLosses}/${MAX_LOSS_STREAK_PAUSE} losses`)

      await this.createFeedEvent(decision.tool, decision.args, decision.confidence, decision.reasoning)
      await this.recordERC8004(agent, result)
      this.circuitBreaker.recordTradeResult(tradePnl)

      broadcastAgentEvent(this.agentId, {
        event: 'execution', agentId: this.agentId,
        result: { tool: decision.tool, args: decision.args, outcome: result, pnl: tradePnl },
      })

      console.log(`   ✅ [${this.agentName}] Done`)
    } catch (error) {
      console.error(`   ❌ [${this.agentName}]`, error)
      broadcastAgentEvent(this.agentId, { event: 'error', agentId: this.agentId, content: String(error) })
    }
  }

  private async updateAgentPnL(pnl: number) {
    try {
      const agent = await db.query.agents.findFirst({ where: eq(agents.id, this.agentId) })
      if (agent) {
        const currentPnl = Number(agent.totalPnl || 0)
        const newPnl = currentPnl + pnl
        const currentTrades = Number(agent.tradeCount || 0) + 1
        await db.update(agents)
          .set({ totalPnl: newPnl.toFixed(2), tradeCount: String(currentTrades) })
          .where(eq(agents.id, this.agentId))
          .execute()
      }
    } catch (err) {
      console.error('Failed to update agent PnL:', (err as Error).message)
    }
  }

  getStatus() {
    return {
      agentId: this.agentId, agentName: this.agentName,
      dailyTradeCount: this.dailyTradeCount, consecutiveLosses: this.consecutiveLosses,
      lastTradeTime: this.lastTradeTime ? new Date(this.lastTradeTime).toISOString() : null,
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
