# Phase 6: AI Engine v2 — Implementation Tickets

> **Total:** ~25 tickets | **Estimated:** 40-60 hours across team
> **Providers:** Heurist.ai + ASI1-mini (fetch.ai)
> **Created:** 2026-05-24

---

## 🎯 How to Use These Tickets

1. **Pick any P0 ticket** — they can be worked in parallel
2. **Each ticket = ~2-4 hours** for one developer
3. **Dependencies noted** — some tickets build on others
4. **Success criteria** — each has testable deliverables

---

## P0 — FOUNDATION (Do These First)

### Ticket F1: Audit System
**File:** `engine/audit/audit-system.ts`
**Time:** 3-4 hours
**Prerequisites:** None

```markdown
## Ticket F1: Audit System for Verifiable Reasoning

### Description
Build the core audit system that logs every AI decision with evidence chains, 
cryptographic hashing, and full replay capability.

### Deliverables
- [ ] `engine/audit/audit-system.ts`
  - [ ] `Evidence` creation with type, source, content, verification_hash
  - [ ] `ReasoningStep` logging with agent role, input/output summary
  - [ ] `ReasoningChain` management (start, add steps, finalize)
  - [ ] `hashData()` — SHA-256 hashing of any data
  - [ ] `hashReasoningChain()` — hash entire reasoning chain
  - [ ] `hashCommitteeResult()` — hash full committee output
  - [ ] `verifyAuditChain()` — verify chain integrity
  - [ ] `exportDecision()` — export decision with verification instructions
  - [ ] Audit trail persistence (in-memory for now, DB later)

### Schemas to Add
- [ ] `engine/schemas/audit.ts`
  - [ ] Evidence schema with Zod validation
  - [ ] ReasoningStep schema
  - [ ] ReasoningChain schema

### Tests
- [ ] Unit tests for hashing functions
- [ ] Test chain integrity verification
- [ ] Test evidence creation with verification

### Success Criteria
- Every LLM call can be traced with evidence
- Any decision can be verified by replaying steps
- Cryptographic hashes are correct SHA-256
```

---

### Ticket F2: PnL Tracking Service
**File:** `engine/services/pnl.service.ts`
**Time:** 2-3 hours
**Prerequisites:** F1 (audit system)

```markdown
## Ticket F2: PnL Tracking Service

### Description
Build the PnL service that tracks realized/unrealized PnL for all positions,
feeds into the learning engine, and provides data for charts.

### Deliverables

#### Database Schema Updates (`lib/schema.ts`)
- [ ] Update `positions` table:
  - [ ] `decisionId` — link to decision
  - [ ] `unrealizedPnl` — current unrealized
  - [ ] `realizedPnl` — set on close
  - [ ] `fees` — gas + trading fees
  - [ ] `netPnl` — realized - fees
  - [ ] `priceAtClose` — exit price
- [ ] New `agentPnlSnapshots` table:
  - [ ] hourly/daily/weekly PnL for charts
  - [ ] openPositions, closedPositions counts
  - [ ] portfolioValue at snapshot
- [ ] New `tradeOutcomes` table:
  - [ ] structured outcomes for learning engine
  - [ ] holdTimeMs, wasCorrect, patterns

#### PnL Service (`engine/services/pnl.service.ts`)
- [ ] `calculateUnrealizedPnL(side, size, entry, current)` → PositionPnL
- [ ] `calculateRealizedPnL(side, size, entry, exit, fees)` → PositionPnL
- [ ] `updateMarkToMarket(prices)` — batch update all open positions
- [ ] `closePosition(positionId, exitPrice, fees)` → TradeOutcome
- [ ] `aggregatePnL(agentId, window)` → AggregatedPnL (day/week/month/all)
- [ ] `getPnLHistory(agentId, window)` → for charts
- [ ] `createSnapshot(agentId)` — hourly snapshots
- [ ] `getPerformanceMetrics(agentId)` — winRate, sharpe, drawdown

#### API Routes
- [ ] `GET /api/pnl/:agentId/summary?window=day`
- [ ] `GET /api/pnl/:agentId/history?window=daily`
- [ ] `GET /api/pnl/:agentId/metrics`
- [ ] `POST /api/pnl/close`

### Tests
- [ ] Unit tests for PnL calculations
- [ ] Test unrealized PnL updates
- [ ] Test realized PnL on close

### Success Criteria
- Real-time PnL updates every price tick
- Historical PnL data for charts
- Trade outcomes feed into learning engine
```

---

### Ticket F3: Base Agent Class
**File:** `engine/agents/base-agent.ts`
**Time:** 2-3 hours
**Prerequisites:** F1 (audit system)

```markdown
## Ticket F3: Base Agent Class

### Description
Create the abstract base class for all AI agents that provides:
- LLM call abstraction
- Structured output support
- Audit logging integration
- Evidence collection

### Deliverables
- [ ] `engine/agents/base-agent.ts`

#### BaseAgent Class
- [ ] `AgentConfig` interface (name, role, specialty, systemPrompt, modelPreference)
- [ ] `AgentResponse<T>` interface (success, data, error, latencyMs, modelVersion, reasoningStep)
- [ ] Abstract `analyze(context)` method
- [ ] `setReasoningContext(chainId, decisionId)` — set audit context
- [ ] `buildSystemPrompt(context)` — build system prompt with market data
- [ ] `callLLM<T>(prompt, schema, maxTokens)` — call LLM with structured output
  - [ ] Log prompt/response hashes for audit
  - [ ] Extract model version
  - [ ] Return reasoning step for audit
- [ ] `addEvidence(evidence)` — attach evidence to reasoning

#### Integration with Audit System
- [ ] Import and use `auditSystem` from `../audit/audit-system.ts`
- [ ] Auto-generate reasoning steps for every LLM call
- [ ] Hash prompts and responses

### Heurist/ASI1 Provider Updates
- [ ] Update `engine/providers/heurist.ts` with structured output support
- [ ] Update `engine/providers/asi-one.ts` with structured output support
- [ ] Add `completeWithSchema(systemPrompt, userPrompt, schema, maxTokens)` method

### Tests
- [ ] Unit tests for base agent
- [ ] Test structured output parsing
- [ ] Test reasoning step generation

### Success Criteria
- All agents extend BaseAgent
- Every LLM call logged with reasoning step
- Structured output with Zod validation
```

---

## P1 — ANALYSTS (Can Be Parallelized)

### Ticket A1: Technical Analyst Agent
**File:** `engine/agents/analysts/technical-analyst.ts`
**Time:** 2-3 hours
**Prerequisites:** F3 (base agent)

```markdown
## Ticket A1: Technical Analyst Agent

### Description
Create the Technical Analyst agent that makes real LLM calls to analyze:
- Price action and trends
- Support/resistance levels
- Chart patterns
- Technical indicators (RSI, MACD, etc.)

### Deliverables
- [ ] `engine/agents/analysts/technical-analyst.ts`

#### TechnicalAnalyst Class
- [ ] Extend `BaseAgent`
- [ ] Config: role="technical_analyst", specialty="Price action, chart patterns"
- [ ] `analyze(context)` → AnalystReport
- [ ] System prompt: 20-year veteran technical analyst
- [ ] Structured output schema (Zod):
  - [ ] stance: bullish/bearish/neutral
  - [ ] confidence: 0-100
  - [ ] summary: 2-3 sentences
  - [ ] evidence: array of evidence
  - [ ] challenges: questions for other analysts
  - [ ] warnings: risk warnings
  - [ ] key_levels: support, resistance, entry, stop
  - [ ] patterns: detected chart patterns

#### Prompt Engineering
- [ ] Include market context (BTC, ETH, SOL prices)
- [ ] Include technical data from context
- [ ] Include open positions
- [ ] Require evidence for all claims
- [ ] JSON-only response

### Tests
- [ ] Integration test with real LLM
- [ ] Test structured output parsing
- [ ] Test evidence extraction

### Success Criteria
- Real LLM calls (not deterministic)
- Valid structured output
- Evidence-backed analysis
```

---

### Ticket A2: Sentiment Analyst Agent
**File:** `engine/agents/analysts/sentiment-analyst.ts`
**Time:** 2-3 hours
**Prerequisites:** F3 (base agent)

```markdown
## Ticket A2: Sentiment Analyst Agent

### Description
Create the Sentiment Analyst agent that analyzes:
- Social media sentiment
- On-chain metrics
- Funding rates
- Market mood indicators

### Deliverables
- [ ] `engine/agents/analysts/sentiment-analyst.ts`

#### SentimentAnalyst Class
- [ ] Extend `BaseAgent`
- [ ] Config: role="sentiment_analyst", specialty="Social sentiment, funding rates"
- [ ] `analyze(context)` → AnalystReport
- [ ] System prompt: expert in sentiment analysis
- [ ] Structured output schema:
  - [ ] stance: bullish/bearish/neutral
  - [ ] confidence: 0-100
  - [ ] summary
  - [ ] evidence (social, on-chain, funding)
  - [ ] challenges
  - [ ] warnings

### Success Criteria
- Real LLM calls
- Sentiment-backed analysis
- Evidence from multiple sources
```

---

### Ticket A3: OnChain Analyst Agent
**File:** `engine/agents/analysts/onchain-analyst.ts`
**Time:** 2-3 hours
**Prerequisites:** F3 (base agent)

```markdown
## Ticket A3: OnChain Analyst Agent

### Description
Create the OnChain Analyst agent that analyzes:
- Wallet flows
- Exchange balances
- Smart money movements
- Protocol metrics

### Deliverables
- [ ] `engine/agents/analysts/onchain-analyst.ts`

#### OnChainAnalyst Class
- [ ] Extend `BaseAgent`
- [ ] Config: role="onchain_analyst", specialty="Wallet flows, smart money"
- [ ] `analyze(context)` → AnalystReport
- [ ] System prompt: on-chain analytics expert

### Success Criteria
- Real LLM calls
- On-chain evidence-backed analysis
```

---

### Ticket A4: Macro Analyst Agent
**File:** `engine/agents/analysts/macro-analyst.ts`
**Time:** 2-3 hours
**Prerequisites:** F3 (base agent)

```markdown
## Ticket A4: Macro Analyst Agent

### Description
Create the Macro Analyst agent that analyzes:
- Economic indicators
- Fed policy
- Global market correlations
- Risk-on/risk-off sentiment

### Deliverables
- [ ] `engine/agents/analysts/macro-analyst.ts`

#### MacroAnalyst Class
- [ ] Extend `BaseAgent`
- [ ] Config: role="macro_analyst", specialty="Economic policy, global markets"
- [ ] `analyze(context)` → AnalystReport
- [ ] System prompt: macroeconomics expert

### Success Criteria
- Real LLM calls
- Macro evidence-backed analysis
```

---

## P1 — RESEARCHERS (Sequential After Analysts)

### Ticket R1: Bull Researcher
**File:** `engine/agents/researchers/bull-researcher.ts`
**Time:** 2-3 hours
**Prerequisites:** A1, A2, A3, A4 (all analysts)

```markdown
## Ticket R1: Bull Researcher

### Description
Create the Bull Researcher agent that builds the bull case:
- Finds evidence for bullish positions
- Challenges bearish arguments
- Identifies entry opportunities

### Deliverables
- [ ] `engine/agents/researchers/bull-researcher.ts`

#### BullResearcher Class
- [ ] Extend `BaseAgent`
- [ ] Config: role="bull_researcher", specialty="Bullish opportunities"
- [ ] `analyze(context, analystReports, bearCase)` → AnalystReport
- [ ] System prompt: bullish research analyst
- [ ] Takes analyst reports and bear case as input
- [ ] Structured output schema:
  - [ ] stance
  - [ ] confidence
  - [ ] summary
  - [ ] evidence
  - [ ] challenges (questions for bear researcher)
  - [ ] strongest_bull_case
  - [ ] key_thesis
  - [ ] entry_requirements

### Success Criteria
- Makes strongest bull case
- Challenges bear arguments
- Identifies entry conditions
```

---

### Ticket R2: Bear Researcher
**File:** `engine/agents/researchers/bear-researcher.ts`
**Time:** 2-3 hours
**Prerequisites:** A1, A2, A3, A4 (all analysts)

```markdown
## Ticket R2: Bear Researcher

### Description
Create the Bear Researcher agent that builds the bear case:
- Identifies risks and weaknesses
- Challenges bullish arguments
- Recommends caution or shorts

### Deliverables
- [ ] `engine/agents/researchers/bear-researcher.ts`

#### BearResearcher Class
- [ ] Extend `BaseAgent`
- [ ] Config: role="bear_researcher", specialty="Risk identification"
- [ ] `analyze(context, analystReports, bullCase)` → AnalystReport
- [ ] System prompt: bearish research analyst
- [ ] Takes analyst reports and bull case as input

### Success Criteria
- Makes strongest bear case
- Challenges bull arguments
- Identifies exit conditions
```

---

## P1 — DECISION MAKERS

### Ticket D1: Trader Agent
**File:** `engine/agents/trader.ts`
**Time:** 2-3 hours
**Prerequisites:** R1, R2 (researchers)

```markdown
## Ticket D1: Trader Agent

### Description
Create the Trader agent that turns research into trade proposals:
- Translates analysis into specific trades
- Determines entry, exit, position size
- Considers risk/reward ratio

### Deliverables
- [ ] `engine/agents/trader.ts`

#### Trader Class
- [ ] Extend `BaseAgent`
- [ ] Config: role="trader", specialty="Trade execution, position sizing"
- [ ] `makeDecision(context, researchPlan, analystReports)` → TraderProposal
- [ ] System prompt: expert trading agent
- [ ] Structured output schema:
  - [ ] action: buy/sell/hold
  - [ ] reasoning
  - [ ] entry_price
  - [ ] stop_loss
  - [ ] take_profit
  - [ ] position_size
  - [ ] leverage
  - [ ] timeframe

### Success Criteria
- Specific trade proposals
- Clear entry/exit/size
- Risk/reward considered
```

---

### Ticket D2: Portfolio Manager
**File:** `engine/agents/portfolio-manager.ts`
**Time:** 2-3 hours
**Prerequisites:** D1 (trader)

```markdown
## Ticket D2: Portfolio Manager

### Description
Create the Portfolio Manager agent (final authority):
- Synthesizes all research and risk analysis
- Makes final go/no-go decision
- Adjusts position sizing
- Applies lessons from past decisions

### Deliverables
- [ ] `engine/agents/portfolio-manager.ts`

#### PortfolioManager Class
- [ ] Extend `BaseAgent`
- [ ] Config: role="portfolio_manager", specialty="Final execution authority"
- [ ] `makeFinalDecision(context, traderProposal, riskEvaluation)` → PortfolioDecision
- [ ] System prompt: senior portfolio manager, final authority
- [ ] Structured output schema:
  - [ ] rating: buy/overweight/hold/underweight/sell
  - [ ] conviction: 0-100
  - [ ] executive_summary
  - [ ] investment_thesis
  - [ ] position_size
  - [ ] entry_price, stop_loss, take_profit
  - [ ] leverage, timeframe
  - [ ] risk_adjusted
  - [ ] lessons_applied

### Success Criteria
- Final authority on all decisions
- Considers portfolio-level factors
- Can reject or modify trader proposals
```

---

## P1 — ORCHESTRATION

### Ticket O1: Discussion Manager
**File:** `engine/discussion/discussion-manager.ts`
**Time:** 3-4 hours
**Prerequisites:** R1, R2 (researchers)

```markdown
## Ticket O1: Discussion Manager

### Description
Build the discussion system that orchestrates multi-round debate:
- Bull vs Bear research debate
- Challenge/response rounds
- Moderator synthesis

### Deliverables
- [ ] `engine/discussion/discussion-manager.ts`

#### DiscussionManager Class
- [ ] `runResearchDebate(context, bullResearcher, bearResearcher, analystReports)` 
  - [ ] Round 1: Opening statements
  - [ ] Round 2: Challenge round (if disagreement > 30%)
  - [ ] Round 3: Rebuttals
  - [ ] Moderator synthesis
- [ ] `synthesizeResearchPlan(bullReport, bearReport, analystReports)` → ResearchPlan
  - [ ] Count bullish vs bearish analysts
  - [ ] Determine recommendation
  - [ ] Calculate conviction
  - [ ] Generate strategic actions
- [ ] `getDebateHistory()` → DebateMessage[]

#### DebateMessage Types
- [ ] opening
- [ ] challenge
- [ ] rebuttal
- [ ] concession
- [ ] closing

### Success Criteria
- Multi-round debate
- Evidence chains in debate
- Clear synthesis
```

---

### Ticket O2: Complete Trading Agent
**File:** `engine/agents/complete-trading-agent.ts`
**Time:** 4-5 hours
**Prerequisites:** O1 (discussion manager), D2 (portfolio manager)

```markdown
## Ticket O2: Complete Trading Agent

### Description
Build the complete trading agent that orchestrates everything:
- All sub-agents working together
- Full reasoning chain with audit
- Identity signing
- Trade execution

### Deliverables
- [ ] `engine/agents/complete-trading-agent.ts`

#### CompleteTradingAgent Class
- [ ] Initialize all sub-agents
- [ ] `runCycle(context)` → CommitteeResult
  - [ ] Phase 1: Analyst Team (parallel)
  - [ ] Phase 2: Research Debate
  - [ ] Phase 3: Trader Decision
  - [ ] Phase 4: Portfolio Manager
  - [ ] Phase 5: Execute if approved
- [ ] `shouldExecute(decision)` — check constraints
- [ ] `executeTrade(decision)` — call tools
- [ ] `recordTradeOutcome(decisionId, outcome)` — for learning

#### Event Emission
- [ ] `cycle:start`, `cycle:end`, `cycle:error`
- [ ] `phase:start` (analysts, research, trader, pm)
- [ ] `trade:execute`, `trade:complete`
- [ ] `reflection:generated`

#### Identity Integration
- [ ] Sign decisions with agent identity
- [ ] Include signature in CommitteeResult
- [ ] Verify signatures

### Success Criteria
- Full end-to-end flow working
- All agents contributing
- Audit trail complete
- Decisions signed
```

---

## P2 — LEARNING & MEMORY

### Ticket L1: Learning Engine
**File:** `engine/learning/learning-engine.ts`
**Time:** 3-4 hours
**Prerequisites:** F2 (PnL service)

```markdown
## Ticket L1: Learning Engine

### Description
Build the learning engine that:
- Extracts patterns from trade history
- Generates insights from wins/losses
- Adjusts strategies based on performance
- Validates insights against new outcomes

### Deliverables
- [ ] `engine/learning/learning-engine.ts`

#### LearningEngine Class
- [ ] `recordTradeOutcome(outcome)` — record PnL outcome
  - [ ] Extract patterns from trade
  - [ ] Generate insights
  - [ ] Validate existing insights
- [ ] `extractPatterns(outcome)` → PatternMatch[]
  - [ ] Time-based (hour, day of week)
  - [ ] Hold time (short/medium/long term)
  - [ ] PnL magnitude
  - [ ] Size-based
- [ ] `generateInsights()` — analyze patterns
- [ ] `validateInsights(outcome)` — update confidence
- [ ] `getRelevantInsights(context)` → LearningInsight[]
- [ ] `getStrategyAdjustments()` → StrategyAdjustment[]
- [ ] `buildLearningContext(context)` → string for LLM

#### Pattern Recognition
- [ ] Track pattern success rates
- [ ] Identify winning patterns (70%+, 3+ occurrences)
- [ ] Identify losing patterns (<40%, 3+ occurrences)
- [ ] Generate actionable insights

### Integration with PnL
- [ ] Import and use PnL service
- [ ] Feed trade outcomes into pattern analysis
- [ ] Calculate win rate, profit factor

### Success Criteria
- Patterns extracted from history
- Insights generated from trades
- Strategy adjustments based on performance
```

---

### Ticket L2: Reflection Generator
**File:** `engine/memory/reflection-generator.ts`
**Time:** 2-3 hours
**Prerequisites:** L1 (learning engine)

```markdown
## Ticket L2: Reflection Generator

### Description
Build the reflection generator that:
- Evaluates reasoning quality
- Extracts lessons from wins/losses
- Generates improved strategies
- Builds reflection summary for LLM context

### Deliverables
- [ ] `engine/memory/reflection-generator.ts`

#### ReflectionGenerator Class
- [ ] `generateReflection(decision, outcome)` → Reflection
  - [ ] Evaluate reasoning quality
  - [ ] Extract lessons
  - [ ] Generate improved strategies
- [ ] `evaluateReasoningQuality(decision, outcome)` — score 0-100
  - [ ] High conviction + correct = high quality
  - [ ] High conviction + incorrect = low quality
  - [ ] Evidence count factored in
- [ ] `extractLessons(decision, outcome)` → string[]
  - [ ] Conviction accuracy lessons
  - [ ] Evidence quality lessons
  - [ ] Risk management lessons
  - [ ] Timing lessons
- [ ] `generateImprovedStrategies(reflection)` → string[]
- [ ] `buildReflectionSummary()` → string for LLM

### Integration with Learning Engine
- [ ] Link reflections to patterns
- [ ] Feed into strategy adjustments

### Success Criteria
- Quality reasoning evaluation
- Actionable lessons extracted
- Improved strategies generated
```

---

## P2 — IDENTITY & ACCOUNTABILITY

### Ticket I1: Agent Identity Service
**File:** `engine/identity/agent-identity.ts`
**Time:** 3-4 hours
**Prerequisites:** O2 (complete agent)

```markdown
## Ticket I1: Agent Identity Service (ERC-8004)

### Description
Build the agent identity service that:
- Registers agents on-chain (ERC-8004)
- Manages agent metadata
- Signs decisions cryptographically
- Provides identity verification

### Deliverables
- [ ] `engine/identity/agent-identity.ts`

#### AgentIdentityService Class
- [ ] Constructor with RPC URL, contract address, signer
- [ ] `registerAgent(name, metadata)` → { tokenId, address, txHash }
  - [ ] Upload metadata to IPFS
  - [ ] Call contract.registerAgent()
  - [ ] Derive agent address from token ID
- [ ] `getAgentInfo(tokenId)` → AgentInfo
- [ ] `verifyAgent(tokenId)` → boolean
- [ ] `resolveIdentity(agentAddress)` → tokenId
- [ ] `signDecision(tokenId, decisionHash, decisionData)` → signature
  - [ ] EIP-712 typed data signing
  - [ ] Sign decision hash with agent key
- [ ] `verifyDecisionSignature()` — verify signed decisions
- [ ] `buildIdentityReport(agentId)` — full identity proof

#### ERC-8004 Integration
- [ ] Connect to deployed ERC-8004 contract
- [ ] Use Arc Testnet (chainId: 5042002)
- [ ] Support for USDC gas

### Database Integration
- [ ] `agentIdentities` table sync
- [ ] `decisionSignatures` table for signed decisions

### Success Criteria
- Agents can be registered on-chain
- Decisions are cryptographically signed
- Identity can be verified externally
```

---

## P2 — 24/7 AUTONOMY

### Ticket AU1: Event Store
**File:** `engine/autonomous/event-store.ts`
**Time:** 2-3 hours
**Prerequisites:** F1 (audit system)

```markdown
## Ticket AU1: Event Store

### Description
Build the event store for 24/7 autonomous operation:
- Event sourcing for agent state
- Event persistence and replay
- Event querying

### Deliverables
- [ ] `engine/autonomous/event-store.ts`

#### EventStore Class
- [ ] `EventType` enum (CYCLE_START, CYCLE_END, DECISION_MADE, TRADE_EXECUTED, etc.)
- [ ] `AgentEvent` interface
- [ ] `append(event)` → AgentEvent
- [ ] `getEventsSince(agentId, sinceTimestamp)` → AgentEvent[]
- [ ] `getEventsByType(agentId, type)` → AgentEvent[]
- [ ] Event persistence (in-memory, DB later)

### Events to Track
- [ ] CYCLE_START, CYCLE_END
- [ ] DECISION_MADE, DECISION_APPROVED, DECISION_REJECTED
- [ ] TRADE_EXECUTED, TRADE_CLOSED
- [ ] GOAL_UPDATED, GOAL_COMPLETED
- [ ] ERROR, RECOVERY

### Success Criteria
- All agent events captured
- Events can be queried
- Event replay possible
```

---

### Ticket AU2: Watchdog
**File:** `engine/autonomous/watchdog.ts`
**Time:** 1-2 hours
**Prerequisites:** AU1 (event store)

```markdown
## Ticket AU2: Watchdog

### Description
Build the watchdog for health monitoring:
- Heartbeat tracking
- Failure detection
- Auto-restart capability

### Deliverables
- [ ] `engine/autonomous/watchdog.ts`

#### Watchdog Class
- [ ] Constructor with config (maxSilenceMs, checkIntervalMs)
- [ ] `start(onFailure?)` — start monitoring
- [ ] `stop()` — stop monitoring
- [ ] `ping()` — heartbeat
- [ ] `isHealthy()` — check if responsive
- [ ] `getTimeSinceLastHeartbeat()` — time since last ping

#### Health Checks
- [ ] Detect stuck agent (no heartbeat)
- [ ] Detect failed cycles
- [ ] Trigger recovery on failure

### Success Criteria
- Detects unresponsive agent
- Triggers recovery
- Minimal false positives
```

---

### Ticket AU3: Self-Healer
**File:** `engine/autonomous/self-healer.ts`
**Time:** 2-3 hours
**Prerequisites:** AU2 (watchdog)

```markdown
## Ticket AU3: Self-Healer

### Description
Build the self-healer for error recovery:
- Automatic error recovery
- State restoration from checkpoints
- Graceful degradation

### Deliverables
- [ ] `engine/autonomous/self-healer.ts`

#### SelfHealer Class
- [ ] `recover(error)` — attempt recovery from error
- [ ] `restoreFromCheckpoint(agentId)` — restore state
- [ ] `rollback(lastGoodState)` — rollback to known good state
- [ ] `degrade()` — graceful degradation mode

#### Recovery Strategies
- [ ] Retry failed operations (up to 3 times)
- [ ] Restart agent loop
- [ ] Restore from last checkpoint
- [ ] Fallback to rule-based mode
- [ ] Alert on persistent failures

### Success Criteria
- Automatic recovery from errors
- State preservation
- Minimal downtime
```

---

### Ticket AU4: Autonomous Loop
**File:** `engine/autonomous/autonomous-loop.ts`
**Time:** 3-4 hours
**Prerequisites:** AU1, AU2, AU3 (all autonomy components)

```markdown
## Ticket AU4: Autonomous Loop

### Description
Build the 24/7 autonomous loop:
- Event-driven architecture
- State machine for agent lifecycle
- Integration with all components

### Deliverables
- [ ] `engine/autonomous/autonomous-loop.ts`

#### AutonomousLoop Class
- [ ] Constructor with config (cycleIntervalMs, maxRetries)
- [ ] `start()` — start autonomous operation
- [ ] `stop()` — graceful shutdown
- [ ] `runCycle()` — execute one cycle
- [ ] Event-driven processing
- [ ] Checkpoint saving
- [ ] Watchdog integration
- [ ] Self-healer integration

#### Lifecycle States
- [ ] SLEEPING → WAKING → ANALYZING → DECIDING → EXECUTING → REPORTING → SLEEPING
- [ ] ERROR → RECOVERING → SLEEPING
- [ ] SHUTTING_DOWN

#### Integration
- [ ] Event store for event sourcing
- [ ] Watchdog for health monitoring
- [ ] Self-healer for error recovery
- [ ] CompleteTradingAgent for execution

### Success Criteria
- 24/7 autonomous operation
- Automatic error recovery
- State persistence across restarts
```

---

## P3 — INTEGRATION

### Ticket IN1: Engine Index Update
**File:** `engine/index.ts`
**Time:** 2-3 hours
**Prerequisites:** All P1 tickets

```markdown
## Ticket IN1: Engine Index Update

### Description
Update the main engine index to export new components and provide 
start/stop functionality for the autonomous loop.

### Deliverables
- [ ] `engine/index.ts` — update exports

#### Exports
- [ ] Export CompleteTradingAgent
- [ ] Export all schemas
- [ ] Export AuditSystem
- [ ] Export PnLService
- [ ] Export LearningEngine
- [ ] Export AutonomousLoop
- [ ] `startEngine(config?)` — start autonomous loop
- [ ] `stopEngine()` — stop autonomous loop
- [ ] `getAgent(agentId)` — get agent by ID

### Success Criteria
- Clean API for starting/stopping engine
- All components exported
- Works with existing routes
```

---

### Ticket IN2: Cron Jobs Update
**File:** `engine/services/cron.ts`
**Time:** 2-3 hours
**Prerequisites:** F2 (PnL service)

```markdown
## Ticket IN2: Cron Jobs Update

### Description
Update cron jobs to support the new engine:
- Mark-to-market updates (every 10s)
- Hourly snapshots for charts
- Auto-close at stop loss/take profit
- Agent processing with new AI committee

### Deliverables
- [ ] `engine/services/cron.ts` — update

#### New Cron Jobs
- [ ] Every 10s: Mark-to-market updates
- [ ] Every minute: Agent processing (new AI committee)
- [ ] Every hour: PnL snapshots
- [ ] Every 30s: Auto-close check (stop loss / take profit)

#### Agent Processing Job
- [ ] Load active agents
- [ ] Run CompleteTradingAgent for each
- [ ] Use new AI-powered committee
- [ ] Record trade outcomes

### Success Criteria
- Real-time PnL updates
- Agents running autonomously
- Positions auto-closed at limits
```

---

### Ticket IN3: API Routes
**Files:** `routes/agents.ts`, `routes/pnl.ts`, etc.
**Time:** 3-4 hours
**Prerequisites:** All P1/P2 tickets

```markdown
## Ticket IN3: API Routes Update

### Description
Update API routes to expose new engine capabilities:
- Decision audit trails
- Agent reasoning chains
- PnL data
- Learning insights

### Deliverables
- [ ] `routes/agents.ts` — update

#### New Endpoints
- [ ] `GET /api/agents/:id/decisions` — recent decisions
- [ ] `GET /api/agents/:id/decisions/:decisionId` — decision detail with reasoning
- [ ] `GET /api/agents/:id/decisions/:decisionId/audit` — full audit trail
- [ ] `GET /api/agents/:id/insights` — learning insights
- [ ] `GET /api/agents/:id/patterns` — extracted patterns

#### PnL Routes
- [ ] `GET /api/pnl/:agentId/summary` — aggregated PnL
- [ ] `GET /api/pnl/:agentId/history` — chart data
- [ ] `GET /api/pnl/:agentId/metrics` — performance metrics
- [ ] `POST /api/pnl/close` — manual close

#### Identity Routes
- [ ] `GET /api/agents/:id/identity` — agent identity proof
- [ ] `GET /api/agents/:id/verify` — verify agent on-chain

### Success Criteria
- All new data exposed via API
- Frontend can consume new data
- Audit trails accessible
```

---

## P3 — TESTING & POLISH

### Ticket TP1: Integration Tests
**Time:** 4-5 hours
**Prerequisites:** All P1/P2/P3 tickets

```markdown
## Ticket TP1: Integration Tests

### Description
Write integration tests for the complete flow:
- Agent cycle end-to-end
- Audit trail verification
- PnL tracking accuracy
- Learning engine effectiveness

### Deliverables
- [ ] `engine/__tests__/integration/`

#### Test Suites
- [ ] `agent-cycle.test.ts` — full cycle test
- [ ] `audit-trail.test.ts` — verify audit integrity
- [ ] `pnl-tracking.test.ts` — PnL calculations
- [ ] `learning.test.ts` — pattern extraction
- [ ] `identity.test.ts` — identity signing/verification

### Success Criteria
- All tests passing
- Coverage > 80%
- Integration tests for critical paths
```

---

### Ticket TP2: Error Handling & Edge Cases
**Time:** 2-3 hours
**Prerequisites:** All P1/P2 tickets

```markdown
## Ticket TP2: Error Handling & Edge Cases

### Description
Add comprehensive error handling:
- LLM failure handling
- API timeout handling
- Invalid data handling
- Graceful degradation

### Deliverables
- [ ] Error boundaries in all agents
- [ ] Fallback strategies
- [ ] Retry logic with backoff
- [ ] Error logging and alerting

### Success Criteria
- No unhandled exceptions
- Graceful degradation
- Meaningful error messages
```

---

## 📊 TICKET SUMMARY

| Ticket | Name | Time | Prerequisites |
|--------|------|------|---------------|
| **FOUNDATION** |
| F1 | Audit System | 3-4h | - |
| F2 | PnL Service | 2-3h | F1 |
| F3 | Base Agent | 2-3h | F1 |
| **ANALYSTS** |
| A1 | Technical Analyst | 2-3h | F3 |
| A2 | Sentiment Analyst | 2-3h | F3 |
| A3 | OnChain Analyst | 2-3h | F3 |
| A4 | Macro Analyst | 2-3h | F3 |
| **RESEARCHERS** |
| R1 | Bull Researcher | 2-3h | A1-A4 |
| R2 | Bear Researcher | 2-3h | A1-A4 |
| **DECISION MAKERS** |
| D1 | Trader | 2-3h | R1, R2 |
| D2 | Portfolio Manager | 2-3h | D1 |
| **ORCHESTRATION** |
| O1 | Discussion Manager | 3-4h | R1, R2 |
| O2 | Complete Agent | 4-5h | O1, D2 |
| **LEARNING** |
| L1 | Learning Engine | 3-4h | F2 |
| L2 | Reflection Generator | 2-3h | L1 |
| **IDENTITY** |
| I1 | Agent Identity | 3-4h | O2 |
| **AUTONOMY** |
| AU1 | Event Store | 2-3h | F1 |
| AU2 | Watchdog | 1-2h | AU1 |
| AU3 | Self-Healer | 2-3h | AU2 |
| AU4 | Autonomous Loop | 3-4h | AU1, AU2, AU3 |
| **INTEGRATION** |
| IN1 | Engine Index | 2-3h | All P1 |
| IN2 | Cron Jobs | 2-3h | F2 |
| IN3 | API Routes | 3-4h | All P1/P2 |
| **TESTING** |
| TP1 | Integration Tests | 4-5h | All P1/P2/P3 |
| TP2 | Error Handling | 2-3h | All P1/P2 |

**Total: 25 tickets | 50-65 hours**

---

## 🚀 PARALLELIZATION SUGGESTIONS

### Team of 2 (Week 1)
**Developer A:**
- F1 → F3 → A1 → A2 → R1 → R2 → D1 → D2 → O1 → O2

**Developer B:**
- F2 → L1 → L2 → AU1 → AU2 → AU3 → AU4 → IN1 → IN2 → IN3

### Team of 3 (Week 1)
**Developer A (Agents):**
- F3 → A1 → A2 → A3 → A4 → R1 → R2

**Developer B (Decision):**
- F1 → D1 → D2 → O1 → O2

**Developer C (Infrastructure):**
- F2 → L1 → L2 → AU1 → AU2 → AU3 → AU4

---

## ✅ SUCCESS CRITERIA

When all tickets complete:
1. ✅ Real AI-powered committee (not deterministic)
2. ✅ Verifiable reasoning with evidence chains
3. ✅ Full audit trail with cryptographic hashing
4. ✅ Realized & unrealized PnL tracking
5. ✅ Learning from trade history
6. ✅ ERC-8004 agent identity
7. ✅ 24/7 autonomous operation
8. ✅ All decisions traceable and accountable
