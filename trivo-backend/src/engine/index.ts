import { AgentEngine } from './agent-loop.js'
import { ToolRegistry } from './tools/registry.js'
import { ASIOneProvider } from './providers/asi-one.js'
import { HeuristProvider } from './providers/heurist.js'
import { getPriceTool } from './tools/get-price.js'
import { openTradeTool } from './tools/open-trade.js'
import { closeTradeTool } from './tools/close-trade.js'
import { getSentimentTool } from './tools/get-sentiment.js'
import { swapTokenTool } from './tools/swap-token.js'
import type { EngineConfig } from './types.js'

// Phase 6 exports
export { AuditSystem, auditSystem, type DecisionExport } from './audit/audit-system.js'
export { BaseAgent } from './agents/base-agent.js'
export { TechnicalAnalystAgent } from './agents/analysts/technical-analyst.js'
export { SentimentAnalystAgent } from './agents/analysts/sentiment-analyst.js'
export { OnChainAnalystAgent } from './agents/analysts/onchain-analyst.js'
export { MacroAnalystAgent } from './agents/analysts/macro-analyst.js'
export { BullResearcherAgent } from './agents/researchers/bull-researcher.js'
export { BearResearcherAgent } from './agents/researchers/bear-researcher.js'
export { TraderAgent } from './agents/trader.js'
export { PortfolioManagerAgent } from './agents/portfolio-manager.js'
export { CompleteTradingAgent } from './agents/complete-trading-agent.js'
export { LearningEngine } from './learning/learning-engine.js'
export { ReflectionGenerator, buildReflectionSummary } from './memory/reflection-generator.js'
export { AutonomousRunner } from './autonomous/autonomous-runner.js'
export { EventStore, eventStore, EventType } from './autonomous/event-store.js'
export { Watchdog, watchdog } from './autonomous/watchdog.js'
export { SelfHealer, selfHealer, RecoveryStrategy } from './autonomous/self-healer.js'
export { DebateOrchestrator } from './discussion/debate-orchestrator.js'
export { IdentityService, identityService } from './identity/identity-service.js'
export { PnLService, pnlService } from '../services/pnl.service.js'
export { withRetry, withTimeout, withFallback, withLLMFallback } from './utils/error-handler.js'
export * from './schemas/index.js'
export * from './discussion/schemas.js'

let engine: AgentEngine | null = null

export function startEngine(config?: Partial<EngineConfig>): void {
  // Build tool registry
  const tools = new ToolRegistry()
  tools.register(getPriceTool)
  tools.register(openTradeTool)
  tools.register(closeTradeTool)
  tools.register(getSentimentTool)
  tools.register(swapTokenTool)

  // Build provider (SOLID-D: use abstraction)
  const provider = buildProvider()

  engine = new AgentEngine(
    { cycleIntervalMs: 60_000, maxAgentsPerCycle: 20, memoryContextSize: 5, ...config },
    provider,
    tools,
  )
  engine.start()
}

function buildProvider() {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? ''
  const baseURL = process.env.AI_BASE_URL ?? ''
  const model = process.env.AI_MODEL ?? 'gpt-4o'

  // If ASI:One endpoint → use ASIOneProvider
  if (baseURL.includes('asi1.ai')) {
    return new ASIOneProvider({ apiKey, model })
  }

  // If Heurist endpoint → use HeuristProvider
  if (baseURL.includes('heurist')) {
    return new HeuristProvider({ apiKey, model })
  }

  // Default: ASI:One
  return new ASIOneProvider({ apiKey, model: 'asi1' })
}

export function stopEngine(): void {
  engine?.stop()
  engine = null
}

export async function runAgentNow(agentId: string): Promise<void> {
  if (!engine) throw new Error('Engine not started')
  await engine.runAgentCycle(agentId)
}

export function getEngineStatus() {
  return engine?.getStatus() ?? []
}
