import { Hono } from 'hono'
import { eq, desc } from 'drizzle-orm'
import { db } from '../lib/db'
import { agentMemory, userMemory } from '../lib/schema'
import { authMiddleware } from '../middleware/auth'

export const memoryRoutes = new Hono()

memoryRoutes.post('/agents/:id/memory', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const agentId = c.req.param('id')
  const { type, content, reasoning, metadata } = await c.req.json()

  await db.insert(agentMemory).values({
    id: crypto.randomUUID(),
    agentId,
    type: type || 'observation',
    content,
    reasoning,
    metadata: metadata ? JSON.stringify(metadata) : null,
  })

  return c.json({ status: 'memorized' }, 201)
})

memoryRoutes.get('/agents/:id/memory', async (c) => {
  const agentId = c.req.param('id')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200)
  const type = c.req.query('type')

  let memories = await db.select().from(agentMemory)
    .where(eq(agentMemory.agentId, agentId))
    .orderBy(desc(agentMemory.createdAt))

  if (type) memories = memories.filter((m: typeof agentMemory.$inferSelect) => m.type === type)
  const page = memories.slice(0, limit)

  return c.json({ memories: page, total: memories.length })
})

memoryRoutes.post('/user/memory', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { type, content, metadata } = await c.req.json()

  await db.insert(userMemory).values({
    id: crypto.randomUUID(),
    userId,
    type: type || 'interaction',
    content,
    metadata: metadata ? JSON.stringify(metadata) : null,
  })

  return c.json({ status: 'saved' }, 201)
})

memoryRoutes.get('/user/memory', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200)

  const memories = await db.select().from(userMemory)
    .where(eq(userMemory.userId, userId))
    .orderBy(desc(userMemory.createdAt))
    .limit(limit)

  return c.json({ memories, total: memories.length })
})
