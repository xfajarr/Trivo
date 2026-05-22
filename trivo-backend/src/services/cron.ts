import { eq, desc } from 'drizzle-orm'
import { db } from '../lib/db'
import { agents as agentsTable, agentMemory, agentSessions, feedEvents, positions } from '../lib/schema'
import { fetchAndPushPrices, getSimulatedPrices } from './market-data.service'
import { decide, executeDecision } from './decision-engine.service'
import { getPrice } from './contract.service'

function startCron(name: string, intervalMs: number, fn: () => Promise<void>) {
  console.log(`⏰ Cron started: ${name} (every ${intervalMs}ms)`)

  async function run() {
    try {
      await fn()
    } catch (err) {
      console.error(`❌ [${name}] Error:`, err)
    }
  }

  run()
  setInterval(run, intervalMs)
}

async function marketDataJob() {
  const prices = await fetchAndPushPrices()
  if (Object.keys(prices).length === 0) {
    const simPrices = await getSimulatedPrices()
    for (const [pair, price] of Object.entries(simPrices)) {
      try {
        const mod = await import('./contract.service')
        await mod.updatePrice(pair, price)
      } catch {}
    }
  }
}

async function agentProcessingJob() {
  const activeAgents = await db.select().from(agentsTable)
    .where(eq(agentsTable.status, 'active'))
    .limit(10)

  if (activeAgents.length === 0) return

  let prices: Record<string, number> = {}
  try {
    prices['BTC/USD'] = await getPrice('BTC/USD')
    prices['ETH/USD'] = await getPrice('ETH/USD')
    prices['SOL/USD'] = await getPrice('SOL/USD')
  } catch {
    prices = await getSimulatedPrices()
  }

  for (const agent of activeAgents) {
    try {
      const recentMemory = await db.select()
        .from(agentMemory)
        .where(eq(agentMemory.agentId, agent.id))
        .orderBy(desc(agentMemory.createdAt))
        .limit(5)

      const decision = await decide({
        id: agent.id,
        name: agent.name,
        strategy: agent.strategy,
        modelProvider: agent.modelProvider,
        memory: recentMemory.map(m => ({
          type: m.type,
          content: m.content,
          reasoning: m.reasoning,
        })),
      }, { prices })

      await db.insert(agentMemory).values({
        id: crypto.randomUUID(),
        agentId: agent.id,
        type: decision.shouldTrade ? 'decision' : 'observation',
        content: decision.reasoning,
        reasoning: decision.reasoning,
        metadata: JSON.stringify({ tool: decision.tool, confidence: decision.confidence }),
      })

      if (!decision.shouldTrade || !decision.tool) continue

      const result = await executeDecision(agent.id, decision)

      await db.insert(feedEvents).values({
        id: crypto.randomUUID(),
        agentId: agent.id,
        type: 'position_open',
        data: JSON.stringify({ decision, result }),
        venue: ((decision.args ?? {}) as any)?.venue ?? 'perp',
        txHash: result?.txHash ?? null,
        reasoning: decision.reasoning,
      })

      console.log(`🤖 ${agent.name}: ${decision.tool} → ${result?.success ? '✅' : '❌'}`)
    } catch (err) {
      console.error(`❌ Agent ${agent.id} processing error:`, err)
    }
  }
}

async function pnlWatcherJob() {
  const openPositions = await db.select().from(positions)
    .where(eq(positions.status, 'open'))

  for (const pos of openPositions) {
    try {
      const pair = `${pos.market?.split('-')[0] ?? 'BTC'}/USD`
      const currentPrice = await getPrice(pair)
      const entryPrice = Number(pos.entryPrice)
      if (entryPrice === 0) continue

      const change = (currentPrice - entryPrice) / entryPrice

      if (Math.abs(change) > 0.02) {
        const isLong = pos.side === 'LONG' || pos.side === 'BUY' || pos.side === 'YES'
        const pnlRaw = isLong ? change * Number(pos.size) : (-change) * Number(pos.size)
        const pnl = Math.floor(pnlRaw)

        // Call closePosition on Arc
        try {
          const copyPosId = parseInt(pos.copyTradingPositionId || '0')
          if (copyPosId > 0) {
            const { closePositionOnChain } = await import('./contract.service')
            await closePositionOnChain(copyPosId, currentPrice, pnl)
          }
        } catch (e) {
          console.error('Close on-chain failed:', e)
        }

        await db.update(positions).set({
          status: 'closed',
          pnl: pnl.toString(),
          markPrice: currentPrice.toString(),
          closedAt: new Date(),
        }).where(eq(positions.id, pos.id))

        await db.insert(feedEvents).values({
          id: crypto.randomUUID(),
          agentId: pos.agentId,
          type: 'position_close',
          data: JSON.stringify({ pnl, exitPrice: currentPrice }),
          venue: pos.venue,
          reasoning: `Price moved ${(change * 100).toFixed(1)}%, closing position. PnL: ${pnl >= 0 ? '+' : ''}${pnl} USDC`,
        })
      }
    } catch (err) {
      console.error(`❌ PnL check failed for ${pos.id}:`, err)
    }
  }
}

export async function startAllCrons() {
  console.log('⏰ Starting all cron jobs...')

  const { registerAllTools } = await import('./tools')
  registerAllTools()

  startCron('market-data', 60_000, marketDataJob)
  startCron('agent-processing', 30_000, agentProcessingJob)
  startCron('pnl-watcher', 60_000, pnlWatcherJob)

  console.log('✅ All cron jobs running')
}
