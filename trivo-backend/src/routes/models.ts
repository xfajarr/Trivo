import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { agents } from '../lib/schema'
import { authMiddleware } from '../middleware/auth'
import { getEffectiveConfig } from '../services/models/provider'

export const modelRoutes = new Hono()

const PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', defaultModel: 'deepseek-chat' },
  { id: 'claude', name: 'Claude', defaultModel: 'claude-sonnet-4-20250514' },
  { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o' },
  { id: 'qwen', name: 'Qwen', defaultModel: 'qwen-max' },
  { id: 'byok', name: 'Bring Your Own Key', defaultModel: 'custom' },
]

modelRoutes.get('/', (c) => {
  const env = getEffectiveConfig()
  return c.json({
    providers: PROVIDERS,
    currentEnv: env.apiKey ? {
      provider: env.provider || 'not set',
      baseURL: env.baseURL || 'not set',
      model: env.model || 'not set',
      hasApiKey: !!env.apiKey,
    } : null,
    instructions: 'Set AI_PROVIDER, AI_BASE_URL, AI_MODEL, AI_API_KEY in .env for global config, or use PUT /api/models/agents/:id for per-agent config.',
  })
})

modelRoutes.get('/agents/:id', async (c) => {
  const id = c.req.param('id')
  const agent = await db.select().from(agents).where(eq(agents.id, id))
  if (agent.length === 0) return c.json({ error: 'Agent not found' }, 404)

  const effective = getEffectiveConfig(agent[0]?.modelConfig)
  return c.json({
    agentId: id,
    provider: agent[0]?.modelProvider || null,
    config: agent[0]?.modelConfig ? tryParse(agent[0].modelConfig) : null,
    effective,
  })
})

modelRoutes.put('/agents/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()

  const existing = await db.select().from(agents).where(eq(agents.id, id))
  if (existing.length === 0) return c.json({ error: 'Agent not found' }, 404)
  if (existing[0]?.ownerId !== userId) return c.json({ error: 'Not your agent' }, 403)

  const modelConfig = JSON.stringify({
    provider: body.provider,
    apiKey: body.apiKey || undefined,
    baseURL: body.baseURL || undefined,
    model: body.model || undefined,
  })

  await db.update(agents).set({
    modelProvider: body.provider,
    modelConfig,
    updatedAt: new Date(),
  }).where(eq(agents.id, id))

  return c.json({ message: 'Model config updated', agentId: id })
})

function tryParse(str: string) {
  try { return JSON.parse(str) } catch { return str }
}
