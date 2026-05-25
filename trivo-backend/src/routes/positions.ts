import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../lib/db'
import { positions as positionsTable } from '../lib/schema'
import { getPrice } from '../services/contract.service'

export const positionRoutes = new Hono()

// Helper: calculate unrealized PnL for a position using current oracle price
async function calcUnrealizedPnl(
  market: string,
  side: string,
  size: string,
  entryPrice: string,
  storedPnl: string
): Promise<{ pnl: number; pnlPct: number; currentPrice: number; markPrice: string }> {
  const entry = Number(entryPrice) || 0
  const sz = Number(size) || 0
  if (entry === 0 || sz === 0) {
    return { pnl: Number(storedPnl) || 0, pnlPct: 0, currentPrice: entry, markPrice: entryPrice }
  }
  let currentPrice = entry
  try {
    currentPrice = await getPrice(market || 'BTC/USD')
    if (currentPrice <= 0) currentPrice = entry
  } catch {
    currentPrice = entry
  }
  const isLong = (side || 'long').toLowerCase() === 'long'
  const pnl = isLong
    ? ((currentPrice - entry) / entry) * sz
    : ((entry - currentPrice) / entry) * sz
  const pnlPct = ((currentPrice - entry) / entry) * 100 * (isLong ? 1 : -1)
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
    currentPrice,
    markPrice: String(Math.round(currentPrice * 100) / 100),
  }
}

positionRoutes.get('/', async (c) => {
  const agentId = c.req.query('agentId')
  const venue = c.req.query('venue')
  const status = c.req.query('status')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = parseInt(c.req.query('offset') || '0')

  let allPositions = await db.select().from(positionsTable).orderBy(desc(positionsTable.openedAt))
  if (agentId) allPositions = allPositions.filter((p: typeof positionsTable.$inferSelect) => p.agentId === agentId)
  if (venue) allPositions = allPositions.filter((p: typeof positionsTable.$inferSelect) => p.venue === venue)
  if (status) allPositions = allPositions.filter((p: typeof positionsTable.$inferSelect) => p.status === status)

  const total = allPositions.length
  const rawPage = allPositions.slice(offset, offset + limit)

  // Calculate fresh unrealized PnL for each open position using current oracle prices
  const page = await Promise.all(
    rawPage.map(async (p) => {
      if (p.status === 'open') {
        const fresh = await calcUnrealizedPnl(p.market, p.side, p.size, p.entryPrice, p.pnl || '0')
        return { ...p, pnl: String(fresh.pnl), pnlPct: String(fresh.pnlPct), markPrice: fresh.markPrice }
      }
      return p
    })
  )

  return c.json({ positions: page, total, limit, offset })
})

positionRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const position = await db.select().from(positionsTable).where(eq(positionsTable.id, id))
  if (position.length === 0) return c.json({ error: 'Position not found' }, 404)
  const p = position[0]!
  if (p.status === 'open') {
    const fresh = await calcUnrealizedPnl(p.market, p.side, p.size, p.entryPrice, p.pnl || '0')
    return c.json({ position: { ...p, pnl: String(fresh.pnl), pnlPct: String(fresh.pnlPct), markPrice: fresh.markPrice } })
  }
  return c.json({ position: p })
})

// Trade history for an agent (all closed positions with PnL)
positionRoutes.get('/history/:agentId', async (c) => {
  const agentId = c.req.param('agentId')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)

  const history = await db
    .select()
    .from(positionsTable)
    .where(eq(positionsTable.agentId, agentId))
    .orderBy(desc(positionsTable.closedAt))
    .limit(limit)

  const closed = history.filter((p) => p.status === 'closed')

  const summary = {
    totalTrades: closed.length,
    totalPnl: closed.reduce((s, p) => s + Number(p.pnl || 0), 0),
    winRate:
      closed.length > 0 ? Math.round((closed.filter((p) => Number(p.pnl || 0) > 0).length / closed.length) * 100) : 0,
    trades: closed,
  }

  return c.json(summary)
})
