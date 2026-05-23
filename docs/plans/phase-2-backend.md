# ⚙️ Phase 2 — Backend Implementation Plan

> **Project:** Trivo  
> **Stack:** Hono + TypeScript + PostgreSQL  
> **Auth:** Privy Wallet (wallet connect, session mgmt)  
> **Chain:** Arc Testnet (viem)  
> **Deployed Contracts:** SimpleOracle · MockPerp · MockPolymarket · MockLPV3 · CopyTrading · FeeManager  
> **Sister Doc:** `docs/plans/phase-1-smart-contracts.md`

---

## 🏗️ Architecture Overview

```
┌──────────────┐     ┌────────────────────────────────────────────┐     ┌──────────────┐
│   Frontend   │◄───►│              Hono API Server                │◄───►│  PostgreSQL  │
│  (TanStack)  │     │                                            │     │              │
└──────────────┘     │  Auth: Privy SDK (verify token)            │     │  users       │
      │              │  Wallet: Privy Embedded Wallets            │     │  agents      │
      ▼              │  or Circle Agent Wallets                   │     │  positions   │
┌──────────────┐     │                                            │     │  agent_memory│
│   Privy      │     │  ┌────────────────────────────────────┐   │     │  sessions    │
│  (Auth)      │     │  │  Services:                         │   │     │  feeds       │
│              │     │  │  • AgentService (CRUD + on-chain)   │   │     │  copy_rels   │
│  - Wallet    │     │  │  • AuthService (Privy token verify) │   │     │  skills      │
│  - Session   │     │  │  • MemoryService (agent memory)     │   │     └──────────────┘
│  - SIWE      │     │  │  • PositionService                  │   │
└──────────────┘     │  │  • FeedService                      │   │
                     │  │  • CopyService                      │   │     ┌──────────────┐
                     │  │  • WalletService (Circle/Privy)     │   │◄───►│  Arc Chain   │
                     │  │  • ContractService (viem)           │   │     │  (viem)      │
                     │  │  • StrategyService                  │   │     │              │
                     │  │  • MarketDataService                │   │     │  CopyTrading │
                     │  └────────────────────────────────────┘   │     │  SimpleOracle│
                     └────────────────────────────────────────────┘     │  MockVenues  │
                                                                        └──────────────┘
```

---

## 🆕 Key Concepts

### 1. Auth via Privy (bukan manual wallet verify)

Privy handle:
- **Wallet creation** — embedded wallet for each user
- **Auth** — email, social, or wallet (SIWE)
- **Session** — Privy JWT tokens, backend verify via Privy SDK

Backend cukup:
```typescript
// Verify Privy access token
import { PrivyClient } from '@privy-io/server-auth';

const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);

async function getUserFromToken(token: string) {
  const verified = await privy.verifyAuthToken(token);
  return verified.userId;  // Privy user ID
}
```

### 2. Setiap Agent Punya Identity + Soul + Session + Memory sendiri

| Konsep | Implementasi | Kenapa |
|--------|-------------|--------|
| **Identity** | ERC-8004 on-chain identity NFT + `agents` table di DB | Agent punya reputasi verifiable di Arcscan |
| **Soul** | Soulbound token atau on-chain record — track record agent yang gak bisa dipisah | Gak bisa "reset" reputasi |
| **Session** | `agent_sessions` table — nyimpen context AI model per agent (system prompt, strategy, model config) | Biar tiap agent punya konteks sendiri |
| **Memory** | `agent_memory` table — append-only log: tiap decision, reasoning, outcome | Agent bisa belajar dari masa lalu |

### 3. User-Level Session & Memory History

```
users table
  └── sessions: user login sessions (handled by Privy)
  └── agents[]: list of agents owned by user
  └── user_memory: user preferences, past interactions
  
agents table
  └── agent_sessions: AI model call history per agent
  └── agent_memory: append-only decision log + reasoning traces
```

---

## 🗃️ Database Schema (PostgreSQL via Drizzle)

### Table: `users`

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),             // Privy user ID
  walletAddress: text('wallet_address'),
  email: text('email'),
  displayName: text('display_name'),
  avatar: text('avatar'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Table: `agents`

```typescript
export const agents = pgTable('agents', {
  id: text('id').primaryKey(),             // UUID
  ownerId: text('owner_id').notNull(),     // FK → users.id
  erc8004TokenId: text('erc8004_token_id'), // 🆕 ERC-8004 identity NFT

  // Identity
  name: text('name').notNull(),
  handle: text('handle').notNull().unique(),
  avatar: text('avatar'),

  // Hosting
  hostingType: text('hosting_type').$type<'trivo' | 'self_hosted'>(),
  endpoint: text('endpoint'),

  // AI Model
  modelProvider: text('model_provider').$type<'deepseek' | 'claude' | 'openai' | 'qwen' | 'byok'>(),
  modelConfig: text('model_config'),        // JSON string

  // Skills + Rules
  skills: text('skills'),                  // JSON string
  strategy: text('strategy'),              // natural language
  spendLimit: text('spend_limit'),
  maxLeverage: text('max_leverage'),
  stopLossPct: text('stop_loss_pct'),

  // On-chain
  copyTradingAgentId: text('copy_trading_agent_id'),
  circleWalletId: text('circle_wallet_id'),
  circleWalletAddress: text('circle_wallet_address'),

  // Status
  status: text('status').$type<'inactive' | 'active' | 'paused'>().default('inactive'),

  // Stats (synced from on-chain)
  totalPnl: text('total_pnl').default('0'),
  aum: text('aum').default('0'),
  tradeCount: text('trade_count').default('0'),
  winRate: text('win_rate').default('0'),
  copiers: text('copiers').default('0'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Table: `agent_sessions` 🆕

```typescript
// Setiap agent punya session sendiri — konteks AI model terisolasi
export const agentSessions = pgTable('agent_sessions', {
  id: text('id').primaryKey(),             // UUID
  agentId: text('agent_id').notNull(),      // FK → agents.id
  sessionData: text('session_data'),       // JSON: current context, state
  
  // System prompt + agent config (snapshot at session start)
  systemPrompt: text('system_prompt'),
  modelProvider: text('model_provider'),
  modelConfig: text('model_config'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Table: `agent_memory` 🆕

```typescript
// Append-only decision log — setiap agent punya memory sendiri
// Ini yang bikin agent bisa "ingat" keputusan masa lalu
export const agentMemory = pgTable('agent_memory', {
  id: text('id').primaryKey(),             // UUID
  agentId: text('agent_id').notNull(),      // FK → agents.id
  type: text('type').$type<
    'observation' | 'decision' | 'trade' | 'pnl' | 'reflection'
  >(),
  content: text('content'),                // full text of what happened
  reasoning: text('reasoning'),            // AI reasoning trace
  metadata: text('metadata'),              // JSON: prices, market data, etc.
  txHash: text('tx_hash'),                 // Arc tx hash (if applicable)
  
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Table: `user_memory` 🆕

```typescript
// User-level memory — preferences, history, context
export const userMemory = pgTable('user_memory', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),        // FK → users.id
  type: text('type').$type<
    'preference' | 'interaction' | 'feedback'
  >(),
  content: text('content'),
  metadata: text('metadata'),              // JSON
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Table: `positions`

```typescript
export const positions = pgTable('positions', {
  id: text('id').primaryKey(),
  copyTradingPositionId: text('copy_trading_position_id'),
  agentId: text('agent_id').notNull(),
  venue: text('venue').$type<'perp' | 'prediction' | 'lp' | 'yield' | 'spot'>(),
  market: text('market').notNull(),
  side: text('side').notNull(),
  size: text('size').notNull(),
  entryPrice: text('entry_price').notNull(),
  markPrice: text('mark_price'),
  leverage: text('leverage'),
  pnl: text('pnl').default('0'),
  pnlPct: text('pnl_pct').default('0'),
  copies: text('copies').default('0'),
  status: text('status').$type<'open' | 'closed'>().default('open'),
  txHash: text('tx_hash'),
  reasoning: text('reasoning'),            // 🆕 AI reasoning for this trade
  openedAt: timestamp('opened_at').defaultNow(),
  closedAt: timestamp('closed_at'),
});
```

### Table: `copy_relations`

```typescript
export const copyRelations = pgTable('copy_relations', {
  id: text('id').primaryKey(),
  followerAgentId: text('follower_agent_id').notNull(),
  targetAgentId: text('target_agent_id').notNull(),
  allocationBps: text('allocation_bps').notNull(),
  active: text('active').$type<'true' | 'false'>().default('true'),
  startedAt: timestamp('started_at').defaultNow(),
  totalCopied: text('total_copied').default('0'),
  totalPnl: text('total_pnl').default('0'),
});
```

### Table: `feed_events`

```typescript
export const feedEvents = pgTable('feed_events', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  type: text('type').$type<'position_open' | 'position_close' | 'pnl_update' | 'decision'>(),
  data: text('data'),                     // JSON payload
  venue: text('venue'),
  txHash: text('tx_hash'),
  reasoning: text('reasoning'),           // 🆕 AI reasoning snippet for feed display
  createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 🛣️ API Routes (Updated)

### Auth Routes — Privy

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/verify` | Verify Privy access token → return user |
| GET | `/api/auth/me` | Get current user from token |

Privy handles login/register/session on frontend. Backend only verifies.

### Agent Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents (filter by owner, status, venue) |
| GET | `/api/agents/:id` | Get agent detail |
| POST | `/api/agents` | Create agent |
| PUT | `/api/agents/:id` | Update agent config |
| PATCH | `/api/agents/:id/status` | Pause/resume |
| GET | `/api/agents/:id/memory` | Get agent memory history |
| GET | `/api/agents/:id/session` | Get agent current session |

### Position Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/positions` | List positions |
| GET | `/api/agents/:id/positions` | Positions for specific agent |

### Feed Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/feed` | List feed events (paginated, filterable) |

### Copy Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/copy/attach` | Attach follower |
| POST | `/api/copy/detach` | Detach |
| GET | `/api/copy/relations/:agentId` | Get followers/following |

### Wallet Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/wallets/create` | Create agent wallet (Circle or Privy) |
| GET | `/api/wallets/:agentId/balance` | Get balance |
| POST | `/api/wallets/withdraw` | Withdraw |

### Memory Routes 🆕

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/agents/:id/memory` | Add memory entry |
| GET | `/api/agents/:id/memory` | Get memory history |
| POST | `/api/user/memory` | Add user memory |
| GET | `/api/user/memory` | Get user memory |

### Strategy Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/strategy/compile` | Parse natural language → structured rules |

---

## 🧩 Services Breakdown

### AuthService — Privy

```typescript
// 1. Frontend login via Privy → get access token
// 2. Frontend sends token to POST /api/auth/verify
// 3. Backend verifies with Privy SDK
// 4. Upsert user in DB
// 5. Return user data

async function verifyToken(accessToken: string) {
  const verified = await privy.verifyAuthToken(accessToken);
  // verified.userId = privy user ID
  
  const user = await db.insert(users).values({
    id: verified.userId,
    walletAddress: verified.walletAddress,
  }).onConflictDoUpdate().returning();
  
  return user;
}
```

### AgentService

```typescript
// createAgent:
//   1. Validate input (zod)
//   2. Create agent in DB (status = inactive)
//   3. Create agent session (default system prompt)
//   4. Register ERC-8004 on Arc (via ContractService)
//   5. Register in CopyTrading contract
//   6. Create agent wallet (Circle or Privy)
//   7. Return agent

// updateAgent:
//   1. Verify ownership
//   2. Only agent creator can update
//   3. Update fields
//   4. Log change in agent_memory
```

### MemoryService 🆕

```typescript
// addMemory(agentId, type, content, reasoning, metadata):
//   1. Insert into agent_memory table
//   2. If type === 'trade', also create feed event
//   3. If type === 'pnl', update agent stats

// getMemory(agentId, limit, offset):
//   1. Query agent_memory ordered by createdAt DESC
//   2. Return paginated

// addUserMemory(userId, type, content):
//   1. Insert into user_memory table
```

### Agent Decision Flow (Memory + Session)

```
1. Agent Scheduler triggers agent
2. Load agent session (system prompt, strategy, model config)
3. Load recent agent_memory (past 10 decisions + outcomes)
4. Fetch current market data (from SimpleOracle or CoinGecko)
5. Build prompt: system prompt + strategy + past decisions + market data
6. Call AI model → structured trade decision
7. Execute trade (mock on Arc via ContractService)
8. Save decision + reasoning + outcome to agent_memory
9. Update agent session with new context
10. Broadcast to feed
```

### ContractService

```typescript
// Uses viem to interact with Arc chain
// Key functions:
//   - updatePrice(pair, price) → SimpleOracle
//   - registerAgentInCopyTrading(agentId, agentAddr, ownerAddr) → CopyTrading
//   - reportPosition(agentId, venue, market, side, size, entryPrice, lev, refId) → CopyTrading
//   - closePosition(positionId, exitPrice, pnl) → CopyTrading
```

---

## 📦 Dependencies

```bash
# Auth
pnpm add @privy-io/server-auth

# DB
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# API
pnpm add @hono/zod-validator zod

# Chain
pnpm add viem

# Wallet (optional — Circle or Privy embedded wallet)
pnpm add @circle-fin/developer-controlled-wallets
```

---

## ✅ Updated Task List

| # | Task | Est | Notes |
|---|------|-----|-------|
| 2.1 | **Project setup** — deps, config, drizzle schema (all 9 tables) | 30m | Include agent_memory, agent_sessions, user_memory 🆕 |
| 2.2 | **Privy Auth** — verify token endpoint, user upsert | 30m | Ganti manual wallet verify → Privy |
| 2.3 | **Agent Service** — CRUD + on-chain registration | 60m | Create session + memory on agent creation |
| 2.4 | **Contract Service** — viem → Arc | 45m | All contract interactions |
| 2.5 | **Memory Service** 🆕 — agent + user memory CRUD | 40m | Append-only decision log |
| 2.6 | **Position + Feed Service** | 40m | Query + pagination |
| 2.7 | **Copy Trade Service** | 30m | Attach/detach |
| 2.8 | **Wallet Service** | 30m | Circle/Privy integration |
| 2.9 | **Strategy + Market Data** | 40m | NL parser + price polling |
| | **Total** | **~6h** | |

---

## 🔑 Environment Variables

```
# Server
PORT=3000

# DB
DATABASE_URL=postgres://localhost:5432/trivo

# Privy Auth
PRIVY_APP_ID=clx...
PRIVY_APP_SECRET=...

# Arc Chain
ARC_RPC_URL=https://rpc.testnet.arc-node.thecanteenapp.com/v1/<key>
ARC_CHAIN_ID=5042002

# Deployed Contracts
SIMPLE_ORACLE=0xd5c246c8d79f77b1bd2d5f6c61f48be38027f1c1
COPY_TRADING=0x42a281eac445d2b01fee4137d81d98d31deaed77
MOCK_PERP=0x5dcca68b31da8bc22047371b446dcd3a926d12c8
MOCK_POLYMARKET=0x066fcba3058343e2e474783157e1189fa231ac10
MOCK_LPV3=0x77492a3c212772c3cc7048d0c0a33dc4e9e0fc38
FEE_MANAGER=0x226b5aa0e730504b956cdde107c15b9bcaa32415

# Deployer wallet
DEPLOYER_PRIVATE_KEY=0x...

# Circle Wallet API (optional)
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
```
