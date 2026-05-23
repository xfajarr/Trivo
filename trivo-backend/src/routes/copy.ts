import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { copyRelations, agents } from '../lib/schema'
import { authMiddleware } from '../middleware/auth'

export const copyRoutes = new Hono()

copyRoutes.post('/attach', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { followerAgentId, targetAgentId, allocationBps } = await c.req.json()

  const follower = await db.select().from(agents).where(eq(agents.id, followerAgentId))
  const target = await db.select().from(agents).where(eq(agents.id, targetAgentId))
  if (follower.length === 0 || target.length === 0) {
    return c.json({ error: 'Agent not found' }, 404)
  }
  if (follower[0]?.ownerId !== userId) {
    return c.json({ error: 'Not your agent' }, 403)
  }

  const id = crypto.randomUUID()
  await db.insert(copyRelations).values({
    id,
    followerAgentId,
    targetAgentId,
    allocationBps: allocationBps.toString(),
    active: 'true',
  })

  return c.json({ relation: { id, followerAgentId, targetAgentId, allocationBps } }, 201)
})

copyRoutes.post('/detach', async (c) => {
  const { followerAgentId } = await c.req.json()

  const existing = await db.select().from(copyRelations)
    .where(eq(copyRelations.followerAgentId, followerAgentId))
  if (existing.length === 0) return c.json({ error: 'Relation not found' }, 404)

  await db.update(copyRelations).set({ active: 'false' })
    .where(eq(copyRelations.followerAgentId, followerAgentId))

  return c.json({ status: 'detached' })
})

copyRoutes.get('/relations/:agentId', async (c) => {
  const agentId = c.req.param('agentId')
  const followers = await db.select().from(copyRelations)
    .where(eq(copyRelations.targetAgentId, agentId))
  return c.json({ followers })
})
