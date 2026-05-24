import { calculateScorecard, type ScoreFormulaInput, type ScoreFormulaResult } from './score-formula.js'

export type ScorecardInput = ScoreFormulaInput

export interface ScorecardGatingFlags {
  copyTradingEligible: boolean
  requiresHumanReview: boolean
  blocked: boolean
  confidenceCaution: boolean
  riskCaution: boolean
  regimeCaution: boolean
  skillsCaution: boolean
  memoryCaution: boolean
  committeeCaution: boolean
}

export interface ScorecardResult extends ScoreFormulaResult {
  gatingFlags: ScorecardGatingFlags
  recommendation: 'blocked' | 'review' | 'eligible'
}

function buildGatingFlags(
  input: Pick<ScorecardInput, 'confidenceScore' | 'riskScore' | 'regimeScore' | 'skillsScore' | 'memoryScore' | 'committeeScore'>,
  overallScore: number,
): ScorecardGatingFlags {
  const confidenceCaution = input.confidenceScore < 55
  const riskCaution = input.riskScore < 60
  const regimeCaution = input.regimeScore < 55
  const skillsCaution = input.skillsScore < 50
  const memoryCaution = input.memoryScore < 50
  const committeeCaution = input.committeeScore < 60

  const blocked = overallScore < 55 || input.riskScore < 40 || input.committeeScore < 40
  const copyTradingEligible =
    !blocked &&
    overallScore >= 70 &&
    input.confidenceScore >= 60 &&
    input.riskScore >= 60 &&
    input.regimeScore >= 55 &&
    input.skillsScore >= 50 &&
    input.memoryScore >= 50 &&
    input.committeeScore >= 60

  return {
    copyTradingEligible,
    requiresHumanReview: !copyTradingEligible && !blocked,
    blocked,
    confidenceCaution,
    riskCaution,
    regimeCaution,
    skillsCaution,
    memoryCaution,
    committeeCaution,
  }
}

export function buildScorecard(input: ScorecardInput): ScorecardResult {
  const formula = calculateScorecard(input)
  const normalizedInput = {
    confidenceScore: formula.breakdown.confidence.score,
    riskScore: formula.breakdown.risk.score,
    regimeScore: formula.breakdown.regime.score,
    skillsScore: formula.breakdown.skills.score,
    memoryScore: formula.breakdown.memory.score,
    committeeScore: formula.breakdown.committee.score,
  }
  const gatingFlags = buildGatingFlags(normalizedInput, formula.overallScore)

  return {
    ...formula,
    gatingFlags,
    recommendation: gatingFlags.blocked ? 'blocked' : gatingFlags.copyTradingEligible ? 'eligible' : 'review',
  }
}

export const updateAgentScorecard = buildScorecard
