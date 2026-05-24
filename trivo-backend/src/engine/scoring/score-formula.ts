export interface ScoreFormulaInput {
  confidenceScore: number
  riskScore: number
  regimeScore: number
  skillsScore: number
  memoryScore: number
  committeeScore: number
}

export interface ScoreFormulaBreakdownItem {
  score: number
  weight: number
  weightedScore: number
}

export interface ScoreFormulaResult {
  overallScore: number
  breakdown: {
    confidence: ScoreFormulaBreakdownItem
    risk: ScoreFormulaBreakdownItem
    regime: ScoreFormulaBreakdownItem
    skills: ScoreFormulaBreakdownItem
    memory: ScoreFormulaBreakdownItem
    committee: ScoreFormulaBreakdownItem
  }
}

const SCORE_WEIGHTS = {
  confidence: 0.26,
  risk: 0.24,
  regime: 0.16,
  skills: 0.14,
  memory: 0.1,
  committee: 0.1,
} as const

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function toBreakdownItem(score: number, weight: number): ScoreFormulaBreakdownItem {
  const clamped = clampScore(score)

  return {
    score: clamped,
    weight,
    weightedScore: clamped * weight,
  }
}

export function calculateScorecard(input: ScoreFormulaInput): ScoreFormulaResult {
  const breakdown = {
    confidence: toBreakdownItem(input.confidenceScore, SCORE_WEIGHTS.confidence),
    risk: toBreakdownItem(input.riskScore, SCORE_WEIGHTS.risk),
    regime: toBreakdownItem(input.regimeScore, SCORE_WEIGHTS.regime),
    skills: toBreakdownItem(input.skillsScore, SCORE_WEIGHTS.skills),
    memory: toBreakdownItem(input.memoryScore, SCORE_WEIGHTS.memory),
    committee: toBreakdownItem(input.committeeScore, SCORE_WEIGHTS.committee),
  }

  const overallScore = clampScore(
    breakdown.confidence.weightedScore +
      breakdown.risk.weightedScore +
      breakdown.regime.weightedScore +
      breakdown.skills.weightedScore +
      breakdown.memory.weightedScore +
      breakdown.committee.weightedScore,
  )

  return {
    overallScore,
    breakdown,
  }
}
