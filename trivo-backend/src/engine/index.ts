import { AgentEngine } from './agent-loop.js'
import { ToolRegistry } from './tools/registry.js'
import { ASIOneProvider } from './providers/asi-one.js'
import { HeuristProvider } from './providers/heurist.js'
import { getPriceTool } from './tools/get-price.js'
import { openTradeTool } from './tools/open-trade.js'
import { closeTradeTool } from './tools/close-trade.js'
import { getSentimentTool } from './tools/get-sentiment.js'
import type { EngineConfig } from './types.js'

let engine: AgentEngine | null = null

export function startEngine(config?: Partial<EngineConfig>): void {
  // Build tool registry
  const tools = new ToolRegistry()
  tools.register(getPriceTool)
  tools.register(openTradeTool)
  tools.register(closeTradeTool)
  tools.register(getSentimentTool)

  // Build provider (SOLID-D: use abstraction)
  const provider = buildProvider()

  engine = new AgentEngine(
    { cycleIntervalMs: 10_000, maxAgentsPerCycle: 20, memoryContextSize: 5, ...config },
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
