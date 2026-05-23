import { db } from '../../lib/db.js'
import { positions, feedEvents } from '../../lib/schema.js'
import { reportPositionOnChain } from '../../services/contract.service.js'
import type { EngineTool } from './registry.js'

export const openTradeTool: EngineTool = {
  schema: {
    name: 'open_trade',
    description: 'Open a new trading position. Use this when you identify a profitable opportunity. Always check price first with get_price.',
    input_schema: {
      type: 'object',
      properties: {
        venue: { type: 'string', enum: ['perp', 'polymarket', 'lp'], description: 'Trading venue' },
        pair: { type: 'string', description: 'Trading pair (e.g., "BTC/USD")' },
        side: { type: 'string', enum: ['long', 'short'], description: 'Position direction' },
        size: { type: 'number', description: 'Position size in USD' },
        leverage: { type: 'number', description: 'Leverage multiplier (1-10)' },
      },
      required: ['venue', 'pair', 'side', 'size'],
    },
  },
  async execute(args) {
    const { venue, pair, side, size, leverage = 1 } = args as {
      venue: string; pair: string; side: string; size: number; leverage?: number
    }

    let txHash = `0x${Date.now().toString(16)}mock`
    let positionId = 0
    try {
      const result = await reportPositionOnChain(0, venue, pair, side, size, 0, leverage)
      txHash = result.txHash
      positionId = result.positionId
    } catch {
      console.log(`[open_trade] Mock: ${venue} ${pair} ${side} $${size}`)
    }

    const dbId = crypto.randomUUID()
    await db.insert(positions).values({
      id: dbId, copyTradingPositionId: String(positionId), agentId: '',
      venue, market: pair, side, size: String(size), entryPrice: '0', leverage: String(leverage),
    }).execute().catch((err: Error) => console.error('[open_trade] DB:', err.message))

    await db.insert(feedEvents).values({
      id: crypto.randomUUID(), agentId: '', type: 'position_opened',
      venue, pair, side, size: String(size), data: JSON.stringify({ leverage, txHash }),
    }).execute().catch((err: Error) => console.error('[open_trade] Feed:', err.message))

    return { success: true, txHash, positionId: dbId, venue, pair, side, size, leverage }
  },
}
