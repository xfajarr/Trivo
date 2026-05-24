export interface TechnicalIndicators {
  rsi: { value: number; signal: string; description: string }
  macd: { macd: number; signal: number; histogram: number; crossover: string; description: string }
  ema: { ema9: number; ema21: number; crossover: string; description: string }
  bollinger: { upper: number; middle: number; lower: number; position: string; description: string }
  summary: string
}

export function calculateIndicators(prices: number[]): TechnicalIndicators {
  if (prices.length < 26) {
    return {
      rsi: { value: 50, signal: 'neutral', description: 'Insufficient data for RSI' },
      macd: { macd: 0, signal: 0, histogram: 0, crossover: 'none', description: 'Insufficient data for MACD' },
      ema: { ema9: 0, ema21: 0, crossover: 'none', description: 'Insufficient data for EMA' },
      bollinger: { upper: 0, middle: 0, lower: 0, position: 'middle', description: 'Insufficient data for Bollinger' },
      summary: 'Insufficient price data for technical analysis',
    }
  }

  const rsi = calcRSI(prices)
  const macd = calcMACD(prices)
  const ema = calcEMA(prices)
  const bollinger = calcBollinger(prices)

  const signals: string[] = []
  if (rsi.signal === 'oversold') signals.push('RSI OVERSOLD → buy')
  if (rsi.signal === 'overbought') signals.push('RSI OVERBOUGHT → sell')
  if (macd.crossover === 'bullish') signals.push('MACD BULLISH → momentum up')
  if (macd.crossover === 'bearish') signals.push('MACD BEARISH → momentum down')
  if (ema.crossover === 'bullish') signals.push('EMA BULLISH → uptrend')
  if (ema.crossover === 'bearish') signals.push('EMA BEARISH → downtrend')
  if (bollinger.position === 'below_lower') signals.push('BELOW BB → oversold bounce')
  if (bollinger.position === 'above_upper') signals.push('ABOVE BB → overbought reversal')

  const bullish = signals.filter(
    (s) => s.includes('buy') || s.includes('BULLISH') || s.includes('up') || s.includes('bounce'),
  ).length
  const bearish = signals.filter(
    (s) => s.includes('sell') || s.includes('BEARISH') || s.includes('down') || s.includes('reversal'),
  ).length
  const bias = bullish > bearish + 1 ? 'BULLISH' : bearish > bullish + 1 ? 'BEARISH' : 'NEUTRAL'

  return { rsi, macd, ema, bollinger, summary: `TA BIAS: ${bias} | ${signals.join(', ') || 'No strong signals'}` }
}

function calcRSI(prices: number[]): { value: number; signal: string; description: string } {
  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) changes.push(prices[i]! - prices[i - 1]!)

  const recent = changes.slice(-14)
  const gains = recent.filter((c) => c > 0)
  const losses = recent.filter((c) => c < 0).map((c) => Math.abs(c))

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / 14 : 0
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / 14 : 0
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  const rsi = 100 - 100 / (1 + rs)

  if (rsi < 30)
    return { value: rsi, signal: 'oversold', description: `RSI ${rsi.toFixed(1)} — OVERSOLD. Potential buy signal.` }
  if (rsi > 70)
    return {
      value: rsi,
      signal: 'overbought',
      description: `RSI ${rsi.toFixed(1)} — OVERBOUGHT. Potential sell signal.`,
    }
  return { value: rsi, signal: 'neutral', description: `RSI ${rsi.toFixed(1)} — Neutral zone.` }
}

function calcMACD(prices: number[]): {
  macd: number
  signal: number
  histogram: number
  crossover: string
  description: string
} {
  const ema12 = emaSingle(prices, 12)
  const ema26 = emaSingle(prices, 26)
  const macd = ema12 - ema26

  const macdVals: number[] = []
  for (let i = 26; i <= prices.length; i++) {
    const s = prices.slice(0, i)
    macdVals.push(emaSingle(s, 12) - emaSingle(s, 26))
  }

  const signalLine = macdVals.length >= 9 ? emaSingle(macdVals, 9) : macd
  const histogram = macd - signalLine

  let crossover = 'none'
  let description =
    histogram > 0
      ? `MACD positive (${histogram.toFixed(2)}) — bullish.`
      : `MACD negative (${histogram.toFixed(2)}) — bearish.`

  if (macdVals.length >= 2) {
    const prev = macdVals[macdVals.length - 2]! - signalLine
    if (histogram > 0 && prev <= 0) {
      crossover = 'bullish'
      description = 'MACD bullish crossover — momentum turning positive.'
    }
    if (histogram < 0 && prev >= 0) {
      crossover = 'bearish'
      description = 'MACD bearish crossover — momentum turning negative.'
    }
  }

  return { macd, signal: signalLine, histogram, crossover, description }
}

function calcEMA(prices: number[]): { ema9: number; ema21: number; crossover: string; description: string } {
  const ema9 = emaSingle(prices, 9)
  const ema21 = emaSingle(prices, 21)

  if (ema9 > ema21)
    return {
      ema9,
      ema21,
      crossover: 'bullish',
      description: `EMA9 (${ema9.toFixed(0)}) > EMA21 (${ema21.toFixed(0)}) — Short-term bullish.`,
    }
  if (ema9 < ema21)
    return {
      ema9,
      ema21,
      crossover: 'bearish',
      description: `EMA9 (${ema9.toFixed(0)}) < EMA21 (${ema21.toFixed(0)}) — Short-term bearish.`,
    }
  return { ema9, ema21, crossover: 'none', description: 'EMA9 ≈ EMA21 — Neutral.' }
}

function calcBollinger(prices: number[]): {
  upper: number
  middle: number
  lower: number
  position: string
  description: string
} {
  const recent = prices.slice(-20)
  const middle = recent.reduce((a, b) => a + b, 0) / recent.length
  const variance = recent.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / recent.length
  const sd = Math.sqrt(variance)
  const upper = middle + 2 * sd
  const lower = middle - 2 * sd
  const price = prices[prices.length - 1]!
  const range = upper - lower || 1
  const pos = (price - lower) / range

  if (price > upper)
    return {
      upper,
      middle,
      lower,
      position: 'above_upper',
      description: `Price ABOVE upper band ($${upper.toFixed(0)}) — Overbought.`,
    }
  if (pos > 0.8)
    return {
      upper,
      middle,
      lower,
      position: 'near_upper',
      description: `Price near upper ($${upper.toFixed(0)}) — Caution.`,
    }
  if (pos < 0.2)
    return {
      upper,
      middle,
      lower,
      position: 'near_lower',
      description: `Price near lower ($${lower.toFixed(0)}) — Support zone.`,
    }
  if (price < lower)
    return {
      upper,
      middle,
      lower,
      position: 'below_lower',
      description: `Price BELOW lower ($${lower.toFixed(0)}) — Oversold.`,
    }
  return { upper, middle, lower, position: 'middle', description: 'Price in middle band — Neutral.' }
}

function emaSingle(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1]!
  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < prices.length; i++) ema = (prices[i]! - ema) * multiplier + ema
  return ema
}

export function generateSimulatedPrices(currentPrice: number, count: number = 50): number[] {
  const prices: number[] = [currentPrice * 0.95]
  for (let i = 1; i < count; i++) {
    const change = (Math.random() - 0.48) * currentPrice * 0.02
    prices.push(prices[i - 1]! + change)
  }
  prices[count - 1] = currentPrice
  return prices
}
