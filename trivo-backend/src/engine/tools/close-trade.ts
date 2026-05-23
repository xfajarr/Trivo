import { db } from '../../lib/db.js'
import { positions, feedEvents } from '../../lib/schema.js'
import { eq } from 'drizzle-orm'
import { closePositionOnChain, getPrice } from '../../services/contract.service.js'
import type { EngineTool } from './registry.js'

export const closeTradeTool: EngineTool = {
  schema: {
    name: 'close_trade',
    description: 'Close an existing trading position. Use this to take profit or cut losses.',
    input_schema: {
      type: 'object',
      properties: {
        positionId: { type: 'string', description: 'ID of the position to close' },
        reason: { type: 'string', description: 'Why closing' },
      },
      required: ['positionId'],
    },
  },
  async execute(args) {
    const { positionId, reason = 'manual close' } = args as { positionId: string; reason?: string }

    // Load position
    const pos = await db.query.positions.findFirst({
      where: eq(positions.id, positionId),
    })

    if (!pos) {
      return { success: false, error: 'Position not found' }
    }

    const entryPrice = Number(pos.entryPrice) || 0
    const pair = pos.market ?? 'BTC/USD'
    const size = Number(pos.size) || 0
    const side = pos.side ?? 'long'

    // GET REAL exit price
    let exitPrice: number
    try {
      exitPrice = await getPrice(pair)
      console.log(`[close_trade] Real exit price for ${pair}: $${exitPrice}`)
    } catch {
      console.warn(`[close_trade] Could not get price for ${pair}`)
      return { success: false, error: 'Could not get exit price' }
    }

    // CALCULATE REAL PnL
    const isLong = side === 'long' || side === 'LONG' || side === 'BUY'
    let pnl = 0
    let pnlPct = 0

    if (entryPrice > 0) {
      if (isLong) {
        pnl = ((exitPrice - entryPrice) / entryPrice) * size
      } else {
        pnl = ((entryPrice - exitPrice) / entryPrice) * size
      }
      pnlPct = entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0
      if (!isLong) pnlPct = -pnlPct // Invert for short
    }

    console.log(`[close_trade] ${pair} ${side}: entry $${entryPrice} → exit $${exitPrice} | PnL: $${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%)`)

    // Close on-chain
    let txHash = `0x${Date.now().toString(16)}mock`
    try {
      const receipt = await closePositionOnChain(Number(pos.copyTradingPositionId || '0'), exitPrice, Math.floor(pnl))
      txHash = receipt.transactionHash
      console.log(`[close_trade] On-chain: https://testnet.arcscan.app/tx/${txHash}`)
    } catch {
      console.log(`[close_trade] Mock close: position ${positionId}`)
    }

    // Update DB with PnL
    await db.update(positions)
      .set({
        status: 'closed' as string,
        pnl: pnl.toFixed(2),
        pnlPct: pnlPct.toFixed(2),
        markPrice: String(exitPrice),
        closedAt: new Date(),
        txHash,
      })
      .where(eq(positions.id, positionId))
      .execute()
      .catch((err: Error) => console.error('[close_trade] DB update failed:', err.message))

    // Feed event with PnL
    await db.insert(feedEvents).values({
      id: crypto.randomUUID(), agentId: (pos.agentId ?? (args as Record<string,unknown>)._agentId as string) || '', type: 'position_closed',
      venue: pos.venue ?? '', pair, side, size: String(size),
      data: JSON.stringify({
        positionId, reason, entryPrice, exitPrice, pnl: pnl.toFixed(2), pnlPct: pnlPct.toFixed(2), txHash,
      }),
    }).execute().catch((err: Error) => console.error('[close_trade] Feed insert failed:', err.message))

    return {
      success: true,
      txHash,
      positionId,
      pair,
      side,
      entryPrice,
      exitPrice,
      pnl: pnl.toFixed(2),
      pnlPct: pnlPct.toFixed(2),
      reason,
      closedAt: new Date().toISOString(),
    }
  },
}
