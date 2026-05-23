import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../lib/db'
import { positions } from '../lib/schema'
import { getPrice } from '../services/contract.service'

export const pnlRoutes = new Hono()

pnlRoutes.get('/agents/:id', async (c) => {
  const agentId = c.req.param('id')
  
  // Get all open positions
  const openPositions = await db.select().from(positions)
    .where(and(eq(positions.agentId, agentId), eq(positions.status, 'open')))

  let unrealizedPnl = 0
  const positionDetails: Array<{
    id: string; pair: string; side: string; size: number; entryPrice: number;
    currentPrice: number; unrealizedPnl: number; unrealizedPnlPct: number
  }> = []

  for (const pos of openPositions) {
    const pair = pos.market || 'BTC/USD'
    const entryPrice = Number(pos.entryPrice) || 0
    const size = Number(pos.size) || 0
    
    if (entryPrice === 0) continue

    // Get current price
    let currentPrice: number
    try {
      currentPrice = await getPrice(pair)
    } catch { continue }
    if (currentPrice === 0) continue

    const isLong = (pos.side || 'long').toLowerCase() === 'long'
    let posPnl: number
    if (isLong) posPnl = ((currentPrice - entryPrice) / entryPrice) * size
    else posPnl = ((entryPrice - currentPrice) / entryPrice) * size
    
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100 * (isLong ? 1 : -1)

    unrealizedPnl += posPnl
    positionDetails.push({
      id: pos.id, pair, side: pos.side || 'long', size, entryPrice,
      currentPrice, unrealizedPnl: posPnl, unrealizedPnlPct: pnlPct,
    })
  }

  return c.json({
    unrealizedPnl,
    totalPositions: openPositions.length,
    positions: positionDetails,
  })
})
