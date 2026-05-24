import { describe, expect, it } from 'vitest'
import type { MarketContext } from '../types.js'
import { detectMarketRegime } from './regime-detector.js'

function baseContext(overrides: Partial<MarketContext> = {}): MarketContext {
  return {
    prices: { 'BTC/USD': 100 },
    priceChanges: { 'BTC/USD': { hour: 0, day: 0 } },
    sentiment: { BTC: { score: 0, sentiment: 'neutral', volume: 100 } },
    technicalAnalysis: {
      'BTC/USD': {
        timeframes: [{ timeframe: '1h', trend: 'neutral', strength: 40 }],
        supportResistance: {
          supports: [95],
          resistances: [105],
          nearestSupport: 95,
          nearestResistance: 105,
          description: 'range',
        },
        volume: {
          currentVolume: 100,
          averageVolume: 100,
          volumeRatio: 1,
          trend: 'normal',
          confirmation: false,
          description: 'normal',
        },
        patterns: [],
        fundingRate: { rate: 0, sentiment: 'neutral', description: 'flat' },
        correlation: {
          pair1: 'BTC',
          pair2: 'ETH',
          coefficient: 0.5,
          trend: 'correlated',
          description: 'normal',
        },
        overallBias: 'neutral',
        confidence: 40,
        summary: 'neutral',
      },
    },
    recentTrades: [],
    openPositions: [],
    todayPnl: 0,
    winRate: 0,
    totalTrades: 0,
    ...overrides,
  }
}

describe('detectMarketRegime', () => {
  it('detects trending markets from high trend strength', () => {
    const ctx = baseContext({
      technicalAnalysis: {
        'BTC/USD': {
          ...baseContext().technicalAnalysis!['BTC/USD']!,
          timeframes: [{ timeframe: '1h', trend: 'bullish', strength: 85 }],
          overallBias: 'bullish',
          confidence: 82,
        },
      },
    })

    const result = detectMarketRegime(ctx, 'BTC/USD', '1h')
    expect(result.regime).toBe('trending')
    expect(result.trendScore).toBeGreaterThanOrEqual(80)
    expect(result.confidence).toBeGreaterThanOrEqual(80)
  })

  it('detects news-driven markets from sentiment shock', () => {
    const ctx = baseContext({ sentiment: { BTC: { score: 92, sentiment: 'bullish', volume: 900 } } })
    const result = detectMarketRegime(ctx, 'BTC/USD', '1h')
    expect(result.regime).toBe('news_driven')
    expect(result.sentimentShockScore).toBeGreaterThanOrEqual(80)
  })

  it('detects low-liquidity markets from low volume ratio', () => {
    const ta = baseContext().technicalAnalysis!['BTC/USD']!
    const ctx = baseContext({
      technicalAnalysis: {
        'BTC/USD': { ...ta, volume: { ...ta.volume, volumeRatio: 0.2, trend: 'low', description: 'thin' } },
      },
    })

    const result = detectMarketRegime(ctx, 'BTC/USD', '1h')
    expect(result.regime).toBe('low_liquidity')
    expect(result.liquidityScore).toBeLessThanOrEqual(20)
  })
})
