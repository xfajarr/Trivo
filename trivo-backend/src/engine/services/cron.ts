// engine/services/cron.ts
// Phase 6: Cron jobs for PnL updates, agent processing, auto-close
// Mark-to-market, snapshots, auto-close at SL/TP

import { db } from '../../lib/db.js'
import { agents, positions } from '../../lib/schema.js'
import { eq } from 'drizzle-orm'
import { pnlService } from '../../services/pnl.service.js'
import { getPrice } from '../../services/contract.service.js'
import { eventStore, EventType } from '../autonomous/event-store.js'

// Simple cron-like scheduler (no external dependency)
type CronJob = {
  name: string
  intervalMs: number
  lastRun: number
  fn: () => Promise<void>
}

const jobs: CronJob[] = []

/**
 * Add a cron job to the scheduler
 */
export function addCronJob(name: string, intervalMs: number, fn: () => Promise<void>): void {
  jobs.push({
    name,
    intervalMs,
    lastRun: 0,
    fn,
  })
  console.log(`[Cron] Registered job: ${name} (every ${intervalMs}ms)`)
}

/**
 * Get current market prices
 */
async function getMarketPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = {}
  const pairs = ['BTC/USD', 'ETH/USD', 'SOL/USD']

  for (const pair of pairs) {
    try {
      const price = await getPrice(pair)
      if (price > 0) {
        prices[pair] = price
      }
    } catch {
      // Skip if price unavailable
    }
  }

  return prices
}

/**
 * Initialize all cron jobs
 */
export function initCronJobs(): void {
  // ─── MARK-TO-MARKET UPDATE (every 10 seconds) ───
  addCronJob('mark-to-market', 10_000, async () => {
    try {
      const prices = await getMarketPrices()
      if (Object.keys(prices).length === 0) {
        console.log('[Cron] mark-to-market: No prices available')
        return
      }

      await pnlService.updateMarkToMarket(prices)
      eventStore.append('system', EventType.PNL_SNAPSHOT, {
        type: 'mark_to_market',
        pricesUpdated: Object.keys(prices).length,
      })

      console.log(`[Cron] mark-to-market: Updated ${Object.keys(prices).length} prices`)
    } catch (error) {
      console.error('[Cron] mark-to-market failed:', error)
    }
  })

  // ─── HOURLY PNL SNAPSHOTS ───
  addCronJob('pnl-snapshots', 60 * 60_000, async () => {
    try {
      const activeAgents = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.status, 'active'))

      for (const agent of activeAgents) {
        await pnlService.createSnapshot(agent.id)
        eventStore.append(agent.id, EventType.PNL_SNAPSHOT, {
          type: 'hourly_snapshot',
        })
      }

      console.log(`[Cron] pnl-snapshots: Created ${activeAgents.length} snapshots`)
    } catch (error) {
      console.error('[Cron] pnl-snapshots failed:', error)
    }
  })

  // ─── AUTO-CLOSE AT STOP LOSS / TAKE PROFIT (every 30 seconds) ───
  addCronJob('auto-close', 30_000, async () => {
    try {
      const openPositions = await db
        .select()
        .from(positions)
        .where(eq(positions.status, 'open'))

      let closedCount = 0

      for (const position of openPositions) {
        const pair = position.market || 'BTC/USD'
        let currentPrice: number

        try {
          currentPrice = await getPrice(pair)
        } catch {
          continue
        }

        if (currentPrice <= 0) continue

        const side = (position.side || 'long').toLowerCase()
        const isLong = side === 'long'
        const stopLossStr = (position as unknown as Record<string, string>).stopLoss
        const takeProfitStr = (position as unknown as Record<string, string>).takeProfit
        const stopLoss = parseFloat(stopLossStr || '0')
        const takeProfit = parseFloat(takeProfitStr || '0')

        // Check stop loss
        if (stopLoss > 0) {
          const hitStopLoss = isLong
            ? currentPrice <= stopLoss
            : currentPrice >= stopLoss

          if (hitStopLoss) {
            await pnlService.closePosition(position.id, currentPrice, 5)
            eventStore.append(position.agentId, EventType.TRADE_CLOSED, {
              positionId: position.id,
              reason: 'stop_loss',
              exitPrice: currentPrice,
            })
            closedCount++
            continue
          }
        }

        // Check take profit
        if (takeProfit > 0) {
          const hitTakeProfit = isLong
            ? currentPrice >= takeProfit
            : currentPrice <= takeProfit

          if (hitTakeProfit) {
            await pnlService.closePosition(position.id, currentPrice, 5)
            eventStore.append(position.agentId, EventType.TRADE_CLOSED, {
              positionId: position.id,
              reason: 'take_profit',
              exitPrice: currentPrice,
            })
            closedCount++
          }
        }
      }

      if (closedCount > 0) {
        console.log(`[Cron] auto-close: Closed ${closedCount} positions`)
      }
    } catch (error) {
      console.error('[Cron] auto-close failed:', error)
    }
  })

  // ─── AGENT PROCESSING (every 60 seconds) ───
  addCronJob('agent-processing', 60_000, async () => {
    try {
      const activeAgents = await db
        .select({ id: agents.id, status: agents.status })
        .from(agents)
        .where(eq(agents.status, 'active'))

      console.log(`[Cron] agent-processing: Found ${activeAgents.length} active agents`)

      // Agent processing would be triggered here
      // The actual agent loop is handled by the AutonomousRunner
      for (const agent of activeAgents) {
        eventStore.append(agent.id, EventType.HEARTBEAT, {
          type: 'agent_alive',
        })
      }
    } catch (error) {
      console.error('[Cron] agent-processing failed:', error)
    }
  })
}

// ─── CRON RUNNER ───

let cronRunnerId: ReturnType<typeof setInterval> | null = null
let isRunning = false

/**
 * Start the cron runner
 */
export function startCron(): void {
  if (isRunning) {
    console.log('[Cron] Already running')
    return
  }

  initCronJobs()
  isRunning = true

  // Run every 1 second to check job schedules
  cronRunnerId = setInterval(() => {
    const now = Date.now()

    for (const job of jobs) {
      if (now - job.lastRun >= job.intervalMs) {
        job.lastRun = now
        job.fn().catch((error) => {
          console.error(`[Cron] Job ${job.name} error:`, error)
        })
      }
    }
  }, 1000)

  console.log(`[Cron] Started with ${jobs.length} jobs`)
}

/**
 * Stop the cron runner
 */
export function stopCron(): void {
  if (cronRunnerId) {
    clearInterval(cronRunnerId)
    cronRunnerId = null
  }
  isRunning = false
  console.log('[Cron] Stopped')
}

/**
 * Check if cron is running
 */
export function isCronRunning(): boolean {
  return isRunning
}

/**
 * Get cron job status
 */
export function getCronStatus(): Array<{
  name: string
  intervalMs: number
  lastRunAgo: number
  isDue: boolean
}> {
  const now = Date.now()
  return jobs.map((job) => ({
    name: job.name,
    intervalMs: job.intervalMs,
    lastRunAgo: now - job.lastRun,
    isDue: now - job.lastRun >= job.intervalMs,
  }))
}

/**
 * Trigger a specific job immediately
 */
export async function triggerJob(name: string): Promise<void> {
  const job = jobs.find((j) => j.name === name)
  if (job) {
    job.lastRun = 0 // Reset to trigger immediately
    await job.fn()
    job.lastRun = Date.now()
  } else {
    throw new Error(`Job not found: ${name}`)
  }
}
