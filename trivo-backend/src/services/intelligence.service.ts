import { and, desc, eq } from 'drizzle-orm'
import { db } from '../lib/db'
import {
  agents,
  agentDecisions,
  agentReflections,
  agentScorecards,
  agentSkillPacks,
  committeeReports,
  marketRegimes,
} from '../lib/schema'
import { BUILT_IN_SKILL_PACKS } from '../engine/skills/skill-pack-registry'
import { loadRiskPolicy } from '../engine/risk/risk-policy-loader'

export function listBuiltInSkillPacks() {
  return BUILT_IN_SKILL_PACKS
}

export async function listAgentDecisions(agentId: string, limit = 25) {
  return db
    .select()
    .from(agentDecisions)
    .where(eq(agentDecisions.agentId, agentId))
    .orderBy(desc(agentDecisions.createdAt))
    .limit(limit)
}

export async function listAgentCommitteeReports(agentId: string, limit = 50) {
  return db
    .select()
    .from(committeeReports)
    .where(eq(committeeReports.agentId, agentId))
    .orderBy(desc(committeeReports.createdAt))
    .limit(limit)
}

export async function listAgentReflections(agentId: string, limit = 25) {
  return db
    .select()
    .from(agentReflections)
    .where(eq(agentReflections.agentId, agentId))
    .orderBy(desc(agentReflections.createdAt))
    .limit(limit)
}

export async function listAgentScorecards(agentId: string, limit = 4) {
  return db
    .select()
    .from(agentScorecards)
    .where(eq(agentScorecards.agentId, agentId))
    .orderBy(desc(agentScorecards.updatedAt))
    .limit(limit)
}

export async function getLatestAgentScorecard(agentId: string) {
  const [scorecard] = await listAgentScorecards(agentId, 1)
  return scorecard ?? null
}

export async function listScorecards(window?: string, limit = 100) {
  if (window) {
    return db
      .select()
      .from(agentScorecards)
      .where(eq(agentScorecards.window, window))
      .orderBy(desc(agentScorecards.updatedAt))
      .limit(limit)
  }

  return db.select().from(agentScorecards).orderBy(desc(agentScorecards.updatedAt)).limit(limit)
}

export async function listAgentSkillPacks(agentId: string, limit = 50) {
  return db
    .select()
    .from(agentSkillPacks)
    .where(eq(agentSkillPacks.agentId, agentId))
    .orderBy(desc(agentSkillPacks.assignedAt))
    .limit(limit)
}

export async function listMarketRegimes(filters: { symbol?: string; timeframe?: string; limit?: number }) {
  const { symbol, timeframe, limit = 50 } = filters

  if (symbol && timeframe) {
    return db
      .select()
      .from(marketRegimes)
      .where(and(eq(marketRegimes.symbol, symbol), eq(marketRegimes.timeframe, timeframe)))
      .orderBy(desc(marketRegimes.createdAt))
      .limit(limit)
  }

  if (symbol) {
    return db.select().from(marketRegimes).where(eq(marketRegimes.symbol, symbol)).orderBy(desc(marketRegimes.createdAt)).limit(limit)
  }

  if (timeframe) {
    return db.select().from(marketRegimes).where(eq(marketRegimes.timeframe, timeframe)).orderBy(desc(marketRegimes.createdAt)).limit(limit)
  }

  return db.select().from(marketRegimes).orderBy(desc(marketRegimes.createdAt)).limit(limit)
}

export async function getAgentRiskPolicy(agentId: string) {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
  })

  if (!agent) {
    return loadRiskPolicy(agentId, {})
  }

  return loadRiskPolicy(agentId, {
    maxLeverage: agent.maxLeverage,
    spendLimit: agent.spendLimit,
    stopLossPct: agent.stopLossPct,
  })
}
