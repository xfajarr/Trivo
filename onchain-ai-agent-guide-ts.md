# 🤖 Onchain AI Agent Engine — Complete Guide (TypeScript)
### Long-Term Memory · Deep Thinking · Autonomous DeFi Decision Making

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [Project Setup](#2-project-setup)
3. [Memory System: Vector DB Deep Dive](#3-memory-system-vector-db-deep-dive)
4. [Agent Core: Thinking & Reasoning Engine](#4-agent-core-thinking--reasoning-engine)
5. [Decision Engine for Onchain Transactions](#5-decision-engine-for-onchain-transactions)
6. [Tool Layer: DeFi & Trading Integrations](#6-tool-layer-defi--trading-integrations)
7. [Risk Management Framework](#7-risk-management-framework)
8. [Full Stack Implementation](#8-full-stack-implementation)
9. [Deployment & Monitoring](#9-deployment--monitoring)

---

## 1. Overview & Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                     ONCHAIN AI AGENT                        │
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Market  │───▶│   Thinking   │───▶│    Decision      │  │
│  │  Input   │    │   Engine     │    │    Engine        │  │
│  └──────────┘    └──────┬───────┘    └────────┬─────────┘  │
│                         │                     │            │
│  ┌──────────────────────▼─────────────────────▼─────────┐  │
│  │                   MEMORY SYSTEM                       │  │
│  │  Working Memory │ Episodic │ Semantic │ Procedural   │  │
│  └─────────────────────────────────────────────────────┘  │
│                         │                                  │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │                    TOOL LAYER                        │  │
│  │   DEX │ Lending │ Bridge │ Price Feed │ Gas Oracle  │  │
│  └────────────────────────┬────────────────────────────┘  │
│                           │                                 │
│                    ┌──────▼──────┐                         │
│                    │  BLOCKCHAIN  │                         │
│                    └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

- **Autonomy** — Agent operates 24/7, mampu execute onchain actions tanpa intervensi
- **Memory Persistence** — Ingat setiap trade, market condition, dan outcome sebelumnya
- **Transparent Reasoning** — Setiap keputusan ada audit trail yang jelas
- **Risk-First** — Setiap action dievaluasi risikonya sebelum execute

---

## 2. Project Setup

### Folder Structure

```
onchain-agent/
├── src/
│   ├── types/          # Shared TypeScript interfaces & enums
│   ├── memory/         # Vector DB & memory system
│   ├── agent/          # Thinking & decision engine
│   ├── tools/          # DeFi tool integrations
│   ├── risk/           # Circuit breaker & risk management
│   ├── config/         # Risk config & constants
│   └── main.ts         # Entry point
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

### package.json

```json
{
  "name": "onchain-agent",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.25.0",
    "@qdrant/js-client-rest": "^1.9.0",
    "openai": "^4.47.0",
    "viem": "^2.13.0",
    "axios": "^1.7.0",
    "ioredis": "^5.3.0",
    "uuid": "^10.0.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/uuid": "^10.0.0",
    "typescript": "^5.4.0",
    "tsx": "^4.11.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 3. Memory System: Vector DB Deep Dive

### Kenapa Vector DB adalah Best Choice?

| Kriteria | SQL/NoSQL | Vector DB | Hybrid (Best) |
|---|---|---|---|
| Semantic similarity search | ❌ | ✅ | ✅ |
| "Situasi mirip sebelumnya?" | ❌ | ✅ | ✅ |
| Structured queries | ✅ | ⚠️ | ✅ |
| Speed at scale | ✅ | ✅ | ✅ |
| Onchain context retrieval | ❌ | ✅ | ✅ |

**Verdict:** Pakai **Hybrid** — Qdrant untuk semantic memory + Redis untuk working memory cache.

### Pilihan Vector DB

#### 🥇 Qdrant — Recommended untuk Onchain Agent
- ✅ Self-hosted — critical karena agent handle private keys, data tidak boleh keluar
- ✅ Built-in payload filtering (filter by chain, protocol, date)
- ✅ Rust-based — sangat cepat
- ✅ TypeScript client yang bagus
- ✅ Sparse + Dense vector hybrid search

#### 🥈 Pinecone — Best untuk cloud managed
- ✅ Zero ops, langsung pakai
- ❌ Data ke cloud (masalah kalau agent handle secrets)
- ❌ Mahal di scale

#### 🥉 pgvector — Best untuk simplicity
- ✅ Langsung di Postgres yang mungkin sudah dipakai
- ❌ Slower di very large scale

**Bottom Line:** Untuk production onchain agent → **Qdrant (self-hosted)** + **Redis** untuk caching.

---

### Types — Mulai dari sini selalu

```typescript
// src/types/index.ts

export type Chain = 'ethereum' | 'arbitrum' | 'optimism' | 'base' | 'polygon'
export type Protocol = 'uniswap-v3' | 'curve' | 'aave-v3' | 'compound-v3' | 'convex' | 'balancer-v2'
export type RiskLevel = 'low' | 'medium' | 'high'
export type Urgency = 'low' | 'medium' | 'high'

export enum ActionType {
  SWAP = 'swap',
  PROVIDE_LIQUIDITY = 'provide_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  BORROW = 'borrow',
  REPAY = 'repay',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  BRIDGE = 'bridge',
  HOLD = 'hold',
}

// Trade memory yang disimpan ke Qdrant
export interface TradeMemory {
  id?: string
  timestamp: string
  chain: Chain
  protocol: Protocol
  action: ActionType
  amount: string
  token: string
  entryPrice?: number
  exitPrice?: number
  gasUsedUsd: number
  marketContext: string       // JSON string dari market state
  reasoning: string           // Full reasoning dari agent
  outcome: 'success' | 'failed' | 'pending'
  pnlUsd?: number
  storedAt?: string
}

// Semantic insight hasil distillasi
export interface SemanticInsight {
  topic: string
  insight: {
    keyPatterns: string[]
    riskLessons: string[]
    optimalConditions: string[]
    avoidConditions: string[]
  }
  distilledAt: string
}

// Output dari thinking engine
export interface ThinkingOutput {
  observation: string
  reasoning: string
  riskAssessment: {
    level: RiskLevel
    factors: string[]
  }
  action: {
    type: ActionType
    params: ActionParams
  }
  confidence: number          // 0-100
  abortConditions: string[]
}

export interface ActionParams {
  protocol?: Protocol
  chain?: Chain
  tokenIn?: string
  tokenOut?: string
  amountUsd?: number
  amount?: string
  expectedProfitUsd?: number
  gasEstimateUsd?: number
  feesUsd?: number
  slippageCostUsd?: number
  slippageBps?: number
  price?: number
  [key: string]: unknown
}

// Final decision setelah evaluasi
export interface TradeDecision {
  action: ActionType
  protocol: Protocol
  chain: Chain
  params: ActionParams
  expectedProfitUsd: number
  gasEstimateUsd: number
  netProfitUsd: number
  confidence: number
  reasoning: string
  riskLevel: RiskLevel
  abortConditions: string[]
}

// State portfolio
export interface PortfolioState {
  totalValueUsd: number
  dailyPnlUsd: number
  summary: string
  positions: Position[]
}

export interface Position {
  protocol: Protocol
  chain: Chain
  token: string
  valueUsd: number
  apy?: number
}

// Market state
export interface MarketState {
  summary: {
    ethGasGwei?: number
    arbGasGwei?: number
    timestamp: string
    [key: string]: unknown
  }
}

// Config
export interface AgentConfig {
  rpcEndpoints: Partial<Record<Chain, string>>
  walletAddress: string
}

export interface RiskConfig {
  maxPositionPct: number
  maxSingleProtocolPct: number
  maxSingleChainPct: number
  maxDailyLossUsd: number
  maxDrawdownPct: number
  minProfitUsd: number
  minProfitPct: number
  maxSlippageBps: number
  maxGasCostPctOfProfit: number
  allowedProtocols: Protocol[]
  allowedChains: Chain[]
  allowHighRisk: boolean
  pauseOnConsecutiveLosses: number
  cooldownPeriodMinutes: number
}
```

---

### Memory System Implementation

```typescript
// src/memory/vectorStore.ts

import { QdrantClient } from '@qdrant/js-client-rest'
import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import Anthropic from '@anthropic-ai/sdk'
import type { TradeMemory, SemanticInsight } from '../types/index.js'

interface MemoryFilter {
  chain?: string
  protocol?: string
  outcome?: string
}

interface QdrantPayload {
  memoryText: string
  storedAt: string
  [key: string]: unknown
}

const COLLECTIONS = {
  episodic: 'agent_episodic_memory',
  semantic: 'agent_semantic_memory',
} as const

type CollectionKey = keyof typeof COLLECTIONS

export class AgentMemorySystem {
  private qdrant: QdrantClient
  private embedder: OpenAI
  private anthropic: Anthropic

  constructor() {
    this.qdrant = new QdrantClient({ host: 'localhost', port: 6333 })
    this.embedder = new OpenAI()
    this.anthropic = new Anthropic()
  }

  async init(): Promise<void> {
    for (const [, collectionName] of Object.entries(COLLECTIONS)) {
      try {
        await this.qdrant.createCollection(collectionName, {
          vectors: { size: 1536, distance: 'Cosine' },
        })
        console.log(`✅ Collection "${collectionName}" created`)
      } catch {
        // Collection sudah ada, skip
      }
    }
  }

  private async embed(text: string): Promise<number[]> {
    const response = await this.embedder.embeddings.create({
      input: text,
      model: 'text-embedding-3-small',
    })
    return response.data[0].embedding
  }

  private buildMemoryText(trade: TradeMemory): string {
    return `
Trade pada ${trade.timestamp}
Chain: ${trade.chain} | Protocol: ${trade.protocol}
Action: ${trade.action} ${trade.amount} ${trade.token}
Entry Price: ${trade.entryPrice ?? 'N/A'} | Exit Price: ${trade.exitPrice ?? 'open'}
PnL: ${trade.pnlUsd ?? 'N/A'} USD | Gas Used: ${trade.gasUsedUsd} USD
Market Context: ${trade.marketContext}
Reasoning: ${trade.reasoning}
Outcome: ${trade.outcome}
    `.trim()
  }

  async storeTradeMemory(trade: TradeMemory): Promise<void> {
    const memoryText = this.buildMemoryText(trade)
    const vector = await this.embed(memoryText)

    const payload: QdrantPayload = {
      ...trade,
      memoryText,
      storedAt: new Date().toISOString(),
    }

    await this.qdrant.upsert(COLLECTIONS.episodic, {
      points: [{
        id: uuidv4(),
        vector,
        payload,
      }],
    })
  }

  async retrieveRelevantMemories(
    currentContext: string,
    memoryType: CollectionKey = 'episodic',
    topK: number = 5,
    filters?: MemoryFilter,
  ): Promise<QdrantPayload[]> {
    const queryVector = await this.embed(currentContext)

    const searchParams: Parameters<typeof this.qdrant.search>[1] = {
      vector: queryVector,
      limit: topK,
      withPayload: true,
    }

    // Build filter kalau ada
    if (filters) {
      const conditions = Object.entries(filters)
        .filter(([, v]) => v !== undefined)
        .map(([key, value]) => ({
          key,
          match: { value },
        }))

      if (conditions.length > 0) {
        searchParams.filter = { must: conditions }
      }
    }

    const results = await this.qdrant.search(COLLECTIONS[memoryType], searchParams)
    return results.map(hit => hit.payload as QdrantPayload)
  }

  /**
   * Distill recent episodic memories → semantic insight.
   * Jalankan secara periodik (misalnya setiap hari via cron).
   */
  async distillToSemanticMemory(topic: string): Promise<SemanticInsight['insight']> {
    const relevant = await this.retrieveRelevantMemories(topic, 'episodic', 20)
    const memoriesText = relevant.map(m => m.memoryText).join('\n\n')

    const response = await this.anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analisis trade memories berikut dan ekstrak insights yang actionable:

${memoriesText}

Respond ONLY dengan JSON (tanpa markdown/backticks):
{
  "keyPatterns": ["..."],
  "riskLessons": ["..."],
  "optimalConditions": ["..."],
  "avoidConditions": ["..."]
}`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const insight = JSON.parse(text) as SemanticInsight['insight']

    // Simpan ke semantic collection
    const insightText = `${topic} ${JSON.stringify(insight)}`
    const vector = await this.embed(insightText)

    await this.qdrant.upsert(COLLECTIONS.semantic, {
      points: [{
        id: uuidv4(),
        vector,
        payload: {
          topic,
          insight,
          distilledAt: new Date().toISOString(),
        },
      }],
    })

    return insight
  }
}
```

---

## 4. Agent Core: Thinking & Reasoning Engine

```typescript
// src/agent/thinkingEngine.ts

import Anthropic from '@anthropic-ai/sdk'
import type { MessageParam, ToolUseBlock } from '@anthropic-ai/sdk/resources/messages.js'
import type { AgentMemorySystem } from '../memory/vectorStore.js'
import type { DeFiToolRegistry } from '../tools/defiTools.js'
import type {
  ThinkingOutput,
  MarketState,
  PortfolioState,
} from '../types/index.js'

const SYSTEM_PROMPT = `
You are an autonomous DeFi trading agent with expertise in onchain transactions.

Your capabilities:
- Execute trades on DEXs (Uniswap, Curve, Balancer)
- Manage lending positions (Aave, Compound)
- Farm yield opportunities (Convex, Yearn)
- Bridge assets across chains
- Monitor and rebalance portfolios

Your decision framework:
1. OBSERVE: Analisis market data, portfolio state, dan relevant memories
2. THINK: Reasoning step-by-step tentang peluang dan risiko
3. PLAN: Buat action plan dengan contingencies
4. ACT: Execute dengan parameter yang tepat
5. REFLECT: Evaluasi hasil dan simpan ke memory

CRITICAL RULES:
- Selalu kalkulasi slippage, gas cost, dan net profit sebelum execute
- Jangan pernah exceed risk limits yang sudah ditetapkan
- Jika uncertainty tinggi, pilih action yang lebih konservatif
- Semua reasoning harus transparan dan bisa diaudit

Respond ONLY dengan JSON (tanpa markdown/backticks):
{
  "observation": "...",
  "reasoning": "step by step analysis...",
  "riskAssessment": { "level": "low|medium|high", "factors": [...] },
  "action": { "type": "swap|provide_liquidity|borrow|stake|hold|...", "params": {...} },
  "confidence": 0-100,
  "abortConditions": [...]
}
`.trim()

export class ThinkingEngine {
  private client: Anthropic
  private memory: AgentMemorySystem
  private tools: DeFiToolRegistry
  private conversationHistory: MessageParam[]

  constructor(memory: AgentMemorySystem, tools: DeFiToolRegistry) {
    this.client = new Anthropic()
    this.memory = memory
    this.tools = tools
    this.conversationHistory = []
  }

  async think(
    marketState: MarketState,
    portfolio: PortfolioState,
  ): Promise<ThinkingOutput> {
    // Reset conversation per cycle
    this.conversationHistory = []

    // Step 1: Build context query untuk memory retrieval
    const contextQuery = `
      Market: ${JSON.stringify(marketState.summary)}
      Portfolio value: ${portfolio.totalValueUsd} USD
      Daily PnL: ${portfolio.dailyPnlUsd} USD
      Looking for: similar market conditions and past outcomes
    `.trim()

    // Step 2: Retrieve relevant memories
    const [episodicMemories, semanticInsights] = await Promise.all([
      this.memory.retrieveRelevantMemories(contextQuery, 'episodic', 5),
      this.memory.retrieveRelevantMemories(contextQuery, 'semantic', 3),
    ])

    // Step 3: Build user message dengan full context
    const userMessage = this.buildContextPrompt(
      marketState,
      portfolio,
      episodicMemories,
      semanticInsights,
    )

    this.conversationHistory.push({ role: 'user', content: userMessage })

    // Step 4: Run ReAct thinking loop
    return this.runThinkingLoop()
  }

  private buildContextPrompt(
    marketState: MarketState,
    portfolio: PortfolioState,
    episodicMemories: Record<string, unknown>[],
    semanticInsights: Record<string, unknown>[],
  ): string {
    const memoriesStr = episodicMemories
      .map(m => {
        const mem = m as { timestamp?: string; action?: string; outcome?: string; pnlUsd?: number }
        return `- [${mem.timestamp}] ${mem.action} → ${mem.outcome ?? 'N/A'} | PnL: ${mem.pnlUsd ?? 'N/A'} USD`
      })
      .join('\n') || 'Tidak ada trade relevan sebelumnya'

    const insightsStr = semanticInsights
      .map(s => {
        const insight = s as { insight?: unknown }
        return JSON.stringify(insight.insight, null, 2)
      })
      .join('\n') || 'Belum ada insights tersimpan'

    return `
## Current Market State
${JSON.stringify(marketState, null, 2)}

## Portfolio State
${JSON.stringify(portfolio, null, 2)}

## Relevant Past Trades (dari memory)
${memoriesStr}

## Distilled Insights (dari pengalaman)
${insightsStr}

## Task
Analisis situasi saat ini dan tentukan action terbaik.
Gunakan past memories sebagai referensi — apakah kondisi ini mirip dengan yang pernah terjadi?
Berikan reasoning yang lengkap sebelum memutuskan action.
    `.trim()
  }

  private async runThinkingLoop(maxIterations: number = 10): Promise<ThinkingOutput> {
    for (let i = 0; i < maxIterations; i++) {
      const response = await this.client.messages.create({
        model: 'claude-opus-4-20250514',   // Opus untuk complex reasoning
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: this.conversationHistory,
        tools: this.tools.getToolSchemas(),
      })

      // Agent selesai thinking, parse JSON
      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(b => b.type === 'text')
        if (!textBlock || textBlock.type !== 'text') {
          throw new Error('No text in agent response')
        }
        return JSON.parse(textBlock.text) as ThinkingOutput
      }

      // Agent mau pakai tool
      if (response.stop_reason === 'tool_use') {
        const toolResults = await this.handleToolCalls(
          response.content.filter((b): b is ToolUseBlock => b.type === 'tool_use'),
        )

        this.conversationHistory.push(
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        )
      }
    }

    throw new Error('Max iterations reached without decision')
  }

  private async handleToolCalls(
    toolBlocks: ToolUseBlock[],
  ): Promise<Anthropic.Messages.ToolResultBlockParam[]> {
    const results = await Promise.all(
      toolBlocks.map(async block => {
        const result = await this.tools.execute(
          block.name,
          block.input as Record<string, unknown>,
        )
        return {
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: JSON.stringify(result),
        }
      }),
    )
    return results
  }
}
```

---

## 5. Decision Engine for Onchain Transactions

```typescript
// src/agent/decisionEngine.ts

import { ActionType } from '../types/index.js'
import type {
  ThinkingOutput,
  TradeDecision,
  PortfolioState,
  RiskConfig,
  RiskLevel,
  Protocol,
  Chain,
} from '../types/index.js'

interface ProfitMetrics {
  grossProfitUsd: number
  gasUsd: number
  protocolFees: number
  slippageCost: number
  netProfitUsd: number
}

export class DecisionEngine {
  constructor(private readonly riskConfig: RiskConfig) {}

  evaluate(
    thinkingOutput: ThinkingOutput,
    portfolio: PortfolioState,
  ): TradeDecision | null {
    const { action, confidence, riskAssessment } = thinkingOutput

    // Hard risk gates
    if (!this.passesRiskGates(thinkingOutput, portfolio)) {
      return null
    }

    // Confidence gate — semakin tinggi risk, semakin tinggi confidence yang dibutuhkan
    const minConfidence: Record<RiskLevel, number> = {
      low: 60,
      medium: 75,
      high: 90,
    }

    if (confidence < minConfidence[riskAssessment.level]) {
      console.log(
        `⛔ Confidence ${confidence} < minimum ${minConfidence[riskAssessment.level]} untuk risk ${riskAssessment.level}`,
      )
      return null
    }

    // Profitability check
    const profitMetrics = this.calculateProfitability(action.params)

    if (profitMetrics.netProfitUsd < this.riskConfig.minProfitUsd) {
      console.log(`⛔ Net profit $${profitMetrics.netProfitUsd.toFixed(2)} terlalu kecil`)
      return null
    }

    // Gas tidak boleh lebih dari X% dari gross profit
    if (profitMetrics.grossProfitUsd > 0) {
      const gasPct = profitMetrics.gasUsd / profitMetrics.grossProfitUsd
      if (gasPct > this.riskConfig.maxGasCostPctOfProfit) {
        console.log(`⛔ Gas cost ${(gasPct * 100).toFixed(1)}% terlalu tinggi vs profit`)
        return null
      }
    }

    return {
      action: action.type,
      protocol: action.params.protocol as Protocol,
      chain: action.params.chain as Chain,
      params: action.params,
      expectedProfitUsd: profitMetrics.grossProfitUsd,
      gasEstimateUsd: profitMetrics.gasUsd,
      netProfitUsd: profitMetrics.netProfitUsd,
      confidence,
      reasoning: thinkingOutput.reasoning,
      riskLevel: riskAssessment.level,
      abortConditions: thinkingOutput.abortConditions,
    }
  }

  private passesRiskGates(
    thinkingOutput: ThinkingOutput,
    portfolio: PortfolioState,
  ): boolean {
    const { params } = thinkingOutput.action
    const tradeSizeUsd = params.amountUsd ?? 0

    // 1. Position size
    const maxPositionUsd = portfolio.totalValueUsd * this.riskConfig.maxPositionPct
    if (tradeSizeUsd > maxPositionUsd) {
      console.log(`⛔ Trade size $${tradeSizeUsd} melebihi max $${maxPositionUsd.toFixed(0)}`)
      return false
    }

    // 2. Daily loss limit
    if (portfolio.dailyPnlUsd < -this.riskConfig.maxDailyLossUsd) {
      console.log(`⛔ Daily loss limit reached: $${portfolio.dailyPnlUsd}`)
      return false
    }

    // 3. Protocol whitelist
    if (params.protocol && !this.riskConfig.allowedProtocols.includes(params.protocol as Protocol)) {
      console.log(`⛔ Protocol ${params.protocol} tidak di whitelist`)
      return false
    }

    // 4. Chain whitelist
    if (params.chain && !this.riskConfig.allowedChains.includes(params.chain as Chain)) {
      console.log(`⛔ Chain ${params.chain} tidak di whitelist`)
      return false
    }

    // 5. High risk gate
    if (thinkingOutput.riskAssessment.level === 'high' && !this.riskConfig.allowHighRisk) {
      console.log('⛔ High risk trades tidak diizinkan dalam config')
      return false
    }

    return true
  }

  private calculateProfitability(params: ThinkingOutput['action']['params']): ProfitMetrics {
    const grossProfitUsd = params.expectedProfitUsd ?? 0
    const gasUsd = params.gasEstimateUsd ?? 0
    const protocolFees = params.feesUsd ?? 0
    const slippageCost = params.slippageCostUsd ?? 0

    return {
      grossProfitUsd,
      gasUsd,
      protocolFees,
      slippageCost,
      netProfitUsd: grossProfitUsd - gasUsd - protocolFees - slippageCost,
    }
  }
}
```

---

## 6. Tool Layer: DeFi & Trading Integrations

```typescript
// src/tools/defiTools.ts

import axios from 'axios'
import { createPublicClient, http, formatUnits } from 'viem'
import { mainnet, arbitrum } from 'viem/chains'
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js'
import type { Chain, Protocol, Urgency, PortfolioState } from '../types/index.js'

interface TokenPrice {
  priceUsd: number
  confidence: number
  timestamp: number
  source: string
  error?: string
}

interface GasPrice {
  gasPriceGwei: number
  estimatedSwapCostUsd: number
  error?: string
}

interface ProtocolHealth {
  isHealthy: boolean
  tvlUsd: number
  tvlChange24hPct: number
  warning?: string
  error?: string
}

interface SwapSimulation {
  toAmount: string
  gasEstimateUsd: number
  protocols: string[]
  priceImpactPct: number
  error?: string
}

type ToolInput = Record<string, unknown>
type ToolResult = TokenPrice | GasPrice | ProtocolHealth | SwapSimulation | PortfolioState | { error: string }

export class DeFiToolRegistry {
  private viemClients: Partial<Record<Chain, ReturnType<typeof createPublicClient>>>

  constructor(
    private readonly rpcEndpoints: Partial<Record<Chain, string>>,
    private readonly walletAddress: string,
  ) {
    this.viemClients = {}

    if (rpcEndpoints.ethereum) {
      this.viemClients.ethereum = createPublicClient({
        chain: mainnet,
        transport: http(rpcEndpoints.ethereum),
      })
    }
    if (rpcEndpoints.arbitrum) {
      this.viemClients.arbitrum = createPublicClient({
        chain: arbitrum,
        transport: http(rpcEndpoints.arbitrum),
      })
    }
  }

  getToolSchemas(): Tool[] {
    return [
      {
        name: 'get_token_price',
        description: 'Get current price of a token from multiple sources (DeFiLlama + Coingecko)',
        input_schema: {
          type: 'object' as const,
          properties: {
            tokenAddress: { type: 'string', description: 'Token contract address' },
            chain: { type: 'string', enum: ['ethereum', 'arbitrum', 'optimism', 'base', 'polygon'] },
          },
          required: ['tokenAddress', 'chain'],
        },
      },
      {
        name: 'get_pool_data',
        description: 'Get liquidity pool data including TVL, APR, volume',
        input_schema: {
          type: 'object' as const,
          properties: {
            poolAddress: { type: 'string' },
            protocol: { type: 'string' },
            chain: { type: 'string' },
          },
          required: ['poolAddress', 'protocol', 'chain'],
        },
      },
      {
        name: 'simulate_swap',
        description: 'Simulate a token swap — get expected output, price impact, and gas estimate',
        input_schema: {
          type: 'object' as const,
          properties: {
            tokenIn: { type: 'string' },
            tokenOut: { type: 'string' },
            amountIn: { type: 'string' },
            chain: { type: 'string' },
            slippageBps: { type: 'number', description: 'Slippage in basis points (default 50 = 0.5%)' },
          },
          required: ['tokenIn', 'tokenOut', 'amountIn', 'chain'],
        },
      },
      {
        name: 'get_portfolio_state',
        description: 'Get current portfolio positions, balances, and PnL across chains',
        input_schema: {
          type: 'object' as const,
          properties: {
            chains: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      {
        name: 'get_gas_price',
        description: 'Get current gas price and estimated transaction cost in USD',
        input_schema: {
          type: 'object' as const,
          properties: {
            chain: { type: 'string' },
            urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['chain'],
        },
      },
      {
        name: 'check_protocol_health',
        description: 'Check if a DeFi protocol is healthy — TVL, no exploits, normal activity',
        input_schema: {
          type: 'object' as const,
          properties: {
            protocol: { type: 'string' },
            chain: { type: 'string' },
          },
          required: ['protocol'],
        },
      },
    ]
  }

  async execute(toolName: string, params: ToolInput): Promise<ToolResult> {
    try {
      switch (toolName) {
        case 'get_token_price':
          return this.getTokenPrice(params.tokenAddress as string, params.chain as Chain)
        case 'simulate_swap':
          return this.simulateSwap(
            params.tokenIn as string,
            params.tokenOut as string,
            params.amountIn as string,
            params.chain as Chain,
            (params.slippageBps as number) ?? 50,
          )
        case 'get_portfolio_state':
          return this.getPortfolioState((params.chains as Chain[]) ?? [])
        case 'get_gas_price':
          return this.getGasPrice(params.chain as Chain, (params.urgency as Urgency) ?? 'medium')
        case 'check_protocol_health':
          return this.checkProtocolHealth(params.protocol as Protocol)
        default:
          return { error: `Unknown tool: ${toolName}` }
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) }
    }
  }

  private async getTokenPrice(tokenAddress: string, chain: Chain): Promise<TokenPrice> {
    const url = `https://coins.llama.fi/prices/current/${chain}:${tokenAddress}`
    const { data } = await axios.get<{
      coins: Record<string, { price: number; confidence: number; timestamp: number }>
    }>(url)

    const coinKey = `${chain}:${tokenAddress}`
    const coin = data.coins[coinKey]

    if (!coin) {
      return { priceUsd: 0, confidence: 0, timestamp: 0, source: 'defillama', error: 'Price not found' }
    }

    return {
      priceUsd: coin.price,
      confidence: coin.confidence,
      timestamp: coin.timestamp,
      source: 'defillama',
    }
  }

  private async simulateSwap(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    chain: Chain,
    slippageBps: number = 50,
  ): Promise<SwapSimulation> {
    // Pakai 1inch Fusion API atau Paraswap
    // Ini contoh struktur response-nya
    const gasPrice = await this.getGasPrice(chain, 'medium')
    
    return {
      toAmount: '0',                       // Fill dari actual API
      gasEstimateUsd: gasPrice.estimatedSwapCostUsd,
      protocols: ['uniswap-v3'],
      priceImpactPct: 0.1,
    }
  }

  private async getPortfolioState(chains: Chain[]): Promise<PortfolioState> {
    // Integrasi dengan Zapper API atau Zerion
    // https://api.zapper.xyz/v2/balances
    return {
      totalValueUsd: 10000,
      dailyPnlUsd: 0,
      summary: 'Portfolio state fetched',
      positions: [],
    }
  }

  private async getGasPrice(chain: Chain, urgency: Urgency = 'medium'): Promise<GasPrice> {
    const client = this.viemClients[chain]

    if (!client) {
      return { gasPriceGwei: 0, estimatedSwapCostUsd: 0, error: `Chain ${chain} not configured` }
    }

    const gasPrice = await client.getGasPrice()
    const gasPriceGwei = Number(formatUnits(gasPrice, 9))

    // Estimasi untuk swap (~200k gas) dengan ETH = $3000
    const ethPriceUsd = 3000
    const estimatedSwapCostUsd = (Number(gasPrice) * 200000 / 1e18) * ethPriceUsd

    return { gasPriceGwei, estimatedSwapCostUsd }
  }

  private async checkProtocolHealth(protocol: Protocol): Promise<ProtocolHealth> {
    const { data } = await axios.get<{
      tvl: Array<{ totalLiquidityUSD: number }>
    }>(`https://api.llama.fi/protocol/${protocol}`)

    const tvl = data.tvl ?? []

    if (tvl.length < 2) {
      return { isHealthy: true, tvlUsd: 0, tvlChange24hPct: 0 }
    }

    const recentTvl = tvl[tvl.length - 1].totalLiquidityUSD
    const prevTvl = tvl[tvl.length - 2].totalLiquidityUSD
    const tvlChange24hPct = ((recentTvl - prevTvl) / prevTvl) * 100
    const isHealthy = Math.abs(tvlChange24hPct) < 20 // Alert kalau TVL berubah >20%

    return {
      isHealthy,
      tvlUsd: recentTvl,
      tvlChange24hPct,
      warning: isHealthy ? undefined : `TVL changed ${tvlChange24hPct.toFixed(1)}% in 24h`,
    }
  }
}
```

---

## 7. Risk Management Framework

```typescript
// src/config/riskConfig.ts
import type { RiskConfig } from '../types/index.js'

export const RISK_CONFIG: RiskConfig = {
  // Position limits
  maxPositionPct: 0.20,          // Max 20% portfolio per trade
  maxSingleProtocolPct: 0.40,    // Max 40% di satu protocol
  maxSingleChainPct: 0.60,       // Max 60% di satu chain

  // Loss limits
  maxDailyLossUsd: 500,          // Stop trading kalau rugi >$500/day
  maxDrawdownPct: 0.15,          // Max 15% portfolio drawdown

  // Profit requirements
  minProfitUsd: 5,               // Minimum profit $5 setelah gas
  minProfitPct: 0.003,           // Minimum 0.3% return

  // Execution limits
  maxSlippageBps: 100,           // Max 1% slippage
  maxGasCostPctOfProfit: 0.30,   // Gas tidak boleh >30% dari profit

  // Whitelists
  allowedProtocols: ['uniswap-v3', 'curve', 'aave-v3', 'compound-v3', 'convex', 'balancer-v2'],
  allowedChains: ['ethereum', 'arbitrum', 'optimism', 'base'],

  // Risk levels
  allowHighRisk: false,

  // Circuit breaker
  pauseOnConsecutiveLosses: 3,
  cooldownPeriodMinutes: 60,
}
```

```typescript
// src/risk/circuitBreaker.ts
import type { RiskConfig } from '../types/index.js'

interface CircuitBreakerStatus {
  canTrade: boolean
  reason?: string
  resumeAt?: Date
}

export class CircuitBreaker {
  private consecutiveLosses = 0
  private isPaused = false
  private pauseUntil: Date | null = null
  private dailyPnl = 0
  private dailyResetTime: Date

  constructor(private readonly config: RiskConfig) {
    this.dailyResetTime = this.getMidnightUTC()
  }

  private getMidnightUTC(): Date {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    return d
  }

  recordTradeResult(pnlUsd: number): void {
    // Reset daily PnL kalau sudah hari baru
    const now = new Date()
    const nextMidnight = new Date(this.dailyResetTime.getTime() + 86400000)

    if (now >= nextMidnight) {
      this.dailyPnl = 0
      this.consecutiveLosses = 0
      this.dailyResetTime = this.getMidnightUTC()
    }

    this.dailyPnl += pnlUsd

    if (pnlUsd < 0) {
      this.consecutiveLosses++
    } else {
      this.consecutiveLosses = 0
    }

    this.checkAndTrigger()
  }

  private checkAndTrigger(): void {
    const reasons: string[] = []

    if (this.consecutiveLosses >= this.config.pauseOnConsecutiveLosses) {
      reasons.push(`${this.consecutiveLosses} consecutive losses`)
    }

    if (this.dailyPnl < -this.config.maxDailyLossUsd) {
      reasons.push(`Daily loss $${Math.abs(this.dailyPnl).toFixed(0)} exceeded limit`)
    }

    if (reasons.length > 0) {
      this.isPaused = true
      this.pauseUntil = new Date(Date.now() + this.config.cooldownPeriodMinutes * 60 * 1000)
      console.log(`🚨 CIRCUIT BREAKER TRIGGERED: ${reasons.join(', ')}`)
      console.log(`   Agent paused until ${this.pauseUntil.toISOString()}`)
    }
  }

  canTrade(): CircuitBreakerStatus {
    if (!this.isPaused) return { canTrade: true }

    const now = new Date()
    if (this.pauseUntil && now >= this.pauseUntil) {
      // Auto-resume setelah cooldown
      this.isPaused = false
      this.consecutiveLosses = 0
      this.pauseUntil = null
      return { canTrade: true }
    }

    const remainingMs = (this.pauseUntil?.getTime() ?? 0) - now.getTime()
    const remainingMin = Math.ceil(remainingMs / 60000)

    return {
      canTrade: false,
      reason: `Circuit breaker active`,
      resumeAt: this.pauseUntil ?? undefined,
    }
  }

  getStatus(): { dailyPnl: number; consecutiveLosses: number; isPaused: boolean } {
    return {
      dailyPnl: this.dailyPnl,
      consecutiveLosses: this.consecutiveLosses,
      isPaused: this.isPaused,
    }
  }
}
```

---

## 8. Full Stack Implementation

```typescript
// src/main.ts

import 'dotenv/config'
import { AgentMemorySystem } from './memory/vectorStore.js'
import { ThinkingEngine } from './agent/thinkingEngine.js'
import { DecisionEngine } from './agent/decisionEngine.js'
import { DeFiToolRegistry } from './tools/defiTools.js'
import { CircuitBreaker } from './risk/circuitBreaker.js'
import { RISK_CONFIG } from './config/riskConfig.js'
import { ActionType } from './types/index.js'
import type {
  AgentConfig,
  TradeMemory,
  TradeDecision,
  MarketState,
  PortfolioState,
} from './types/index.js'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

class OnchainAgent {
  private memory: AgentMemorySystem
  private tools: DeFiToolRegistry
  private thinker: ThinkingEngine
  private decisionEngine: DecisionEngine
  private circuitBreaker: CircuitBreaker

  constructor(config: AgentConfig) {
    this.memory = new AgentMemorySystem()
    this.tools = new DeFiToolRegistry(config.rpcEndpoints, config.walletAddress)
    this.thinker = new ThinkingEngine(this.memory, this.tools)
    this.decisionEngine = new DecisionEngine(RISK_CONFIG)
    this.circuitBreaker = new CircuitBreaker(RISK_CONFIG)
  }

  async init(): Promise<void> {
    await this.memory.init()
    console.log('🤖 Onchain Agent initialized')
  }

  async run(intervalSeconds: number = 300): Promise<void> {
    console.log(`🚀 Agent started. Polling every ${intervalSeconds}s`)

    while (true) {
      try {
        await this.agentCycle()
      } catch (err) {
        console.error('❌ Error in agent cycle:', err)
      }
      await sleep(intervalSeconds * 1000)
    }
  }

  private async agentCycle(): Promise<void> {
    const cycleStart = new Date()
    console.log(`\n${'='.repeat(50)}`)
    console.log(`🔄 Cycle started: ${cycleStart.toISOString()}`)

    // 1. Circuit breaker check
    const { canTrade, reason, resumeAt } = this.circuitBreaker.canTrade()
    if (!canTrade) {
      console.log(`⏸️  Trading paused: ${reason} | Resume: ${resumeAt?.toISOString()}`)
      return
    }

    // 2. Fetch current state
    const [portfolio, marketState] = await Promise.all([
      this.fetchPortfolio(),
      this.fetchMarketState(),
    ])

    const cbStatus = this.circuitBreaker.getStatus()
    console.log(`💰 Portfolio: $${portfolio.totalValueUsd.toLocaleString()}`)
    console.log(`📊 Daily PnL: $${cbStatus.dailyPnl.toFixed(2)}`)

    // 3. Think
    console.log('🧠 Thinking...')
    const thinkingOutput = await this.thinker.think(marketState, portfolio)
    console.log(`   Action: ${thinkingOutput.action.type}`)
    console.log(`   Confidence: ${thinkingOutput.confidence}%`)
    console.log(`   Risk: ${thinkingOutput.riskAssessment.level}`)

    // 4. Evaluate decision
    const decision = this.decisionEngine.evaluate(thinkingOutput, portfolio)

    if (!decision) {
      console.log('⏭️  No action taken (filtered by decision engine)')
      return
    }

    if (decision.action === ActionType.HOLD) {
      console.log('🤝 Agent decided to HOLD')
      return
    }

    // 5. Execute
    console.log(`⚡ Executing: ${decision.action} on ${decision.protocol} (${decision.chain})`)
    const result = await this.executeDecision(decision)

    // 6. Store to memory
    const tradeMemory: TradeMemory = {
      timestamp: cycleStart.toISOString(),
      chain: decision.chain,
      protocol: decision.protocol,
      action: decision.action,
      amount: String(decision.params.amountUsd ?? 0),
      token: String(decision.params.tokenIn ?? ''),
      entryPrice: decision.params.price as number | undefined,
      gasUsedUsd: result.gasUsedUsd ?? 0,
      marketContext: JSON.stringify(marketState.summary),
      reasoning: decision.reasoning,
      outcome: result.success ? 'success' : 'failed',
      pnlUsd: result.pnlUsd,
    }

    await this.memory.storeTradeMemory(tradeMemory)

    // 7. Update circuit breaker
    if (result.pnlUsd !== undefined) {
      this.circuitBreaker.recordTradeResult(result.pnlUsd)
    }

    const pnlStr = result.pnlUsd !== undefined ? `$${result.pnlUsd >= 0 ? '+' : ''}${result.pnlUsd.toFixed(2)}` : 'N/A'
    console.log(`✅ Cycle complete. PnL: ${pnlStr}`)
  }

  private async fetchPortfolio(): Promise<PortfolioState> {
    const result = await this.tools.execute('get_portfolio_state', {
      chains: ['ethereum', 'arbitrum'],
    }) as PortfolioState

    return result
  }

  private async fetchMarketState(): Promise<MarketState> {
    const [ethGas, arbGas] = await Promise.all([
      this.tools.execute('get_gas_price', { chain: 'ethereum' }),
      this.tools.execute('get_gas_price', { chain: 'arbitrum' }),
    ])

    return {
      summary: {
        ethGasGwei: (ethGas as { gasPriceGwei?: number }).gasPriceGwei,
        arbGasGwei: (arbGas as { gasPriceGwei?: number }).gasPriceGwei,
        timestamp: new Date().toISOString(),
      },
    }
  }

  private async executeDecision(
    decision: TradeDecision,
  ): Promise<{ success: boolean; txHash?: string; gasUsedUsd?: number; pnlUsd?: number }> {
    // CRITICAL: Selalu simulate dulu sebelum execute real tx
    const simulation = await this.tools.execute('simulate_swap', {
      ...decision.params,
      chain: decision.chain,
    })

    if ('error' in simulation) {
      console.log(`❌ Simulation failed: ${simulation.error}`)
      return { success: false }
    }

    // Check abort conditions sebelum execute
    for (const condition of decision.abortConditions) {
      console.log(`   Checking abort condition: ${condition}`)
      // Implement actual condition evaluation di sini
    }

    // ⚠️ PRODUCTION: Implement actual tx signing dengan KMS atau hardware wallet
    console.log('   [SIMULATION MODE — tidak execute actual tx]')

    return {
      success: true,
      txHash: '0x...',
      gasUsedUsd: decision.gasEstimateUsd,
      pnlUsd: decision.netProfitUsd,
    }
  }
}

// Entry point
const config: AgentConfig = {
  rpcEndpoints: {
    ethereum: process.env.ETH_RPC_URL!,
    arbitrum: process.env.ARB_RPC_URL!,
  },
  walletAddress: process.env.WALLET_ADDRESS!,
}

const agent = new OnchainAgent(config)
await agent.init()
await agent.run(300) // Check setiap 5 menit
```

### .env

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...           # untuk embeddings
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ARB_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
WALLET_ADDRESS=0xYOUR_ADDRESS
DB_PASSWORD=your_postgres_password
```

---

## 9. Deployment & Monitoring

### docker-compose.yml

```yaml
version: '3.8'

services:
  agent:
    build: .
    env_file: .env
    depends_on:
      - qdrant
      - redis
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: agent_db
      POSTGRES_USER: agent
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  qdrant_data:
  pg_data:
```

### Dockerfile

```dockerfile
FROM node:20-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci --production=false

COPY tsconfig.json .
COPY src ./src

RUN npm run build

CMD ["node", "dist/main.js"]
```

---

## Key Takeaways

### Memory Best Practices
1. **Selalu simpan reasoning**, bukan hanya outcome — agent perlu tahu *kenapa* keputusan dibuat
2. **Distill episodic → semantic** secara periodik (daily cron job) supaya insights terakumulasi
3. **Index dengan metadata** (chain, protocol, date) untuk filtering yang efisien
4. **Gunakan `Promise.all`** untuk parallel memory retrieval — jangan sequential

### TypeScript-Specific Tips
1. **Strong typing di ActionParams** — pakai discriminated union kalau action type-nya berbeda struktur
2. **Zod untuk runtime validation** — LLM output tidak selalu valid JSON, validate sebelum parse
3. **`viem` bukan `ethers`** — lebih type-safe dan tree-shakeable untuk onchain interactions
4. **Async throughout** — semua onchain + AI calls async, hindari blocking

### Security Critical Points
1. **Private keys** → pakai AWS KMS, GCP KMS, atau hardware wallet — JANGAN di `.env`
2. **Whitelist contracts** — agent hanya boleh interact dengan contracts yang sudah di-audit
3. **Rate limiting** — batasi jumlah tx per jam/hari
4. **Fork simulation** — pakai Tenderly atau Foundry Anvil fork sebelum mainnet execute
5. **Monitoring + alerts** — Telegram/Discord webhook untuk setiap tx dan anomali

---

*Always test di testnet (Sepolia, Arbitrum Sepolia) sebelum mainnet.*
*Gunakan paper trading mode dengan `SIMULATION_MODE=true` di `.env` untuk dry run.*
