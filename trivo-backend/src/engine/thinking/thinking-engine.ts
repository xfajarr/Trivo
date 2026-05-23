import type { ThinkingOutput } from '../types.js'
import type { ToolRegistry } from '../tools/registry.js'
import { buildSystemPrompt } from './system-prompt.js'
import { buildMarketContext, buildUserPrompt } from './context-builder.js'
import type { BaseProvider } from '../providers/base-provider.js'

/**
 * ThinkingEngine — orchestrates the thinking process
 * SOLID-D: Depends on BaseProvider abstraction, not concrete classes
 */
export class ThinkingEngine {
  constructor(
    private readonly provider: BaseProvider,
    private readonly tools: ToolRegistry,
  ) {}

  async run(agent: {
    id: string; name: string; strategy: string | null; skills: string | null
    riskConfig: { maxLeverage: number; stopLossPct: number; spendLimit: number }
  }): Promise<ThinkingOutput> {
    const context = await buildMarketContext(agent.id)
    const system = buildSystemPrompt(agent)
    const user = buildUserPrompt(context)

    return this.provider.runReActLoop(system, user, this.tools, 5)
  }
}
