import { eq } from 'drizzle-orm'
import { db } from '../../lib/db.js'
import { agentRiskPolicies } from '../../lib/schema.js'
import type { AgentRiskPolicy, MarketRegime } from '../intelligence-types.js'

type AgentRiskInputs = {
  maxLeverage?: string | null
  spendLimit?: string | null
  stopLossPct?: string | null
}

type RiskPolicyRow = {
  maxOpenPositions: string | null
  maxLeverageX: string | null
  maxTradeUsd: string | null
  maxDailyLossUsd: string | null
  minConfidenceOpen: string | null
  minConfidenceClose: string | null
  cooldownMinutes: string | null
  blockIfRegime: string | null
  requireCommitteeQuorum: string | null
  enabled: string | null
}

const DEFAULT_BLOCKED_REGIMES: MarketRegime[] = ['low_liquidity']

function parseNumber(value: string | null | undefined, fallback: number): number {
  if (value == null || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseBlockedRegimes(value: string | null | undefined): MarketRegime[] {
  if (!value) return DEFAULT_BLOCKED_REGIMES

  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) {
      return parsed.filter((regime): regime is MarketRegime => typeof regime === 'string' && regime.length > 0)
    }
  } catch {
    // Fallback to comma-separated values below.
  }

  const regimes = value
    .split(',')
    .map((regime) => regime.trim())
    .filter(Boolean) as MarketRegime[]

  return regimes.length > 0 ? regimes : DEFAULT_BLOCKED_REGIMES
}

function parseEnabled(value: string | null | undefined): boolean {
  if (value == null || value === '') return true
  return value !== 'false'
}

export function deriveDefaultRiskPolicy(agent: AgentRiskInputs): AgentRiskPolicy {
  const maxLeverageX = parseNumber(agent.maxLeverage, 2) || 2
  const maxTradeUsd = parseNumber(agent.spendLimit, 50) || 50

  return {
    maxOpenPositions: 3,
    maxLeverageX,
    maxTradeUsd,
    maxDailyLossUsd: Math.max(25, maxTradeUsd * 0.5),
    minConfidenceOpen: 65,
    minConfidenceClose: 45,
    cooldownMinutes: 10,
    blockIfRegime: [...DEFAULT_BLOCKED_REGIMES],
    requireCommitteeQuorum: 4,
    enabled: true,
  }
}

export async function loadRiskPolicy(agentId: string, agent: AgentRiskInputs): Promise<AgentRiskPolicy> {
  const row = (await db.query.agentRiskPolicies.findFirst({
    where: eq(agentRiskPolicies.agentId, agentId),
  })) as RiskPolicyRow | undefined

  if (!row) {
    return deriveDefaultRiskPolicy(agent)
  }

  return {
    maxOpenPositions: parseNumber(row.maxOpenPositions, 3) || 3,
    maxLeverageX: parseNumber(row.maxLeverageX, parseNumber(agent.maxLeverage, 2) || 2),
    maxTradeUsd: parseNumber(row.maxTradeUsd, parseNumber(agent.spendLimit, 50) || 50),
    maxDailyLossUsd: parseNumber(row.maxDailyLossUsd, 25) || 25,
    minConfidenceOpen: parseNumber(row.minConfidenceOpen, 65) || 65,
    minConfidenceClose: parseNumber(row.minConfidenceClose, 45) || 45,
    cooldownMinutes: parseNumber(row.cooldownMinutes, 10) || 10,
    blockIfRegime: parseBlockedRegimes(row.blockIfRegime),
    requireCommitteeQuorum: parseNumber(row.requireCommitteeQuorum, 4) || 4,
    enabled: parseEnabled(row.enabled),
  }
}
