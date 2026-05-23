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

const MAX_POSITIONS = 3
const MIN_TRADE_INTERVAL_MS = 30_000
const MAX_DAILY_TRADES = 50

export class AgentRunner {
  private decision: DecisionEngine
  private circuitBreaker: CircuitBreaker
  private lastTradeTime = 0
  private dailyTradeCount = 0
  private dailyResetTime: Date

  constructor(
    private readonly agentId: string, private readonly agentName: string,
    private readonly thinking: ThinkingEngine, private readonly tools: ToolRegistry,
  ) {
    this.decision = new DecisionEngine(DEFAULT_RISK_CONFIG)
    this.circuitBreaker = new CircuitBreaker(DEFAULT_RISK_CONFIG)
    this.dailyResetTime = new Date(); this.dailyResetTime.setUTCHours(0, 0, 0, 0)
  }

  async runCycle(): Promise<void> {
    const now = new Date()
    if (now >= new Date(this.dailyResetTime.getTime() + 86400000)) { this.dailyTradeCount = 0; this.dailyResetTime = new Date(); this.dailyResetTime.setUTCHours(0, 0, 0, 0) }

    const { canTrade, reason } = this.circuitBreaker.canTrade()
    if (!canTrade) { console.log(`⏸️  [${this.agentName}] Paused: ${reason}`); return }

    const agent = await db.query.agents.findFirst({ where: eq(agents.id, this.agentId) })
    if (!agent || agent.status !== 'active') return

    const openPositions = await db.select().from(positions)
      .where(and(eq(positions.agentId, this.agentId), eq(positions.status, 'open')))
    const currentPositions = openPositions.length

    const timeSinceLastTrade = Date.now() - this.lastTradeTime
    if (this.lastTradeTime > 0 && timeSinceLastTrade < MIN_TRADE_INTERVAL_MS) return
    if (this.dailyTradeCount >= MAX_DAILY_TRADES) return

    // STRICT: Block opening if already at max — only allow close or hold
    const canOpen = currentPositions < MAX_POSITIONS

    console.log(`\n${'─'.repeat(40)}`)
    console.log(`🔄 [${this.agentName}] Cycle (${currentPositions}/${MAX_POSITIONS} positions, ${canOpen ? 'can open' : 'FULL'})`)

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

      console.log(`   🧠 ${output.confidence}% | ${output.riskLevel} | ${output.action}`)

      // CLOSE: Always allow
      if (output.action === 'close_trade' && output.tool === 'close_trade') {
        const closeArgs = (output.args || {}) as Record<string, unknown>
        const posId = closeArgs.positionId || openPositions[0]?.id
        if (posId) {
          const result = await this.tools.execute('close_trade', { positionId: posId, reason: output.reasoning?.slice(0, 200), _agentId: this.agentId })
          const pnl = parseFloat((result as Record<string, unknown>).pnl as string) || 0
          await this.updateAgentPnL(pnl)
          this.dailyTradeCount++; this.lastTradeTime = Date.now()
          console.log(`   📈 Closed PnL: $${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`)
          await this.createFeedEvent('position_closed', closeArgs, output.confidence, output.reasoning, pnl)
        }
        return
      }

      // HOLD: No action
      if (output.action === 'hold') { console.log(`   🤝 Holding`); return }

      // OPEN: Only if under max
      if (output.action === 'open_trade') {
        if (!canOpen) {
          console.log(`   ⚠️ FULL (${currentPositions}/${MAX_POSITIONS}) — must close one first`)
          return
        }

        const decision = this.decision.evaluate(output, {
          maxLeverageX: Number(agent.maxLeverage ?? 5),
          spendLimitUsd: Number(agent.spendLimit ?? 100),
        })

        if (!decision) return

        console.log(`   ⚡ ${decision.tool}`)
        const result = await this.tools.execute(decision.tool, { ...decision.args, _agentId: this.agentId })

        await this.saveMemory('execution', `${decision.tool}: ${JSON.stringify(result)}`, decision.reasoning, { tool: decision.tool, args: decision.args })
        this.dailyTradeCount++; this.lastTradeTime = Date.now()

        await this.createFeedEvent('position_opened', decision.args, decision.confidence, decision.reasoning, 0)
        await this.recordERC8004(agent, result)

        broadcastAgentEvent(this.agentId, { event: 'execution', agentId: this.agentId, result: { tool: decision.tool, args: decision.args, outcome: result } })
        console.log(`   ✅ Done`)
      }
    } catch (error) {
      console.error(`   ❌ [${this.agentName}]`, error)
      broadcastAgentEvent(this.agentId, { event: 'error', agentId: this.agentId, content: String(error) })
    }
  }

  private async updateAgentPnL(pnl: number) {
    try {
      const agent = await db.query.agents.findFirst({ where: eq(agents.id, this.agentId) })
      if (agent) {
        const np = Number(agent.totalPnl || 0) + pnl
        const tr = Number(agent.tradeCount || 0) + 1
        await db.update(agents).set({ totalPnl: np.toFixed(2), tradeCount: String(tr) }).where(eq(agents.id, this.agentId)).execute()
      }
    } catch { /* ignore */ }
  }

  getStatus() { return { agentId: this.agentId, agentName: this.agentName, dailyTradeCount: this.dailyTradeCount, circuitBreaker: this.circuitBreaker.getStatus() } }

  private async saveMemory(t: string, c: string, r: string, m: Record<string, unknown>) {
    await db.insert(agentMemory).values({ id: crypto.randomUUID(), agentId: this.agentId, type: t, content: c, reasoning: r, metadata: JSON.stringify(m) }).execute().catch(() => {})
  }

  private async createFeedEvent(type: string, args: Record<string, unknown>, confidence: number, reasoning: string, pnl: number) {
    const venue = String(args.venue || 'perp')
    const pair = String(args.pair || '-')
    // Perp = LONG/SHORT, Polymarket = YES/NO, LP = ADD/REMOVE
    const side = venue === 'polymarket' ? (String(args.side || 'yes').toLowerCase() === 'yes' ? 'YES' : 'NO')
               : venue === 'lp' ? 'ADD'
               : String(args.side || 'long').toUpperCase()

    await db.insert(feedEvents).values({
      id: crypto.randomUUID(), agentId: this.agentId, type, venue, pair, side,
      size: String(args.size || '0'),
      data: JSON.stringify({ confidence, reasoning, pnl: pnl.toFixed(2), entryPrice: args.entryPrice, exitPrice: args.exitPrice }),
    }).execute().catch(() => {})
  }

  private async recordERC8004(agent: Record<string, unknown>, result: unknown) {
    try {
      const ercId = agent.erc8004TokenId as string | undefined
      if (ercId) { const won = !!(result as Record<string, unknown>)?.success; await erc8004Service.recordTradeOutcome(ercId, won) }
    } catch { /* ignore */ }
  }
}
