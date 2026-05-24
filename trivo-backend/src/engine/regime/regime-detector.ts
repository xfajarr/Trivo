import type { MarketRegimeSnapshot } from '../intelligence-types.js'
import type { MarketContext } from '../types.js'

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function tokenFromSymbol(symbol: string): string {
  return symbol.split('/')[0] ?? symbol
}

function getTimeframeAnalysis(context: MarketContext, symbol: string, timeframe: string) {
  const analyses = context.technicalAnalysis?.[symbol]?.timeframes ?? []
  return analyses.find((item) => item.timeframe === timeframe) ?? analyses[0]
}

export function detectMarketRegime(
  context: MarketContext,
  symbol = 'BTC/USD',
  timeframe = '1h',
): MarketRegimeSnapshot {
  const ta = context.technicalAnalysis?.[symbol]
  const token = tokenFromSymbol(symbol)
  const sentiment = context.sentiment[token]
  const timeframeAnalysis = getTimeframeAnalysis(context, symbol, timeframe)
  const priceChange = context.priceChanges[symbol] ?? { hour: 0, day: 0 }
  const volumeRatio = ta?.volume.volumeRatio ?? 1

  const trendScore = clampScore(
    Math.max(
      timeframeAnalysis?.strength ?? 0,
      ta?.confidence ?? 0,
      ta?.overallBias === 'bullish' || ta?.overallBias === 'bearish' ? 10 : 0,
    ),
  )

  const volatilityScore = clampScore(
    Math.max(
      Math.abs(priceChange.hour) * 10,
      Math.abs(priceChange.day) * 5,
      ta?.patterns.some((pattern) => pattern.strength === 'strong') ? 72 : 0,
      ta?.fundingRate.sentiment !== 'neutral' ? 58 : 0,
      ta?.volume.trend === 'high' ? 65 : 0,
    ),
  )

  const liquidityScore = clampScore(volumeRatio * 50)

  const sentimentShockScore = clampScore(
    Math.abs(sentiment?.score ?? 0) * 0.8 + Math.min(sentiment?.volume ?? 0, 1000) / 20,
  )

  const regime = (() => {
    if (sentimentShockScore >= 80) return 'news_driven'
    if (liquidityScore <= 20) return 'low_liquidity'
    if (volatilityScore >= 75) return 'volatile'
    if (trendScore >= 70 && ta?.overallBias !== 'neutral') return 'trending'
    if (trendScore <= 35 && volatilityScore <= 40) return 'ranging'
    return 'mixed'
  })()

  const confidence = clampScore(Math.max(trendScore, volatilityScore, sentimentShockScore, 100 - liquidityScore))

  return {
    symbol,
    timeframe,
    regime,
    trendScore,
    volatilityScore,
    liquidityScore,
    sentimentShockScore,
    confidence,
    evidence: {
      trend: timeframeAnalysis ?? null,
      overallBias: ta?.overallBias ?? 'neutral',
      volumeRatio,
      sentiment: sentiment ?? null,
      priceChange,
      fundingRate: ta?.fundingRate ?? null,
      volume: ta?.volume ?? null,
    },
  }
}
