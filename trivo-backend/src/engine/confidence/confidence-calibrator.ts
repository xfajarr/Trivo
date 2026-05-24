import type { CalibratedConfidence } from '../intelligence-types.js'

export interface ConfidenceSignalInput {
  rawConfidence: number
  technicalScore: number
  sentimentScore: number
  riskScore: number
  memoryScore: number
  committeeAgreementScore: number
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function calibrateConfidence(input: ConfidenceSignalInput): CalibratedConfidence {
  const rawConfidence = clamp(input.rawConfidence)
  const technicalScore = clamp(input.technicalScore)
  const sentimentScore = clamp(input.sentimentScore)
  const riskScore = clamp(input.riskScore)
  const memoryScore = clamp(input.memoryScore)
  const committeeAgreementScore = clamp(input.committeeAgreementScore)

  const calibratedConfidence = clamp(
    technicalScore * 0.3 +
      sentimentScore * 0.2 +
      riskScore * 0.2 +
      memoryScore * 0.15 +
      committeeAgreementScore * 0.15,
  )

  return {
    rawConfidence,
    calibratedConfidence,
    technicalScore,
    sentimentScore,
    riskScore,
    memoryScore,
    committeeAgreementScore,
    explanation: `technical=${technicalScore}, sentiment=${sentimentScore}, risk=${riskScore}, memory=${memoryScore}, committee=${committeeAgreementScore}`,
  }
}
