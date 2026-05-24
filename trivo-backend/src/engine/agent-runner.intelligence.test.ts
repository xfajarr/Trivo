import { vi, describe, expect, it } from 'vitest'
vi.mock('./services/erc8004.service.js', () => ({
  erc8004Service: {
    recordTradeOutcome: vi.fn().mockResolvedValue(undefined),
  },
}))
import { buildIntelligenceCycle } from './agent-runner.js'
import type { MarketContext } from './types.js'

const context: MarketContext = {
  prices: {
    'BTC/USD': 68000,
    'ETH/USD': 3600,
    'SOL/USD': 180,
  },
  priceChanges: {
    'BTC/USD': { hour: 3.2, day: 8.5 },
    'ETH/USD': { hour: 2.1, day: 6.4 },
    'SOL/USD': { hour: 1.8, day: 4.9 },
  },
  sentiment: {
    BTC: { score: 32, sentiment: 'bullish', volume: 420 },
    ETH: { score: 18, sentiment: 'bullish', volume: 210 },
    SOL: { score: 10, sentiment: 'neutral', volume: 120 },
  },
  technicalAnalysis: {
    'BTC/USD': {
      timeframes: [{ timeframe: '1h', trend: 'bullish', strength: 84 }],
      supportResistance: {
        supports: [67000, 66000],
        resistances: [69000, 70000],
        nearestSupport: 67000,
        nearestResistance: 69000,
        description: 'BTC holding above support with room to resistance.',
      },
      volume: {
        currentVolume: 120000,
        averageVolume: 60000,
        volumeRatio: 2,
        trend: 'high',
        confirmation: true,
        description: 'Strong volume confirms the move.',
      },
      patterns: [{ name: 'ascending_triangle', type: 'bullish', strength: 'strong', description: 'Breakout structure intact.' }],
      fundingRate: {
        rate: 0.01,
        sentiment: 'bullish',
        description: 'Positive funding, but not extreme.',
      },
      correlation: {
        pair1: 'BTC/USD',
        pair2: 'ETH/USD',
        coefficient: 0.82,
        trend: 'correlated',
        description: 'ETH is following BTC strength.',
      },
      overallBias: 'bullish',
      confidence: 84,
      summary: 'BTC trend is strong and supported by volume.',
    },
  },
  recentTrades: [
    { action: 'open_trade', pnl: 24, timestamp: '2026-05-24T00:00:00.000Z' },
    { action: 'close_trade', pnl: -8, timestamp: '2026-05-24T01:00:00.000Z' },
  ],
  openPositions: [],
  todayPnl: 16,
  winRate: 66,
  totalTrades: 2,
}

describe('buildIntelligenceCycle', () => {
  it('derives deterministic signals and blocks open trades by regime policy', () => {
    const result = buildIntelligenceCycle({
      agent: {
        id: 'agent-1',
        name: 'Atlas',
        skills: 'perp,copy trading',
        strategy: 'BTC momentum long',
        maxLeverage: '2',
        spendLimit: '50',
        stopLossPct: '10',
        totalPnl: '42',
        winRate: '66',
        tradeCount: '12',
      },
      context,
      openPositionCount: 0,
      minutesSinceLastTrade: 99,
      recentReflections: [{ wasCorrect: true }, { wasCorrect: false }],
      policy: {
        maxOpenPositions: 3,
        maxLeverageX: 2,
        maxTradeUsd: 50,
        maxDailyLossUsd: 25,
        minConfidenceOpen: 65,
        minConfidenceClose: 45,
        cooldownMinutes: 0,
        blockIfRegime: ['trending'],
        requireCommitteeQuorum: 4,
        enabled: true,
      },
    })

    expect(result.symbol).toBe('BTC/USD')
    expect(result.skillPacks.map((pack) => pack.slug)).toEqual(expect.arrayContaining(['technical-momentum', 'risk-guard']))
    expect(result.regime.regime).toBe('trending')
    expect(result.decisionScorecard.recommendation).toBe('eligible')
    expect(result.riskDecision.allowed).toBe(false)
    expect(result.riskDecision.reason).toContain('market_regime')
  })
})
