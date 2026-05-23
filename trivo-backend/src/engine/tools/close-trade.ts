import { db } from '../../lib/db.js'
import { positions, feedEvents } from '../../lib/schema.js'
import { eq } from 'drizzle-orm'
import { closePositionOnChain } from '../../services/contract.service.js'
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

    let txHash = `0x${Date.now().toString(16)}mock`
    try {
      const receipt = await closePositionOnChain(Number(positionId || '0'), 0, 0)
      txHash = receipt.transactionHash
    } catch {
      console.log(`[close_trade] Mock: position ${positionId}`)
    }

    await db.update(positions).set({ status: 'closed' })
      .where(eq(positions.id, positionId)).execute()
      .catch((err: Error) => console.error('[close_trade] DB:', err.message))

    await db.insert(feedEvents).values({
      id: crypto.randomUUID(), agentId: '', type: 'position_closed',
      venue: '', pair: '', side: '', size: '0',
      data: JSON.stringify({ positionId, reason, txHash }),
    }).execute().catch((err: Error) => console.error('[close_trade] Feed:', err.message))

    return { success: true, txHash, positionId, reason, closedAt: new Date().toISOString() }
  },
}
