import { describe, expect, it, vi } from 'vitest'

const listBuiltInSkillPacks = vi.fn(() => [{ slug: 'risk-guard' }])
const listAgentDecisions = vi.fn(async () => [{ id: 'decision-1' }])
const listAgentCommitteeReports = vi.fn(async () => [{ id: 'report-1' }])
const listAgentReflections = vi.fn(async () => [{ id: 'reflection-1' }])
const getLatestAgentScorecard = vi.fn(async () => ({ id: 'scorecard-1' }))
const listScorecards = vi.fn(async () => [{ id: 'scorecard-2' }])
const listAgentSkillPacks = vi.fn(async () => [{ id: 'skillpack-1' }])
const listMarketRegimes = vi.fn(async () => [{ id: 'regime-1' }])
const getAgentRiskPolicy = vi.fn(async () => ({ enabled: true }))

vi.mock('../services/intelligence.service', () => ({
  listBuiltInSkillPacks,
  listAgentDecisions,
  listAgentCommitteeReports,
  listAgentReflections,
  getLatestAgentScorecard,
  listScorecards,
  listAgentSkillPacks,
  listMarketRegimes,
  getAgentRiskPolicy,
}))

describe('intelligence routes', () => {
  it('returns built-in skill packs', async () => {
    const { intelligenceRoutes } = await import('../routes/intelligence')
    const res = await intelligenceRoutes.request('/skill-packs')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.skillPacks).toEqual([{ slug: 'risk-guard' }])
  })

  it('returns agent intelligence records with query limits', async () => {
    const { intelligenceRoutes } = await import('../routes/intelligence')

    const decisionRes = await intelligenceRoutes.request('/agents/agent-1/decisions?limit=7')
    const reflectionRes = await intelligenceRoutes.request('/agents/agent-1/reflections?limit=3')
    const scorecardRes = await intelligenceRoutes.request('/agents/agent-1/scorecard')

    expect(decisionRes.status).toBe(200)
    expect(reflectionRes.status).toBe(200)
    expect(scorecardRes.status).toBe(200)
    expect(listAgentDecisions).toHaveBeenCalledWith('agent-1', 7)
    expect(listAgentReflections).toHaveBeenCalledWith('agent-1', 3)
    expect(getLatestAgentScorecard).toHaveBeenCalledWith('agent-1')
  })

  it('returns market regimes and risk policy', async () => {
    const { intelligenceRoutes } = await import('../routes/intelligence')
    const regimesRes = await intelligenceRoutes.request('/market-regimes?symbol=BTC/USD&timeframe=1h&limit=2')
    const policyRes = await intelligenceRoutes.request('/agents/agent-1/risk-policy')

    expect(regimesRes.status).toBe(200)
    expect(policyRes.status).toBe(200)
    expect(listMarketRegimes).toHaveBeenCalledWith({ symbol: 'BTC/USD', timeframe: '1h', limit: 2 })
    expect(getAgentRiskPolicy).toHaveBeenCalledWith('agent-1')
  })
})
