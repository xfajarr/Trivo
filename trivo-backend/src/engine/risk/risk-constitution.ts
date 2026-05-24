import type {
  AgentRiskPolicy,
  CommitteeDecision,
  MarketRegimeSnapshot,
  RiskConstitutionDecision,
} from '../intelligence-types.js'

export interface RiskConstitutionInput {
  decision: CommitteeDecision
  calibratedConfidence: number
  policy: AgentRiskPolicy
  regime: MarketRegimeSnapshot
  openPositionCount: number
  todayPnl: number
  minutesSinceLastTrade: number
}

function fail(name: string, detail: string, checks: RiskConstitutionDecision['checks']): RiskConstitutionDecision {
  return {
    allowed: false,
    status: 'blocked',
    reason: `${name}: ${detail}`,
    checks: [...checks, { name, passed: false, detail }],
  }
}

export function evaluateRiskConstitution(input: RiskConstitutionInput): RiskConstitutionDecision {
  const checks: RiskConstitutionDecision['checks'] = []
  const { decision, policy, regime } = input

  if (!policy.enabled) {
    return fail('policy_enabled', 'risk policy disabled trading', checks)
  }

  checks.push({ name: 'policy_enabled', passed: true, detail: 'risk policy enabled' })

  if (decision.action === 'hold') {
    return {
      allowed: true,
      status: 'approved',
      reason: 'hold does not require trade execution',
      checks,
    }
  }

  const quorum = decision.roleReports.filter((report) => report.confidence >= 50).length
  if (quorum < policy.requireCommitteeQuorum) {
    return fail('committee_quorum', `quorum ${quorum} below required ${policy.requireCommitteeQuorum}`, checks)
  }
  checks.push({ name: 'committee_quorum', passed: true, detail: `quorum ${quorum}` })

  if (policy.blockIfRegime.includes(regime.regime)) {
    return fail('market_regime', `regime ${regime.regime} is blocked`, checks)
  }
  checks.push({ name: 'market_regime', passed: true, detail: `regime ${regime.regime} allowed` })

  if (input.todayPnl < -policy.maxDailyLossUsd) {
    return fail('daily_loss', `daily PnL ${input.todayPnl} below -${policy.maxDailyLossUsd}`, checks)
  }
  checks.push({ name: 'daily_loss', passed: true, detail: `daily PnL ${input.todayPnl}` })

  if (input.minutesSinceLastTrade < policy.cooldownMinutes) {
    return fail('cooldown', `${input.minutesSinceLastTrade}m since last trade below ${policy.cooldownMinutes}m`, checks)
  }
  checks.push({ name: 'cooldown', passed: true, detail: `${input.minutesSinceLastTrade}m since last trade` })

  if (decision.action === 'open_trade') {
    if (input.openPositionCount >= policy.maxOpenPositions) {
      return fail('max_open_positions', `${input.openPositionCount} open positions`, checks)
    }

    const args = decision.args ?? {}
    const size = Number(args.size ?? args.sizeUsd ?? 0)
    const leverage = Number(args.leverage ?? 1)

    if (size > policy.maxTradeUsd) {
      return fail('max_trade_usd', `size ${size} exceeds ${policy.maxTradeUsd}`, checks)
    }
    if (leverage > policy.maxLeverageX) {
      return fail('max_leverage', `leverage ${leverage} exceeds ${policy.maxLeverageX}`, checks)
    }
    if (input.calibratedConfidence < policy.minConfidenceOpen) {
      return fail('confidence', `confidence ${input.calibratedConfidence} below ${policy.minConfidenceOpen}`, checks)
    }

    checks.push({ name: 'max_open_positions', passed: true, detail: `${input.openPositionCount}/${policy.maxOpenPositions}` })
    checks.push({ name: 'max_trade_usd', passed: true, detail: `size ${size}` })
    checks.push({ name: 'max_leverage', passed: true, detail: `leverage ${leverage}` })
    checks.push({ name: 'confidence', passed: true, detail: `confidence ${input.calibratedConfidence}` })
  }

  if (decision.action === 'close_trade' && input.calibratedConfidence < policy.minConfidenceClose) {
    return fail('close_confidence', `confidence ${input.calibratedConfidence} below ${policy.minConfidenceClose}`, checks)
  }

  return {
    allowed: true,
    status: 'approved',
    reason: 'all risk constitution checks passed',
    checks,
  }
}
