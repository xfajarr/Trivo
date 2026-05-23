export type RiskLevel = 'low' | 'medium' | 'high'
export type ActionType = 'open_trade' | 'close_trade' | 'hold'

export interface ThinkingOutput {
  observation: string
  analysis: string
  action: ActionType
  tool: string | null
  args: Record<string, unknown> | null
  confidence: number
  riskLevel: RiskLevel
  reasoning: string
  abortConditions: string[]
}

export interface TradeDecision {
  tool: string
  args: Record<string, unknown>
  confidence: number
  riskLevel: RiskLevel
  reasoning: string
  abortConditions: string[]
  expectedPnlUsd: number
}

export interface RiskConfig {
  maxLeverageX: number
  stopLossPct: number
  spendLimitUsd: number
  maxDailyLossUsd: number
  pauseOnConsecutiveLosses: number
  cooldownMinutes: number
  confidenceThresholds: {
    low: number
    medium: number
    high: number
  }
}

export interface EngineConfig {
  cycleIntervalMs: number
  maxAgentsPerCycle: number
  memoryContextSize: number
}

export interface MarketContext {
  prices: Record<string, number>
  priceChanges: Record<string, { hour: number; day: number }>
  sentiment: Record<string, { score: number; sentiment: string; volume: number }>
  technicalAnalysis?: Record<string, {
    timeframes: Array<{
      timeframe: string
      trend: 'bullish' | 'bearish' | 'neutral'
      strength: number
    }>
    supportResistance: {
      supports: number[]
      resistances: number[]
      nearestSupport: number
      nearestResistance: number
      description: string
    }
    volume: {
      currentVolume: number
      averageVolume: number
      volumeRatio: number
      trend: 'high' | 'normal' | 'low'
      confirmation: boolean
      description: string
    }
    patterns: Array<{
      name: string
      type: 'bullish' | 'bearish' | 'neutral'
      strength: 'strong' | 'medium' | 'weak'
      description: string
    }>
    fundingRate: {
      rate: number
      sentiment: 'bullish' | 'bearish' | 'neutral'
      description: string
    }
    correlation: {
      pair1: string
      pair2: string
      coefficient: number
      trend: 'correlated' | 'uncorrelated' | 'inverted'
      description: string
    }
    overallBias: 'bullish' | 'bearish' | 'neutral'
    confidence: number
    summary: string
  }>
  recentTrades: Array<{ action: string; pnl: number; timestamp: string }>
  openPositions: Array<{ venue: string; side: string; size: number; entryPrice: number }>
  todayPnl: number
  winRate: number
  totalTrades: number
}

export interface SentimentData {
  token: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  score: number
  volume: number
  engagement: number
  topTopics: string[]
  influentialTweets: Array<{
    text: string
    author: string
    followers: number
    sentiment: string
  }>
  timestamp: string
}
