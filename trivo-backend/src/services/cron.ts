import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { positions, feedEvents } from '../lib/schema'
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

// agentProcessingJob DISABLED — replaced by new engine/agent-runner.ts

async function pnlWatcherJob() {
  const openPositions = await db.select().from(positions).where(eq(positions.status, 'open'))

  for (const pos of openPositions) {
    try {
      const KNOWN_TOKENS = ['BTC', 'ETH', 'SOL']
      const baseToken = KNOWN_TOKENS.find((t) => pos.market?.toUpperCase().includes(t)) ?? 'BTC'
      const pair = `${baseToken}/USD`
      const currentPrice = await getPrice(pair)
      if (currentPrice === 0) {
        console.warn(`⚠️ Skipping position ${pos.id}: no price data for ${pair}`)
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

export async function startAllCrons() {
  console.log('⏰ Starting all cron jobs...')

  const { registerAllTools } = await import('./tools')
  registerAllTools()

  startCron('market-data', 60_000, marketDataJob)
  // startCron("agent-processing", 30_000, agentProcessingJob) // DISABLED — using new engine
  // startCron("agent-processing", 30_000, agentProcessingJob)
  startCron('pnl-watcher', 60_000, pnlWatcherJob)

  console.log('✅ All cron jobs running')
}
