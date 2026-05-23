# Engine Refactor — Implementation Plan

> Goal: Replace the scattered agent loop with a single `engine/` folder that is the one place
> to configure, extend, and reason about every AI agent decision in Trivo.

---

## Why the Current Approach Falls Short

Before jumping to the plan, here's exactly what's broken today and why each problem matters.

### Problem 1 — Claude runs through the OpenAI-compat shim

**Current code** (`services/models/provider.ts` lines 59-64):
```ts
claude: {
  baseURL: 'https://api.anthropic.com/v1',
  model: 'claude-sonnet-4-20250514',
}
```

Then `openai-provider.ts` calls it via `new OpenAI({ baseURL })`. This works *just enough* to
get a response, but you lose everything Claude-specific:

| Feature | Via OpenAI shim | Via native `@anthropic-ai/sdk` |
|---|---|---|
| Prompt caching (saves 90% token cost on repeated system prompts) | ❌ | ✅ |
| Extended thinking (`budget_tokens`) | ❌ | ✅ |
| Native tool_use with multi-turn ReAct loop | ❌ (hacky) | ✅ |
| Streaming with event types | ❌ | ✅ |
| Citation / document blocks | ❌ | ✅ |

For a hackathon judges running Claude as the AI backbone, hitting native API is the right call.

---

### Problem 2 — Think and Decide are two separate prompts (bad pattern)

**Current flow** (`agent-engine-v2.ts` lines 159-207):
```
provider.think(systemPrompt, context)   → save memory → broadcast
provider.decide(systemPrompt, context, thinking) → parse JSON → execute tool
```

This sends **two API calls per cycle**. The second prompt re-feeds the thinking back as a string.

The correct pattern (from the guide) is a **single ReAct loop**:
```
messages: [ user: "here is the context" ]
→ Claude responds with text (reasoning) OR tool_use block
→ if tool_use: execute tool, append result, continue loop
→ if end_turn: parse final JSON decision
```

This means Claude can call `get_price` mid-reasoning, see the result, and incorporate it into the
final decision — all in one API call chain. Much more capable than the current think-then-decide split.

---

### Problem 3 — Risk parameters are stored but never enforced

**Schema** (agents table): `spendLimit`, `maxLeverage`, `stopLossPct`

**Current enforcement**: None. `executeDecision()` in `agent-engine-v2.ts` line 58-70 just calls
`getTool(decision.tool).execute(decision.args)` with no guard whatsoever.

An agent configured with `maxLeverage: 2` happily opens a 10x position today.

---

### Problem 4 — No circuit breaker

If an agent loses 5 trades in a row, the loop keeps firing every 10 seconds with no cooldown.
No consecutive-loss counter, no daily-loss limit, no pause mechanism.

---

### Problem 5 — Memory is load-last-5, no summarization

**Current** (`buildContext()` lines 27-44): Fetches last 5 `agentMemory` rows and concatenates them.

Problems:
- Context grows stale (trade from 3 days ago treated equally to trade from 30s ago)
- No semantic retrieval (can't ask "what happened last time BTC was at $70k?")
- No distillation (episodic memories never become learned insights)

The guide's `distillToSemanticMemory()` pattern solves this with periodic summarization.
We can do this in PostgreSQL without Qdrant (simple `pgvector` or even full-text search).

---

### Problem 6 — Code is flat functions, not composable classes

Everything lives in one 220-line file (`agent-engine-v2.ts`) mixing:
- Provider resolution
- Context building
- Memory persistence
- Tool dispatch
- Feed event creation
- WebSocket broadcasting

This makes it hard to test, extend, or replace any single piece.

---

## New Structure

```
trivo-backend/src/engine/
├── index.ts                  ← public API: startEngine(), stopEngine(), runAgentNow()
├── agent-loop.ts             ← orchestrator: per-agent cycle, wires all pieces together
├── types.ts                  ← ThinkingOutput, TradeDecision, EngineConfig, RiskConfig
│
├── thinking/
│   ├── thinking-engine.ts    ← ReAct loop via native Anthropic SDK
│   ├── context-builder.ts    ← builds the user prompt (prices + memories + portfolio)
│   └── system-prompt.ts      ← system prompt templates per agent personality
│
├── decision/
│   ├── decision-engine.ts    ← evaluates ThinkingOutput → TradeDecision (or null)
│   ├── risk-gates.ts         ← position size, leverage, daily loss, protocol whitelist
│   └── circuit-breaker.ts    ← consecutive loss counter + cooldown
│
├── tools/
│   ├── registry.ts           ← ToolRegistry: register, getSchemas(), execute()
│   ├── open-trade.ts         ← MockPerp / MockPolymarket / MockLPV3 on Arc
│   ├── close-trade.ts        ← close position + report to CopyTrading.sol
│   └── get-price.ts          ← SimpleOracle on Arc via viem
│
├── memory/
│   ├── memory-store.ts       ← load recent memories, store new memory
│   └── distill.ts            ← periodic episodic → semantic summarization (Claude)
│
└── providers/
    ├── anthropic.ts           ← native @anthropic-ai/sdk (Claude only)
    └── openai-compat.ts      ← existing OpenAI shim (DeepSeek, Qwen, OpenAI, BYOK)
```

---

## Implementation Phases

### Phase 1 — Types & Skeleton (start here, ~1 hour)

**Why first:** Everything else depends on the types. Nail these and the rest slots in cleanly.

Create `engine/types.ts`:
```ts
// Replaces the current LLMProvider / StructuredDecision interfaces
// and adds the missing pieces

export interface ThinkingOutput {
  reasoning: string
  riskLevel: 'low' | 'medium' | 'high'
  riskFactors: string[]
  tool: string | null
  args: Record<string, unknown> | null
  confidence: number         // 0-100
  abortConditions: string[]
}

export interface TradeDecision {
  tool: string
  args: Record<string, unknown>
  expectedPnlUsd: number
  confidence: number
  riskLevel: 'low' | 'medium' | 'high'
  reasoning: string
}

export interface RiskConfig {
  maxLeverageX: number           // from agent.maxLeverage
  stopLossPct: number            // from agent.stopLossPct
  spendLimitUsd: number          // from agent.spendLimit
  maxDailyLossUsd: number        // global floor
  pauseOnConsecutiveLosses: number
  cooldownMinutes: number
  confidenceThresholds: {
    low: number                  // e.g. 55
    medium: number               // e.g. 70
    high: number                 // e.g. 85
  }
}

export interface EngineConfig {
  cycleIntervalMs: number        // default 10_000
  maxAgentsPerCycle: number      // default 20
  memoryContextSize: number      // default 5
}
```

Create `engine/index.ts` as the public API shell (empty implementations for now):
```ts
export function startEngine(config?: Partial<EngineConfig>): void { ... }
export function stopEngine(): void { ... }
export async function runAgentNow(agentId: string): Promise<void> { ... }
```

Replace `startAgentEngineV2()` import in `src/index.ts` with `startEngine()`.

---

### Phase 2 — Native Anthropic Provider (biggest win, ~2 hours)

**Why this matters:** This is the single change with the highest impact. Prompt caching alone
cuts Claude API cost by ~80% on repeated calls (the system prompt is cached after the first call).

Create `engine/providers/anthropic.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages.js'
import type { ToolRegistry } from '../tools/registry.js'
import type { ThinkingOutput } from '../types.js'

export class AnthropicProvider {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey })
  }

  async runReActLoop(
    systemPrompt: string,
    userPrompt: string,
    tools: ToolRegistry,
    maxIterations = 8,
  ): Promise<ThinkingOutput> {
    const messages: MessageParam[] = [{ role: 'user', content: userPrompt }]

    for (let i = 0; i < maxIterations; i++) {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages,
        tools: tools.getSchemas(),
      })

      if (response.stop_reason === 'end_turn') {
        // Claude finished reasoning — parse final JSON
        const text = response.content.find(b => b.type === 'text')?.text ?? '{}'
        return JSON.parse(text) as ThinkingOutput
      }

      if (response.stop_reason === 'tool_use') {
        // Claude wants to call a tool mid-reasoning
        const toolCalls = response.content.filter((b): b is ToolUseBlock => b.type === 'tool_use')
        const results = await Promise.all(
          toolCalls.map(async block => ({
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify(await tools.execute(block.name, block.input as Record<string, unknown>)),
          }))
        )

        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user', content: results })
      }
    }

    throw new Error('ReAct loop exceeded max iterations')
  }
}
```

**Key difference from current approach:**
- `cache_control: { type: 'ephemeral' }` on system prompt → Anthropic caches it for 5 min
- Single loop instead of think() + decide() = two calls → one streaming conversation
- Claude can call `get_price` during reasoning and see the result before deciding

Keep `engine/providers/openai-compat.ts` as a thin wrapper for DeepSeek/Qwen/OpenAI (they
don't have native tool_use in the same way). This means Claude gets the full engine, others
get the existing behavior — no regression.

---

### Phase 3 — Tool Registry (clean replacement, ~1 hour)

**Current problem:** `getTool(name)` is a plain function returning an object. No schema attached,
no way to pass schemas to the Claude API.

Create `engine/tools/registry.ts`:
```ts
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js'

export interface EngineTool {
  schema: Tool                                           // fed to Claude API
  execute(args: Record<string, unknown>): Promise<unknown>
}

export class ToolRegistry {
  private tools = new Map<string, EngineTool>()

  register(tool: EngineTool): this {
    this.tools.set(tool.schema.name, tool)
    return this
  }

  getSchemas(): Tool[] {
    return [...this.tools.values()].map(t => t.schema)
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name)
    if (!tool) throw new Error(`Unknown tool: ${name}`)
    return tool.execute(args)
  }
}
```

Migrate `open-trade.tool.ts`, `close-trade.tool.ts`, `get-price.tool.ts` to implement
`EngineTool` (add `schema` property with the JSON schema Claude needs). Logic stays the same —
just wrapping it in the new interface.

---

### Phase 4 — Decision Engine + Risk Gates (~1.5 hours)

**This is the fix for "risk params stored but never enforced."**

Create `engine/decision/risk-gates.ts`:
```ts
// Enforces agent.maxLeverage, agent.stopLossPct, agent.spendLimit
// Called BEFORE executeDecision(), returns null if any gate fails

export function checkRiskGates(
  decision: ThinkingOutput,
  agentConfig: RiskConfig,
  currentDailyPnl: number,
): { allowed: boolean; reason?: string } {
  const args = decision.args ?? {}

  // 1. Leverage gate
  if (args.leverage && Number(args.leverage) > agentConfig.maxLeverageX) {
    return { allowed: false, reason: `Leverage ${args.leverage}x exceeds max ${agentConfig.maxLeverageX}x` }
  }

  // 2. Position size gate
  if (args.size && Number(args.size) > agentConfig.spendLimitUsd) {
    return { allowed: false, reason: `Size $${args.size} exceeds spend limit $${agentConfig.spendLimitUsd}` }
  }

  // 3. Daily loss gate
  if (currentDailyPnl < -agentConfig.maxDailyLossUsd) {
    return { allowed: false, reason: `Daily loss $${currentDailyPnl} exceeded limit` }
  }

  // 4. Confidence gate (higher risk → higher confidence required)
  const minConf = agentConfig.confidenceThresholds[decision.riskLevel]
  if (decision.confidence < minConf) {
    return { allowed: false, reason: `Confidence ${decision.confidence} < ${minConf} for ${decision.riskLevel} risk` }
  }

  return { allowed: true }
}
```

Create `engine/decision/circuit-breaker.ts` — straight port from the guide's `CircuitBreaker`
class. No changes needed, it's a clean standalone class.

Create `engine/decision/decision-engine.ts`:
```ts
export class DecisionEngine {
  constructor(
    private readonly circuitBreaker: CircuitBreaker,
  ) {}

  evaluate(thinking: ThinkingOutput, agent: Agent): TradeDecision | null {
    // 1. Circuit breaker
    const { canTrade, reason } = this.circuitBreaker.canTrade()
    if (!canTrade) {
      console.log(`[${agent.name}] circuit breaker: ${reason}`)
      return null
    }

    // 2. Risk gates
    const riskConfig = buildRiskConfig(agent)
    const gate = checkRiskGates(thinking, riskConfig, this.circuitBreaker.getDailyPnl())
    if (!gate.allowed) {
      console.log(`[${agent.name}] risk gate: ${gate.reason}`)
      return null
    }

    // 3. No tool = HOLD
    if (!thinking.tool) return null

    return {
      tool: thinking.tool,
      args: thinking.args ?? {},
      confidence: thinking.confidence,
      riskLevel: thinking.riskLevel,
      reasoning: thinking.reasoning,
      expectedPnlUsd: 0,  // filled by tool after execution
    }
  }

  recordResult(pnlUsd: number): void {
    this.circuitBreaker.recordTradeResult(pnlUsd)
  }
}
```

---

### Phase 5 — Thinking Engine (ReAct orchestrator, ~1 hour)

Create `engine/thinking/thinking-engine.ts`:

```ts
// Replaces the two-call think() + decide() pattern with a single ReAct loop.
// For Claude: uses AnthropicProvider (native SDK, prompt caching).
// For others: falls back to openai-compat provider (existing behavior).

export class ThinkingEngine {
  constructor(
    private readonly provider: AnthropicProvider | OpenAICompatProvider,
    private readonly tools: ToolRegistry,
    private readonly contextBuilder: ContextBuilder,
  ) {}

  async run(agent: Agent): Promise<ThinkingOutput> {
    const systemPrompt = buildSystemPrompt(agent)
    const context = await this.contextBuilder.build(agent)

    if (this.provider instanceof AnthropicProvider) {
      // Full ReAct loop — Claude can call tools during reasoning
      return this.provider.runReActLoop(systemPrompt, context, this.tools)
    }

    // Existing two-call flow for non-Claude providers
    const thinking = await this.provider.think(systemPrompt, context)
    return this.provider.decide(systemPrompt, context, thinking)
  }
}
```

---

### Phase 6 — Memory Distillation (~1 hour)

Create `engine/memory/distill.ts`:
```ts
// Run as a cron job (daily or every N cycles per agent).
// Takes the last 20 episodic memories → asks Claude to distill insights →
// stores as a single 'reflection' memory entry in agentMemory table.
// No Qdrant needed — just PostgreSQL.

export async function distillAgentMemory(agentId: string): Promise<void> {
  const recent = await db.query.agentMemory.findMany({
    where: eq(agentMemory.agentId, agentId),
    orderBy: desc(agentMemory.createdAt),
    limit: 20,
  })

  if (recent.length < 5) return  // not enough data yet

  const memories = recent.map(m => m.content).join('\n\n')

  const insight = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',   // cheap model for summarization
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Summarize these agent trading memories into 3-5 actionable lessons.
                Focus on: what worked, what failed, market conditions that mattered.
                Be concise. Output plain text, no JSON.\n\n${memories}`,
    }],
  })

  await db.insert(agentMemory).values({
    id: randomUUID(),
    agentId,
    type: 'reflection',
    content: insight.content[0].text,
    createdAt: new Date(),
  })
}
```

Update `engine/memory/memory-store.ts` to load reflections first (semantic) then recent
episodic — so the context always starts with distilled wisdom before recent raw trades.

---

### Phase 7 — Agent Loop Wiring (~30 min)

Create `engine/agent-loop.ts` — this replaces `processAgent()` in `agent-engine-v2.ts`:

```ts
export async function runAgentCycle(agent: Agent, engine: EngineServices): Promise<void> {
  const { thinking, decision, tools, memory } = engine

  // 1. Think (ReAct loop)
  const thinkingOutput = await thinking.run(agent)
  await memory.store(agent.id, 'reasoning', thinkingOutput.reasoning)

  // 2. Evaluate against risk gates + circuit breaker
  const tradeDecision = decision.evaluate(thinkingOutput, agent)
  if (!tradeDecision) return

  // 3. Execute tool
  const result = await tools.execute(tradeDecision.tool, tradeDecision.args)

  // 4. Record outcome
  await memory.store(agent.id, 'execution', JSON.stringify(result))
  decision.recordResult(result.pnlUsd ?? 0)

  // 5. Feed event + WebSocket broadcast (same as current)
  await createFeedEvent(agent, tradeDecision, result)
  broadcast(agent.id, { type: 'decision', data: { tradeDecision, result } })
}
```

Update `engine/index.ts` to start the interval loop calling `runAgentCycle()` per active agent.
Delete `services/agent-engine-v2.ts` once all agents are confirmed working.

---

## Before vs. After Summary

| | Current | New Engine |
|---|---|---|
| **Claude integration** | OpenAI shim (no caching, no native tool_use) | Native `@anthropic-ai/sdk` with `cache_control` |
| **API calls per cycle** | 2 (think + decide) | 1 ReAct loop (n tool calls within it) |
| **Token cost (Claude)** | Full price every call | ~80% cheaper via prompt cache |
| **Risk enforcement** | None (params stored, ignored) | `checkRiskGates()` blocks every bad trade |
| **Circuit breaker** | None | Consecutive loss counter + daily loss limit + cooldown |
| **Tool use** | Tool decided after reasoning, not during | Claude calls tools mid-reasoning, sees results |
| **Memory** | Last 5 raw memories, no summarization | Recent episodic + periodic reflection distillation |
| **Code organization** | 220-line monolith + scattered services | Composable classes, each independently testable |
| **Adding a new tool** | Edit agent-engine-v2.ts | Create a file in `engine/tools/`, call `registry.register()` |
| **Adding a new provider** | Add a case in provider.ts | Create a file in `engine/providers/`, implement interface |

---

## Execution Order

1. `engine/types.ts` + `engine/index.ts` shell — no behavior change yet
2. `engine/tools/registry.ts` + migrate existing tools — no behavior change
3. `engine/providers/anthropic.ts` — Claude agents now use native SDK
4. `engine/decision/circuit-breaker.ts` + `risk-gates.ts` + `decision-engine.ts`
5. `engine/thinking/thinking-engine.ts` + `context-builder.ts`
6. `engine/agent-loop.ts` — wire everything together
7. `engine/memory/distill.ts` — add as cron, non-blocking
8. Delete `services/agent-engine-v2.ts`, `services/models/`

Each phase is independently deployable — you can ship Phase 3 (Claude native) before Phase 4
(risk gates) and get immediate value without waiting for the full refactor.

---

## What Does NOT Change

- Database schema (`agentMemory`, `feedEvents`, `positions` tables) — untouched
- All API routes (`/api/agents`, `/api/feed`, `/api/positions`, etc.) — untouched
- Frontend — untouched
- Smart contracts — untouched
- Mock venue functions (MockPerp, MockPolymarket, MockLPV3) — tools call same functions
- Circle wallet integration — untouched

The engine is a contained internal refactor. The only external-facing change is that Claude
agents will produce richer reasoning (because they can call tools during thinking) and
risk-violating trades will be blocked (which may reduce feed events until agents calibrate).
