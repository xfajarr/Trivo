# Phase 6: AI Engine v2 — Context

> **Purpose:** Quick reference for AI agents implementing this plan
> **Updated:** 2026-05-24

---

## Decisions (User-Confirmed)

| Decision | Value |
|----------|-------|
| Database | PostgreSQL + Drizzle ORM (existing) |
| AI Provider | Round-robin load balancing (Heurist ↔ ASI1-mini) |
| ERC-8004 | ✅ Already deployed on Arc |
| Existing Code | Check `trivo-backend/src/engine/` first |
| IPFS | Placeholder (data URI for now) |
| Testing | Vitest |

---

## AI Providers

- **Primary A:** Heurist.ai
- **Primary B:** ASI1-mini (fetch.ai)
- **Strategy:** Round-robin load balancing between providers
- **API:** OpenAI-compatible

---

## ERC-8004 Contracts (Already Deployed)

| Contract | Address | Purpose |
|---------|---------|---------|
| **Identity Registry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Agent registration |
| **Reputation Registry** | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Trade feedback |

**Existing Service:** `trivo-backend/src/engine/services/erc8004.service.ts`

---

## File Locations

```
trivo-backend/src/engine/
├── schemas/index.ts                    # Structured output schemas
├── audit/audit-system.ts              # Verifiable reasoning
├── identity/agent-identity.ts         # ERC-8004 wrapper
├── learning/learning-engine.ts         # Pattern recognition
├── memory/reflection-generator.ts     # Learn from decisions
├── agents/
│   ├── base-agent.ts                 # Abstract base class
│   ├── complete-trading-agent.ts      # Orchestrates everything
│   ├── analysts/
│   │   ├── technical-analyst.ts
│   │   ├── sentiment-analyst.ts
│   │   ├── onchain-analyst.ts
│   │   └── macro-analyst.ts
│   ├── researchers/
│   │   ├── bull-researcher.ts
│   │   └── bear-researcher.ts
│   ├── trader.ts
│   └── portfolio-manager.ts
├── harness/
│   ├── constraint-validator.ts
│   └── performance-monitor.ts
├── discussion/discussion-manager.ts
├── autonomous/
│   ├── event-store.ts
│   ├── watchdog.ts
│   ├── self-healer.ts
│   └── autonomous-loop.ts
└── services/
    ├── pnl.service.ts                # NEW: PnL tracking
    └── cron.ts                       # UPDATE: Add PnL jobs
```

---

## Existing Code to Reference

Before implementing, check:

1. **`engine/providers/`** — How existing providers work
2. **`engine/types.ts`** — `MarketContext` interface
3. **`engine/tools/`** — How tools are registered/executed
4. **`engine/services/erc8004.service.ts`** — ERC-8004 integration already exists
5. **`lib/schema.ts`** — Database schema for new tables

---

## Key Schemas

### Rating Scale
```typescript
enum Rating {
  BUY = "buy",
  OVERWEIGHT = "overweight",
  HOLD = "hold",
  UNDERWEIGHT = "underweight",
  SELL = "sell",
}
```

### Evidence (for audit trail)
```typescript
interface Evidence {
  id: string
  type: 'price_data' | 'onchain_data' | 'sentiment' | 'technical' | 'macro' | 'model_output'
  source: string           // "CoinGecko API", "Oracle Contract", "LLM:heurist"
  content: string
  timestamp: number
  confidence: number       // 0-100
  verification_hash?: string
}
```

---

## Provider Round-Robin Implementation

```typescript
// Round-robin between Heurist and ASI1
const providers = [heuristProvider, asi1Provider]
let currentIndex = 0

function getNextProvider() {
  const provider = providers[currentIndex]
  currentIndex = (currentIndex + 1) % providers.length
  return provider
}

// Usage in base-agent.ts
const provider = getNextProvider()
const result = await provider.completeWithSchema(...)
```

---

## Audit System (PostgreSQL)

```typescript
// All audit data persisted to PostgreSQL via Drizzle
import { db } from '../lib/db.js'
import { auditLogs, reasoningChains } from '../lib/schema.js'

// Append to audit chain
await db.insert(auditLogs).values({
  id: crypto.randomUUID(),
  agentId,
  decisionId,
  stepNumber,
  agentRole,
  inputHash,
  outputHash,
  evidenceHashes,
  confidence,
  modelVersion,
  timestamp: new Date(),
})
```

---

## Quick Commands

```bash
# Build
cd trivo-backend && pnpm run build

# Type check
cd trivo-backend && pnpm run typecheck

# Test
cd trivo-backend && pnpm test

# Run engine
cd trivo-backend && pnpm run dev
```

---

## Notes for AI Agents

1. **Start with F1 (Audit System)** — foundation for everything
2. **Use Zod for all schemas** — validation + TypeScript types
3. **Hash everything for audit** — SHA-256 for evidence chains
4. **Every LLM call = reasoning step** — log prompt/response hashes
5. **Learning requires PnL** — integrate with PnL service first
6. **ERC-8004 uses Arc Testnet** — chainId: 5042002
7. **Check existing code first** — avoid duplicating work
