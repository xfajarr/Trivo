# Phase 6: AI Engine v2 — Implementation Tickets

> **Status:** ✅ COMPLETE - All 25 tickets implemented
> **Total:** ~25 tickets | **Estimated:** 50-65 hours
> **Providers:** Heurist.ai + ASI1-mini (fetch.ai)
> **Created:** 2026-05-24
> **Completed:** 2026-05-24

---

## ✅ Ticket Completion Status

| Ticket | Name | Status | Files |
|--------|------|--------|-------|
| **FOUNDATION** |
| F1 | Audit System | ✅ Done | `engine/audit/audit-system.ts` |
| F2 | PnL Service | ✅ Done | `services/pnl.service.ts`, `routes/pnl.ts` |
| F3 | Base Agent | ✅ Done | `engine/agents/base-agent.ts` |
| **ANALYSTS** |
| A1 | Technical Analyst | ✅ Done | `engine/agents/analysts/technical-analyst.ts` |
| A2 | Sentiment Analyst | ✅ Done | `engine/agents/analysts/sentiment-analyst.ts` |
| A3 | OnChain Analyst | ✅ Done | `engine/agents/analysts/onchain-analyst.ts` |
| A4 | Macro Analyst | ✅ Done | `engine/agents/analysts/macro-analyst.ts` |
| **RESEARCHERS** |
| R1 | Bull Researcher | ✅ Done | `engine/agents/researchers/bull-researcher.ts` |
| R2 | Bear Researcher | ✅ Done | `engine/agents/researchers/bear-researcher.ts` |
| **DECISION MAKERS** |
| D1 | Trader | ✅ Done | `engine/agents/trader.ts` |
| D2 | Portfolio Manager | ✅ Done | `engine/agents/portfolio-manager.ts` |
| **ORCHESTRATION** |
| O1 | Discussion Manager | ✅ Done | `engine/discussion/debate-orchestrator.ts` |
| O2 | Complete Agent | ✅ Done | `engine/agents/complete-trading-agent.ts` |
| **LEARNING** |
| L1 | Learning Engine | ✅ Done | `engine/learning/learning-engine.ts` |
| L2 | Reflection Generator | ✅ Done | `engine/memory/reflection-generator.ts` |
| **IDENTITY** |
| I1 | Agent Identity | ✅ Done | `engine/identity/identity-service.ts` |
| **AUTONOMY** |
| AU1 | Event Store | ✅ Done | `engine/autonomous/event-store.ts` |
| AU2 | Watchdog | ✅ Done | `engine/autonomous/watchdog.ts` |
| AU3 | Self-Healer | ✅ Done | `engine/autonomous/self-healer.ts` |
| AU4 | Autonomous Loop | ✅ Done | `engine/autonomous/autonomous-runner.ts` |
| **INTEGRATION** |
| IN1 | Engine Index | ✅ Done | `engine/index.ts` |
| IN2 | Cron Jobs | ✅ Done | `engine/services/cron.ts` |
| IN3 | API Routes | ✅ Done | `routes/pnl.ts` |
| **TESTING** |
| TP1 | Integration Tests | ✅ Done | `engine/__tests__/integration/` |

---

## 📁 File Structure

```
trivo-backend/src/
├── engine/
│   ├── index.ts                      # ✅ Updated with all exports
│   ├── schemas/index.ts              # ✅ All schemas with Zod
│   ├── audit/audit-system.ts        # ✅ Complete
│   ├── identity/identity-service.ts  # ✅ Complete
│   ├── learning/learning-engine.ts   # ✅ Complete
│   ├── memory/
│   │   └── reflection-generator.ts  # ✅ LLM-powered
│   ├── providers/
│   │   ├── base-provider.ts         # ✅ completeWithSchema()
│   │   ├── heurist.ts              # ✅ Heurist provider
│   │   ├── asi-one.ts              # ✅ ASI1 provider
│   │   └── model-router.ts         # ✅ Round-robin
│   ├── agents/
│   │   ├── base-agent.ts            # ✅ Base class
│   │   ├── complete-trading-agent.ts # ✅ Full orchestrator
│   │   ├── trader.ts                # ✅ Trade proposals
│   │   ├── portfolio-manager.ts     # ✅ Final authority
│   │   ├── analysts/
│   │   │   ├── technical-analyst.ts
│   │   │   ├── sentiment-analyst.ts
│   │   │   ├── onchain-analyst.ts
│   │   │   └── macro-analyst.ts
│   │   └── researchers/
│   │       ├── bull-researcher.ts
│   │       └── bear-researcher.ts
│   ├── autonomous/
│   │   ├── event-store.ts           # ✅ Event sourcing
│   │   ├── watchdog.ts             # ✅ Health monitoring
│   │   ├── self-healer.ts          # ✅ Recovery
│   │   └── autonomous-runner.ts    # ✅ 24/7 loop
│   ├── discussion/
│   │   ├── debate-orchestrator.ts   # ✅ Multi-round debate
│   │   └── schemas.ts
│   └── services/
│       └── cron.ts                  # ✅ PnL cron jobs
├── services/
│   └── pnl.service.ts              # ✅ Core PnL calculations
└── routes/
    └── pnl.ts                      # ✅ PnL API endpoints

trivo-backend/src/lib/
└── schema.ts                       # ✅ Updated with PnL tables
```

---

## 🚀 Quick Start

```bash
# Start the engine
cd trivo-backend
pnpm run dev

# The engine will:
# 1. Start cron jobs (mark-to-market every 10s)
# 2. Initialize all agents
# 3. Run trading cycles every 60s
```

---

## API Endpoints

### PnL Endpoints
```
GET  /api/pnl/agents/:id              # PnL overview
GET  /api/pnl/agents/:id/performance   # Metrics
GET  /api/pnl/agents/:id/history      # Chart data
GET  /api/pnl/agents/:id/outcomes     # Trade outcomes
POST /api/pnl/agents/:id/close/:positionId  # Close position
POST /api/pnl/snapshot                # Trigger snapshot
```

### Agent Endpoints
```
GET  /api/agents/:id/decisions        # Recent decisions
GET  /api/agents/:id/decisions/:id    # Decision detail
GET  /api/agents/:id/audit            # Audit trail
GET  /api/agents/:id/insights         # Learning insights
GET  /api/agents/:id/identity         # Agent identity
```

---

## Cron Jobs (IN2)

| Job | Interval | Description |
|-----|----------|-------------|
| `mark-to-market` | 10s | Update unrealized PnL for all positions |
| `pnl-snapshots` | 1h | Create hourly PnL snapshots for charts |
| `auto-close` | 30s | Close positions at SL/TP |
| `agent-processing` | 60s | Agent heartbeat & processing |

---

## Usage Examples

### Create Complete Trading Agent
```typescript
import { createCompleteTradingAgent } from './engine'

const agent = createCompleteTradingAgent()
const result = await agent.runFullCycle(marketContext)
console.log(result.finalDecision)
```

### Use Individual Agents
```typescript
import { createTechnicalAnalyst, createSentimentAnalyst } from './engine'

const technical = createTechnicalAnalyst()
const sentiment = createSentimentAnalyst()

const [techResult, sentResult] = await Promise.all([
  technical.analyze(context),
  sentiment.analyze(context)
])
```

### Check PnL
```typescript
import { pnlService } from './services/pnl.service'

const summary = await pnlService.aggregatePnL(agentId, 'day')
console.log(`Today's PnL: $${summary.realizedPnl}`)
```

### Start Cron Jobs
```typescript
import { startCron, stopCron } from './engine'

startCron()  // Starts all PnL cron jobs
// ...
stopCron()   // Stops all cron jobs
```

---

## Testing

```bash
# Run all tests
cd trivo-backend && pnpm test

# Run with coverage
pnpm test -- --coverage

# Run specific test
pnpm test -- --grep "TechnicalAnalyst"
```

---

## ✅ Success Criteria Met

1. ✅ Real AI-powered committee (LLM calls, not deterministic)
2. ✅ Verifiable reasoning with evidence chains
3. ✅ Full audit trail with cryptographic hashing
4. ✅ Realized & unrealized PnL tracking
5. ✅ Learning from trade history
6. ✅ ERC-8004 agent identity
7. ✅ 24/7 autonomous operation
8. ✅ All decisions traceable and accountable
