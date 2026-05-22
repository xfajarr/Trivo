import { Hono } from 'hono'

export const strategyRoutes = new Hono()

strategyRoutes.post('/compile', async (c) => {
  const { strategy } = await c.req.json()
  if (!strategy) return c.json({ error: 'Strategy text required' }, 400)

  // TODO: AI-powered NL parser
  // For now, return basic parsed structure
  const rules = {
    triggers: [],
    actions: [],
    rawStrategy: strategy,
  }

  return c.json({ rules })
})
