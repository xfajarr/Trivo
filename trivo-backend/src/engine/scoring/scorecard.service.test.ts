import { describe, expect, it } from 'vitest'
import { calculateScorecard } from './score-formula.js'
import { buildScorecard } from './scorecard.service.js'

describe('scorecard scoring', () => {
  it('calculates a weighted TrivoScore from the six intelligence inputs', () => {
    const result = calculateScorecard({
      confidenceScore: 82,
      riskScore: 90,
      regimeScore: 76,
      skillsScore: 88,
      memoryScore: 70,
      committeeScore: 84,
    })

    expect(result.breakdown.confidence.score).toBe(82)
    expect(result.breakdown.risk.score).toBe(90)
    expect(result.overallScore).toBe(83)
  })

  it('builds a rich scorecard with gating flags', () => {
    const result = buildScorecard({
      confidenceScore: 82,
      riskScore: 90,
      regimeScore: 76,
      skillsScore: 88,
      memoryScore: 70,
      committeeScore: 84,
    })

    expect(result.recommendation).toBe('eligible')
    expect(result.gatingFlags.copyTradingEligible).toBe(true)
    expect(result.gatingFlags.blocked).toBe(false)
    expect(result.breakdown.committee.weightedScore).toBeCloseTo(8.4)
  })

  it('clamps each input and the overall score to 0 through 100', () => {
    const result = buildScorecard({
      confidenceScore: 120,
      riskScore: -10,
      regimeScore: 200,
      skillsScore: 50,
      memoryScore: 150,
      committeeScore: Number.NaN,
    })

    expect(result.breakdown.confidence.score).toBe(100)
    expect(result.breakdown.risk.score).toBe(0)
    expect(result.breakdown.regime.score).toBe(100)
    expect(result.breakdown.memory.score).toBe(100)
    expect(result.breakdown.committee.score).toBe(0)
    expect(result.overallScore).toBeGreaterThanOrEqual(0)
    expect(result.overallScore).toBeLessThanOrEqual(100)
  })

  it('flags weak inputs as blocked or review-only', () => {
    const result = buildScorecard({
      confidenceScore: 48,
      riskScore: 32,
      regimeScore: 43,
      skillsScore: 47,
      memoryScore: 38,
      committeeScore: 35,
    })

    expect(result.gatingFlags.blocked).toBe(true)
    expect(result.gatingFlags.copyTradingEligible).toBe(false)
    expect(result.gatingFlags.confidenceCaution).toBe(true)
    expect(result.gatingFlags.riskCaution).toBe(true)
    expect(result.gatingFlags.committeeCaution).toBe(true)
    expect(result.recommendation).toBe('blocked')
  })
})
