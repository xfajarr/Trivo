import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { positions, feedEvents, agents } from '../lib/schema'
import { fetchAndPushPrices, getSimulatedPrices } from './market-data.service'
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
      } catch {
        console.warn('Non-critical error')
      }
    }
  }
}

/**
 * Agent processing job — runs the AI trading committee for active agents
 * Uses CompleteTradingAgent to run the full analyst→researcher→trader→PM→execute pipeline
 */
async function agentProcessingJob() {
  try {
    const { CompleteTradingAgent } = await import('../engine/agents/complete-trading-agent.js')
    const { HeuristProvider } = await import('../engine/providers/heurist.js')
    const { getPrice } = await import('./contract.service')

    // Get active agents
    const activeAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.status, 'active'))
      .limit(10)

    if (activeAgents.length === 0) return

    // Get real prices from oracle (NO FALLBACK — surface errors)
    const btcPrice = await getPrice('BTC/USD')
    const ethPrice = await getPrice('ETH/USD')
    const solPrice = await getPrice('SOL/USD')
    const prices = { 'BTC/USD': btcPrice, 'ETH/USD': ethPrice, 'SOL/USD': solPrice }

    // ── MARK-TO-MARKET: Update unrealized PnL for all open positions ─────────
    try {
      const { pnlService } = await import('./pnl.service')
      await pnlService.updateMarkToMarket(prices)
    } catch (err) {
      console.warn('[Cron] updateMarkToMarket failed:', (err as Error).message)
    }

    const openPositions = await db
      .select()
      .from(positions)
      .where(eq(positions.status, 'open'))

    const marketContext = {
      prices,
      priceChanges: {
        'BTC/USD': { hour: 0, day: 0 },
        'ETH/USD': { hour: 0, day: 0 },
        'SOL/USD': { hour: 0, day: 0 },
      },
      sentiment: {},
      recentTrades: [],
      openPositions: openPositions.map(p => ({
        venue: p.venue || 'mock',
        side: p.side || 'LONG',
        size: Number(p.size) || 0,
        entryPrice: Number(p.entryPrice) || 0,
      })),
      todayPnl: 0,
      winRate: 0,
      totalTrades: openPositions.length,
    }

    // Initialize provider
    const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? ''
    const model = process.env.AI_MODEL ?? 'gpt-4o'
    const provider = new HeuristProvider({ apiKey, model: model })
    const agent = new CompleteTradingAgent(provider)

    // Run for each active agent — build per-agent context with ONLY their positions
    for (const agentData of activeAgents) {
      try {
        // Filter open positions to ONLY this agent's positions
        const agentOpenPositions = openPositions.filter(p => p.agentId === agentData.id)

        const perAgentContext = {
          prices,
          priceChanges: {
            'BTC/USD': { hour: 0, day: 0 },
            'ETH/USD': { hour: 0, day: 0 },
            'SOL/USD': { hour: 0, day: 0 },
          },
          sentiment: {},
          recentTrades: [],
          openPositions: agentOpenPositions.map(p => ({
            venue: p.venue || 'mock',
            side: p.side || 'LONG',
            size: Number(p.size) || 0,
            entryPrice: Number(p.entryPrice) || 0,
          })),
          todayPnl: 0,
          winRate: 0,
          totalTrades: agentOpenPositions.length,
        }

        const result = await agent.runFullCycle(perAgentContext, agentData.id)
        if (result.executed && result.tradeResult?.success) {
          console.log(`✅ [Agent ${agentData.id.slice(0, 8)}] Trade executed: ${result.traderProposal?.action}`)
        }
      } catch (err) {
        console.error(`❌ [Agent ${agentData.id.slice(0, 8)}] Cycle failed:`, err)
      }
    }
  } catch (err) {
    console.error('❌ [agent-processing] Failed:', err)
  }
}

async function pnlWatcherJob() {
  const openPositions = await db.select().from(positions).where(eq(positions.status, 'open'))

  for (const pos of openPositions) {
    try {
      const KNOWN_TOKENS = ['BTC', 'ETH', 'SOL']
      const baseToken = KNOWN_TOKENS.find((t) => pos.market?.toUpperCase().includes(t)) ?? 'BTC'
      const pair = `${baseToken}/USD`
      const currentPrice = await getPrice(pair)
      if (currentPrice === 0) {
        console.warn(`⚠️ Skipping position ${pos.id}: no oracle price for ${pair}`)
        continue
      }
      const entryPrice = Number(pos.entryPrice)
      if (entryPrice === 0) continue

      const change = (currentPrice - entryPrice) / entryPrice

      if (Math.abs(change) > 0.02) {
        const isLong = pos.side === 'LONG' || pos.side === 'BUY' || pos.side === 'YES'
        const pnlRaw = isLong ? change * Number(pos.size) : -change * Number(pos.size)
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

        await db
          .update(positions)
          .set({
            status: 'closed',
            pnl: pnl.toString(),
            markPrice: currentPrice.toString(),
            closedAt: new Date(),
          })
          .where(eq(positions.id, pos.id))

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

async function pnlSnapshotJob() {
  const agentResults = await db
    .selectDistinct({ agentId: positions.agentId })
    .from(positions)
    .where(eq(positions.status, 'closed'))

  for (const { agentId } of agentResults) {
    if (!agentId) continue
    try {
      const { pnlService } = await import('./pnl.service')
      await pnlService.createSnapshot(agentId)
    } catch {
      // PnL snapshot for this agent skipped — service may not be available
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
  startCron('pnl-snapshot', 300_000, pnlSnapshotJob)

  console.log('✅ All cron jobs running')
}
