import type { CommitteeDecision, CommitteeRoleReport, CommitteeStance } from '../intelligence-types.js'
import type { ActionType, MarketContext } from '../types.js'
import { COMMITTEE_ROLES, REQUIRED_COMMITTEE_QUORUM } from './roles.js'

export interface TradingCommitteeInput {
  agentName: string
  strategy: string | null
  skills: string | null
  context: MarketContext
  symbol: string
}

export interface TradingCommitteeConsensus {
  stance: CommitteeStance | 'mixed'
  support: number
  summary: string
  roles: Array<CommitteeRoleReport['role']>
}

export interface TradingCommitteeDissent {
  role: CommitteeRoleReport['role']
  stance: CommitteeStance
  summary: string
}

export interface TradingCommitteeQuorumStatus {
  required: number
  aligned: number
  satisfied: boolean
}

export interface TradingCommitteeRecommendation {
  action: ActionType
  side: 'long' | 'short' | 'none'
  tool: string | null
  args: Record<string, unknown> | null
  confidence: number
  rationale: string
}

export interface TradingCommitteeResult extends CommitteeDecision {
  consensus: TradingCommitteeConsensus
  dissent: TradingCommitteeDissent[]
  quorum: TradingCommitteeQuorumStatus
  finalRecommendation: TradingCommitteeRecommendation
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function tokenFromSymbol(symbol: string): string {
  return symbol.split('/')[0] ?? symbol
}

function report(
  role: CommitteeRoleReport['role'],
  stance: CommitteeStance,
  confidence: number,
  summary: string,
  evidence: Record<string, unknown>,
): CommitteeRoleReport {
  return {
    role,
    stance,
    confidence: clampPercent(confidence),
    summary,
    evidence,
    modelProvider: 'deterministic-v1',
    latencyMs: 0,
  }
}

function stanceDirection(stance: CommitteeStance): 'bullish' | 'bearish' | 'neutral' {
  if (stance === 'bullish' || stance === 'approve') return 'bullish'
  if (stance === 'bearish' || stance === 'reject') return 'bearish'
  return 'neutral'
}

function pickConsensus(roleReports: CommitteeRoleReport[]): TradingCommitteeConsensus {
  const bullishRoles = roleReports.filter((report) => stanceDirection(report.stance) === 'bullish')
  const bearishRoles = roleReports.filter((report) => stanceDirection(report.stance) === 'bearish')

  if (bullishRoles.length === bearishRoles.length) {
    return {
      stance: 'mixed',
      support: bullishRoles.length,
      summary: 'Committee split between bullish and bearish views.',
      roles: [],
    }
  }

  const winner = bullishRoles.length > bearishRoles.length ? bullishRoles : bearishRoles
  const stance = bullishRoles.length > bearishRoles.length ? 'bullish' : 'bearish'

  return {
    stance,
    support: winner.length,
    summary: `${stance} consensus with ${winner.length} aligned roles.`,
    roles: winner.map((report) => report.role),
  }
}

function buildFinalRecommendation(input: TradingCommitteeInput, roleReports: CommitteeRoleReport[]): TradingCommitteeRecommendation {
  const technical = roleReports.find((report) => report.role === 'technical_analyst')
  const sentiment = roleReports.find((report) => report.role === 'sentiment_analyst')
  const risk = roleReports.find((report) => report.role === 'risk_analyst')
  const pm = roleReports.find((report) => report.role === 'portfolio_manager')

  const bullishSignal = technical?.stance === 'bullish' && sentiment?.stance === 'bullish'
  const bearishSignal = technical?.stance === 'bearish' && sentiment?.stance === 'bearish'
  const approvedByRisk = risk?.stance === 'approve'
  const openPositions = input.context.openPositions.length

  if (bullishSignal && approvedByRisk && openPositions < 3) {
    return {
      action: 'open_trade',
      side: 'long',
      tool: 'open_trade',
      args: { venue: 'perp', pair: input.symbol, side: 'long', size: 50, leverage: 2 },
      confidence: clampPercent(pm?.confidence ?? 0),
      rationale: `Committee approved long ${input.symbol}: ${pm?.summary ?? 'portfolio manager aligned.'}`,
    }
  }

  if (bearishSignal && approvedByRisk && openPositions < 3) {
    return {
      action: 'open_trade',
      side: 'short',
      tool: 'open_trade',
      args: { venue: 'perp', pair: input.symbol, side: 'short', size: 50, leverage: 2 },
      confidence: clampPercent(pm?.confidence ?? 0),
      rationale: `Committee approved short ${input.symbol}: ${pm?.summary ?? 'portfolio manager aligned.'}`,
    }
  }

  return {
    action: 'hold',
    side: 'none',
    tool: null,
    args: null,
    confidence: clampPercent(pm?.confidence ?? 0),
    rationale: 'Committee did not find enough aligned edge to trade.',
  }
}

export function runTradingCommittee(input: TradingCommitteeInput): TradingCommitteeResult {
  const ta = input.context.technicalAnalysis?.[input.symbol]
  const token = tokenFromSymbol(input.symbol)
  const sentiment = input.context.sentiment[token]
  const priceChange = input.context.priceChanges[input.symbol]
  const openPositionCount = input.context.openPositions.length
  const recentTrades = input.context.recentTrades
  const winRate = input.context.winRate
  const totalTrades = input.context.totalTrades

  const bullishTechnical = Boolean(ta && ta.overallBias === 'bullish' && ta.confidence >= 60)
  const bearishTechnical = Boolean(ta && ta.overallBias === 'bearish' && ta.confidence >= 60)
  const bullishSentiment = (sentiment?.score ?? 0) >= 20
  const bearishSentiment = (sentiment?.score ?? 0) <= -20
  const riskOff = openPositionCount >= 3 || input.context.todayPnl < -25 || (ta?.volume.confirmation === false && (ta?.volume.volumeRatio ?? 0) < 1)

  const roleReports: CommitteeRoleReport[] = [
    report(
      'technical_analyst',
      bullishTechnical ? 'bullish' : bearishTechnical ? 'bearish' : 'neutral',
      ta?.confidence ?? 50,
      ta?.summary ?? 'No strong technical edge.',
      { technicalAnalysis: ta ?? null, priceChange: priceChange ?? null },
    ),
    report(
      'sentiment_analyst',
      bullishSentiment ? 'bullish' : bearishSentiment ? 'bearish' : 'neutral',
      clampPercent(Math.abs(sentiment?.score ?? 0) + 40),
      sentiment ? `${sentiment.sentiment} sentiment score ${sentiment.score}` : 'Neutral sentiment.',
      { sentiment: sentiment ?? null },
    ),
    report(
      'risk_analyst',
      riskOff ? 'risk_off' : 'approve',
      riskOff ? 75 : 82,
      riskOff ? `${openPositionCount} open positions or weak market quality.` : 'Risk checks pass.',
      { openPositionCount, todayPnl: input.context.todayPnl, recentTrades },
    ),
    report(
      'bull_researcher',
      bullishTechnical || bullishSentiment ? 'bullish' : 'neutral',
      bullishTechnical && bullishSentiment ? 86 : bullishTechnical || bullishSentiment ? 68 : 54,
      'Bull case checks trend and sentiment alignment.',
      { bullishTechnical, bullishSentiment, strategy: input.strategy, skills: input.skills },
    ),
    report(
      'bear_researcher',
      bearishTechnical || bearishSentiment ? 'bearish' : 'neutral',
      bearishTechnical && bearishSentiment ? 86 : bearishTechnical || bearishSentiment ? 68 : 54,
      'Bear case checks downside, crowding, and failed momentum.',
      { bearishTechnical, bearishSentiment, winRate, totalTrades },
    ),
    report(
      'portfolio_manager',
      bullishTechnical && bullishSentiment && !riskOff
        ? 'approve'
        : bearishTechnical && bearishSentiment && !riskOff
          ? 'reject'
          : 'neutral',
      bullishTechnical && bullishSentiment ? 80 : bearishTechnical && bearishSentiment ? 72 : 58,
      'Portfolio manager chooses action after committee review.',
      { agentName: input.agentName, strategy: input.strategy, skills: input.skills, openPositionCount, winRate },
    ),
  ]

  const consensus = pickConsensus(roleReports)
  const dissent = roleReports
    .filter((report) => consensus.stance === 'mixed' || stanceDirection(report.stance) !== consensus.stance)
    .map((report) => ({ role: report.role, stance: report.stance, summary: report.summary }))

  const quorumSupport = roleReports.filter((report) => report.stance !== 'neutral' && report.stance !== 'risk_off').length
  const quorum = {
    required: REQUIRED_COMMITTEE_QUORUM,
    aligned: quorumSupport,
    satisfied: quorumSupport >= REQUIRED_COMMITTEE_QUORUM && consensus.stance !== 'mixed',
  }

  const finalRecommendation = buildFinalRecommendation(input, roleReports)
  const action = finalRecommendation.action
  const side = finalRecommendation.side

  const pm = roleReports.find((report) => report.role === 'portfolio_manager')
  const rawConfidence = clampPercent(
    consensus.stance === 'mixed'
      ? roleReports.reduce((sum, report) => sum + report.confidence, 0) / roleReports.length
      : roleReports
          .filter((report) => stanceDirection(report.stance) === consensus.stance)
          .reduce((sum, report) => sum + report.confidence, 0) /
          Math.max(1, roleReports.filter((report) => stanceDirection(report.stance) === consensus.stance).length),
  )

  const reasoning =
    action === 'open_trade'
      ? `Committee approved ${side} ${input.symbol}: ${pm?.summary ?? 'portfolio manager approved.'}`
      : 'Committee did not find enough aligned edge to trade.'

  return {
    action,
    tool: finalRecommendation.tool,
    args: finalRecommendation.args,
    rawConfidence,
    riskLevel: action === 'open_trade' ? (finalRecommendation.confidence >= 75 ? 'medium' : 'low') : 'low',
    reasoning,
    abortConditions: ['risk policy blocks trade', 'market regime changes', 'price invalidates setup'],
    roleReports: COMMITTEE_ROLES.map((role) => roleReports.find((report) => report.role === role)!),
    debateSummary: `Technical=${roleReports[0]!.stance}, Sentiment=${roleReports[1]!.stance}, Risk=${roleReports[2]!.stance}, PM=${roleReports[5]!.stance}`,
    market: input.symbol,
    consensus,
    dissent,
    quorum,
    finalRecommendation,
  }
}
