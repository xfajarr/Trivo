import type { ActionType, RiskLevel } from './types.js'

export type CommitteeRole =
  | 'technical_analyst'
  | 'sentiment_analyst'
  | 'risk_analyst'
  | 'bull_researcher'
  | 'bear_researcher'
  | 'portfolio_manager'

export type CommitteeStance = 'bullish' | 'bearish' | 'neutral' | 'risk_off' | 'approve' | 'reject'

export type MarketRegime = 'trending' | 'ranging' | 'volatile' | 'news_driven' | 'low_liquidity' | 'mixed'

export type RiskDecisionStatus = 'approved' | 'blocked' | 'degraded'

export type AgentDecisionStatus = 'proposed' | 'executed' | 'failed' | 'skipped'

export type SkillPackCategory = 'analysis' | 'execution' | 'risk' | 'social' | 'copy_trading'

export interface CommitteeRoleReport {
  role: CommitteeRole
  stance: CommitteeStance
  confidence: number
  summary: string
  evidence: Record<string, unknown>
  modelProvider?: string
  latencyMs?: number
}

export interface CommitteeDecision {
  action: ActionType
  tool: string | null
  args: Record<string, unknown> | null
  rawConfidence: number
  riskLevel: RiskLevel
  reasoning: string
  abortConditions: string[]
  roleReports: CommitteeRoleReport[]
  debateSummary: string
  market: string
}

export interface MarketRegimeSnapshot {
  symbol: string
  timeframe: string
  regime: MarketRegime
  trendScore: number
  volatilityScore: number
  liquidityScore: number
  sentimentShockScore: number
  confidence: number
  evidence: Record<string, unknown>
}

export interface CalibratedConfidence {
  rawConfidence: number
  calibratedConfidence: number
  technicalScore: number
  sentimentScore: number
  riskScore: number
  memoryScore: number
  committeeAgreementScore: number
  explanation: string
}

export interface RiskConstitutionDecision {
  allowed: boolean
  status: RiskDecisionStatus
  reason: string
  checks: Array<{ name: string; passed: boolean; detail: string }>
}

export interface AgentRiskPolicy {
  maxOpenPositions: number
  maxLeverageX: number
  maxTradeUsd: number
  maxDailyLossUsd: number
  minConfidenceOpen: number
  minConfidenceClose: number
  cooldownMinutes: number
  blockIfRegime: MarketRegime[]
  requireCommitteeQuorum: number
  enabled: boolean
}

export interface SkillPackDefinition {
  id: string
  name: string
  slug: string
  description: string
  category: SkillPackCategory
  toolNames: string[]
  committeeRoles: CommitteeRole[]
  defaultConfig: Record<string, unknown>
}

export interface ScorecardInput {
  realizedPnlUsd: number
  winRatePct: number
  maxDrawdownPct: number
  consistencyPct: number
  riskAdjustedReturn: number
  explanationCompletenessPct: number
  totalTrades: number
}

export interface ScorecardResult {
  trivoScore: number
  realizedPnlScore: number
  winRateScore: number
  drawdownScore: number
  consistencyScore: number
  riskAdjustedScore: number
  explanationScore: number
}
