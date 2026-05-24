# Implementation Tickets — Context

> **Quick reference for AI agents picking up tickets**
> **Updated:** 2026-05-24

---

## Decisions (User-Confirmed)

| Decision | Value |
|----------|-------|
| Database | PostgreSQL + Drizzle ORM (existing) |
| AI Provider | Round-robin (Heurist ↔ ASI1-mini) |
| ERC-8004 | ✅ Already deployed on Arc |
| Existing Code | Check `trivo-backend/src/engine/` first |
| IPFS | Placeholder (data URI) |
| Testing | Vitest |

---

## AI Provider Round-Robin

```typescript
// Ticket F3: Update base-agent to use round-robin
class ModelRouter {
  private providers: BaseProvider[]
  private index = 0

  getNext(): BaseProvider {
    const p = this.providers[this.index]
    this.index = (this.index + 1) % this.providers.length
    return p
  }

  // Use in callLLM
  async callLLM(prompt: string, schema: any) {
    const provider = this.getNext()
    return provider.completeWithSchema(prompt, schema)
  }
}
```

---

## ERC-8004 Contracts (Already Deployed)

| Contract | Address |
|---------|---------|
| **Identity Registry** | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| **Reputation Registry** | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |

**Existing:** `engine/services/erc8004.service.ts`

**Update Ticket I1:** Wrap existing service, don't recreate.

---

## Quick Start

### Pick a Ticket
Tickets are ordered by priority and dependencies. Pick from **P0 first**.

### Recommended Starting Order
```
1. F1: Audit System       ← Foundation (do this first)
2. F3: Base Agent         ← All agents inherit this
3. F2: PnL Service        ← Learning needs this
4. A1: Technical Analyst  ← First real AI agent
```

### Parallelization
- Foundation (F1-F3): 1 developer
- Analysts (A1-A4): 4 developers parallel
- Everything else: after analysts complete

---

## Ticket Overview

| Category | Count | Time | Start After |
|----------|-------|------|-------------|
| Foundation | F1-F3 | 7-10h | — |
| Analysts | A1-A4 | 8-12h | F3 |
| Researchers | R1-R2 | 4-6h | A1-A4 |
| Decision Makers | D1-D2 | 4-6h | R1-R2 |
| Orchestration | O1-O2 | 7-9h | D2 |
| Learning | L1-L2 | 5-7h | F2 |
| Identity | I1 | 3-4h | O2 (wrap existing service) |
| Autonomy | AU1-AU4 | 8-12h | F1 |
| Integration | IN1-IN3 | 7-10h | All P1 |
| Testing | TP1-TP2 | 6-8h | All |

---

## Integration Points

```
F1 (Audit) ──────────────────────────────┐
    ↓                                      │
F3 (Base Agent) ──→ A1-A4 (Analysts) ──→ R1-R2 (Researchers)
    ↓                    ↓                    ↓
    ↓                    ↓               D1 (Trader)
    ↓                    ↓                    ↓
    ↓               O1 (Discussion) ──→ D2 (Portfolio Manager)
    ↓                    ↓                    ↓
    ↓                    └────────────────────┘
    ↓                                     ↓
F2 (PnL) ──→ L1 (Learning) ──→ L2 (Reflection)
    ↓
AU1 (Event Store) ──→ AU2 (Watchdog) ──→ AU3 (Self-Healer)
    ↓
AU4 (Autonomous Loop)
    ↓
IN1-IN3 (Integration)
    ↓
TP1-TP2 (Testing)
```

---

## Existing Code to Check

Before starting, read these files:

| File | Purpose |
|------|---------|
| `engine/providers/asi-one.ts` | ASI1 provider implementation |
| `engine/providers/heurist.ts` | Heurist provider implementation |
| `engine/types.ts` | MarketContext interface |
| `engine/tools/registry.ts` | Tool registration |
| `engine/services/erc8004.service.ts` | Existing ERC-8004 |
| `lib/schema.ts` | Database schema |

---

## Reference

| Resource | Location |
|----------|----------|
| Architecture Plan | `docs/plans/phase-6-ai-engine-v2.md` |
| Context | `docs/plans/phase-6-ai-engine-v2-context.md` |
| Tickets | `docs/implementation-tickets.md` |
| Current Engine | `trivo-backend/src/engine/` |
| Schema | `trivo-backend/src/lib/schema.ts` |
| Contracts | `trivo-contracts/src/` |

---

## Notes

1. **Heurist + ASI1** — OpenAI-compatible, round-robin
2. **Use Zod** — for all structured output validation
3. **Hash everything** — for audit trail integrity
4. **Learn from PnL** — feed outcomes into learning engine
5. **Arc Testnet** — chainId: 5042002
6. **Check existing code first** — don't duplicate work
7. **Wrap existing ERC-8004 service** — don't recreate
