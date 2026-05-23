import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { agents as agentsTable, agentSessions, agentMemory } from '../lib/schema'
import { authMiddleware } from '../middleware/auth'

export const agentRoutes = new Hono()

const createAgentSchema = z.object({
  name: z.string().min(1).max(32),
  handle: z.string().min(1).max(32),
  avatar: z.string().optional(),
  hostingType: z.enum(['trivo', 'self_hosted']).optional(),
  endpoint: z.string().optional(),
  modelProvider: z.enum(['deepseek', 'claude', 'openai', 'qwen', 'byok']),
  modelConfig: z.string().optional(),
  skills: z.string().optional(),
  strategy: z.string().optional(),
  spendLimit: z.string().optional(),
  maxLeverage: z.string().optional(),
  stopLossPct: z.string().optional(),
})

agentRoutes.get('/', async (c) => {
  const allAgents = await db.select().from(agentsTable)
  return c.json({ agents: allAgents, total: allAgents.length })
})

agentRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const agent = await db.select().from(agentsTable).where(eq(agentsTable.id, id))
  if (agent.length === 0) return c.json({ error: 'Agent not found' }, 404)
  return c.json({ agent: agent[0] })
})

agentRoutes.post('/', authMiddleware, zValidator('json', createAgentSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  const agentId = crypto.randomUUID()

  await db.insert(agentsTable).values({
    id: agentId,
    ownerId: userId,
    name: data.name,
    handle: data.handle,
    avatar: data.avatar,
    hostingType: data.hostingType ?? 'trivo',
    endpoint: data.endpoint,
    modelProvider: data.modelProvider,
    modelConfig: data.modelConfig,
    skills: data.skills,
    strategy: data.strategy,
    spendLimit: data.spendLimit,
    maxLeverage: data.maxLeverage,
    stopLossPct: data.stopLossPct,
    status: 'inactive',
  })

  const systemPrompt = `You are ${data.name}, an AI trading agent on Trivo.
Strategy: ${data.strategy || 'No specific strategy'}
Always return structured trade decisions with reasoning.`

  await db.insert(agentSessions).values({
    id: crypto.randomUUID(),
    agentId,
    systemPrompt,
    modelProvider: data.modelProvider,
    modelConfig: data.modelConfig,
    sessionData: JSON.stringify({ turnCount: 0 }),
  })

  await db.insert(agentMemory).values({
    id: crypto.randomUUID(),
    agentId,
    type: 'reflection',
    content: `Agent ${data.name} created with ${data.modelProvider} model, strategy: ${data.strategy || 'none'}`,
    reasoning: 'Agent initialization',
  })

  const agent = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId))
  return c.json({ agent: agent[0] }, 201)
})

agentRoutes.put('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()

  const existing = await db.select().from(agentsTable).where(eq(agentsTable.id, id))
  if (existing.length === 0) return c.json({ error: 'Agent not found' }, 404)
  if (existing[0]?.ownerId !== userId) return c.json({ error: 'Not your agent' }, 403)

  await db
    .update(agentsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(agentsTable.id, id))
  const agent = await db.select().from(agentsTable).where(eq(agentsTable.id, id))
  return c.json({ agent: agent[0] })
})

agentRoutes.patch('/:id/status', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const { status } = await c.req.json()

  const existing = await db.select().from(agentsTable).where(eq(agentsTable.id, id))
  if (existing.length === 0) return c.json({ error: 'Agent not found' }, 404)
  if (existing[0]?.ownerId !== userId) return c.json({ error: 'Not your agent' }, 403)

  await db.update(agentsTable).set({ status, updatedAt: new Date() }).where(eq(agentsTable.id, id))
  return c.json({ status })
})
