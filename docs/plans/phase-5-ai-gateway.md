# 🤖 Phase 5 — AI Model Gateway + Agent Engine v2

> **Goal:** Agent runs every 10s, thinks before deciding, saves reasoning, real-time WS, backtesting  
> **Stack:** OpenAI-compatible SDK + WebSocket + Hono  
> **Depends on:** Phase 2 (DB) + Phase 3 (Tools/Cron) + Phase 4 (Wallet)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AGENT ENGINE V2                              │
│                                                                     │
│  setInterval(10s):                                                  │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐    │
│    │  THINK        │───►│  DECIDE      │───►│  EXECUTE         │    │
│    │  "Market is   │    │  "Open LONG  │    │  via tools → Arc │    │
│    │  bullish..."  │    │   BTC $5k"   │    │  tx hash: 0x... │    │
│    └──────┬───────┘    └──────┬───────┘    └────────┬─────────┘    │
│           │                  │                       │              │
│           ▼                  ▼                       ▼              │
│    ┌─────────────────────────────────────────────────────────┐    │
│    │                 SAVE TO AGENT MEMORY                     │    │
│    │  { type: 'reasoning', content: 'Market is bullish...' } │    │
│    │  { type: 'decision',  tool: 'open_trade', args: ... }   │    │
│    │  { type: 'result',    txHash: '0x...', pnl: ... }      │    │
│    └─────────────────────────────────────────────────────────┘    │
│                                                                     │
│    ┌─────────────────────────────────────────────────────────┐    │
│    │                 BROADCAST VIA WEBSOCKET                  │    │
│    │  { event: 'thinking', agentId, content: '...' }        │    │
│    │  { event: 'decision', agentId, decision: {...} }       │    │
│    │  { event: 'execution', agentId, txHash: '...' }       │    │
│    └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Agent Loop (10s)

```
THINK (1-2s)
  ├─ Load market data (Oracle prices)
  ├─ Load agent memory (last 10 entries)
  ├─ Load wallet balance
  └─ Call LLM: "Given your strategy, market data, and past decisions, what do you think?"

DECIDE (1-2s)
  └─ Call LLM: "Based on your thinking, what action do you take?"
  └─ Structured output: { tool: "open_trade" | "close_trade" | "skip", args: {...} }

EXECUTE (1-3s)
  ├─ If trade: call contract via tools → Arc
  └─ Save result + txHash to memory

SAVE + BROADCAST (0.1s)
  ├─ Save thinking + decision + result to agent_memory
  └─ WS broadcast to subscribed clients
```

---

## 📁 Files to Create/Modify

```
trivo-backend/src/
├── services/
│   ├── models/
│   │   ├── provider.ts          # 🆕 OpenAI-compatible interface
│   │   ├── openai-provider.ts   # 🆕 DeepSeek/Claude/OpenAI/Qwen via OpenAI SDK
│   │   └── byok-provider.ts     # 🆕 BYOK custom endpoint
│   ├── agent-engine-v2.ts       # 🆕 10s loop, think→decide→execute
│   ├── backtest.service.ts      # 🆕 Backtest engine
│   ├── thinking.service.ts      # 🆕 Thinking trace management
│   └── ws.ts                    # 🆕 WebSocket server
├── routes/
│   ├── backtest.ts              # 🆕 Backtest API
│   └── ws.ts                    # 🆕 WebSocket route
└── cron.ts                      # 📝 Update: 10s instead of 30s
```

---

## 🧩 Task Breakdown

### Task 5.1: OpenAI-Compatible Provider

**File:** `services/models/provider.ts`

```typescript
export interface LLMProvider {
  name: string
  think(systemPrompt: string, context: string): Promise<string>
  decide(systemPrompt: string, context: string, thinking: string): Promise<StructuredDecision>
}

export interface StructuredDecision {
  reasoning: string
  confidence: number
  tool: string | null
  args: Record<string, unknown> | null
}
```

**File:** `services/models/openai-provider.ts`

```typescript
import OpenAI from 'openai'

export function createOpenAIProvider(config: {
  apiKey: string
  baseURL: string  // e.g. https://api.deepseek.com or https://api.openai.com
  model: string     // e.g. deepseek-chat, gpt-4o, claude-sonnet-4
}): LLMProvider {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL })

  return {
    name: config.model,
    async think(systemPrompt, context) {
      const res = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze the current situation:\n\n${context}\n\nWhat are you thinking?` }
        ],
        temperature: 0.7,
      })
      return res.choices[0]?.message?.content ?? ''
    },

    async decide(systemPrompt, context, thinking) {
      const res = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'assistant', content: thinking },
          { role: 'user', content: `Based on your analysis, what action do you take?\n\n${context}\n\nRespond with JSON: { "reasoning": "...", "confidence": 0.75, "tool": "open_trade" | null, "args": { "venue": "perp", ... } | null }` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      })
      return JSON.parse(res.choices[0]?.message?.content ?? '{}')
    },
  }
}
```

### Task 5.2: WebSocket Server

**File:** `services/ws.ts`

```typescript
import { Hono } from 'hono'
import { upgradeWebSocket } from '@hono/node-server/ws'

// Store active connections per agent
const agentConnections = new Map<string, Set<WebSocket>>()

export function subscribeAgent(agentId: string, ws: WebSocket) {
  if (!agentConnections.has(agentId)) {
    agentConnections.set(agentId, new Set())
  }
  agentConnections.get(agentId)!.add(ws)
  ws.addEventListener('close', () => {
    agentConnections.get(agentId)?.delete(ws)
  })
}

export function broadcastAgentEvent(agentId: string, event: AgentEvent) {
  const connections = agentConnections.get(agentId)
  if (!connections) return
  for (const ws of connections) {
    ws.send(JSON.stringify(event))
  }
}

export const wsRoutes = new Hono()
wsRoutes.get('/ws/agent/:id', upgradeWebSocket((c) => {
  const agentId = c.req.param('id')
  return {
    onOpen(_, ws) {
      subscribeAgent(agentId, ws as any)
      ws.send(JSON.stringify({ event: 'connected', agentId }))
    },
  }
}))
```

### Task 5.3: Agent Engine v2 (10s loop)

**File:** `services/agent-engine-v2.ts`

```typescript
export async function startAgentEngineV2() {
  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })
  
  setInterval(async () => {
    const agents = await db.select().from(agentsTable).where(eq(agentsTable.status, 'active'))
    
    for (const agent of agents) {
      // 1. Load context
      const marketData = await getMarketContext()
      const memory = await getRecentMemory(agent.id)
      const balance = await getWalletBalance(agent.circleWalletAddress ?? '')
      
      // 2. Build system prompt from agent config
      const systemPrompt = buildSystemPrompt(agent)
      
      // 3. Build context
      const context = buildContext(marketData, memory, balance)
      
      // 4. THINK
      const thinking = await callLLM('think', systemPrompt, context)
      await saveMemory(agent.id, 'reasoning', thinking)
      broadcastAgentEvent(agent.id, { event: 'thinking', content: thinking })
      
      // 5. DECIDE
      const decision = await callLLM('decide', systemPrompt, context, thinking)
      await saveMemory(agent.id, 'decision', JSON.stringify(decision))
      broadcastAgentEvent(agent.id, { event: 'deciding', decision })
      
      // 6. EXECUTE
      if (decision.tool) {
        const result = await executeTool(agent.id, decision.tool, decision.args)
        await saveMemory(agent.id, 'result', JSON.stringify(result))
        broadcastAgentEvent(agent.id, { event: 'execution', result })
      }
    }
  }, 10_000)
}
```

### Task 5.4: Backtest Engine

**File:** `services/backtest.service.ts`

- User provides: agent config, date range, initial capital
- Engine replays historical price data
- Runs agent decision loop (without executing on-chain)
- Returns: PnL curve, Sharpe, max drawdown, win rate, trade history

### Task 5.5: NL Training (Strategy Update)

```
POST /api/strategy/compile
  Input: "Buy BTC when price drops below $70k and sell when above $75k"
  → LLM parses into structured rules
  → Save to agent.strategy field
  → Next agent loop picks up new strategy
```

---

## 🔄 Updated Cron Schedule

| Cron | Interval | Task |
|------|----------|------|
| Market Data | 60s | CoinGecko → Oracle |
| Agent Engine | **10s** (was 30s) | Think → Decide → Execute |
| PnL Watcher | 60s | Close positions > threshold |

---

## 📦 Dependencies

```bash
pnpm add openai                          # OpenAI-compatible SDK
pnpm add @hono/node-server@latest        # For WebSocket support
```
