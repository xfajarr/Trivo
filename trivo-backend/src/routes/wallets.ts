import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { agents } from '../lib/schema'
import { authMiddleware } from '../middleware/auth'

export const walletRoutes = new Hono()

walletRoutes.post('/create', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { agentId } = await c.req.json()

  const existing = await db.select().from(agents).where(eq(agents.id, agentId))
  if (existing.length === 0) return c.json({ error: 'Agent not found' }, 404)
  if (existing[0].ownerId !== userId) return c.json({ error: 'Not your agent' }, 403)

  // TODO: Integrate Circle Agent Wallet API
  // For now, return placeholder
  return c.json({
    message: 'Wallet creation endpoint',
    note: 'Circle Agent Wallet integration pending',
    agentId,
  }, 201)
})

walletRoutes.get('/:agentId/balance', async (c) => {
  const agentId = c.req.param('agentId')
  // TODO: Query Circle API or Arc chain for balance
  return c.json({ agentId, balance: '0', currency: 'USDC' })
})

walletRoutes.post('/withdraw', authMiddleware, async (c) => {
  // TODO: Implement withdrawal via Circle or direct transfer
  return c.json({ message: 'Withdraw endpoint', note: 'Pending integration' })
})
