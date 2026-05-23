import type { ThinkingOutput, RiskConfig } from '../types.js'

export function checkRiskGates(
  decision: ThinkingOutput,
  config: RiskConfig,
  currentDailyPnl: number,
): { allowed: boolean; reason?: string } {
  const args = decision.args ?? {}

  // 1. Leverage gate
  if (args.leverage && Number(args.leverage) > config.maxLeverageX) {
    return {
      allowed: false,
      reason: `Leverage ${args.leverage}x exceeds max ${config.maxLeverageX}x`,
    }
  }

  // 2. Position size gate
  if (args.size && Number(args.size) > config.spendLimitUsd) {
    return {
      allowed: false,
      reason: `Size $${args.size} exceeds spend limit $${config.spendLimitUsd}`,
    }
  }

  // 3. Daily loss gate
  if (currentDailyPnl < -config.maxDailyLossUsd) {
    return {
      allowed: false,
      reason: `Daily loss $${Math.abs(currentDailyPnl)} exceeded limit $${config.maxDailyLossUsd}`,
    }
  }

  // 4. Confidence gate (higher risk → higher confidence required)
  const minConfidence = config.confidenceThresholds[decision.riskLevel]
  if (decision.confidence < minConfidence) {
    return {
      allowed: false,
      reason: `Confidence ${decision.confidence}% < required ${minConfidence}% for ${decision.riskLevel} risk`,
    }
  }

  // 5. Stop loss check
  if (args.stopLoss && Number(args.stopLoss) > config.stopLossPct) {
    return {
      allowed: false,
      reason: `Stop loss ${args.stopLoss}% exceeds max ${config.stopLossPct}%`,
    }
  }

  return { allowed: true }
}
