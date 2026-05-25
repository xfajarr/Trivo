# End-to-End Real Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Trivo's real demo flow work end-to-end: create agent, create Circle agent wallet, fund/transfer to agent wallet, show real chart candles/trading markers, remove backend engine drift, and refresh API docs.

**Architecture:** Keep the existing stack and fix the truth gaps instead of rebuilding. Backend gets clear service boundaries for agent provisioning, wallet transfers, OHLC market data, and OpenAPI docs; frontend uses those endpoints directly; legacy engine code is quarantined or removed after tests confirm only `src/engine/*` is active.

**Tech Stack:** Hono + TypeScript + Drizzle + viem + Circle Developer-Controlled Wallets SDK + Privy + TanStack Start/React + TanStack Query + lightweight-charts + Foundry contracts on Arc Testnet.

---

## Scope and Non-Negotiables

This plan covers five connected workstreams:

1. **Agent creation bug:** agent creation must independently attempt ERC-8004 registration and Circle wallet creation.
2. **Wallet fund/transfer:** deferred for this pass.
3. **TradingView-style chart:** frontend chart must use real OHLC candles from backend, with trade markers overlaid from position history.
4. **Backend drift cleanup:** new `src/engine/*` is canonical; old `src/services/agent-engine-v2.ts` and old `src/services/tools/*` are marked legacy or removed after imports/tests prove unused.
5. **OpenAPI docs:** docs must include actual current routes used by frontend.
6. **Wallet transfer/UI scope is deferred:** backend deposit/transfer and frontend wallet funding UI are explicitly out of scope for this pass.

Definition of done:

- Creating an agent returns an agent with `circleWalletId`/`circleWalletAddress` when Circle config is valid.
- Agent detail chart renders backend candles, not randomly generated OHLC.

---

## File Structure Plan

### Backend files to modify

- `trivo-backend/src/routes/agents.ts`
  - Fix provisioning order.
  - Add safe status metadata in agent response.

- `trivo-backend/src/services/market-data.service.ts`
  - Add reusable OHLC candle fetch/build method.
  - Prefer real provider data if available; fall back to deterministic candles, not random candles.

- `trivo-backend/src/routes/market.ts`
  - New route group for `GET /api/market/candles`.

- `trivo-backend/src/index.ts`
  - Mount `marketRoutes`.
  - Ensure only new engine starts.

- `trivo-backend/src/lib/openapi.ts`
  - Add docs for `/api/pnl`, `/api/chat`, `/api/positions/history`, and market candles.

- `trivo-backend/src/services/agent-engine-v2.ts`
  - Either delete or add a top-level deprecation guard/comment if deletion is too risky.

- `trivo-backend/src/services/tools/*`
  - Delete if no imports remain, or mark legacy and remove from barrel exports.

- Backend tests:
  - `trivo-backend/src/__tests__/agents.test.ts`
  - `trivo-backend/src/__tests__/wallets.test.ts`
  - `trivo-backend/src/__tests__/market.test.ts`
  - update existing tests if route mounting changes.

### Frontend files to modify

- `trivo-frontend/src/lib/api.ts`
  - Add typed market candles API.

- `trivo-frontend/src/hooks/useMarketCandles.ts`
  - New hook for chart candles.

- `trivo-frontend/src/components/AgentChart.tsx`
  - Remove random candle generation.
  - Render candles returned by backend.
  - Overlay trade markers from position history.

- `trivo-frontend/src/routes/agent.$id.tsx`
  - Pass agent symbol/timeframe/position history to chart.

### Contract files

No contract changes are required for this end-to-end demo unless real USDC settlement is added. For this plan, contracts remain mock execution primitives. Verification still runs:

- `trivo-contracts`: `forge test`

---

## Task 1: Fix Agent Creation Provisioning Order

**Files:**
- Modify: `trivo-backend/src/routes/agents.ts`
- Test: `trivo-backend/src/__tests__/agents.test.ts`

### Objective

Agent creation must always attempt Circle wallet creation, regardless of ERC-8004 success/failure. ERC-8004 and wallet provisioning are independent non-blocking provisioning steps.

- [ ] **Step 1: Write failing tests for independent provisioning**

Create `trivo-backend/src/__tests__/agents.test.ts` with module-level mocks. The tests must prove wallet creation runs when ERC-8004 succeeds and when ERC-8004 fails.

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const insertValues = vi.fn().mockResolvedValue(undefined)
const updateSet = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const selectWhere = vi.fn().mockResolvedValue([
  {
    id: 'agent-1',
    ownerId: 'user-1',
    name: 'Test Agent',
    handle: 'test',
    status: 'active',
    circleWalletId: 'wallet-1',
    circleWalletAddress: '0xabc',
  },
])

vi.mock('../lib/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: selectWhere })) })),
  },
}))

const registerAgent = vi.fn()
const createAgentWallet = vi.fn()

vi.mock('../engine/services/erc8004.service.js', () => ({
  erc8004Service: {
    createAgentMetadata: vi.fn(() => ({ name: 'Test Agent' })),
    uploadMetadata: vi.fn(() => 'data:application/json;base64,eyJuYW1lIjoiVGVzdCJ9'),
    registerAgent,
  },
}))

vi.mock('../services/wallet.service.js', () => ({
  createAgentWallet,
}))

vi.mock('../middleware/auth', () => ({
  authMiddleware: async (c: any, next: any) => {
    c.set('userId', 'user-1')
    await next()
  },
}))

describe('agent creation provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertValues.mockResolvedValue(undefined)
    updateSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    selectWhere.mockResolvedValue([{ id: 'agent-1', ownerId: 'user-1', name: 'Test Agent' }])
    createAgentWallet.mockResolvedValue({ walletId: 'wallet-1', walletAddress: '0xabc' })
  })

  it('creates a Circle wallet when ERC-8004 registration succeeds', async () => {
    registerAgent.mockResolvedValue({ agentId: '123', txHash: '0xerc' })
    const { agentRoutes } = await import('../routes/agents')

    const res = await agentRoutes.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({
        name: 'Test Agent',
        handle: 'test',
        modelProvider: 'asi1-mini',
        strategy: 'Trade BTC momentum',
        skills: 'perp',
      }),
    })

    expect(res.status).toBe(201)
    expect(registerAgent).toHaveBeenCalledTimes(1)
    expect(createAgentWallet).toHaveBeenCalledTimes(1)
    expect(createAgentWallet).toHaveBeenCalledWith('Test Agent')
  })

  it('still creates a Circle wallet when ERC-8004 registration fails', async () => {
    registerAgent.mockRejectedValue(new Error('registry unavailable'))
    const { agentRoutes } = await import('../routes/agents')

    const res = await agentRoutes.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({
        name: 'Test Agent',
        handle: 'test',
        modelProvider: 'asi1-mini',
        strategy: 'Trade BTC momentum',
        skills: 'perp',
      }),
    })

    expect(res.status).toBe(201)
    expect(registerAgent).toHaveBeenCalledTimes(1)
    expect(createAgentWallet).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
cd trivo-backend
pnpm exec vitest run src/__tests__/agents.test.ts
```

Expected before implementation:

- First test fails because wallet creation is only inside ERC-8004 `catch`.

- [ ] **Step 3: Move wallet creation outside ERC-8004 catch**

In `trivo-backend/src/routes/agents.ts`, replace the provisioning block around lines 64-98 with this structure:

```ts
  // 🆔 ERC-8004: Register agent identity on-chain (non-blocking)
  try {
    const metadata = erc8004Service.createAgentMetadata({
      name: data.name,
      description: data.strategy ?? 'AI trading agent on Trivo',
      strategy: data.strategy ?? '',
      skills: (data.skills ?? 'perp').split(','),
      riskParams: {
        maxLeverage: data.maxLeverage ?? '5',
        stopLossPct: data.stopLossPct ?? '10',
        spendLimit: data.spendLimit ?? '100',
      },
    })
    const metadataURI = erc8004Service.uploadMetadata(metadata)
    const { agentId: erc8004Id, txHash } = await erc8004Service.registerAgent(metadataURI)
    await db.update(agentsTable)
      .set({ erc8004TokenId: erc8004Id, erc8004TxHash: txHash, metadataUri: metadataURI })
      .where(eq(agentsTable.id, agentId))
    console.log(`🆔 ERC-8004 agent #${erc8004Id} registered: https://testnet.arcscan.app/tx/${txHash}`)
  } catch (err) {
    console.warn('⚠️ ERC-8004 registration failed (non-blocking):', (err as Error).message)
  }

  // 💳 Circle wallet: Create agent wallet independently from ERC-8004 (non-blocking)
  try {
    const wallet = await createAgentWallet(data.name || 'Agent')
    if (wallet) {
      await db.update(agentsTable)
        .set({ circleWalletId: wallet.walletId, circleWalletAddress: wallet.walletAddress })
        .where(eq(agentsTable.id, agentId))
      console.log(`💳 Wallet created for ${data.name}: ${wallet.walletAddress}`)
    }
  } catch (err) {
    console.warn('⚠️ Wallet creation failed (non-blocking):', (err as Error).message)
  }
```

- [ ] **Step 4: Run agent route test**

Run:

```bash
cd trivo-backend
pnpm exec vitest run src/__tests__/agents.test.ts
```

Expected:

- Both tests pass.

- [ ] **Step 5: Run backend typecheck**

Run:

```bash
cd trivo-backend
pnpm run typecheck
```

Expected:

- TypeScript passes with no errors.

- [ ] **Step 6: Commit**

```bash
git add trivo-backend/src/routes/agents.ts trivo-backend/src/__tests__/agents.test.ts
git commit -m "fix(agents): create wallet independently from erc8004"
```

---

## Out of Scope for This Pass

The following from the original plan are deferred and will not be implemented in this pass:

- Backend wallet deposit/transfer endpoints
- Frontend wallet funding/transfer UI wiring

The rest of this plan continues normally.

---

## Task 4: Add Backend Market Candles Endpoint

**Files:**
- Modify: `trivo-backend/src/services/market-data.service.ts`
- Create: `trivo-backend/src/routes/market.ts`
- Modify: `trivo-backend/src/index.ts`
- Test: `trivo-backend/src/__tests__/market.test.ts`

### Objective

Provide real/deterministic candle data from backend so frontend chart stops generating random OHLC locally.

### API Contract

```txt
GET /api/market/candles?symbol=BTC/USD&timeframe=1m&limit=120
```

Response:

```json
{
  "symbol": "BTC/USD",
  "timeframe": "1m",
  "candles": [
    { "time": 1760000000, "open": 65000, "high": 65100, "low": 64950, "close": 65050, "volume": 123.45 }
  ]
}
```

- [ ] **Step 1: Write market route tests**

Create `trivo-backend/src/__tests__/market.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

vi.mock('../services/market-data.service.js', () => ({
  getCandles: vi.fn(async (symbol: string, timeframe: string, limit: number) => ({
    symbol,
    timeframe,
    candles: Array.from({ length: limit }, (_, index) => ({
      time: 1_760_000_000 + index * 60,
      open: 100 + index,
      high: 101 + index,
      low: 99 + index,
      close: 100.5 + index,
      volume: 10 + index,
    })),
  })),
}))

describe('market routes', () => {
  it('returns candles with valid query params', async () => {
    const { marketRoutes } = await import('../routes/market')
    const res = await marketRoutes.request('/candles?symbol=BTC/USD&timeframe=1m&limit=10')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.symbol).toBe('BTC/USD')
    expect(body.timeframe).toBe('1m')
    expect(body.candles).toHaveLength(10)
    expect(body.candles[0]).toMatchObject({ open: 100, high: 101, low: 99, close: 100.5 })
  })

  it('rejects unsupported timeframe', async () => {
    const { marketRoutes } = await import('../routes/market')
    const res = await marketRoutes.request('/candles?symbol=BTC/USD&timeframe=9h&limit=10')
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run failing market tests**

```bash
cd trivo-backend
pnpm exec vitest run src/__tests__/market.test.ts
```

Expected:

- Fails because `routes/market.ts` does not exist.

- [ ] **Step 3: Add `getCandles` service**

In `trivo-backend/src/services/market-data.service.ts`, add:

```ts
export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface CandleResult {
  symbol: string
  timeframe: string
  candles: Candle[]
}

const timeframeSeconds: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
}

export async function getCandles(symbol: string, timeframe: string, limit: number): Promise<CandleResult> {
  const step = timeframeSeconds[timeframe]
  if (!step) throw new Error(`Unsupported timeframe: ${timeframe}`)

  const normalizedLimit = Math.min(Math.max(limit, 10), 500)
  const now = Math.floor(Date.now() / 1000)
  const currentPrice = await getMarketPrice(symbol)
  const safePrice = currentPrice > 0 ? currentPrice : 100

  const candles: Candle[] = []

  for (let index = normalizedLimit - 1; index >= 0; index--) {
    const time = now - index * step
    const drift = Math.sin((normalizedLimit - index) / 7) * safePrice * 0.003
    const open = safePrice + drift
    const close = safePrice + Math.sin((normalizedLimit - index + 1) / 7) * safePrice * 0.003
    const high = Math.max(open, close) * 1.0015
    const low = Math.min(open, close) * 0.9985

    candles.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number((100 + Math.abs(Math.sin(index)) * 250).toFixed(2)),
    })
  }

  return { symbol, timeframe, candles }
}
```

This is deterministic market-derived fallback, not random. If a real historical provider is available later, replace internals while preserving the same return type.

- [ ] **Step 4: Add market route**

Create `trivo-backend/src/routes/market.ts`:

```ts
import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCandles } from '../services/market-data.service.js'

export const marketRoutes = new Hono()

const candleQuerySchema = z.object({
  symbol: z.string().default('BTC/USD'),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']).default('1m'),
  limit: z.coerce.number().int().min(10).max(500).default(120),
})

marketRoutes.get('/candles', zValidator('query', candleQuerySchema), async (c) => {
  const { symbol, timeframe, limit } = c.req.valid('query')

  try {
    const result = await getCandles(symbol, timeframe, limit)
    return c.json(result)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400)
  }
})
```

- [ ] **Step 5: Mount route in `index.ts`**

In `trivo-backend/src/index.ts`, import and mount:

```ts
import { marketRoutes } from './routes/market.js'
```

Then add:

```ts
app.route('/api/market', marketRoutes)
```

Place it near other `/api/*` route mounts.

- [ ] **Step 6: Run market tests and typecheck**

```bash
cd trivo-backend
pnpm exec vitest run src/__tests__/market.test.ts
pnpm run typecheck
```

Expected:

- Tests and typecheck pass.

- [ ] **Step 7: Commit**

```bash
git add trivo-backend/src/services/market-data.service.ts trivo-backend/src/routes/market.ts trivo-backend/src/index.ts trivo-backend/src/__tests__/market.test.ts
git commit -m "feat(market): expose backend candle data"
```

---

## Task 5: Replace Frontend Random Chart Candles with Backend Candles

**Files:**
- Modify: `trivo-frontend/src/lib/api.ts`
- Create: `trivo-frontend/src/hooks/useMarketCandles.ts`
- Modify: `trivo-frontend/src/components/AgentChart.tsx`
- Modify: `trivo-frontend/src/routes/agent.$id.tsx`

### Objective

Chart should render backend OHLC data and overlay actual trade markers from backend history.

- [ ] **Step 1: Add market API client**

In `trivo-frontend/src/lib/api.ts`, add:

```ts
export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export const marketApi = {
  candles: (params: { symbol: string; timeframe: string; limit?: number }) =>
    api.get<{ symbol: string; timeframe: string; candles: Candle[] }>('/api/market/candles', { params }).then((r) => r.data),
}
```

- [ ] **Step 2: Add market candle hook**

Create `trivo-frontend/src/hooks/useMarketCandles.ts`:

```ts
import { useQuery } from '@tanstack/react-query'
import { marketApi } from '@/lib/api'

export function useMarketCandles(symbol: string, timeframe: string, limit = 160) {
  return useQuery({
    queryKey: ['market-candles', symbol, timeframe, limit],
    queryFn: () => marketApi.candles({ symbol, timeframe, limit }),
    refetchInterval: 15_000,
    staleTime: 10_000,
  })
}
```

- [ ] **Step 3: Update `AgentChart` props**

In `trivo-frontend/src/components/AgentChart.tsx`, remove local random OHLC generation and define props:

```ts
import type { Candle } from '@/lib/api'

type TradeMarker = {
  id: string
  side: 'long' | 'short' | 'yes' | 'no' | string
  status: string
  entryPrice?: string | number | null
  exitPrice?: string | number | null
  openedAt?: string | null
  closedAt?: string | null
}

type AgentChartProps = {
  candles: Candle[]
  trades: TradeMarker[]
  isLoading?: boolean
}
```

Convert candle data for lightweight-charts:

```ts
const chartCandles = candles.map((candle) => ({
  time: candle.time as any,
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
}))
```

Build markers from trades:

```ts
const markers = trades
  .filter((trade) => trade.openedAt)
  .map((trade) => ({
    time: Math.floor(new Date(trade.openedAt!).getTime() / 1000) as any,
    position: trade.side === 'short' || trade.side === 'no' ? 'aboveBar' : 'belowBar',
    color: trade.side === 'short' || trade.side === 'no' ? '#ef4444' : '#22c55e',
    shape: trade.side === 'short' || trade.side === 'no' ? 'arrowDown' : 'arrowUp',
    text: `${String(trade.side).toUpperCase()} ${trade.status}`,
  }))
```

If `isLoading`, render a skeleton/empty chart state. If `candles.length === 0`, render:

```tsx
<div className="flex h-[360px] items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-sm text-muted-foreground">
  Waiting for market candles...
</div>
```

- [ ] **Step 4: Wire route to hook**

In `trivo-frontend/src/routes/agent.$id.tsx`, infer symbol from positions or default:

```ts
const primarySymbol = positions?.[0]?.symbol ?? history?.[0]?.symbol ?? 'BTC/USD'
const [timeframe, setTimeframe] = useState('1m')
const candles = useMarketCandles(primarySymbol, timeframe, 160)
```

Pass into chart:

```tsx
<AgentChart
  candles={candles.data?.candles ?? []}
  trades={history ?? []}
  isLoading={candles.isLoading}
/>
```

If `AgentChart` owns timeframe selector today, either keep selector inside and call `onTimeframeChange`, or move selector to route. Do not keep random candles.

- [ ] **Step 5: Build frontend**

```bash
cd trivo-frontend
bun run build
```

Expected:

- Build passes.

- [ ] **Step 6: Commit**

```bash
git add trivo-frontend/src/lib/api.ts trivo-frontend/src/hooks/useMarketCandles.ts trivo-frontend/src/components/AgentChart.tsx trivo-frontend/src/routes/agent.\$id.tsx
git commit -m "feat(charts): render backend market candles"
```

---

## Task 6: Clean Backend Engine Drift

**Files:**
- Modify/Delete: `trivo-backend/src/services/agent-engine-v2.ts`
- Modify/Delete: `trivo-backend/src/services/tools/*`
- Modify: imports/barrels that reference old tools if any
- Test: existing backend test suite

### Objective

Make `src/engine/*` the only active trading engine. Remove or quarantine old engine paths to prevent accidental use.

- [ ] **Step 1: Find imports of legacy engine/tools**

Run:

```bash
cd trivo-backend
rg "agent-engine-v2|services/tools" src
```

Expected:

- Only legacy files or tests should reference these. `src/index.ts` should not start `agent-engine-v2`.

- [ ] **Step 2: If no runtime imports exist, delete legacy files**

Remove:

```bash
rm src/services/agent-engine-v2.ts
rm -rf src/services/tools
```

If tests import old tools directly, update those tests to import new engine tools:

```ts
import { openTradeTool } from '../engine/tools/open-trade'
import { closeTradeTool } from '../engine/tools/close-trade'
import { getPriceTool } from '../engine/tools/get-price'
```

- [ ] **Step 3: If deletion is too risky, mark legacy clearly**

If old tests still need migration and time is short, keep files but add this top-level guard comment to `agent-engine-v2.ts` and `services/tools/index.ts`:

```ts
/**
 * @deprecated Legacy engine path. Do not import from runtime code.
 * Canonical trading engine lives under src/engine/* and is started from src/index.ts.
 */
```

Also remove any barrel export that makes old tools easy to import from runtime.

- [ ] **Step 4: Run backend full check**

```bash
cd trivo-backend
pnpm run check
```

Expected:

- Typecheck, lint, tests pass.

- [ ] **Step 5: Commit**

If deleted:

```bash
git add trivo-backend/src
git commit -m "refactor(engine): remove legacy agent engine stack"
```

If deprecated only:

```bash
git add trivo-backend/src/services/agent-engine-v2.ts trivo-backend/src/services/tools
git commit -m "chore(engine): mark legacy engine stack deprecated"
```

---

## Task 7: Refresh OpenAPI Docs for Actual Routes

**Files:**
- Modify: `trivo-backend/src/lib/openapi.ts`

### Objective

`/api/docs.json` must reflect frontend-called and newly added endpoints.

- [ ] **Step 1: Add missing route specs**

In `trivo-backend/src/lib/openapi.ts`, add path entries for:

```txt
GET  /api/pnl/agents/{id}
GET  /api/positions/history/{agentId}
POST /api/chat
POST /api/chat/agent/{id}
GET  /api/wallets/usdc/{address}
POST /api/wallets/transfer
GET  /api/market/candles
GET  /api/models
GET  /api/models/agents/{id}
PUT  /api/models/agents/{id}
```

Use these response schemas inline:

```ts
const errorResponse = {
  description: 'Error response',
  content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } },
}

const okObjectResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
})
```

For `/api/market/candles`, include explicit candle schema:

```ts
{
  type: 'object',
  properties: {
    symbol: { type: 'string' },
    timeframe: { type: 'string' },
    candles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          time: { type: 'number' },
          open: { type: 'number' },
          high: { type: 'number' },
          low: { type: 'number' },
          close: { type: 'number' },
          volume: { type: 'number' },
        },
      },
    },
  },
}
```

- [ ] **Step 2: Verify docs endpoint compiles**

Run:

```bash
cd trivo-backend
pnpm run typecheck
```

Expected:

- Pass.

- [ ] **Step 3: Optionally inspect docs JSON locally**

Start backend:

```bash
cd trivo-backend
pnpm run dev
```

In another terminal:

```bash
curl http://localhost:3000/api/docs.json | python3 -m json.tool >/tmp/trivo-openapi.json
```

Expected:

- JSON formats successfully.
- `/api/market/candles`, `/api/wallets/transfer`, `/api/chat/agent/{id}` exist in `/tmp/trivo-openapi.json`.

- [ ] **Step 4: Commit**

```bash
git add trivo-backend/src/lib/openapi.ts
git commit -m "docs(api): document active app endpoints"
```

---

## Task 8: End-to-End Manual Demo Verification

**Files:**
- No code changes unless bugs are found.

### Objective

Verify the actual user journey works from UI to backend to chain/service integrations.

- [ ] **Step 1: Start backend**

```bash
cd trivo-backend
pnpm run dev
```

Expected logs:

```txt
Server running
📡 Starting real-time price feed...
Agent engine started
```

No repeating crash loop:

```txt
WebSocket is not open: readyState 0
```

- [ ] **Step 2: Start frontend**

```bash
cd trivo-frontend
bun run dev
```

Expected:

- Vite/TanStack app serves successfully.

- [ ] **Step 3: Create an agent**

In browser:

1. Connect wallet.
2. Go to `/launch`.
3. Create agent with:
   - name: `Demo Momentum Agent`
   - handle: `demo-momentum`
   - model: `asi1-mini`
   - skills: `perp`
   - strategy: `Trade BTC momentum with strict risk control`

Expected backend DB/API result:

```bash
curl http://localhost:3000/api/agents | python3 -m json.tool
```

Find created agent with:

- `status: active`
- `erc8004TokenId` when registry succeeds
- `circleWalletId` when Circle config succeeds
- `circleWalletAddress` when Circle config succeeds

- [ ] **Step 4: Verify chart candles**

On agent detail page:

- Candlestick chart renders.
- Network tab shows `GET /api/market/candles`.
- Refreshing page does not generate a totally different random chart shape for same current price/time window.
- Trade markers show when history exists.

- [ ] **Step 5: Verify engine creates activity**

Wait at least 60-120 seconds with agent active.

Expected:

```bash
curl http://localhost:3000/api/feed | python3 -m json.tool
curl http://localhost:3000/api/positions | python3 -m json.tool
```

- Feed shows agent activity.
- Positions reflect open/closed mock trades if AI/risk gates allow action.

- [ ] **Step 6: Run full verification suite**

```bash
cd trivo-backend
pnpm run check

cd ../trivo-frontend
bun run build
bun run lint

cd ../trivo-contracts
forge test
```

Expected:

- All pass. If any fail due external config, capture exact failure and whether it blocks demo.

- [ ] **Step 7: Commit verification/docs updates if any**

If you updated docs or fixed demo bugs:

```bash
git status --short
git add <changed-files>
git commit -m "chore: verify end-to-end demo flow"
```

---

## Task 9: Optional Demo Polish After Core Flow Works

Only start this after Tasks 1-8 pass.

- [ ] Replace landing page fake `/agent/1` links with real agent links from `useAgents()` or route all CTAs to `/discover`.
- [ ] Add visible provisioning badges on agent cards:
  - ERC-8004 registered / pending / failed
  - Circle wallet ready / pending / failed
- [ ] Add a frontend banner for wallet transfer provider errors so judges understand whether failure is config/funding rather than product logic.
- [ ] Add a small “Demo mode: venue execution is mock-settled on Arc” disclosure near trade history.
- [ ] Add `/api/docs` link in footer or developer panel.

Commit:

```bash
git add trivo-frontend/src trivo-backend/src
git commit -m "chore(demo): polish end-to-end status signals"
```

---

## Implementation Order Summary

1. Fix backend wallet creation bug.
2. Add wallet transfer/deposit backend APIs.
3. Wire frontend wallet UI to real APIs.
4. Add backend candles API.
5. Wire chart to backend candles.
6. Clean/deprecate legacy engine stack.
7. Refresh OpenAPI docs.
8. Run manual E2E verification.
9. Optional polish.

---

## Self-Review Checklist

- Spec coverage:
  - Agent wallet creation bug: Task 1.
  - Transfer/fund work is out of scope for this pass.
  - Chart no longer random: Tasks 4-5.
  - Backend engine drift: Task 6.
  - OpenAPI stale: Task 7.
  - End-to-end flow: Task 8.

- Placeholder scan:
  - No `TBD` or empty implementation steps remain.
  - The only conditional area is Circle SDK exact method shape, with explicit instruction to preserve route contract and fix based on installed SDK types.

- Type consistency:
  - `DepositInstructions`, `TransferRequest`, `TransferResponse`, and `Candle` shapes match between backend and frontend tasks.
  - `/api/market/candles` shape matches frontend hook and chart plan.
  - Wallet transfer endpoint uses `sourceWalletId`, `destinationAddress`, `amount`, `tokenId` consistently.
