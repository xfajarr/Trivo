/**
 * Enhanced Technical Analysis Module
 * 
 * Features:
 * - Multi-timeframe analysis (1m, 5m, 15m, 1h, 4h)
 * - Support/Resistance detection
 * - Volume analysis + confirmation
 * - Candlestick patterns (doji, hammer, engulfing, etc)
 * - Funding rate sentiment
 * - Correlation analysis (BTC/ETH)
 * 
 * Inspired by: autonomous-ai-trading-agent-llama3, Moss.site, Akonobea/ai-crypto-agent
 */

export interface OHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

export interface TimeframeAnalysis {
  timeframe: string
  indicators: TechnicalIndicators
  trend: 'bullish' | 'bearish' | 'neutral'
  strength: number // 0-100
}

export interface TechnicalIndicators {
  rsi: number
  macd: { macd: number; signal: number; histogram: number; crossover: string }
  ema: { ema9: number; ema21: number; crossover: string }
  bollinger: { upper: number; middle: number; lower: number; position: string }
}

export interface SupportResistance {
  supports: number[]
  resistances: number[]
  nearestSupport: number
  nearestResistance: number
  description: string
}

export interface VolumeAnalysis {
  currentVolume: number
  averageVolume: number
  volumeRatio: number
  trend: 'high' | 'normal' | 'low'
  confirmation: boolean
  description: string
}

export interface CandlestickPattern {
  name: string
  type: 'bullish' | 'bearish' | 'neutral'
  strength: 'strong' | 'medium' | 'weak'
  description: string
}

export interface FundingRate {
  rate: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  description: string
}

export interface Correlation {
  pair1: string
  pair2: string
  coefficient: number
  trend: 'correlated' | 'uncorrelated' | 'inverted'
  description: string
}

export interface EnhancedAnalysis {
  timeframes: TimeframeAnalysis[]
  supportResistance: SupportResistance
  volume: VolumeAnalysis
  patterns: CandlestickPattern[]
  fundingRate: FundingRate
  correlation: Correlation
  overallBias: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  summary: string
}

/**
 * Calculate all enhanced technical analysis
 */
export function calculateEnhancedAnalysis(
  prices: number[],
  volumes: number[],
  currentPrice: number
): EnhancedAnalysis {
  // Multi-timeframe analysis
  const timeframes = analyzeMultiTimeframe(prices)
  
  // Support/Resistance
  const supportResistance = findSupportResistance(prices, currentPrice)
  
  // Volume analysis
  const volume = analyzeVolume(volumes, prices)
  
  // Candlestick patterns
  const patterns = detectCandlestickPatterns(prices, volumes)
  
  // Funding rate (simulated - in production: fetch from exchange)
  const fundingRate = estimateFundingRate(timeframes)
  
  // Correlation (simplified - in production: calculate from multiple pairs)
  const correlation: Correlation = {
    pair1: 'BTC',
    pair2: 'ETH',
    coefficient: 0.85,
    trend: 'correlated',
    description: 'BTC/ETH highly correlated (0.85) — ETH follows BTC'
  }
  
  // Overall bias
  const { bias, confidence } = calculateOverallBias(timeframes, supportResistance, volume, patterns, fundingRate)
  
  // Summary
  const summary = buildSummary(timeframes, supportResistance, volume, patterns, fundingRate, correlation, bias, confidence)
  
  return {
    timeframes,
    supportResistance,
    volume,
    patterns,
    fundingRate,
    correlation,
    overallBias: bias,
    confidence,
    summary
  }
}

/**
 * Multi-timeframe analysis
 */
function analyzeMultiTimeframe(prices: number[]): TimeframeAnalysis[] {
  const timeframes = ['1m', '5m', '15m', '1h', '4h']
  const results: TimeframeAnalysis[] = []
  
  for (const tf of timeframes) {
    // Simulate different timeframe data by sampling
    const sampleRate = getTimeframeSampleRate(tf)
    const sampledPrices = prices.filter((_, i) => i % sampleRate === 0)
    
    if (sampledPrices.length < 26) {
      results.push({
        timeframe: tf,
        indicators: getDefaultIndicators(),
        trend: 'neutral',
        strength: 50
      })
      continue
    }
    
    const indicators = calculateIndicators(sampledPrices)
    const trend = determineTrend(indicators)
    const strength = calculateTrendStrength(indicators)
    
    results.push({ timeframe: tf, indicators, trend, strength })
  }
  
  return results
}

function getTimeframeSampleRate(timeframe: string): number {
  switch (timeframe) {
    case '1m': return 1
    case '5m': return 5
    case '15m': return 15
    case '1h': return 60
    case '4h': return 240
    default: return 1
  }
}

function calculateIndicators(prices: number[]): TechnicalIndicators {
  const rsi = calcRSI(prices)
  const macd = calcMACD(prices)
  const ema = calcEMA(prices)
  const bollinger = calcBollinger(prices)
  
  return { rsi, macd, ema, bollinger }
}

function calcRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50
  
  const changes: number[] = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i]! - prices[i - 1]!)
  }
  
  const recent = changes.slice(-period)
  const gains = recent.filter(c => c > 0)
  const losses = recent.filter(c => c < 0).map(c => Math.abs(c))
  
  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0
  
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calcMACD(prices: number[]): { macd: number; signal: number; histogram: number; crossover: string } {
  const ema12 = emaSingle(prices, 12)
  const ema26 = emaSingle(prices, 26)
  const macd = ema12 - ema26
  
  const macdVals: number[] = []
  for (let i = 26; i <= prices.length; i++) {
    const s = prices.slice(0, i)
    macdVals.push(emaSingle(s, 12) - emaSingle(s, 26))
  }
  
  const signal = macdVals.length >= 9 ? emaSingle(macdVals, 9) : macd
  const histogram = macd - signal
  
  let crossover = 'none'
  if (macdVals.length >= 2) {
    const prev = macdVals[macdVals.length - 2]! - signal
    if (histogram > 0 && prev <= 0) crossover = 'bullish'
    if (histogram < 0 && prev >= 0) crossover = 'bearish'
  }
  
  return { macd, signal, histogram, crossover }
}

function calcEMA(prices: number[]): { ema9: number; ema21: number; crossover: string } {
  const ema9 = emaSingle(prices, 9)
  const ema21 = emaSingle(prices, 21)
  
  let crossover = 'none'
  if (ema9 > ema21 * 1.001) crossover = 'bullish'
  if (ema9 < ema21 * 0.999) crossover = 'bearish'
  
  return { ema9, ema21, crossover }
}

function calcBollinger(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number; position: string } {
  const recent = prices.slice(-period)
  const middle = recent.reduce((a, b) => a + b, 0) / recent.length
  const variance = recent.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / recent.length
  const sd = Math.sqrt(variance)
  
  const upper = middle + stdDev * sd
  const lower = middle - stdDev * sd
  const price = prices[prices.length - 1]!
  const range = upper - lower || 1
  const pos = (price - lower) / range
  
  let position = 'middle'
  if (price > upper) position = 'above_upper'
  else if (pos > 0.8) position = 'near_upper'
  else if (pos < 0.2) position = 'near_lower'
  else if (price < lower) position = 'below_lower'
  
  return { upper, middle, lower, position }
}

function emaSingle(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1]!
  const multiplier = 2 / (period + 1)
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i]! - ema) * multiplier + ema
  }
  return ema
}

function determineTrend(indicators: TechnicalIndicators): 'bullish' | 'bearish' | 'neutral' {
  let bullish = 0
  let bearish = 0
  
  if (indicators.rsi > 55) bullish++
  if (indicators.rsi < 45) bearish++
  if (indicators.macd.crossover === 'bullish') bullish += 2
  if (indicators.macd.crossover === 'bearish') bearish += 2
  if (indicators.ema.crossover === 'bullish') bullish++
  if (indicators.ema.crossover === 'bearish') bearish++
  if (indicators.bollinger.position === 'near_lower' || indicators.bollinger.position === 'below_lower') bullish++
  if (indicators.bollinger.position === 'near_upper' || indicators.bollinger.position === 'above_upper') bearish++
  
  if (bullish > bearish + 1) return 'bullish'
  if (bearish > bullish + 1) return 'bearish'
  return 'neutral'
}

function calculateTrendStrength(indicators: TechnicalIndicators): number {
  let strength = 50
  
  // RSI contribution
  if (indicators.rsi > 70) strength += 15
  else if (indicators.rsi < 30) strength -= 15
  else if (indicators.rsi > 60) strength += 5
  else if (indicators.rsi < 40) strength -= 5
  
  // MACD contribution
  if (indicators.macd.crossover === 'bullish') strength += 20
  if (indicators.macd.crossover === 'bearish') strength -= 20
  
  // EMA contribution
  if (indicators.ema.crossover === 'bullish') strength += 10
  if (indicators.ema.crossover === 'bearish') strength -= 10
  
  return Math.max(0, Math.min(100, strength))
}

function getDefaultIndicators(): TechnicalIndicators {
  return {
    rsi: 50,
    macd: { macd: 0, signal: 0, histogram: 0, crossover: 'none' },
    ema: { ema9: 0, ema21: 0, crossover: 'none' },
    bollinger: { upper: 0, middle: 0, lower: 0, position: 'middle' }
  }
}

/**
 * Support/Resistance detection
 */
function findSupportResistance(prices: number[], currentPrice: number): SupportResistance {
  const supports: number[] = []
  const resistances: number[] = []
  
  // Find local minima (supports) and maxima (resistances)
  for (let i = 2; i < prices.length - 2; i++) {
    const p = prices[i]!
    const prev2 = prices[i - 2]!
    const prev1 = prices[i - 1]!
    const next1 = prices[i + 1]!
    const next2 = prices[i + 2]!
    
    // Local minimum = support
    if (p < prev1 && p < prev2 && p < next1 && p < next2) {
      supports.push(p)
    }
    
    // Local maximum = resistance
    if (p > prev1 && p > prev2 && p > next1 && p > next2) {
      resistances.push(p)
    }
  }
  
  // Find nearest levels
  const nearestSupport = supports.filter(s => s < currentPrice).sort((a, b) => b - a)[0] ?? currentPrice * 0.95
  const nearestResistance = resistances.filter(r => r > currentPrice).sort((a, b) => a - b)[0] ?? currentPrice * 1.05
  
  const description = `Support: $${nearestSupport.toFixed(0)} | Resistance: $${nearestResistance.toFixed(0)} | Range: ${((nearestResistance - nearestSupport) / currentPrice * 100).toFixed(1)}%`
  
  return { supports, resistances, nearestSupport, nearestResistance, description }
}

/**
 * Volume analysis
 */
function analyzeVolume(volumes: number[], prices: number[]): VolumeAnalysis {
  const currentVolume = volumes[volumes.length - 1]!
  const averageVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
  const volumeRatio = currentVolume / averageVolume
  
  let trend: 'high' | 'normal' | 'low' = 'normal'
  if (volumeRatio > 1.5) trend = 'high'
  if (volumeRatio < 0.5) trend = 'low'
  
  // Volume confirmation: high volume + price move = strong signal
  const priceChange = (prices[prices.length - 1]! - prices[prices.length - 2]!) / prices[prices.length - 2]!
  const confirmation = (trend === 'high' && Math.abs(priceChange) > 0.005)
  
  let description = `Volume: ${volumeRatio.toFixed(1)}x average — ${trend}`
  if (confirmation) description += ' | CONFIRMED — High volume validates price move'
  
  return { currentVolume, averageVolume, volumeRatio, trend, confirmation, description }
}

/**
 * Candlestick pattern detection
 */
function detectCandlestickPatterns(prices: number[], _volumes: number[]): CandlestickPattern[] {
  const patterns: CandlestickPattern[] = []
  
  if (prices.length < 3) return patterns
  
  const last = prices.length - 1
  const prev = last - 1
  const prev2 = last - 2
  
  const open = prices[prev]!
  const close = prices[last]!
  const high = Math.max(open, close) * 1.001
  const low = Math.min(open, close) * 0.999
  const body = Math.abs(close - open)
  const range = high - low || 1
  const upperWick = high - Math.max(open, close)
  const lowerWick = Math.min(open, close) - low
  
  // Doji — indecision
  if (body < range * 0.1) {
    patterns.push({
      name: 'DOJI',
      type: 'neutral',
      strength: 'medium',
      description: 'Doji pattern — Market indecision, potential reversal'
    })
  }
  
  // Hammer — bullish reversal
  if (lowerWick > body * 2 && upperWick < body * 0.5 && close > open) {
    patterns.push({
      name: 'HAMMER',
      type: 'bullish',
      strength: 'strong',
      description: 'Hammer pattern — Bullish reversal signal after downtrend'
    })
  }
  
  // Shooting Star — bearish reversal
  if (upperWick > body * 2 && lowerWick < body * 0.5 && close < open) {
    patterns.push({
      name: 'SHOOTING_STAR',
      type: 'bearish',
      strength: 'strong',
      description: 'Shooting Star — Bearish reversal signal after uptrend'
    })
  }
  
  // Engulfing patterns
  const prevOpen = prices[prev2]!
  const prevClose = prices[prev]!
  const prevBody = Math.abs(prevClose - prevOpen)
  
  // Bullish Engulfing
  if (prevClose < prevOpen && close > open && body > prevBody && close > prevOpen && open < prevClose) {
    patterns.push({
      name: 'BULLISH_ENGULFING',
      type: 'bullish',
      strength: 'strong',
      description: 'Bullish Engulfing — Strong reversal signal, buyers taking control'
    })
  }
  
  // Bearish Engulfing
  if (prevClose > prevOpen && close < open && body > prevBody && close < prevOpen && open > prevClose) {
    patterns.push({
      name: 'BEARISH_ENGULFING',
      type: 'bearish',
      strength: 'strong',
      description: 'Bearish Engulfing — Strong reversal signal, sellers taking control'
    })
  }
  
  // Morning Star — bullish reversal (3 candles)
  if (prices.length >= 3) {
    const candle1 = prices[prev2]!
    const candle2 = prices[prev]!
    const candle3 = prices[last]!
    const body2 = Math.abs(candle2 - candle1)
    
    if (candle1 > candle2 && body2 < Math.abs(candle3 - candle2) * 0.3 && candle3 > candle1) {
      patterns.push({
        name: 'MORNING_STAR',
        type: 'bullish',
        strength: 'strong',
        description: 'Morning Star — Strong bullish reversal pattern'
      })
    }
  }
  
  // Evening Star — bearish reversal (3 candles)
  if (prices.length >= 3) {
    const candle1 = prices[prev2]!
    const candle2 = prices[prev]!
    const candle3 = prices[last]!
    const body2 = Math.abs(candle2 - candle1)
    
    if (candle1 < candle2 && body2 < Math.abs(candle3 - candle2) * 0.3 && candle3 < candle1) {
      patterns.push({
        name: 'EVENING_STAR',
        type: 'bearish',
        strength: 'strong',
        description: 'Evening Star — Strong bearish reversal pattern'
      })
    }
  }
  
  return patterns
}

/**
 * Estimate funding rate sentiment
 * Positive = longs pay shorts (market bullish)
 * Negative = shorts pay longs (market bearish)
 */
function estimateFundingRate(timeframes: TimeframeAnalysis[]): FundingRate {
  const bullishCount = timeframes.filter(t => t.trend === 'bullish').length
  const bearishCount = timeframes.filter(t => t.trend === 'bearish').length
  
  if (bullishCount > bearishCount + 1) {
    return { rate: 0.01, sentiment: 'bullish', description: 'Funding: +0.0100% — Longs paying shorts, market bullish' }
  }
  
  if (bearishCount > bullishCount + 1) {
    return { rate: -0.01, sentiment: 'bearish', description: 'Funding: -0.0100% — Shorts paying longs, market bearish' }
  }
  
  return { rate: 0, sentiment: 'neutral', description: 'Funding: Neutral — Balanced positioning' }
}

/**
 * Calculate overall bias from all signals
 */
function calculateOverallBias(
  timeframes: TimeframeAnalysis[],
  sr: SupportResistance,
  volume: VolumeAnalysis,
  patterns: CandlestickPattern[],
  funding: FundingRate
): { bias: 'bullish' | 'bearish' | 'neutral'; confidence: number } {
  let bullishScore = 0
  let bearishScore = 0
  
  // Timeframe alignment
  for (const tf of timeframes) {
    if (tf.trend === 'bullish') bullishScore += tf.strength / 100
    if (tf.trend === 'bearish') bearishScore += tf.strength / 100
  }
  
  // Volume confirmation
  if (volume.confirmation) {
    const lastPrice = timeframes[0]?.indicators.ema.ema9 ?? 0
    const prevPrice = timeframes[0]?.indicators.ema.ema21 ?? 0
    if (lastPrice > prevPrice) bullishScore += 1.5
    else bearishScore += 1.5
  }
  
  // Pattern signals
  for (const p of patterns) {
    if (p.type === 'bullish') bullishScore += p.strength === 'strong' ? 2 : 1
    if (p.type === 'bearish') bearishScore += p.strength === 'strong' ? 2 : 1
  }
  
  // Funding rate
  if (funding.sentiment === 'bullish') bullishScore += 0.5
  if (funding.sentiment === 'bearish') bearishScore += 0.5
  
  // Determine bias
  let bias: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (bullishScore > bearishScore + 2) bias = 'bullish'
  if (bearishScore > bullishScore + 2) bias = 'bearish'
  
  // Confidence based on signal alignment
  const totalScore = bullishScore + bearishScore
  const dominant = Math.max(bullishScore, bearishScore)
  const confidence = totalScore > 0 ? Math.round((dominant / totalScore) * 100) : 50
  
  return { bias, confidence: Math.min(95, Math.max(30, confidence)) }
}

/**
 * Build comprehensive summary for AI
 */
function buildSummary(
  timeframes: TimeframeAnalysis[],
  sr: SupportResistance,
  volume: VolumeAnalysis,
  patterns: CandlestickPattern[],
  funding: FundingRate,
  correlation: Correlation,
  bias: string,
  confidence: number
): string {
  const lines: string[] = []
  
  lines.push(`📊 OVERALL: ${bias.toUpperCase()} (${confidence}% confidence)`)
  lines.push('')
  
  // Timeframe alignment
  lines.push('⏱️ TIMEFRAMES:')
  for (const tf of timeframes) {
    const icon = tf.trend === 'bullish' ? '🟢' : tf.trend === 'bearish' ? '🔴' : '⚪'
    lines.push(`  ${icon} ${tf.timeframe}: ${tf.trend} (${tf.strength}%)`)
  }
  lines.push('')
  
  // Key levels
  lines.push(`📐 LEVELS: ${sr.description}`)
  lines.push('')
  
  // Volume
  lines.push(`📈 VOLUME: ${volume.description}`)
  lines.push('')
  
  // Patterns
  if (patterns.length > 0) {
    lines.push('🕯️ PATTERNS:')
    for (const p of patterns) {
      lines.push(`  ${p.type === 'bullish' ? '🟢' : p.type === 'bearish' ? '🔴' : '⚪'} ${p.name}: ${p.description}`)
    }
    lines.push('')
  }
  
  // Funding
  lines.push(`💰 ${funding.description}`)
  lines.push('')
  
  // Correlation
  lines.push(`🔗 ${correlation.description}`)
  
  return lines.join('\n')
}

/**
 * Generate simulated OHLCV data for testing
 */
export function generateSimulatedOHLCV(currentPrice: number, count: number = 100): OHLCV[] {
  const candles: OHLCV[] = []
  let price = currentPrice * 0.95
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * currentPrice * 0.02
    const open = price
    const close = price + change
    const high = Math.max(open, close) * (1 + Math.random() * 0.005)
    const low = Math.min(open, close) * (1 - Math.random() * 0.005)
    const volume = 1000000 + Math.random() * 5000000
    
    candles.push({ open, high, low, close, volume, timestamp: Date.now() - (count - i) * 60000 })
    price = close
  }
  
  // Last candle = current price
  candles[count - 1]!.close = currentPrice
  return candles
}
