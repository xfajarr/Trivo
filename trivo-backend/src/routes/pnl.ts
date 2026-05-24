import { Hono } from 'hono'
import { z } from 'zod'
import { db } from '../lib/db.js'
import { positions, tradeOutcomes } from '../lib/schema.js'
import { eq, and, lte } from 'drizzle-orm'
import { getPrice } from '../services/contract.service.js'
import { pnlService } from '../services/pnl.service.js'

export const pnlRoutes = new Hono()

const windowSchema = z.enum(['day', 'week', 'month', 'all']).default('all')
const chartWindowSchema = z.enum(['hourly', 'daily', 'weekly']).default('daily')

// GET /agents/:id - PnL overview for an agent
pnlRoutes.get('/agents/:id', async (c) => {
  const agentId = c.req.param('id')
  const window = (c.req.query('window') || 'all') as z.infer<typeof windowSchema>
  const query = windowSchema.parse(window)

  // Get all open positions with current prices for unrealized PnL
  const openPositions = await db
    .select()
    .from(positions)
    .where(and(eq(positions.agentId, agentId), eq(positions.status, 'open')))

  let unrealizedPnl = 0
  const positionDetails: Array<{
    id: string
    pair: string
    side: string
    size: number
    entryPrice: number
    currentPrice: number
    unrealizedPnl: number
    unrealizedPnlPct: number
  }> = []

  for (const pos of openPositions) {
    const pair = pos.market || 'BTC/USD'
    const entryPrice = Number(pos.entryPrice) || 0
    const size = Number(pos.size) || 0

    if (entryPrice === 0) continue

    let currentPrice: number
    try {
      currentPrice = await getPrice(pair)
    } catch {
      continue
    }
    if (currentPrice === 0) continue

    const isLong = (pos.side || 'long').toLowerCase() === 'long'
    const posPnl = isLong
      ? ((currentPrice - entryPrice) / entryPrice) * size
      : ((entryPrice - currentPrice) / entryPrice) * size

    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100 * (isLong ? 1 : -1)

    unrealizedPnl += posPnl
    positionDetails.push({
      id: pos.id,
      pair,
      side: pos.side || 'long',
      size,
      entryPrice,
      currentPrice,
      unrealizedPnl: posPnl,
      unrealizedPnlPct: pnlPct,
    })
  }

  // Get aggregated realized PnL
  const aggregated = await pnlService.aggregatePnL(agentId, query)

  return c.json({
    realizedPnl: aggregated.realizedPnl,
    unrealizedPnl,
    totalPnl: aggregated.realizedPnl + unrealizedPnl,
    fees: aggregated.fees,
    tradeCount: aggregated.tradeCount,
    winCount: aggregated.winCount,
    lossCount: aggregated.lossCount,
    winRate: aggregated.winRate,
    avgWin: aggregated.avgWin,
    avgLoss: aggregated.avgLoss,
    profitFactor: aggregated.profitFactor,
    maxDrawdown: aggregated.maxDrawdown,
    sharpeRatio: aggregated.sharpeRatio,
    positions: positionDetails,
  })
})

// GET /agents/:id/performance - Performance metrics (scorecard data)
pnlRoutes.get('/agents/:id/performance', async (c) => {
  const agentId = c.req.param('id')

  const metrics = await pnlService.getPerformanceMetrics(agentId)

  return c.json({
    realizedPnl: metrics.realizedPnl,
    unrealizedPnl: metrics.unrealizedPnl,
    winRate: metrics.winRate,
    sharpeRatio: metrics.sharpeRatio,
    maxDrawdown: metrics.maxDrawdown,
    totalTrades: metrics.totalTrades,
    avgHoldTime: metrics.avgHoldTime,
  })
})

// GET /agents/:id/history - PnL chart data
pnlRoutes.get('/agents/:id/history', async (c) => {
  const agentId = c.req.param('id')
  const window = (c.req.query('window') || 'daily') as z.infer<typeof chartWindowSchema>
  const query = chartWindowSchema.parse(window)

  const history = await pnlService.getPnLHistory(agentId, query)

  return c.json(history)
})

// GET /agents/:id/outcomes - Trade outcomes for learning
pnlRoutes.get('/agents/:id/outcomes', async (c) => {
  const agentId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit') || '50'), 200)

  const outcomes = await db
    .select()
    .from(tradeOutcomes)
    .where(eq(tradeOutcomes.agentId, agentId))
    .orderBy(tradeOutcomes.createdAt)
    .limit(limit)

  return c.json({
    outcomes: outcomes.map(o => ({
      id: o.id,
      decisionId: o.decisionId,
      positionId: o.positionId,
      market: o.market,
      side: o.side,
      size: o.size,
      entryPrice: o.entryPrice,
      exitPrice: o.exitPrice,
      grossPnl: o.grossPnl,
      fees: o.fees,
      netPnl: o.netPnl,
      pnlPct: o.pnlPct,
      holdTimeMs: o.holdTimeMs,
      wasCorrect: o.wasCorrect === 'true',
      won: o.won === 'true',
      createdAt: o.createdAt,
    })),
    total: outcomes.length,
  })
})

// POST /agents/:id/close/:positionId - Close a position (manual override)
pnlRoutes.post('/agents/:id/close/:positionId', async (c) => {
  const { positionId } = c.req.param()
  const body = await c.req.json().catch(() => ({}))
  const exitPrice = Number(body.exitPrice) || 0
  const fees = Number(body.fees) || 0

  if (!exitPrice) {
    // Try to get current market price
    const pos = await db
      .select()
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1)

    if (!pos[0]) {
      return c.json({ error: 'Position not found' }, 404)
    }

    const pair = pos[0].market || 'BTC/USD'
    try {
      const currentPrice = await getPrice(pair)
      if (currentPrice) {
        c.status(400)
        return c.json({
          error: 'exitPrice required. Current price is: ' + currentPrice.toFixed(2),
          currentPrice,
        })
      }
    } catch {
      c.status(400)
      return c.json({ error: 'exitPrice required and could not fetch current price' })
    }
  }

  const outcome = await pnlService.closePosition(positionId, exitPrice, fees)

  if (!outcome) {
    return c.json({ error: 'Position not found or already closed' }, 404)
  }

  return c.json({
    success: true,
    outcome,
  })
})

// POST /snapshot - Trigger PnL snapshot for an agent (called by cron)
pnlRoutes.post('/snapshot', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const agentId = String(body.agentId || '')

  if (!agentId) {
    return c.json({ error: 'agentId required' }, 400)
  }

  await pnlService.createSnapshot(agentId)

  return c.json({ success: true })
})
