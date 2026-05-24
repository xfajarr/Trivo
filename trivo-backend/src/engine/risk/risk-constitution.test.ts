import { describe, expect, it } from 'vitest'
import type { AgentRiskPolicy, CommitteeDecision, MarketRegimeSnapshot } from '../intelligence-types.js'
import { evaluateRiskConstitution } from './risk-constitution.js'

const policy: AgentRiskPolicy = {
  maxOpenPositions: 3,
  maxLeverageX: 2,
  maxTradeUsd: 50,
  maxDailyLossUsd: 25,
  minConfidenceOpen: 65,
  minConfidenceClose: 45,
  cooldownMinutes: 10,
  blockIfRegime: ['low_liquidity'],
  requireCommitteeQuorum: 4,
  enabled: true,
}

const decision: CommitteeDecision = {
  action: 'open_trade',
  tool: 'open_trade',
  args: { size: 50, leverage: 2, pair: 'BTC/USD' },
  rawConfidence: 80,
  riskLevel: 'medium',
  reasoning: 'valid setup',
  abortConditions: [],
  roleReports: [
    { role: 'technical_analyst', stance: 'bullish', confidence: 80, summary: 'up', evidence: {} },
    { role: 'sentiment_analyst', stance: 'bullish', confidence: 70, summary: 'positive', evidence: {} },
    { role: 'risk_analyst', stance: 'approve', confidence: 75, summary: 'ok', evidence: {} },
    { role: 'portfolio_manager', stance: 'approve', confidence: 82, summary: 'approve', evidence: {} },
  ],
  debateSummary: 'bull case wins',
  market: 'BTC/USD',
}

const regime: MarketRegimeSnapshot = {
  symbol: 'BTC/USD',
  timeframe: '1h',
  regime: 'trending',
  trendScore: 80,
  volatilityScore: 30,
  liquidityScore: 60,
  sentimentShockScore: 20,
  confidence: 80,
  evidence: {},
}

describe('evaluateRiskConstitution', () => {
  it('approves a valid open trade', () => {
    const result = evaluateRiskConstitution({
      decision,
      calibratedConfidence: 72,
      policy,
      regime,
      openPositionCount: 1,
      todayPnl: 0,
      minutesSinceLastTrade: 20,
    })

    expect(result.allowed).toBe(true)
    expect(result.status).toBe('approved')
  })

  it('blocks low confidence open trades', () => {
    const result = evaluateRiskConstitution({
      decision,
      calibratedConfidence: 50,
      policy,
      regime,
      openPositionCount: 1,
      todayPnl: 0,
      minutesSinceLastTrade: 20,
    })

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('confidence')
  })

  it('blocks regimes listed in the policy', () => {
    const result = evaluateRiskConstitution({
      decision,
      calibratedConfidence: 80,
      policy,
      regime: { ...regime, regime: 'low_liquidity' },
      openPositionCount: 1,
      todayPnl: 0,
      minutesSinceLastTrade: 20,
    })

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('regime')
  })
})
