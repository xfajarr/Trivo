import { Hono } from 'hono'
import { getAgentTraces } from '../services/thinking.service'

export const thinkingRoutes = new Hono()

thinkingRoutes.get('/agents/:id/traces', async (c) => {
  const agentId = c.req.param('id')
  const limit = parseInt(c.req.query('limit') || '20')
  const traces = getAgentTraces(agentId, limit)
  return c.json({ agentId, traces })
})
