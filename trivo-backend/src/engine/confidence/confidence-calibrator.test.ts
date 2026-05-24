import { describe, expect, it } from 'vitest'
import { calibrateConfidence } from './confidence-calibrator.js'

describe('calibrateConfidence', () => {
  it('weights technical, sentiment, risk, memory, and committee agreement scores', () => {
    const result = calibrateConfidence({
      rawConfidence: 80,
      technicalScore: 90,
      sentimentScore: 70,
      riskScore: 80,
      memoryScore: 60,
      committeeAgreementScore: 100,
    })

    expect(result.calibratedConfidence).toBe(81)
    expect(result.explanation).toContain('technical=90')
  })

  it('clamps scores to 0 through 100', () => {
    const result = calibrateConfidence({
      rawConfidence: 120,
      technicalScore: 200,
      sentimentScore: -10,
      riskScore: 100,
      memoryScore: 50,
      committeeAgreementScore: 50,
    })

    expect(result.rawConfidence).toBe(100)
    expect(result.technicalScore).toBe(100)
    expect(result.sentimentScore).toBe(0)
    expect(result.calibratedConfidence).toBeLessThanOrEqual(100)
  })
})
