import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../lib/db'
import { positions as positionsTable } from '../lib/schema'

export const positionRoutes = new Hono()

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
  const page = allPositions.slice(offset, offset + limit)

  return c.json({ positions: page, total, limit, offset })
})

positionRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const position = await db.select().from(positionsTable).where(eq(positionsTable.id, id))
  if (position.length === 0) return c.json({ error: 'Position not found' }, 404)
  return c.json({ position: position[0] })
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
