import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CalibratedConfidence,
  CommitteeDecision,
  MarketRegimeSnapshot,
  RiskConstitutionDecision,
} from '../intelligence-types.js'
import { appendDecisionMemory } from './decision-memory.js'
import { buildReflectionSummary } from './reflection-generator.js'

const { calls, db } = vi.hoisted(() => {
  const calls: Array<{ table: string; rows: unknown }> = []
  const db = {
    insert: (table: { name: string }) => ({
      values: (rows: unknown) => ({
        execute: async () => {
          calls.push({ table: table.name, rows })
        },
      }),
    }),
  }

  return { calls, db }
})

vi.mock('../../lib/db.js', () => ({ db }))
vi.mock('../../lib/schema.js', () => ({
  agentDecisions: { name: 'agent_decisions' },
  committeeReports: { name: 'committee_reports' },
  marketRegimes: { name: 'market_regimes' },
}))

const decision: CommitteeDecision = {
  action: 'open_trade',
  tool: 'open_trade',
  args: { pair: 'BTC/USD', size: 25, txHash: '0xabc123', positionId: 'pos-7' },
  rawConfidence: 81,
  riskLevel: 'medium',
  reasoning: 'trend confirmed on 1h and sentiment aligned',
  abortConditions: ['invalidates under support'],
  roleReports: [
    {
      role: 'technical_analyst',
      stance: 'bullish',
      confidence: 83,
      summary: 'trend intact',
      evidence: { trend: 'up' },
    },
    {
      role: 'portfolio_manager',
      stance: 'approve',
      confidence: 79,
      summary: 'risk acceptable',
      evidence: { size: 25 },
    },
  ],
  debateSummary: '2 of 2 roles approved the long setup',
  market: 'BTC/USD',
}

const calibration: CalibratedConfidence = {
  rawConfidence: 81,
  calibratedConfidence: 76,
  technicalScore: 84,
  sentimentScore: 71,
  riskScore: 78,
  memoryScore: 69,
  committeeAgreementScore: 92,
  explanation: 'committee aligned with the setup',
}

const risk: RiskConstitutionDecision = {
  allowed: true,
  status: 'approved',
  reason: 'within policy limits',
  checks: [{ name: 'confidence', passed: true, detail: '76 >= 65' }],
}

const regime: MarketRegimeSnapshot = {
  symbol: 'BTC/USD',
  timeframe: '1h',
  regime: 'trending',
  trendScore: 87,
  volatilityScore: 31,
  liquidityScore: 72,
  sentimentShockScore: 22,
  confidence: 88,
  evidence: { trend: 'up', volume: 'strong' },
}

beforeEach(() => {
  calls.length = 0
})

describe('appendDecisionMemory', () => {
  it('persists decision, regime, and committee reports with text-safe values', async () => {
    const uuidSpy = vi.spyOn(crypto, 'randomUUID')
    uuidSpy
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222')
      .mockReturnValueOnce('33333333-3333-4333-8333-333333333333')
      .mockReturnValueOnce('44444444-4444-4444-8444-444444444444')

    const result = await appendDecisionMemory({
      agentId: 'agent-1',
      cycleId: 'cycle-7',
      decision,
      calibration,
      risk,
      regime,
      status: 'executed',
    })

    expect(result).toEqual({
      marketRegimeId: '11111111-1111-4111-8111-111111111111',
      decisionId: '22222222-2222-4222-8222-222222222222',
      committeeReportIds: ['33333333-3333-4333-8333-333333333333', '44444444-4444-4444-8444-444444444444'],
    })

    expect(calls.map((call) => call.table)).toEqual(['market_regimes', 'agent_decisions', 'committee_reports', 'committee_reports'])

    expect(calls[1]?.rows).toMatchObject({
      agentId: 'agent-1',
      cycleId: 'cycle-7',
      market: 'BTC/USD',
      action: 'open_trade',
      toolName: 'open_trade',
      toolArgs: '{"pair":"BTC/USD","size":25,"txHash":"0xabc123","positionId":"pos-7"}',
      rawConfidence: '81',
      calibratedConfidence: '76',
      riskLevel: 'medium',
      marketRegimeId: '11111111-1111-4111-8111-111111111111',
      committeeSummary: '2 of 2 roles approved the long setup',
      riskDecision: 'approved',
      riskReason: 'within policy limits',
      finalReasoning: 'trend confirmed on 1h and sentiment aligned',
      txHash: '0xabc123',
      positionId: 'pos-7',
      status: 'executed',
    })

    expect(calls[2]?.rows).toMatchObject({
      agentId: 'agent-1',
      decisionId: '22222222-2222-4222-8222-222222222222',
      cycleId: 'cycle-7',
      role: 'technical_analyst',
      stance: 'bullish',
      confidence: '83',
      summary: 'trend intact',
      evidence: '{"trend":"up"}',
    })

    uuidSpy.mockRestore()
  })
})

describe('buildReflectionSummary', () => {
  it('creates a concise positive reflection', () => {
    const result = buildReflectionSummary({
      market: 'BTC/USD',
      side: 'long',
      pnl: 12,
      reasoning: 'trend held and committee aligned',
    })

    expect(result.outcome).toBe('profit')
    expect(result.wasCorrect).toBe(true)
    expect(result.summary).toBe('BTC/USD long ended in profit. Miss reasons: none. Next action: Keep the same thesis, but only scale after confirmation.')
    expect(result.nextAction).toContain('confirmation')
  })

  it('creates a concise loss reflection with miss reasons and next action', () => {
    const result = buildReflectionSummary({
      market: 'ETH/USD',
      side: 'short',
      pnl: -8,
      reasoning: 'entry was early; momentum reversed',
      missReasons: ['early entry', 'ignored momentum shift'],
      nextAction: 'Reduce size and wait for confirmation before re-entering.',
    })

    expect(result.outcome).toBe('loss')
    expect(result.wasCorrect).toBe(false)
    expect(result.missReasons).toBe('early entry; ignored momentum shift')
    expect(result.summary).toContain('Miss reasons: early entry; ignored momentum shift.')
    expect(result.summary).toContain('Next action: Reduce size and wait for confirmation before re-entering.')
  })
})
