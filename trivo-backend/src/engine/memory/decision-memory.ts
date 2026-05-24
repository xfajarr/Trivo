import { db } from '../../lib/db.js'
import { agentDecisions, committeeReports, marketRegimes } from '../../lib/schema.js'
import type {
  CalibratedConfidence,
  CommitteeDecision,
  MarketRegimeSnapshot,
  RiskConstitutionDecision,
} from '../intelligence-types.js'

export interface AppendDecisionMemoryInput {
  agentId: string
  cycleId: string
  decision: CommitteeDecision
  calibration: CalibratedConfidence
  risk: RiskConstitutionDecision
  regime: MarketRegimeSnapshot
  status?: 'proposed' | 'executed' | 'failed' | 'skipped'
}

export interface AppendDecisionMemoryResult {
  marketRegimeId: string
  decisionId: string
  committeeReportIds: string[]
}

function text(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  return JSON.stringify(value).replace(/\s+/g, ' ').trim()
}

function optionalText(value: unknown): string | undefined {
  const normalized = text(value)
  return normalized.length > 0 ? normalized : undefined
}

function optionalArg(value: Record<string, unknown> | null | undefined, key: string): string | undefined {
  return optionalText(value?.[key])
}

function persistInsert(table: unknown, rows: unknown) {
  return db.insert(table as never).values(rows as never).execute()
}

export async function appendDecisionMemory(input: AppendDecisionMemoryInput): Promise<AppendDecisionMemoryResult> {
  const marketRegimeId = crypto.randomUUID()
  await persistInsert(marketRegimes, {
    id: marketRegimeId,
    symbol: text(input.regime.symbol),
    timeframe: text(input.regime.timeframe),
    regime: text(input.regime.regime),
    trendScore: text(input.regime.trendScore),
    volatilityScore: text(input.regime.volatilityScore),
    liquidityScore: text(input.regime.liquidityScore),
    sentimentShockScore: text(input.regime.sentimentShockScore),
    confidence: text(input.regime.confidence),
    evidence: text(input.regime.evidence),
    source: 'decision-memory',
  })

  const decisionId = crypto.randomUUID()
  const action = input.risk.allowed ? input.decision.action : 'blocked'
  const finalReasoning = input.risk.allowed
    ? input.decision.reasoning
    : `${input.decision.reasoning} | risk: ${input.risk.reason}`

  await persistInsert(agentDecisions, {
    id: decisionId,
    agentId: text(input.agentId),
    cycleId: text(input.cycleId),
    market: text(input.decision.market),
    action: text(action),
    toolName: optionalText(input.decision.tool),
    toolArgs: optionalText(input.decision.args),
    rawConfidence: text(input.calibration.rawConfidence),
    calibratedConfidence: text(input.calibration.calibratedConfidence),
    riskLevel: text(input.decision.riskLevel),
    marketRegimeId,
    committeeSummary: text(input.decision.debateSummary),
    riskDecision: text(input.risk.status),
    riskReason: text(input.risk.reason),
    finalReasoning: text(finalReasoning),
    txHash: optionalArg(input.decision.args, 'txHash'),
    positionId: optionalArg(input.decision.args, 'positionId'),
    status: text(input.status ?? 'proposed'),
  })

  const committeeReportIds: string[] = []
  for (const report of input.decision.roleReports) {
    const reportId = crypto.randomUUID()
    committeeReportIds.push(reportId)
    await persistInsert(committeeReports, {
      id: reportId,
      agentId: text(input.agentId),
      decisionId,
      cycleId: text(input.cycleId),
      role: text(report.role),
      stance: text(report.stance),
      confidence: text(report.confidence),
      summary: text(report.summary),
      evidence: text(report.evidence),
      modelProvider: optionalText(report.modelProvider),
      latencyMs: optionalText(report.latencyMs),
    })
  }

  return { marketRegimeId, decisionId, committeeReportIds }
}
