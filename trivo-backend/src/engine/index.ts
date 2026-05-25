// engine/index.ts
// Phase 6: AI Engine v2 - Complete exports and orchestration

import { AgentEngine } from './agent-loop.js'
import { ToolRegistry } from './tools/registry.js'
import { ASIOneProvider } from './providers/asi-one.js'
import { HeuristProvider } from './providers/heurist.js'
import { ModelRouter } from './providers/model-router.js'
import { getPriceTool } from './tools/get-price.js'
import { openTradeTool } from './tools/open-trade.js'
import { closeTradeTool } from './tools/close-trade.js'
import { getSentimentTool } from './tools/get-sentiment.js'
import { swapTokenTool } from './tools/swap-token.js'
import { CompleteTradingAgent } from './agents/complete-trading-agent.js'
import { TechnicalAnalystAgent } from './agents/analysts/technical-analyst.js'
import { SentimentAnalystAgent } from './agents/analysts/sentiment-analyst.js'
import { OnChainAnalystAgent } from './agents/analysts/onchain-analyst.js'
import { MacroAnalystAgent } from './agents/analysts/macro-analyst.js'
import { BullResearcherAgent } from './agents/researchers/bull-researcher.js'
import { BearResearcherAgent } from './agents/researchers/bear-researcher.js'
import { TraderAgent } from './agents/trader.js'
import { PortfolioManagerAgent } from './agents/portfolio-manager.js'
import { startCron as startCronJobs, stopCron as stopCronJobs } from './services/cron.js'
import type { EngineConfig } from './types.js'
import type { BaseProvider } from './providers/base-provider.js'

// ─── PHASE 6 EXPORTS ────────────────────────────────────────────────────────

// Audit System
export { AuditSystem, auditSystem } from './audit/audit-system.js'
export type { DecisionExport } from './audit/audit-system.js'

// Schemas
export * from './schemas/index.js'
export * from './discussion/schemas.js'

// Base Agent
export { BaseAgent } from './agents/base-agent.js'

// Analysts
export { TechnicalAnalystAgent } from './agents/analysts/technical-analyst.js'
export { SentimentAnalystAgent } from './agents/analysts/sentiment-analyst.js'
export { OnChainAnalystAgent } from './agents/analysts/onchain-analyst.js'
export { MacroAnalystAgent } from './agents/analysts/macro-analyst.js'

// Researchers
export { BullResearcherAgent } from './agents/researchers/bull-researcher.js'
export { BearResearcherAgent } from './agents/researchers/bear-researcher.js'

// Decision Makers
export { TraderAgent } from './agents/trader.js'
export { PortfolioManagerAgent } from './agents/portfolio-manager.js'

// Complete Agent
export { CompleteTradingAgent } from './agents/complete-trading-agent.js'

// Learning & Memory
export { LearningEngine } from './learning/learning-engine.js'
export { ReflectionGenerator, buildReflectionSummary } from './memory/reflection-generator.js'

// Identity
export { IdentityService, identityService } from './identity/identity-service.js'

// Autonomy
export { AutonomousRunner, LifecycleState } from './autonomous/autonomous-runner.js'
export { EventStore, eventStore, EventType } from './autonomous/event-store.js'
export { Watchdog, watchdog } from './autonomous/watchdog.js'
export { SelfHealer, selfHealer, RecoveryStrategy } from './autonomous/self-healer.js'

// Discussion
export { DebateOrchestrator } from './discussion/debate-orchestrator.js'

// Cron Jobs
export {
  startCron,
  stopCron,
  isCronRunning,
  getCronStatus,
  triggerJob,
} from './services/cron.js'

// Providers
export { ModelRouter } from './providers/model-router.js'

// PnL Service (from services/)
export { PnLService, pnlService } from '../services/pnl.service.js'

// Types
export type { PatternMatch } from './learning/learning-engine.js'

// Utils
export { withRetry, withTimeout, withFallback, withLLMFallback } from './utils/error-handler.js'

// ENGINE INSTANCE

let engine: AgentEngine | null = null

/**
 * Start the AI trading engine with all Phase 6 components
 */
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

  // Start cron jobs for PnL tracking
  startCronJobs()
}

/**
 * Build the AI provider based on environment variables
 */
function buildProvider(): HeuristProvider | ASIOneProvider {
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

/**
 * Build a model router for round-robin load balancing
 */
export function buildModelRouter(): ModelRouter {
  return new ModelRouter({
    asiOne: {
      apiKey: process.env.AI_API_KEY ?? '',
      defaultModel: 'asi1',
    },
    heurist: {
      apiKey: process.env.AI_API_KEY ?? '',
      defaultModel: 'hermes-3-llama3.1-8b',
    },
  })
}

/**
 * Stop the AI trading engine
 */
export function stopEngine(): void {
  engine?.stop()
  engine = null

  // Stop cron jobs
  stopCronJobs()
}

/**
 * Run agent cycle immediately
 */
export async function runAgentNow(agentId: string): Promise<void> {
  if (!engine) throw new Error('Engine not started')
  await engine.runAgentCycle(agentId)
}

/**
 * Get engine status
 */
export function getEngineStatus() {
  return engine?.getStatus() ?? []
}

// ─── COMPLETE TRADING AGENT FACTORY ─────────────────────────────────────────

/**
 * Create a complete trading agent with all sub-agents wired up
 */
export function createCompleteTradingAgent(provider?: BaseProvider): CompleteTradingAgent {
  const p = provider ?? buildProvider()
  return new CompleteTradingAgent(p)
}

/**
 * Create a specific analyst agent
 */
export function createTechnicalAnalyst(provider?: BaseProvider): TechnicalAnalystAgent {
  return new TechnicalAnalystAgent(provider ?? buildProvider())
}

export function createSentimentAnalyst(provider?: BaseProvider): SentimentAnalystAgent {
  return new SentimentAnalystAgent(provider ?? buildProvider())
}

export function createOnChainAnalyst(provider?: BaseProvider): OnChainAnalystAgent {
  return new OnChainAnalystAgent(provider ?? buildProvider())
}

export function createMacroAnalyst(provider?: BaseProvider): MacroAnalystAgent {
  return new MacroAnalystAgent(provider ?? buildProvider())
}

export function createBullResearcher(provider?: BaseProvider): BullResearcherAgent {
  return new BullResearcherAgent(provider ?? buildProvider())
}

export function createBearResearcher(provider?: BaseProvider): BearResearcherAgent {
  return new BearResearcherAgent(provider ?? buildProvider())
}

export function createTrader(provider?: BaseProvider): TraderAgent {
  return new TraderAgent(provider ?? buildProvider())
}

export function createPortfolioManager(provider?: BaseProvider): PortfolioManagerAgent {
  return new PortfolioManagerAgent(provider ?? buildProvider())
}
