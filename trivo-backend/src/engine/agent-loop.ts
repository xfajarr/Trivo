import { db } from '../lib/db.js'
import { agents } from '../lib/schema.js'
import { eq } from 'drizzle-orm'
import { ThinkingEngine } from './thinking/thinking-engine.js'
import { ToolRegistry } from './tools/registry.js'
import { AgentRunner } from './agent-runner.js'
import type { EngineConfig } from './types.js'
import type { BaseProvider } from './providers/base-provider.js'

/**
 * AgentEngine — SINGLE RESPONSIBILITY: orchestrate agent runners
 * SOLID-S: Only manages lifecycle (start/stop/status)
 * SOLID-D: Depends on BaseProvider abstraction
 */
export class AgentEngine {
  private runners = new Map<string, AgentRunner>()
  private thinking: ThinkingEngine
  private tools: ToolRegistry
  private isRunning = false
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(
    config: EngineConfig,
    provider: BaseProvider,
    tools: ToolRegistry,
  ) {
    this.tools = tools
    this.thinking = new ThinkingEngine(provider, tools)
    console.log(`🔧 Tools: ${tools.getSchemas().map(t => t.name).join(', ')}`)
    console.log(`🧠 Provider: ${provider.constructor.name}`)
  }

  private getOrCreateRunner(agentId: string, agentName: string): AgentRunner {
    let runner = this.runners.get(agentId)
    if (!runner) {
      runner = new AgentRunner(agentId, agentName, this.thinking, this.tools)
      this.runners.set(agentId, runner)
      console.log(`🆕 Runner created for [${agentName}]`)
    }
    return runner
  }

  async runAgentCycle(agentId: string): Promise<void> {
    const agent = await db.query.agents.findFirst({ where: eq(agents.id, agentId) })
    if (!agent || agent.status !== 'active') return

    const runner = this.getOrCreateRunner(agent.id, agent.name)
    await runner.runCycle()
  }

  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    console.log(`🚀 Engine cycling every 60s — agents run in parallel`)

    this.intervalId = setInterval(async () => {
      try {
        const active = await db.query.agents.findMany({ where: eq(agents.status, 'active') })
        if (active.length === 0) return

        // PARALLEL: all agents run simultaneously
        await Promise.allSettled(
          active.map(a => this.runAgentCycle(a.id).catch(e =>
            console.error(`[${a.name}] cycle failed:`, e.message)
          ))
        )
      } catch (error) { console.error('Engine:', error) }
    }, 60_000)
  }

  stop(): void {
    this.isRunning = false
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null }
    this.runners.clear()
    console.log('⏹️ Engine stopped')
  }

  getStatus() {
    return Array.from(this.runners.values()).map(r => r.getStatus())
  }
}
