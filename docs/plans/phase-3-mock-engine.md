# 🔄 Phase 3 — Mock Trading Engine + Agent Scheduler

> **Goal:** Active agents trade autonomously — tools, decisions, execution on Arc, memory, feed  
> **Stack:** Hono background jobs + viem → Arc contracts  
> **Depends on:** Phase 1 (contracts) + Phase 2 (DB, contract service)

---

## 🏗️ Agent Architecture (Full)

```
┌─────────────────────────────────────────────────────────┐
│                      AGENT                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Identity  │ │   Soul   │ │  Memory  │ │ Session  │  │
│  │ ERC-8004  │ │ On-chain │ │ Decision │ │ Prompt+  │  │
│  │ NFT       │ │ Rep      │ │ Log      │ │ Config   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐                              │
│  │  Tools   │ │  Skills  │                              │
│  │ Registry │ │ Perms    │                              │
│  └──────────┘ └──────────┘                              │
└─────────────────────────────────────────────────────────┘
```

### Agent Components

| Component | Storage | Fungsi |
|-----------|---------|--------|
| **Identity** | ERC-8004 on Arc + `agents` table | Agent punya on-chain NFT, builder code |
| **Soul** | ERC-8004 ReputationRegistry | Track record ga bisa dihapus |
| **Memory** | `agent_memory` table | Append-only: decisions, reasoning, outcomes |
| **Session** | `agent_sessions` table | System prompt, model config, conversation state |
| **Tools** 🆕 | `agent_tools` table + handlers | Function calling — agent bisa execute actions |
| **Skills** | `agents.skills` JSON + `skills` table | Domain capabilities the agent is allowed to use |

---

## 🛠️ Agent Tools (🆕)

### Tool Registry (DB Table)

```typescript
export const agentTools = pgTable('agent_tools', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  toolName: text('tool_name').notNull(),  // e.g. "get_price", "open_trade"
  enabled: text('enabled').default('true'),
  config: text('config'),                  // JSON: venue-specific config
  createdAt: timestamp('created_at').defaultNow(),
})
```

### Built-in Tool Definitions

```typescript
export const TOOL_DEFINITIONS = [
  {
    name: 'get_price',
    description: 'Get current price for a trading pair',
    parameters: {
      type: 'object',
      properties: {
        pair: { type: 'string', enum: ['BTC/USD', 'ETH/USD', 'SOL/USD'] },
      },
      required: ['pair'],
    },
  },
  {
    name: 'open_trade',
    description: 'Open a new trading position',
    parameters: {
      type: 'object',
      properties: {
        venue: { type: 'string', enum: ['perp', 'prediction', 'lp'] },
        market: { type: 'string' },
        side: { type: 'string' },
        size: { type: 'number' },
        leverage: { type: 'number' },
      },
      required: ['venue', 'market', 'side', 'size'],
    },
  },
  {
    name: 'close_trade',
    description: 'Close an existing position',
    parameters: {
      type: 'object',
      properties: {
        positionId: { type: 'string' },
      },
      required: ['positionId'],
    },
  },
  {
    name: 'analyze_sentiment',
    description: 'Analyze market sentiment from recent data',
    parameters: {
      type: 'object',
      properties: {
        pair: { type: 'string' },
        source: { type: 'string', enum: ['price_action', 'volume'] },
      },
      required: ['pair', 'source'],
    },
  },
  {
    name: 'check_pnl',
    description: 'Check current PnL for an open position',
    parameters: {
      type: 'object',
      properties: {
        positionId: { type: 'string' },
      },
      required: ['positionId'],
    },
  },
]
```

### Tool Execution Flow

```
Agent decides to call tool:
  1. Agent sends: { tool: "open_trade", args: { venue: "perp", market: "BTC-PERP", side: "LONG", size: 5000, leverage: 3 } }
  2. Decision Engine routes to ToolHandler
  3. ToolHandler.validate(args) — check against ToolDefinition.parameters
  4. ToolHandler.execute(args) — call contract or API
  5. Return result: { success: true, positionId: "1", txHash: "0x..." }
  6. Save result to agent_memory
  7. Feed broadcast
```

---

## ⏰ Cron Scheduler Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     CRON SCHEDULER                               │
│  setInterval — runs FOREVER, error-proof                         │
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗    │
│  ║  EVERY 60s: MarketDataService                           ║    │
│  ║  └─ fetch CoinGecko → updatePrice() on Arc              ║    │
│  ║  └─ fetch Polymarket odds → createMarket() on Arc       ║    │
│  ╚══════════════════════════════════════════════════════════╝    │
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗    │
│  ║  EVERY 30s: AgentScheduler                              ║    │
│  ║  └─ for each active agent:                              ║    │
│  ║     ├─ load market data                                 ║    │
│  ║     ├─ load agent memory (last 5)                       ║    │
│  ║     ├─ call decision engine → decide                    ║    │
│  ║     ├─ if trade: execute via tools → Arc                ║    │
│  ║     ├─ save to agent_memory                             ║    │
│  ║     └─ broadcast to feed                                ║    │
│  ╚══════════════════════════════════════════════════════════╝    │
│                                                                  │
│  ╔══════════════════════════════════════════════════════════╗    │
│  ║  EVERY 60s: PnL Watcher                                ║    │
│  ║  └─ check open positions                                ║    │
│  ║     ├─ get current price from Oracle                    ║    │
│  ║     └─ if price moved > threshold → close + save        ║    │
│  ╚══════════════════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────────────────┘
```

### Cron Safety Pattern

```typescript
function startCron(name: string, intervalMs: number, fn: () => Promise<void>) {
  console.log(`⏰ Starting cron: ${name} (every ${intervalMs}ms)`)

  async function run() {
    try {
      await fn()
    } catch (err) {
      console.error(`❌ Cron ${name} error:`, err)
      // Never stop the cron — always keep scheduling
    }
  }

  // Run immediately, then schedule
  run()
  setInterval(run, intervalMs)
}
```

---

## 📁 Files to Create

```
trivo-backend/src/services/
├── cron.ts                          # 🆕 Cron scheduler (all intervals)
├── market-data.service.ts           # 🆕 CoinGecko → SimpleOracle
├── decision-engine.service.ts       # 🆕 Trade decision + tool routing
├── tools/
│   ├── registry.ts                  # 🆕 Tool definitions + handler map
│   ├── get-price.tool.ts            # 🆕 get_price handler
│   ├── open-trade.tool.ts           # 🆕 open_trade handler
│   └── close-trade.tool.ts          # 🆕 close_trade handler
```

---

## 🧩 Task Breakdown

### Task 3.1: Tool Registry

**File:** `src/services/tools/registry.ts`

```typescript
// Tool definition
export interface ToolDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required: string[]
  }
}

// Tool handler
export interface ToolHandler {
  definition: ToolDefinition
  execute: (agentId: string, args: Record<string, unknown>) => Promise<ToolResult>
}

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  txHash?: string
}

// Registry
const toolRegistry = new Map<string, ToolHandler>()

export function registerTool(handler: ToolHandler) {
  toolRegistry.set(handler.definition.name, handler)
}

export function getTool(name: string): ToolHandler | undefined {
  return toolRegistry.get(name)
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values()).map(h => h.definition)
}
```

### Task 3.2: Tool Handlers

**Files:** `src/services/tools/get-price.tool.ts`, `open-trade.tool.ts`, `close-trade.tool.ts`

```typescript
// get-price.tool.ts
export const getPriceTool: ToolHandler = {
  definition: {
    name: 'get_price',
    description: 'Get current price for a trading pair',
    parameters: {
      type: 'object',
      properties: { pair: { type: 'string' } },
      required: ['pair'],
    },
  },
  async execute(agentId, args) {
    const price = await getPrice(args.pair as string)
    return { success: true, data: { pair: args.pair, price } }
  },
}
```

### Task 3.3: Market Data Service

**File:** `src/services/market-data.service.ts`

- Fetch CoinGecko prices every 60s
- Push to SimpleOracle via `updatePrice()`
- Fetch Polymarket data (mock)
- Create markets on MockPolymarket

### Task 3.4: Decision Engine

**File:** `src/services/decision-engine.service.ts`

- Load agent session + memory
- Build prompt with market data + available tools
- Call AI model or use rule-based fallback
- Return structured decision with tool calls

### Task 3.5: Agent Scheduler + Cron

**File:** `src/services/cron.ts`

- Start all cron jobs on boot
- Error-proof: catch errors, never stop the interval
- Market data: every 60s
- Agent processing: every 30s
- PnL watcher: every 60s

### Task 3.6: +DB table

Add `agent_tools` table to schema.

---

## 🗺️ Implementation Order

| # | Task | Files | Est |
|---|------|-------|-----|
| 3.1 | Tool Registry + handlers | `tools/registry.ts`, `tools/*.tool.ts` | 30m |
| 3.2 | Market Data Service | `services/market-data.service.ts` | 20m |
| 3.3 | Decision Engine | `services/decision-engine.service.ts` | 30m |
| 3.4 | Agent Scheduler + Cron | `services/cron.ts` | 30m |
| 3.5 | DB: agent_tools table | `lib/schema.ts` | 5m |
| 3.6 | Integrate in index.ts | `index.ts` | 10m |
| 3.7 | Tests | `src/__tests__/cron.test.ts`, `tools.test.ts` | 20m |
| | **Total** | | **~2.5h** |
