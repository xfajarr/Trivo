import type { ThinkingOutput, TradeDecision, RiskConfig } from '../types.js'
import { checkRiskGates } from './risk-gates.js'
import { CircuitBreaker } from './circuit-breaker.js'

export class DecisionEngine {
  private circuitBreaker: CircuitBreaker

  constructor(private readonly defaultRiskConfig: RiskConfig) {
    this.circuitBreaker = new CircuitBreaker(defaultRiskConfig)
  }

  evaluate(thinking: ThinkingOutput, agentRiskConfig?: Partial<RiskConfig>): TradeDecision | null {
    const config = { ...this.defaultRiskConfig, ...agentRiskConfig }

    // 1. Circuit breaker check
    const { canTrade, reason } = this.circuitBreaker.canTrade()
    if (!canTrade) {
      console.log(`⛔ Circuit breaker: ${reason}`)
      return null
    }

    // 2. HOLD decision
    if (!thinking.tool || thinking.action === 'hold') {
      return null
    }

    // 3. Risk gates
    const gate = checkRiskGates(thinking, config, this.circuitBreaker.getDailyPnl())
    if (!gate.allowed) {
      console.log(`⛔ Risk gate blocked: ${gate.reason}`)
      return null
    }

    // 4. Build trade decision
    return {
      tool: thinking.tool,
      args: thinking.args ?? {},
      confidence: thinking.confidence,
      riskLevel: thinking.riskLevel,
      reasoning: thinking.reasoning,
      abortConditions: thinking.abortConditions,
      expectedPnlUsd: 0,
    }
  }

  recordResult(pnlUsd: number): void {
    this.circuitBreaker.recordTradeResult(pnlUsd)
  }

  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStatus()
  }
}
