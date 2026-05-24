import { Hono } from 'hono'
import {
  getAgentRiskPolicy,
  getLatestAgentScorecard,
  listAgentCommitteeReports,
  listAgentDecisions,
  listAgentReflections,
  listAgentSkillPacks,
  listBuiltInSkillPacks,
  listMarketRegimes,
  listScorecards,
} from '../services/intelligence.service'

export const intelligenceRoutes = new Hono()

function parseLimit(value: string | undefined, fallback: number, max: number) {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(1, parsed), max)
}

intelligenceRoutes.get('/skill-packs', (c) => {
  return c.json({ skillPacks: listBuiltInSkillPacks() })
})

intelligenceRoutes.get('/agents/:id/decisions', async (c) => {
  const agentId = c.req.param('id')
  const limit = parseLimit(c.req.query('limit') ?? undefined, 25, 100)
  const decisions = await listAgentDecisions(agentId, limit)
  return c.json({ decisions })
})

intelligenceRoutes.get('/agents/:id/committee-reports', async (c) => {
  const agentId = c.req.param('id')
  const limit = parseLimit(c.req.query('limit') ?? undefined, 50, 200)
  const reports = await listAgentCommitteeReports(agentId, limit)
  return c.json({ reports })
})

intelligenceRoutes.get('/agents/:id/reflections', async (c) => {
  const agentId = c.req.param('id')
  const limit = parseLimit(c.req.query('limit') ?? undefined, 25, 100)
  const reflections = await listAgentReflections(agentId, limit)
  return c.json({ reflections })
})

intelligenceRoutes.get('/agents/:id/scorecard', async (c) => {
  const agentId = c.req.param('id')
  const scorecard = await getLatestAgentScorecard(agentId)
  return c.json({ scorecard })
})

intelligenceRoutes.get('/scorecards', async (c) => {
  const window = c.req.query('window') ?? undefined
  const limit = parseLimit(c.req.query('limit') ?? undefined, 100, 200)
  const scorecards = await listScorecards(window, limit)
  return c.json({ scorecards, window: window ?? 'all' })
})

intelligenceRoutes.get('/agents/:id/skill-packs', async (c) => {
  const agentId = c.req.param('id')
  const limit = parseLimit(c.req.query('limit') ?? undefined, 50, 200)
  const skillPacks = await listAgentSkillPacks(agentId, limit)
  return c.json({ skillPacks })
})

intelligenceRoutes.get('/market-regimes', async (c) => {
  const symbol = c.req.query('symbol') ?? undefined
  const timeframe = c.req.query('timeframe') ?? undefined
  const limit = parseLimit(c.req.query('limit') ?? undefined, 50, 200)
  const regimes = await listMarketRegimes({ symbol, timeframe, limit })
  return c.json({ regimes, symbol: symbol ?? null, timeframe: timeframe ?? null })
})

intelligenceRoutes.get('/agents/:id/risk-policy', async (c) => {
  const agentId = c.req.param('id')
  const policy = await getAgentRiskPolicy(agentId)
  return c.json({ policy })
})
