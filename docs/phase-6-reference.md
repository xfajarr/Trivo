# Phase 6: AI Engine v2 — Reference

> **Status:** ✅ COMPLETE
> **Updated:** 2026-05-24
> **Hackathon Deadline:** May 25, 2026

---

## ✅ Decisions (User-Confirmed)

| Decision | Value |
|----------|-------|
| Database | PostgreSQL + Drizzle ORM |
| AI Provider | Round-robin (Heurist ↔ ASI1-mini) |
| ERC-8004 | ✅ Already deployed on Arc |
| Existing Code | Check first, don't duplicate |
| IPFS | Placeholder (data URI) |
| Testing | Vitest |

---

## 🚀 Quick Start

```bash
# Start backend
cd trivo-backend && pnpm run dev

# Typecheck
cd trivo-backend && pnpm run typecheck

# Tests (165 passing)
cd trivo-backend && pnpm test
```

---

## 📁 All Phase 6 Files

```
docs/
├── phase-6-reference.md                    ✅ This file
├── plans/
│   ├── phase-6-ai-engine-v2.md            ✅ (66KB)
│   ├── phase-6-ai-engine-v2-context.md    ✅
│   ├── implementation-tickets.md           ✅ (Complete)
│   └── pnl-tracking-system.md             ✅ (29KB)
```

---

## File Structure

```
trivo-backend/src/
├── engine/
│   ├── index.ts                      ✅ Exports all components
│   ├── schemas/index.ts              ✅ All schemas with Zod
│   ├── audit/audit-system.ts        ✅ Evidence chains, hashing
│   ├── identity/identity-service.ts  ✅ ERC-8004 via viem
│   ├── learning/learning-engine.ts  ✅ Pattern recognition
│   ├── memory/reflection-generator.ts ✅ LLM-powered
│   ├── providers/
│   │   ├── base-provider.ts          ✅ completeWithSchema()
│   │   ├── heurist.ts               ✅
│   │   ├── asi-one.ts               ✅
│   │   └── model-router.ts          ✅ Round-robin
│   ├── agents/
│   │   ├── base-agent.ts            ✅
│   │   ├── complete-trading-agent.ts ✅
│   │   ├── trader.ts                ✅
│   │   ├── portfolio-manager.ts     ✅
│   │   ├── analysts/                ✅ 4 analysts
│   │   └── researchers/             ✅ Bull/Bear
│   ├── autonomous/
│   │   ├── event-store.ts           ✅
│   │   ├── watchdog.ts              ✅
│   │   ├── self-healer.ts          ✅
│   │   └── autonomous-runner.ts    ✅
│   ├── discussion/
│   │   ├── debate-orchestrator.ts   ✅
│   │   └── schemas.ts              ✅
│   └── services/
│       └── cron.ts                  ✅ PnL jobs
├── services/
│   └── pnl.service.ts               ✅ Core PnL
└── routes/
    └── pnl.ts                       ✅ API
```

---

## API Endpoints

### PnL
```
GET  /api/pnl/agents/:id              # Overview
GET  /api/pnl/agents/:id/performance   # Metrics
GET  /api/pnl/agents/:id/history      # Charts
GET  /api/pnl/agents/:id/outcomes     # Outcomes
POST /api/pnl/agents/:id/close/:positionId
```

### Agents
```
GET  /api/agents/:id/decisions
GET  /api/agents/:id/decisions/:id
GET  /api/agents/:id/audit
GET  /api/agents/:id/insights
```

---

## Cron Jobs

| Job | Interval | Purpose |
|-----|----------|---------|
| mark-to-market | 10s | Update unrealized PnL |
| pnl-snapshots | 1h | Chart snapshots |
| auto-close | 30s | SL/TP execution |
| agent-processing | 60s | Agent cycles |

---

## 25 Tickets: ALL COMPLETE

| Category | Count | Status |
|----------|-------|--------|
| Foundation | F1-F3 | ✅ |
| Analysts | A1-A4 | ✅ |
| Researchers | R1-R2 | ✅ |
| Decision Makers | D1-D2 | ✅ |
| Orchestration | O1-O2 | ✅ |
| Learning | L1-L2 | ✅ |
| Identity | I1 | ✅ |
| Autonomy | AU1-AU4 | ✅ |
| Integration | IN1-IN3 | ✅ |
| Testing | TP1 | ✅ |

**Total: 25 tickets | 0 remaining**

---

## Usage

```typescript
import { 
  createCompleteTradingAgent,
  pnlService, 
  startCron,
  createTechnicalAnalyst 
} from './engine'

// Create agent
const agent = createCompleteTradingAgent()
const result = await agent.runFullCycle(context)

// Check PnL
const summary = await pnlService.aggregatePnL(agentId, 'day')

// Start cron
startCron()
```

---

## ✅ Success Criteria

When complete, Trivo agents will have:

1. ✅ Real AI per role (LLM calls, not deterministic)
2. ✅ Verifiable reasoning with evidence chains
3. ✅ Full audit trails (cryptographic hashing)
4. ✅ Realized & unrealized PnL tracking
5. ✅ Learning from trade history
6. ✅ ERC-8004 on-chain identity
7. ✅ 24/7 autonomous operation
8. ✅ Decisions traceable to creator

---

## Notes

- **Heurist + ASI1** — OpenAI-compatible APIs, round-robin
- **Use Zod** — for all structured output validation
- **Hash everything** — for audit trail integrity
- **Learn from PnL** — feed outcomes into learning engine
- **Arc Testnet** — chainId: 5042002
- **PostgreSQL** — all audit data persisted via Drizzle
- **165 tests passing** — all components verified
