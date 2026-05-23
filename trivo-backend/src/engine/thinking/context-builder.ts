import { db } from '../../lib/db.js'
import { agentMemory, positions } from '../../lib/schema.js'
import { eq, desc } from 'drizzle-orm'
import { getPrice } from '../../services/contract.service.js'
import { getSentimentTool } from '../tools/get-sentiment.js'
import { calculateEnhancedAnalysis, generateSimulatedOHLCV } from '../tools/enhanced-ta.js'
import type { MarketContext } from '../types.js'

export async function buildMarketContext(agentId: string): Promise<MarketContext> {
  const [btc, eth, sol] = await Promise.all([
    getPrice('BTC/USD').catch(() => 0),
    getPrice('ETH/USD').catch(() => 0),
    getPrice('SOL/USD').catch(() => 0),
  ])

  const prices = { 'BTC/USD': btc, 'ETH/USD': eth, 'SOL/USD': sol }

  // Enhanced Technical Analysis for each pair
  const technicalAnalysis: Record<string, ReturnType<typeof calculateEnhancedAnalysis>> = {}
  for (const [pair, price] of Object.entries(prices)) {
    if (price > 0) {
      // Generate simulated OHLCV (in production: fetch from CoinGecko/exchange)
      const candles = generateSimulatedOHLCV(price, 100)
      const candlePrices = candles.map(c => c.close)
      const candleVolumes = candles.map(c => c.volume)
      
      technicalAnalysis[pair] = calculateEnhancedAnalysis(candlePrices, candleVolumes, price)
    }
  }

  const recentTrades = await db.select()
    .from(agentMemory)
    .where(eq(agentMemory.agentId, agentId))
    .orderBy(desc(agentMemory.createdAt))
    .limit(10)

  const openPositions = await db.select()
    .from(positions)
    .where(eq(positions.agentId, agentId))
    .limit(10)

  const todayPnl = recentTrades.reduce((sum, t) => {
    const meta = t.metadata ? JSON.parse(t.metadata) as { pnl?: number } : {}
    return sum + (meta.pnl ?? 0)
  }, 0)

  const wins = recentTrades.filter(t => {
    const meta = t.metadata ? JSON.parse(t.metadata) as { pnl?: number } : {}
    return (meta.pnl ?? 0) > 0
  }).length
  const winRate = recentTrades.length > 0 ? (wins / recentTrades.length) * 100 : 0

  // Sentiment
  const sentiment: Record<string, { score: number; sentiment: string; volume: number }> = {}
  for (const pair of ['BTC', 'ETH', 'SOL']) {
    try {
      const s = await getSentimentTool.execute({ token: pair, timeframe: '4h' }) as { score: number; sentiment: string; volume: number }
      sentiment[pair] = s
    } catch {
      sentiment[pair] = { score: 0, sentiment: 'neutral', volume: 0 }
    }
  }

  return {
    prices,
    priceChanges: {
      'BTC/USD': { hour: 0, day: 0 },
      'ETH/USD': { hour: 0, day: 0 },
      'SOL/USD': { hour: 0, day: 0 },
    },
    sentiment: sentiment as MarketContext['sentiment'],
    technicalAnalysis: technicalAnalysis as MarketContext['technicalAnalysis'],
    recentTrades: recentTrades.map(t => {
      const meta = t.metadata ? JSON.parse(t.metadata) as { pnl?: number } : {}
      return {
        action: t.type ?? 'unknown',
        pnl: meta.pnl ?? 0,
        timestamp: t.createdAt?.toISOString() ?? new Date().toISOString(),
      }
    }),
    openPositions: openPositions.map(p => ({
      venue: (p as unknown as { venue?: string }).venue ?? 'perp',
      side: (p as unknown as { side?: string }).side ?? 'long',
      size: Number(p.size ?? 0),
      entryPrice: Number((p as unknown as { entryPrice?: string }).entryPrice ?? 0),
    })),
    todayPnl,
    winRate,
    totalTrades: recentTrades.length,
  }
}

export function buildUserPrompt(context: MarketContext): string {
  const priceLines = Object.entries(context.prices)
    .map(([pair, price]) => `- ${pair}: $${price.toLocaleString()}`)
    .join('\n')

  const sentimentLines = Object.entries(context.sentiment)
    .map(([token, s]) => `- ${token}: ${s.sentiment} (${s.score > 0 ? '+' : ''}${s.score}) volume: ${s.volume}`)
    .join('\n')

  // Enhanced Technical Analysis section
  const taLines = Object.entries(context.technicalAnalysis ?? {})
    .map(([pair, ta]) => {
      return `### ${pair}
${ta.summary}

**Support/Resistance:** ${ta.supportResistance.description}
**Volume:** ${ta.volume.description}
**Funding:** ${ta.fundingRate.description}
**Correlation:** ${ta.correlation.description}

**Patterns Detected:**
${ta.patterns.length > 0 
  ? ta.patterns.map(p => `  - ${p.name} (${p.type}): ${p.description}`).join('\n')
  : '  - No significant patterns'
}`
    })
    .join('\n\n')

  const tradeLines = context.recentTrades.length > 0
    ? context.recentTrades.map(t =>
        `- ${t.action}: ${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)} (${t.timestamp})`
      ).join('\n')
    : 'No recent trades'

  const positionLines = context.openPositions.length > 0
    ? context.openPositions.map(p =>
        `- ${p.venue} ${p.side} $${p.size} @ $${p.entryPrice}`
      ).join('\n')
    : 'No open positions'

  // Determine market condition from enhanced analysis
  const btcTA = context.technicalAnalysis?.['BTC/USD']
  const btcSentiment = context.sentiment['BTC']?.score ?? 0
  
  let marketHint = 'SIDEWAYS'
  if (btcTA?.overallBias === 'bullish' && btcSentiment > 0) marketHint = 'BULLISH — Look for long opportunities'
  if (btcTA?.overallBias === 'bearish' && btcSentiment < 0) marketHint = 'BEARISH — Look for short opportunities'
  if (btcTA?.overallBias === 'bullish' && btcSentiment > 30) marketHint = 'STRONG BULLISH — High conviction long'
  if (btcTA?.overallBias === 'bearish' && btcSentiment < -30) marketHint = 'STRONG BEARISH — High conviction short'
  
  // Check for pattern signals
  const bullishPatterns = btcTA?.patterns.filter(p => p.type === 'bullish') ?? []
  const bearishPatterns = btcTA?.patterns.filter(p => p.type === 'bearish') ?? []
  if (bullishPatterns.length > 0) marketHint += ` | ${bullishPatterns[0]?.name} detected`
  if (bearishPatterns.length > 0) marketHint += ` | ${bearishPatterns[0]?.name} detected`

  return `## Current Market Data
${priceLines}

## Enhanced Technical Analysis
${taLines}

## Market Sentiment
${sentimentLines}

## Market Condition: ${marketHint}

## Your Recent Trades
${tradeLines}

## Your Open Positions
${positionLines}

## Your Performance Today
- PnL: ${context.todayPnl >= 0 ? '+' : ''}$${context.todayPnl.toFixed(2)}
- Win Rate: ${context.winRate.toFixed(1)}%
- Total Trades: ${context.totalTrades}

## Task
Analyze the market using ALL available signals:

1. **Multi-Timeframe**: Check if timeframes align (all bullish = strong long, all bearish = strong short)
2. **Support/Resistance**: Buy near support, sell near resistance
3. **Volume**: High volume confirms price moves
4. **Candlestick Patterns**: Reversal patterns at key levels are high-probability trades
5. **Funding Rate**: Extreme funding = potential reversal
6. **Correlation**: BTC moves first, ETH follows
7. **Sentiment**: Align with crowd or fade extremes

**Decision Framework:**
- All signals align → HIGH CONFIDENCE (75%+) trade with larger size
- Mixed signals → MEDIUM CONFIDENCE (50-75%) trade with smaller size
- Conflicting signals → HOLD or use VERY SMALL size

Be decisive. Find opportunities in any market condition. Use get_price to verify current prices.
`
}
