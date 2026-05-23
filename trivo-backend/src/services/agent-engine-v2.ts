import { eq, desc } from 'drizzle-orm'
import { db } from '../lib/db'
import { agents as agentsTable, agentMemory, feedEvents } from '../lib/schema'
import { createOpenAIProvider } from './models'
import type { LLMProvider, StructuredDecision } from './models'
import { getPrice } from './contract.service'
import { getTool } from './tools/registry'
import { broadcastAgentEvent } from './ws'
import { addTrace } from './thinking.service'
import { getSimulatedPrices } from './market-data.service'

function buildSystemPrompt(agent: { name: string; strategy: string | null; skills: string | null }): string {
  return `You are ${agent.name}, an AI trading agent on Trivo.

Your strategy: ${agent.strategy || 'Find profitable trading opportunities'}

Your available skills: ${agent.skills || 'perp, prediction, lp'}

Rules:
- Always analyze the market before trading
- Only trade when confidence is high
- Consider your past trades and their outcomes
- Be conservative with capital
- Provide clear reasoning for every decision`
}

async function buildContext(agentId: string): Promise<string> {
  let btc = 0, eth = 0, sol = 0
  try { btc = await getPrice('BTC/USD') } catch { /* price fetch non-critical */ }
  try { eth = await getPrice('ETH/USD') } catch { /* price fetch non-critical */ }
  try { sol = await getPrice('SOL/USD') } catch { /* price fetch non-critical */ }
  const prices: Record<string, number> = { 'BTC/USD': btc, 'ETH/USD': eth, 'SOL/USD': sol }

  const recentMemory = await db.select()
    .from(agentMemory)
    .where(eq(agentMemory.agentId, agentId))
    .orderBy(desc(agentMemory.createdAt))
    .limit(5)

  const priceStr = Object.entries(prices).map(([k, v]) => `${k}: $${v}`).join('\n')
  const memoryStr = recentMemory.map(m => `[${m.type}] ${m.content}`).join('\n')

  return `Current Market Data:\n${priceStr}\n\nRecent Activity:\n${memoryStr || 'No recent activity'}`
}

async function saveMemory(agentId: string, type: string, content: string, reasoning?: string, txHash?: string) {
  await db.insert(agentMemory).values({
    id: crypto.randomUUID(),
    agentId,
    type,
    content: content.slice(0, 2000),
    reasoning: reasoning?.slice(0, 2000) ?? null,
    txHash: txHash ?? null,
    metadata: null,
  })
}

async function executeDecision(agentId: string, decision: StructuredDecision): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!decision.tool || !decision.args) {
    return { success: false, error: 'No action to execute' }
  }

  const tool = getTool(decision.tool)
  if (!tool) {
    return { success: false, error: `Unknown tool: ${decision.tool}` }
  }

  const result = await tool.execute(agentId, decision.args)
  return { success: result.success, txHash: result.txHash, error: result.error }
}

function getProviderForAgent(agent: { modelProvider: string | null; modelConfig: string | null }): LLMProvider | null {
  const provider = agent.modelProvider
  if (!provider || provider === 'byok') return null

  // Read config from agent.modelConfig (JSON) or fallback to env var
  let apiKey = ''
  let baseURL = ''
  let model = ''
  try {
    if (agent.modelConfig) {
      const cfg = JSON.parse(agent.modelConfig)
      apiKey = cfg.apiKey || ''
      baseURL = cfg.baseURL || ''
      model = cfg.model || ''
    }
  } catch { /* parse error */ }
  if (!apiKey) apiKey = process.env.OPENAI_API_KEY ?? ''
  if (!apiKey) return null

  const MODEL_CONFIGS: Record<string, { baseURL: string; model: string }> = {
    deepseek: { baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    claude: { baseURL: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514' },
    openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' },
    qwen: { baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-max' },
  }

  const cfg = MODEL_CONFIGS[provider]
  if (!cfg) return null

  return createOpenAIProvider(model || cfg.model, apiKey, baseURL || cfg.baseURL)
}

let _engineRunning = false

export function startAgentEngineV2() {
  if (_engineRunning) return
  _engineRunning = true

  console.log('🤖 Agent Engine v2 started (10s interval)')

  setInterval(async () => {
    try {
      const activeAgents = await db.select()
        .from(agentsTable)
        .where(eq(agentsTable.status, 'active'))
        .limit(20)

      for (const agent of activeAgents) {
        try {
          await processAgent(agent)
        } catch (err) {
          console.error(`❌ Agent ${agent.id} error:`, err)
          broadcastAgentEvent(agent.id, { event: 'error', agentId: agent.id, error: String(err) })
        }
      }
    } catch (err) {
      console.error('❌ Engine cycle error:', err)
    }
  }, 10_000)
}

async function processAgent(agent: typeof agentsTable.$inferSelect) {
  const provider = getProviderForAgent(agent)
  const agentId = agent.id

  // If no AI provider, use rule-based fallback
  if (!provider) {
    const prices = await getSimulatedPrices()
    const { decide } = await import('./decision-engine.service')
    const d = await decide(
      { id: agentId, name: agent.name, strategy: agent.strategy, modelProvider: agent.modelProvider, memory: [] },
      { prices }
    )

    if (d.shouldTrade && d.tool) {
      const fakeDecision: StructuredDecision = {
        reasoning: d.reasoning,
        confidence: d.confidence,
        tool: d.tool ?? null,
        args: d.args ?? null,
      }
      const result = await executeDecision(agentId, fakeDecision)
      await saveMemory(agentId, 'trade', d.reasoning, d.reasoning, result.txHash)
    }
    return
  }

  // Build context
  const context = await buildContext(agentId)
  const systemPrompt = buildSystemPrompt(agent)

  // Add thinking trace
  addTrace({
    id: crypto.randomUUID(),
    agentId,
    type: 'reasoning',
    content: 'Starting analysis cycle...',
    createdAt: new Date(),
  })

  // 1. THINK
  const thinking = await provider.think(systemPrompt, context)
  await saveMemory(agentId, 'reasoning', thinking)

  addTrace({ id: crypto.randomUUID(), agentId, type: 'reasoning', content: thinking, createdAt: new Date() })
  broadcastAgentEvent(agentId, { event: 'thinking', agentId, content: thinking })

  // 2. DECIDE
  const decision = await provider.decide(systemPrompt, context, thinking)
  await saveMemory(agentId, 'decision', JSON.stringify(decision), decision.reasoning)

  addTrace({
    id: crypto.randomUUID(), agentId, type: 'decision',
    content: `${decision.tool ?? 'skip'} — ${decision.reasoning}`,
    metadata: { decision },
    createdAt: new Date(),
  })
  broadcastAgentEvent(agentId, { event: 'deciding', agentId, decision })

  if (!decision.tool) return

  // 3. EXECUTE
  const result = await executeDecision(agentId, decision)
  await saveMemory(agentId, 'execution', JSON.stringify(result), undefined, result.txHash)

  addTrace({
    id: crypto.randomUUID(), agentId, type: 'execution',
    content: `${result.success ? '✅' : '❌'} ${result.txHash ?? ''}`,
    metadata: { result },
    createdAt: new Date(),
  })
  broadcastAgentEvent(agentId, { event: 'execution', agentId, result })

  console.log(`📡 Agent ${agentId} → trade executed (🔗 https://testnet.arcscan.app/tx/${result.txHash})`)

  console.log(`📡 Agent ${agentId} → trade executed (🔗 https://testnet.arcscan.app/tx/${result.txHash})`)

  // Create feed event
  if (result.txHash) {
    await db.insert(feedEvents).values({
      id: crypto.randomUUID(),
      agentId,
      type: 'position_open',
      data: JSON.stringify({ decision, result }),
      venue: (decision.args?.venue as string) ?? 'perp',
      txHash: result.txHash,
      reasoning: decision.reasoning,
    })
  }
}
