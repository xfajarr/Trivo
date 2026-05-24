import { describe, expect, it } from 'vitest'
import type { MarketContext } from '../types.js'
import { runTradingCommittee } from './trading-committee.js'

const bullishContext: MarketContext = {
  prices: { 'BTC/USD': 100 },
  priceChanges: { 'BTC/USD': { hour: 1, day: 3 } },
  sentiment: { BTC: { score: 55, sentiment: 'bullish', volume: 200 } },
  technicalAnalysis: {
    'BTC/USD': {
      timeframes: [{ timeframe: '1h', trend: 'bullish', strength: 80 }],
      supportResistance: {
        supports: [95],
        resistances: [110],
        nearestSupport: 95,
        nearestResistance: 110,
        description: 'near support',
      },
      volume: {
        currentVolume: 200,
        averageVolume: 100,
        volumeRatio: 2,
        trend: 'high',
        confirmation: true,
        description: 'confirming',
      },
      patterns: [{ name: 'breakout', type: 'bullish', strength: 'strong', description: 'breakout' }],
      fundingRate: { rate: 0.01, sentiment: 'neutral', description: 'normal' },
      correlation: { pair1: 'BTC', pair2: 'ETH', coefficient: 0.8, trend: 'correlated', description: 'normal' },
      overallBias: 'bullish',
      confidence: 80,
      summary: 'bullish',
    },
  },
  recentTrades: [],
  openPositions: [],
  todayPnl: 0,
  winRate: 0,
  totalTrades: 0,
}

const mixedContext: MarketContext = {
  prices: { 'ETH/USD': 2500 },
  priceChanges: { 'ETH/USD': { hour: -0.3, day: 0.1 } },
  sentiment: { ETH: { score: 0, sentiment: 'neutral', volume: 50 } },
  technicalAnalysis: {
    'ETH/USD': {
      timeframes: [{ timeframe: '1h', trend: 'neutral', strength: 40 }],
      supportResistance: {
        supports: [2450],
        resistances: [2550],
        nearestSupport: 2450,
        nearestResistance: 2550,
        description: 'choppy',
      },
      volume: {
        currentVolume: 50,
        averageVolume: 60,
        volumeRatio: 0.83,
        trend: 'normal',
        confirmation: false,
        description: 'weak',
      },
      patterns: [],
      fundingRate: { rate: 0, sentiment: 'neutral', description: 'flat' },
      correlation: { pair1: 'ETH', pair2: 'BTC', coefficient: 0.2, trend: 'uncorrelated', description: 'flat' },
      overallBias: 'neutral',
      confidence: 40,
      summary: 'no edge',
    },
  },
  recentTrades: [{ action: 'open', pnl: -5, timestamp: '2026-05-24T00:00:00Z' }],
  openPositions: [{ venue: 'perp', side: 'long', size: 1, entryPrice: 2500 }],
  todayPnl: -10,
  winRate: 35,
  totalTrades: 12,
}

describe('runTradingCommittee', () => {
  it('returns consensus, dissent, quorum, and a long recommendation when signals align', () => {
    const result = runTradingCommittee({
      agentName: 'Demo',
      strategy: 'Trade BTC momentum',
      skills: 'perp',
      context: bullishContext,
      symbol: 'BTC/USD',
    })

    expect(result.roleReports).toHaveLength(6)
    expect(result.roleReports.map((report) => report.role)).toEqual([
      'technical_analyst',
      'sentiment_analyst',
      'risk_analyst',
      'bull_researcher',
      'bear_researcher',
      'portfolio_manager',
    ])
    expect(result.consensus.stance).toBe('bullish')
    expect(result.quorum).toEqual({ required: 4, aligned: 5, satisfied: true })
    expect(result.dissent.map((item) => item.role)).toContain('bear_researcher')
    expect(result.finalRecommendation).toMatchObject({ action: 'open_trade', side: 'long', tool: 'open_trade' })
    expect(result.market).toBe('BTC/USD')
    expect(result.debateSummary).toContain('Technical=bullish')
  })

  it('holds when the committee is split and quorum is not met', () => {
    const result = runTradingCommittee({
      agentName: 'Demo',
      strategy: 'Trade ETH range',
      skills: 'perp',
      context: mixedContext,
      symbol: 'ETH/USD',
    })

    expect(result.consensus.stance).toBe('mixed')
    expect(result.quorum.satisfied).toBe(false)
    expect(result.finalRecommendation.action).toBe('hold')
    expect(result.finalRecommendation.side).toBe('none')
    expect(result.tool).toBeNull()
    expect(result.args).toBeNull()
  })
})
