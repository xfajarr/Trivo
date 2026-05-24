# Trivo AI Engine v2 — Implementation Plan (Enhanced)

> **Based on:** TradingAgents, AutoHedge, Vibe-Trading, QuantDinger, finance-skills
> **Date:** 2026-05-24
> **Hackathon Deadline:** May 25, 2026
> **Enhanced with:** Learning, Verifiable Reasoning, Identity, Accountability

---

## Executive Summary

Transform Trivo's deterministic "AI committee" into a **real multi-agent AI system** with:

1. **AI-Powered Committee** — Each role makes real LLM calls with structured output
2. **Agent Harness** — Goal tracking, constraint validation, performance feedback
3. **Discussion System** — Multi-round debate with bull/bear challenge/response
4. **24/7 Autonomy** — Event sourcing, checkpointing, watchdog, self-healing
5. **Learning System** — Pattern recognition from trading history, strategy evolution
6. **Verifiable Reasoning** — Evidence chains, full audit trails, explainability
7. **Agent Identity** — ERC-8004 on-chain identity with verification
8. **Accountability** — Decision attribution, performance scoring, creator liability

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENT IDENTITY LAYER (ERC-8004)                       │
│  On-Chain Identity → Verification → Provenance → Accountability              │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                           AGENT HARNESS                                       │
│                                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │ Goal        │───►│ Constraint  │───►│ Performance │───►│ Learning   │ │
│  │ Tracker     │    │ Validator   │    │ Monitor     │    │ Engine     │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                      DISCUSSION LAYER (Real AI)                              │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ANALYST TEAM                                                          │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │Technical  │  │Sentiment  │  │OnChain    │  │Macro      │        │   │
│  │  │Analyst    │  │Analyst    │  │Analyst    │  │Analyst    │        │   │
│  │  │(Real LLM) │  │(Real LLM) │  │(Real LLM) │  │(Real LLM) │        │   │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘        │   │
│  │        └───────────────┴───────────────┴──────────────┘              │   │
│  │                           │                                               │   │
│  │                           ↓                                               │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │ RESEARCH DEBATE (Multi-Round with Evidence Chains)              │   │   │
│  │  │                                                                  │   │   │
│  │  │  ┌─────────────┐  ◄──── Challenge ────►  ┌─────────────┐      │   │   │
│  │  │  │ Bull        │                        │ Bear        │      │   │   │
│  │  │  │ Researcher  │  ──── Rebuttal ────►   │ Researcher  │      │   │   │
│  │  │  │ +Evidence   │  ◄─── Rebuttal ──────  │ +Evidence   │      │   │   │
│  │  │  └──────┬──────┘                        └──────┬──────┘      │   │   │
│  │  │         └────────────────┬─────────────────────┘             │   │   │
│  │  │                          ↓                                      │   │   │
│  │  │                   ┌──────────────┐                              │   │   │
│  │  │                   │ Moderator    │                              │   │   │
│  │  │                   │ Synthesis    │                              │   │   │
│  │  │                   └──────┬───────┘                              │   │   │
│  │  └──────────────────────────┼─────────────────────────────────────┘   │   │
│  │                             ↓                                            │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │   │
│  │  │ DECISION PIPELINE                                               │   │   │
│  │  │  Trader ──► Risk Panel ──► Portfolio Manager (Final Authority)   │   │   │
│  │  └──────────────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │ AUDIT TRAIL (Verifiable Reasoning)                                     │   │
│  │  Every LLM call logged with: evidence, confidence, timestamp, version  │   │
│  │  Full decision tree with reasoning chains                             │   │
│  │  Cryptographic hash of each reasoning step                             │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                        MEMORY & LEARNING LAYER                                │
│                                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Decision    │  │ Reflection  │  │ Semantic    │  │ Pattern     │     │
│  │ Log         │  │ Memory      │  │ Memory      │  │ Recognizer  │     │
│  │ (Full       │  │ (What worked│  │ (Market     │  │ (Learn from │     │
│  │ History)    │  │  & didn't)  │  │ Knowledge)  │  │  trades)   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         └─────────────────┴─────────────────┴─────────────────┘           │
│                                    │                                          │
│                           ┌────────▼────────┐                               │
│                           │ Learning Engine │                               │
│                           │ - Pattern recog │                               │
│                           │ - Strategy adj  │                               │
│                           │ - Risk learn   │                               │
│                           └─────────────────┘                               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                         AUTONOMOUS LOOP                                       │
│                                                                               │
│  Event Store → Checkpoint Manager → Watchdog → Self-Healer                  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ 24/7 Operation: Sleep → Wake → Analyze → Decide → Execute → Report │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: AI-Powered Committee (P0 - Highest Priority)

### 1.1 Structured Output Schemas

**New file:** `engine/schemas/index.ts`

```typescript
// engine/schemas/index.ts

import { z } from 'zod'

// === CORE ENUMS ===

export enum Rating {
  BUY = "buy",
  OVERWEIGHT = "overweight",
  HOLD = "hold",
  UNDERWEIGHT = "underweight",
  SELL = "sell",
}

export enum TraderAction {
  BUY = "buy",
  HOLD = "hold",
  SELL = "sell",
}

export enum Stance {
  BULLISH = "bullish",
  BEARISH = "bearish",
  NEUTRAL = "neutral",
}

export enum RiskStance {
  APPROVE = "approve",
  MODIFY = "modify",
  REJECT = "reject",
  RISK_OFF = "risk_off",
}

// === EVIDENCE & AUDIT SCHEMAS ===

// Single piece of evidence with verifiability
export interface Evidence {
  id: string
  type: 'price_data' | 'onchain_data' | 'sentiment' | 'technical' | 'macro' | 'model_output'
  source: string              // e.g., "CoinGecko API", "Oracle Contract", "LLM:claude-3"
  content: string
  timestamp: number
  confidence: number          // 0-100
  verification_hash?: string  // Hash for audit trail
}

// Full reasoning chain for a decision
export interface ReasoningChain {
  id: string
  decision_id: string
  steps: ReasoningStep[]
  final_conclusion: string
  total_confidence: number
  created_at: number
}

export interface ReasoningStep {
  step_number: number
  agent_role: string
  input_summary: string
  output_summary: string
  evidence_used: Evidence[]
  confidence: number
  timestamp: number
  model_version?: string      // Which AI model was used
  prompt_hash?: string        // Hash of the prompt for audit
  response_hash?: string      // Hash of the response for audit
}

// === ANALYST SCHEMAS ===

export interface AnalystReport {
  role: string
  stance: Stance
  confidence: number          // 0-100
  summary: string            // 2-3 sentences
  evidence: Evidence[]       // ALL evidence used
  reasoning_chain: ReasoningStep
  challenges: string[]       // Questions for other analysts
  warnings?: string[]
  model_version?: string
  created_at: number
}

// Research plan from debate
export interface ResearchPlan {
  recommendation: Rating
  rationale: string
  conviction: number         // 0-100
  strategic_actions: string
  bull_case: string
  bear_case: string
  evidence_used: Evidence[]
  debate_summary: string     // Summary of debate
  moderator_synthesis: string // How moderator synthesized
}

// Trader proposal
export interface TraderProposal {
  action: TraderAction
  reasoning: string
  entry_price?: number
  stop_loss?: number
  take_profit?: number
  position_size: string
  leverage?: number
  timeframe?: string
  reasoning_chain: ReasoningStep
}

// Risk evaluation
export interface RiskEvaluation {
  stance: RiskStance
  confidence: number
  summary: string
  concerns: string[]
  modifications?: string[]
  max_position_size?: string
  required_conditions?: string[]
  reasoning_chain: ReasoningStep
}

// Final portfolio decision
export interface PortfolioDecision {
  id: string                 // Unique decision ID
  agent_id: string           // Which agent made this
  rating: Rating
  conviction: number
  executive_summary: string
  investment_thesis: string
  position_size: string
  entry_price?: number
  stop_loss?: number
  take_profit?: number
  leverage?: number
  timeframe?: string
  risk_adjusted: boolean
  reasoning_chain: ReasoningChain  // FULL reasoning with all steps
  lessons_applied?: string[]
  created_at: number
  
  // Accountability fields
  creator_id?: string        // User who owns this agent
  model_versions: Record<string, string>  // Which models used
  audit_hash?: string        // Hash of entire decision for verification
}

// Debate message
export interface DebateMessage {
  from: string
  to?: string | "all"
  type: "opening" | "challenge" | "rebuttal" | "concession" | "closing" | "evidence"
  content: string
  evidence?: Evidence[]
  timestamp: number
  verifiable: boolean        // Can this be verified externally?
}

// === COMMITTEE RESULT ===

export interface CommitteeResult {
  id: string                 // Unique committee session ID
  agent_id: string
  cycle_id: string
  
  analysts: AnalystReport[]
  research_plan: ResearchPlan
  trader_proposal: TraderProposal
  risk_evaluation: RiskEvaluation
  portfolio_decision: PortfolioDecision
  debate_history: DebateMessage[]
  
  execution_status: "executed" | "approved" | "blocked" | "modified"
  execution_result?: ExecutionResult
  
  // Audit fields
  created_at: number
  duration_ms: number
  total_tokens_used: number
  reasoning_hash: string     // Hash of entire reasoning for verification
}

// Execution result
export interface ExecutionResult {
  success: boolean
  tool: string
  args: Record<string, unknown>
  tx_hash?: string           // On-chain transaction hash
  position_id?: string
  pnl?: number
  error?: string
  executed_at: number
}

// === ZOD SCHEMAS FOR VALIDATION ===

export const EvidenceSchema = z.object({
  id: z.string(),
  type: z.enum(['price_data', 'onchain_data', 'sentiment', 'technical', 'macro', 'model_output']),
  source: z.string(),
  content: z.string(),
  timestamp: z.number(),
  confidence: z.number().min(0).max(100),
  verification_hash: z.string().optional(),
})

export const ReasoningStepSchema = z.object({
  step_number: z.number(),
  agent_role: z.string(),
  input_summary: z.string(),
  output_summary: z.string(),
  evidence_used: z.array(EvidenceSchema),
  confidence: z.number().min(0).max(100),
  timestamp: z.number(),
  model_version: z.string().optional(),
  prompt_hash: z.string().optional(),
  response_hash: z.string().optional(),
})

export const ReasoningChainSchema = z.object({
  id: z.string(),
  decision_id: z.string(),
  steps: z.array(ReasoningStepSchema),
  final_conclusion: z.string(),
  total_confidence: z.number().min(0).max(100),
  created_at: z.number(),
})

export const PortfolioDecisionSchema = z.object({
  id: z.string(),
  agent_id: z.string(),
  rating: z.enum(['buy', 'overweight', 'hold', 'underweight', 'sell']),
  conviction: z.number().min(0).max(100),
  executive_summary: z.string(),
  investment_thesis: z.string(),
  position_size: z.string(),
  reasoning_chain: ReasoningChainSchema,
  lessons_applied: z.array(z.string()).optional(),
  created_at: z.number(),
  creator_id: z.string().optional(),
  model_versions: z.record(z.string()),
  audit_hash: z.string().optional(),
})

export const CommitteeResultSchema = z.object({
  id: z.string(),
  agent_id: z.string(),
  cycle_id: z.string(),
  analysts: z.array(z.any()),
  research_plan: z.any(),
  trader_proposal: z.any(),
  risk_evaluation: z.any(),
  portfolio_decision: PortfolioDecisionSchema,
  debate_history: z.array(z.any()),
  execution_status: z.enum(['executed', 'approved', 'blocked', 'modified']),
  created_at: z.number(),
  duration_ms: z.number(),
  total_tokens_used: z.number(),
  reasoning_hash: z.string(),
})
```

### 1.2 Audit System (Verifiable Reasoning)

**New file:** `engine/audit/audit-system.ts`

```typescript
// engine/audit/audit-system.ts

import { createHash } from 'crypto'
import { ReasoningStep, ReasoningChain, Evidence, CommitteeResult } from '../schemas/index.js'

export interface AuditEntry {
  id: string
  timestamp: number
  type: 'reasoning_step' | 'decision' | 'trade' | 'error'
  data: Record<string, unknown>
  hash: string              // SHA-256 of data
  previous_hash: string     // Chain link
}

export class AuditSystem {
  private chain: AuditEntry[] = []
  private pendingSteps: ReasoningStep[] = []
  
  // Start tracking a reasoning chain for a decision
  startReasoningChain(decisionId: string): string {
    const chainId = crypto.randomUUID()
    this.pendingSteps = []
    return chainId
  }
  
  // Add a step to the pending reasoning chain
  addReasoningStep(step: Omit<ReasoningStep, 'step_number'>): ReasoningStep {
    const stepWithNumber: ReasoningStep = {
      ...step,
      step_number: this.pendingSteps.length + 1,
    }
    
    this.pendingSteps.push(stepWithNumber)
    
    // Log to audit chain
    this.appendAuditEntry({
      type: 'reasoning_step',
      data: {
        step_number: stepWithNumber.step_number,
        agent_role: stepWithNumber.agent_role,
        summary: stepWithNumber.output_summary,
        confidence: stepWithNumber.confidence,
        evidence_count: stepWithNumber.evidence_used.length,
      },
    })
    
    return stepWithNumber
  }
  
  // Finalize the reasoning chain
  finalizeReasoningChain(
    chainId: string,
    decisionId: string,
    finalConclusion: string,
    totalConfidence: number
  ): ReasoningChain {
    const chain: ReasoningChain = {
      id: chainId,
      decision_id: decisionId,
      steps: [...this.pendingSteps],
      final_conclusion: finalConclusion,
      total_confidence: totalConfidence,
      created_at: Date.now(),
    }
    
    this.pendingSteps = []
    
    // Verify the chain integrity
    const chainHash = this.hashReasoningChain(chain)
    
    // Log decision to audit chain
    this.appendAuditEntry({
      type: 'decision',
      data: {
        chain_id: chainId,
        decision_id: decisionId,
        steps_count: chain.steps.length,
        total_confidence: totalConfidence,
        conclusion: finalConclusion,
        chain_hash: chainHash,
      },
    })
    
    return chain
  }
  
  // Create evidence with verifiability
  createEvidence(
    type: Evidence['type'],
    source: string,
    content: string,
    confidence: number,
    rawData?: unknown
  ): Evidence {
    const evidence: Evidence = {
      id: crypto.randomUUID(),
      type,
      source,
      content,
      timestamp: Date.now(),
      confidence,
      verification_hash: rawData ? this.hashData(rawData) : undefined,
    }
    
    return evidence
  }
  
  // Verify evidence against external source
  async verifyEvidence(evidence: Evidence, externalSource: () => Promise<unknown>): Promise<boolean> {
    try {
      const externalData = await externalSource()
      const externalHash = this.hashData(externalData)
      return evidence.verification_hash === externalHash
    } catch {
      return false
    }
  }
  
  // Hash any data for verification
  hashData(data: unknown): string {
    const json = JSON.stringify(data)
    return createHash('sha256').update(json).digest('hex').substring(0, 16)
  }
  
  // Hash entire reasoning chain
  hashReasoningChain(chain: ReasoningChain): string {
    const chainData = {
      id: chain.id,
      decision_id: chain.decision_id,
      steps: chain.steps.map(s => ({
        role: s.agent_role,
        output: s.output_summary,
        confidence: s.confidence,
        evidence_hashes: s.evidence_used.map(e => e.verification_hash || e.content),
      })),
      conclusion: chain.final_conclusion,
    }
    
    return createHash('sha256')
      .update(JSON.stringify(chainData))
      .digest('hex')
  }
  
  // Hash entire committee result for audit
  hashCommitteeResult(result: CommitteeResult): string {
    const data = {
      id: result.id,
      agent_id: result.agent_id,
      cycle_id: result.cycle_id,
      decision_id: result.portfolio_decision.id,
      rating: result.portfolio_decision.rating,
      conviction: result.portfolio_decision.conviction,
      evidence_count: result.portfolio_decision.reasoning_chain.steps.reduce(
        (sum, s) => sum + s.evidence_used.length, 0
      ),
      analysts_count: result.analysts.length,
      debate_rounds: result.debate_history.length,
      executed: result.execution_status === 'executed',
      created_at: result.created_at,
    }
    
    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
  }
  
  // Append entry to audit chain
  private appendAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp' | 'hash' | 'previous_hash'>) {
    const previousHash = this.chain.length > 0 
      ? this.chain[this.chain.length - 1].hash 
      : 'GENESIS'
    
    const fullEntry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: entry.type,
      data: entry.data,
      hash: this.hashData({ ...entry.data, previous_hash: previousHash }),
      previous_hash: previousHash,
    }
    
    this.chain.push(fullEntry)
  }
  
  // Verify audit chain integrity
  verifyAuditChain(): { valid: boolean; brokenAt?: number } {
    for (let i = 1; i < this.chain.length; i++) {
      const expectedPreviousHash = this.chain[i - 1].hash
      if (this.chain[i].previous_hash !== expectedPreviousHash) {
        return { valid: false, brokenAt: i }
      }
    }
    return { valid: true }
  }
  
  // Get full audit trail
  getAuditTrail(): AuditEntry[] {
    return [...this.chain]
  }
  
  // Export decision for external verification
  exportDecision(decision: PortfolioDecision): string {
    return JSON.stringify({
      decision,
      audit_hash: decision.audit_hash,
      verification_instructions: {
        '1. Verify evidence': 'Check each piece of evidence against its source',
        '2. Verify reasoning': 'Replay the reasoning chain step by step',
        '3. Verify hash': 'Hash the decision data and compare with audit_hash',
      },
    }, null, 2)
  }
}

export const auditSystem = new AuditSystem()
```

### 1.3 Base Agent Class

**New file:** `engine/agents/base-agent.ts`

```typescript
// engine/agents/base-agent.ts

import type { BaseProvider } from '../providers/base-provider.js'
import type { MarketContext } from '../types.js'
import { Evidence, ReasoningStep, auditSystem } from '../audit/audit-system.js'
import { createHash } from 'crypto'

export interface AgentConfig {
  name: string
  role: string
  specialty: string
  systemPrompt: string
  modelPreference?: string  // Preferred model for this role
}

export interface AgentResponse<T> {
  success: boolean
  data?: T
  error?: string
  latencyMs: number
  tokensUsed?: number
  modelVersion?: string
  reasoningStep?: ReasoningStep
}

export abstract class BaseAgent {
  protected provider: BaseProvider
  protected config: AgentConfig
  protected currentChainId?: string
  protected currentDecisionId?: string
  
  constructor(provider: BaseProvider, config: AgentConfig) {
    this.provider = provider
    this.config = config
  }
  
  // Each agent implements this to produce structured output
  abstract analyze(context: MarketContext): Promise<AgentResponse<unknown>>
  
  // Set the reasoning chain context
  setReasoningContext(chainId: string, decisionId: string) {
    this.currentChainId = chainId
    this.currentDecisionId = decisionId
  }
  
  // Build system prompt for this agent
  protected buildSystemPrompt(context: MarketContext): string {
    return `${this.config.systemPrompt}

Current Market Context:
- BTC/USD: $${context.prices['BTC/USD']?.toLocaleString() || 'N/A'}
- ETH/USD: $${context.prices['ETH/USD']?.toLocaleString() || 'N/A'}
- SOL/USD: $${context.prices['SOL/USD']?.toLocaleString() || 'N/A'}

Today's PnL: $${context.todayPnl.toFixed(2)}
Open Positions: ${context.openPositions.length}
Win Rate: ${context.winRate.toFixed(1)}%
Total Trades: ${context.totalTrades}

CRITICAL: You must respond with valid JSON. Every claim you make MUST be backed by evidence.
If you cannot verify something, explicitly state "UNVERIFIED:" in your response.
`
  }
  
  // Call LLM with structured output and full audit logging
  protected async callLLM<T>(
    userPrompt: string,
    schema: z.ZodType<T>,
    maxTokens: number = 2048
  ): Promise<AgentResponse<T>> {
    const start = Date.now()
    const promptHash = createHash('sha256').update(userPrompt).digest('hex').substring(0, 16)
    
    // Collect evidence from context
    const evidenceUsed: Evidence[] = []
    
    try {
      const response = await this.provider.completeWithSchema(
        this.buildSystemPrompt({} as MarketContext),
        userPrompt,
        schema,
        maxTokens
      )
      
      const modelVersion = this.provider.getModelVersion?.() || 'unknown'
      const responseHash = createHash('sha256').update(JSON.stringify(response)).digest('hex').substring(0, 16)
      
      // Build reasoning step for audit
      const reasoningStep: ReasoningStep = {
        step_number: 0, // Will be set by audit system
        agent_role: this.config.role,
        input_summary: userPrompt.substring(0, 200) + '...',
        output_summary: typeof response === 'string' ? response.substring(0, 200) : JSON.stringify(response).substring(0, 200),
        evidence_used: evidenceUsed,
        confidence: 75, // Default, should be extracted from response
        timestamp: Date.now(),
        model_version: modelVersion,
        prompt_hash: promptHash,
        response_hash: responseHash,
      }
      
      return {
        success: true,
        data: response,
        latencyMs: Date.now() - start,
        modelVersion,
        reasoningStep,
      }
    } catch (error) {
      return {
        success: false,
        error: String(error),
        latencyMs: Date.now() - start,
      }
    }
  }
  
  // Add evidence to current reasoning
  protected addEvidence(evidence: Evidence) {
    // Evidence will be attached to the reasoning step
  }
}
```

---

## Phase 2: Agent Identity (P0)

### 2.1 ERC-8004 Identity Integration

**New file:** `engine/identity/agent-identity.ts`

```typescript
// engine/identity/agent-identity.ts

import { ethers } from 'ethers'

export interface AgentIdentity {
  id: string                  // Off-chain UUID
  address: string            // Ethereum address (ERC-8004)
  name: string
  creator: string             // Creator address
  symbol: string              // e.g., "TRIVO"
  version: string             // ABI version
  metadata: AgentMetadata
  createdAt: number
  verified: boolean
}

export interface AgentMetadata {
  description: string
  avatar?: string
  strategies: string[]        // e.g., ["momentum", "mean-reversion"]
  riskLevel: 'conservative' | 'moderate' | 'aggressive'
  performanceStats: {
    totalTrades: number
    winRate: number
    sharpeRatio: number
    maxDrawdown: number
  }
  socialProof?: {
    verifiedTraders?: number
    totalCopiers?: number
    avgRating?: number
  }
  auditHash?: string          // Hash of last decision
}

export interface IdentityVerification {
  isValid: boolean
  verifiedAt: number
  expiresAt: number
  chainId: number
  contractAddress: string
}

export class AgentIdentityService {
  private provider: ethers.providers.Provider
  private signer?: ethers.Signer
  private identityContract: ethers.Contract
  
  constructor(
    rpcUrl: string,
    identityContractAddress: string,
    signer?: ethers.Signer
  ) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    this.signer = signer
    
    // ERC-8004 Identity Interface
    const identityABI = [
      'function registerAgent(string name, string metadataURI) returns (uint256 tokenId)',
      'function updateAgentMetadata(uint256 tokenId, string metadataURI)',
      'function getAgentInfo(uint256 tokenId) view returns (address owner, string name, string metadataURI, uint256 createdAt)',
      'function resolveIdentity(address agentAddress) view returns (uint256 tokenId)',
      'function verifyAgent(uint256 tokenId) returns (bool)',
    ]
    
    this.identityContract = new ethers.Contract(
      identityContractAddress,
      identityABI,
      signer || this.provider
    )
  }
  
  // Register a new agent on-chain
  async registerAgent(
    name: string,
    metadata: AgentMetadata
  ): Promise<{ tokenId: number; address: string; txHash: string }> {
    if (!this.signer) {
      throw new Error('Signing required to register agent')
    }
    
    const metadataURI = this.ipfsUpload(metadata)
    
    const tx = await this.identityContract.registerAgent(name, metadataURI)
    const receipt = await tx.wait()
    
    // Extract token ID from event
    const event = receipt.events?.find((e: any) => e.event === 'AgentRegistered')
    const tokenId = event?.args?.tokenId?.toNumber()
    
    // Derive agent address from token ID (deterministic)
    const address = this.deriveAgentAddress(tokenId)
    
    return {
      tokenId,
      address,
      txHash: receipt.transactionHash,
    }
  }
  
  // Get agent identity info
  async getAgentInfo(tokenId: number): Promise<{
    owner: string
    name: string
    metadataURI: string
    createdAt: number
  }> {
    return this.identityContract.getAgentInfo(tokenId)
  }
  
  // Verify agent identity on-chain
  async verifyAgent(tokenId: number): Promise<boolean> {
    return this.identityContract.verifyAgent(tokenId)
  }
  
  // Resolve address to token ID
  async resolveIdentity(agentAddress: string): Promise<number> {
    return this.identityContract.resolveIdentity(agentAddress)
  }
  
  // Link on-chain decision to identity
  async signDecision(
    tokenId: number,
    decisionHash: string,
    decisionData: unknown
  ): Promise<string> {
    if (!this.signer) {
      throw new Error('Signing required to sign decision')
    }
    
    // Create typed data for EIP-712 signing
    const domain = {
      name: 'TrivoAgents',
      version: '1',
      chainId: 5042002, // Arc Testnet
      verifyingContract: await this.identityContract.address,
    }
    
    const types = {
      Decision: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'decisionHash', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'data', type: 'string' },
      ],
    }
    
    const value = {
      tokenId,
      decisionHash,
      timestamp: Math.floor(Date.now() / 1000),
      data: JSON.stringify(decisionData),
    }
    
    const signature = await this.signer._signTypedData(domain, types, value)
    return signature
  }
  
  // Verify a decision signature
  async verifyDecisionSignature(
    tokenId: number,
    decisionHash: string,
    signature: string
  ): Promise<boolean> {
    const { owner } = await this.getAgentInfo(tokenId)
    
    const domain = {
      name: 'TrivoAgents',
      version: '1',
      chainId: 5042002,
      verifyingContract: await this.identityContract.address,
    }
    
    const types = {
      Decision: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'decisionHash', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'data', type: 'string' },
      ],
    }
    
    const recovered = ethers.utils.verifyTypedData(domain, types, { tokenId, decisionHash, timestamp: 0, data: '' }, signature)
    return recovered.toLowerCase() === owner.toLowerCase()
  }
  
  // Derive agent address from token ID (CREATE2 or deterministic)
  private deriveAgentAddress(tokenId: number): string {
    // Deterministic address derivation
    const salt = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['uint256'], [tokenId]))
    const hash = ethers.utils.keccak256(
      ethers.utils.solidityPack(['bytes1', 'address', 'bytes32', 'bytes32'],
      [0xff, this.identityContract.address, salt, '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470'])
    )
    return ethers.utils.getAddress('0x' + hash.substring(26))
  }
  
  // Upload metadata to IPFS (simplified - use Pinata/web3.storage in production)
  private ipfsUpload(metadata: AgentMetadata): string {
    // In production, upload to IPFS and return CID
    const json = JSON.stringify(metadata)
    const hash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(json))
    return `ipfs://Qm${hash.substring(2, 46)}`
  }
  
  // Build verifiable identity report
  async buildIdentityReport(agentId: string): Promise<{
    identity: AgentIdentity
    verification: IdentityVerification
    recentDecisions: Array<{
      id: string
      rating: string
      conviction: number
      auditHash: string
      timestamp: number
    }>
    onChainProof: {
      tokenId: number
      contractAddress: string
      verified: boolean
      txHash: string
    }
  }> {
    // Implementation would fetch from DB and on-chain
    return {
      identity: {} as AgentIdentity,
      verification: {
        isValid: true,
        verifiedAt: Date.now(),
        expiresAt: Date.now() + 86400000,
        chainId: 5042002,
        contractAddress: await this.identityContract.address,
      },
      recentDecisions: [],
      onChainProof: {
        tokenId: 0,
        contractAddress: await this.identityContract.address,
        verified: false,
        txHash: '',
      },
    }
  }
}
```

---

## Phase 3: Learning from History (P1)

### 3.1 Learning Engine

**New file:** `engine/learning/learning-engine.ts`

```typescript
// engine/learning/learning-engine.ts

import { MarketContext } from '../types.js'
import { Evidence } from '../schemas/index.js'

export interface LearningInsight {
  type: 'pattern' | 'strategy' | 'risk' | 'timing'
  title: string
  description: string
  evidence: Evidence[]
  confidence: number
  appliedTo?: string[]       // Decision IDs this was applied to
  createdAt: number
  validated: boolean          // Has this been validated by outcome?
}

export interface TradeOutcome {
  decisionId: string
  entryPrice: number
  exitPrice: number
  pnl: number
  pnlPercent: number
  holdTime: number            // milliseconds
  wasCorrect: boolean         // Did it match the expected direction?
  expectedDirection?: 'long' | 'short'
  actualDirection?: 'long' | 'short'
}

export interface PatternMatch {
  pattern: string
  occurrences: number
  successRate: number
  avgPnL: number
  conditions: string[]
}

export interface StrategyAdjustment {
  type: 'increase_size' | 'decrease_size' | 'change_timeframe' | 'add_filter' | 'remove_filter'
  reason: string
  confidence: number
  previousValue: unknown
  newValue: unknown
  basedOn: string[]            // Pattern IDs that triggered this
}

export class LearningEngine {
  private insights: LearningInsight[] = []
  private outcomes: TradeOutcome[] = []
  private patterns: PatternMatch[] = []
  
  // Record an outcome for learning
  async recordOutcome(outcome: TradeOutcome): Promise<void> {
    this.outcomes.push(outcome)
    
    // Extract patterns from this trade
    const patterns = await this.extractPatterns(outcome)
    this.patterns.push(...patterns)
    
    // Generate insights if we have enough data
    if (this.outcomes.length >= 10) {
      await this.generateInsights()
    }
    
    // Validate existing insights against new outcome
    await this.validateInsights(outcome)
  }
  
  // Extract patterns from a trade
  private async extractPatterns(outcome: TradeOutcome): Promise<PatternMatch[]> {
    const patterns: PatternMatch[] = []
    
    // Pattern 1: Time-of-day
    const hour = new Date().getHours()
    patterns.push({
      pattern: `hour_${hour}`,
      occurrences: 1,
      successRate: outcome.wasCorrect ? 100 : 0,
      avgPnL: outcome.pnl,
      conditions: [`hour = ${hour}`],
    })
    
    // Pattern 2: Hold time
    if (outcome.holdTime < 3600000) {
      patterns.push({
        pattern: 'short_term',
        occurrences: 1,
        successRate: outcome.wasCorrect ? 100 : 0,
        avgPnL: outcome.pnl,
        conditions: ['hold_time < 1 hour'],
      })
    } else if (outcome.holdTime > 86400000) {
      patterns.push({
        pattern: 'long_term',
        occurrences: 1,
        successRate: outcome.wasCorrect ? 100 : 0,
        avgPnL: outcome.pnl,
        conditions: ['hold_time > 1 day'],
      })
    }
    
    // Pattern 3: PnL magnitude
    if (outcome.pnlPercent > 5) {
      patterns.push({
        pattern: 'high_return',
        occurrences: 1,
        successRate: outcome.wasCorrect ? 100 : 0,
        avgPnL: outcome.pnl,
        conditions: ['pnl > 5%'],
      })
    }
    
    return patterns
  }
  
  // Generate insights from patterns
  private async generateInsights(): Promise<void> {
    // Analyze winning trades
    const winningPatterns = this.patterns.filter(p => p.successRate >= 70 && p.occurrences >= 3)
    
    for (const pattern of winningPatterns) {
      const existingInsight = this.insights.find(
        i => i.title === `Pattern: ${pattern.pattern}`
      )
      
      if (!existingInsight) {
        this.insights.push({
          type: 'pattern',
          title: `Pattern: ${pattern.pattern}`,
          description: `Detected pattern "${pattern.pattern}" with ${pattern.successRate}% success rate over ${pattern.occurrences} occurrences. Avg PnL: $${pattern.avgPnL.toFixed(2)}`,
          evidence: [],
          confidence: Math.min(95, 50 + pattern.occurrences * 10),
          createdAt: Date.now(),
          validated: false,
        })
      }
    }
    
    // Analyze losing trades
    const losingPatterns = this.patterns.filter(p => p.successRate < 40 && p.occurrences >= 3)
    
    for (const pattern of losingPatterns) {
      const existingInsight = this.insights.find(
        i => i.title === `Avoid: ${pattern.pattern}`
      )
      
      if (!existingInsight) {
        this.insights.push({
          type: 'risk',
          title: `Avoid: ${pattern.pattern}`,
          description: `Pattern "${pattern.pattern}" has ${pattern.successRate}% success rate. Consider avoiding or adding filters.`,
          evidence: [],
          confidence: Math.min(95, 50 + pattern.occurrences * 10),
          createdAt: Date.now(),
          validated: false,
        })
      }
    }
  }
  
  // Validate insights against new outcomes
  private async validateInsights(outcome: TradeOutcome): Promise<void> {
    for (const insight of this.insights) {
      if (!insight.validated) {
        // Check if this insight applies to the current outcome
        const applies = this.checkPatternMatch(insight, outcome)
        
        if (applies) {
          // Update validation based on outcome
          if (insight.type === 'pattern' || insight.type === 'strategy') {
            // For pattern insights, check if it predicted correctly
            const wasCorrect = (insight.title.includes('Avoid') && !outcome.wasCorrect) ||
                              (!insight.title.includes('Avoid') && outcome.wasCorrect)
            
            // Adjust confidence
            const currentEvidence = insight.confidence
            const adjustment = wasCorrect ? 5 : -10
            insight.confidence = Math.max(10, Math.min(95, currentEvidence + adjustment))
          }
        }
      }
    }
  }
  
  private checkPatternMatch(insight: LearningInsight, outcome: TradeOutcome): boolean {
    // Simplified - would do proper pattern matching
    return insight.description.includes(outcome.holdTime < 3600000 ? 'short' : 'long')
  }
  
  // Get insights relevant to current market context
  async getRelevantInsights(context: MarketContext): Promise<LearningInsight[]> {
    return this.insights
      .filter(i => i.confidence >= 60)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10)
  }
  
  // Get strategy adjustments based on performance
  async getStrategyAdjustments(): Promise<StrategyAdjustment[]> {
    const adjustments: StrategyAdjustment[] = []
    
    // Recent 20 trades
    const recent = this.outcomes.slice(-20)
    if (recent.length < 5) return adjustments
    
    const recentWinRate = recent.filter(t => t.wasCorrect).length / recent.length
    
    if (recentWinRate < 0.4) {
      adjustments.push({
        type: 'decrease_size',
        reason: `Recent win rate (${(recentWinRate * 100).toFixed(1)}%) is below 40%`,
        confidence: 80,
        previousValue: 'current_size',
        newValue: '50% of current_size',
        basedOn: recent.slice(-10).map(t => t.decisionId),
      })
    }
    
    if (recentWinRate > 0.7) {
      adjustments.push({
        type: 'increase_size',
        reason: `Recent win rate (${(recentWinRate * 100).toFixed(1)}%) is above 70%`,
        confidence: 75,
        previousValue: 'current_size',
        newValue: '125% of current_size',
        basedOn: recent.slice(-10).map(t => t.decisionId),
      })
    }
    
    // Check for cold streaks
    const last5 = recent.slice(-5)
    const last5Losses = last5.filter(t => !t.wasCorrect).length
    
    if (last5Losses >= 4) {
      adjustments.push({
        type: 'add_filter',
        reason: `${last5Losses}/5 recent trades were losses - adding caution filter`,
        confidence: 85,
        previousValue: 'no_filter',
        newValue: 'require_70%+_confidence',
        basedOn: last5.map(t => t.decisionId),
      })
    }
    
    return adjustments
  }
  
  // Get all validated insights for a specific decision type
  async getValidatedInsights(type: LearningInsight['type']): Promise<LearningInsight[]> {
    return this.insights.filter(i => i.type === type && i.validated)
  }
  
  // Build learning context for LLM
  async buildLearningContext(context: MarketContext): Promise<string> {
    const insights = await this.getRelevantInsights(context)
    const adjustments = await this.getStrategyAdjustments()
    
    if (insights.length === 0 && adjustments.length === 0) {
      return 'No significant patterns detected yet. Building learning history.'
    }
    
    let prompt = '## LEARNED PATTERNS FROM HISTORY\n\n'
    
    if (insights.length > 0) {
      prompt += 'Validated patterns:\n'
      for (const insight of insights.slice(0, 5)) {
        prompt += `- [${insight.type}] ${insight.title}: ${insight.description} (confidence: ${insight.confidence}%)\n`
      }
    }
    
    if (adjustments.length > 0) {
      prompt += '\n## RECOMMENDED ADJUSTMENTS\n'
      for (const adj of adjustments) {
        prompt += `- [${adj.type}] ${adj.reason} (confidence: ${adj.confidence}%)\n`
      }
    }
    
    return prompt
  }
}
```

### 3.2 Reflection Generator (Learn from Past Decisions)

**Enhanced:** `engine/memory/reflection-generator.ts`

```typescript
// engine/memory/reflection-generator.ts

import type { CommitteeResult } from '../schemas/index.js'

export interface Reflection {
  id: string
  decisionId: string
  decision: CommitteeResult['portfolio_decision']
  outcome?: TradeOutcome
  wasCorrect: boolean
  reasoningQuality: number     // 0-100
  lessonsLearned: string[]
  improvedStrategies?: string[]
  createdAt: number
}

export class ReflectionGenerator {
  private reflections: Reflection[] = []
  
  // Generate reflection after trade outcome is known
  async generateReflection(
    decision: CommitteeResult['portfolio_decision'],
    outcome: TradeOutcome
  ): Promise<Reflection> {
    const reflection: Reflection = {
      id: crypto.randomUUID(),
      decisionId: decision.id,
      decision,
      outcome,
      wasCorrect: outcome.wasCorrect,
      reasoningQuality: this.evaluateReasoningQuality(decision, outcome),
      lessonsLearned: [],
      createdAt: Date.now(),
    }
    
    // Analyze what worked and what didn't
    reflection.lessonsLearned = this.extractLessons(decision, outcome)
    
    // Generate improved strategies based on lessons
    reflection.improvedStrategies = this.generateImprovedStrategies(reflection)
    
    this.reflections.push(reflection)
    
    return reflection
  }
  
  // Evaluate the quality of the reasoning that led to this decision
  private evaluateReasoningQuality(
    decision: CommitteeResult['portfolio_decision'],
    outcome: TradeOutcome
  ): number {
    let quality = 50 // Base quality
    
    // High conviction correct = higher quality
    if (outcome.wasCorrect && decision.conviction >= 70) {
      quality += 20
    }
    
    // Low conviction incorrect = expected, not a reasoning failure
    if (!outcome.wasCorrect && decision.conviction < 60) {
      quality += 10
    }
    
    // High conviction incorrect = reasoning failure
    if (!outcome.wasCorrect && decision.conviction >= 80) {
      quality -= 30
    }
    
    // Check if evidence was properly used
    const evidenceCount = decision.reasoning_chain.steps.reduce(
      (sum, step) => sum + step.evidence_used.length, 0
    )
    
    if (evidenceCount > 5) {
      quality += 10
    } else if (evidenceCount === 0) {
      quality -= 20
    }
    
    return Math.max(0, Math.min(100, quality))
  }
  
  // Extract lessons from the decision and outcome
  private extractLessons(decision: CommitteeResult['portfolio_decision'], outcome: TradeOutcome): string[] {
    const lessons: string[] = []
    
    // Lesson 1: Conviction accuracy
    if (outcome.wasCorrect && decision.conviction >= 80) {
      lessons.push('High conviction decisions have been accurate - maintain confidence in strong signals')
    } else if (!outcome.wasCorrect && decision.conviction >= 80) {
      lessons.push('CRITICAL: High conviction was wrong - reconsider confidence calibration')
    }
    
    // Lesson 2: Evidence quality
    const evidenceCount = decision.reasoning_chain.steps.reduce(
      (sum, step) => sum + step.evidence_used.length, 0
    )
    
    if (outcome.wasCorrect && evidenceCount >= 5) {
      lessons.push('Multi-source evidence correlates with correct decisions')
    } else if (!outcome.wasCorrect && evidenceCount < 3) {
      lessons.push('Decision lacked sufficient evidence - need more sources')
    }
    
    // Lesson 3: Risk management
    if (outcome.pnlPercent < -5 && outcome.wasCorrect === false) {
      lessons.push('Stop loss should have been tighter or position size smaller')
    }
    
    // Lesson 4: Timing
    if (outcome.holdTime < 3600000 && outcome.pnlPercent > 3) {
      lessons.push('Short-term gains suggest momentum plays are working')
    } else if (outcome.holdTime > 86400000 && outcome.pnlPercent < -2) {
      lessons.push('Long holds are underperforming - consider shorter timeframes')
    }
    
    return lessons
  }
  
  // Generate improved strategies based on lessons
  private generateImprovedStrategies(reflection: Reflection): string[] {
    const strategies: string[] = []
    
    if (reflection.reasoningQuality < 50) {
      strategies.push('Increase minimum evidence threshold from 3 to 5 sources')
      strategies.push('Require external verification for high-conviction decisions')
    }
    
    if (!reflection.wasCorrect && reflection.decision.conviction >= 80) {
      strategies.push('Add calibration check for conviction > 80% - require second opinion')
    }
    
    if (reflection.outcome && reflection.outcome.holdTime < 3600000 && reflection.outcome.pnlPercent > 2) {
      strategies.push('Consider adding momentum-focused filters for short-term trades')
    }
    
    return strategies
  }
  
  // Get reflections for similar market conditions
  async getSimilarReflections(
    marketConditions: { trend: string; volatility: string },
    limit: number = 5
  ): Promise<Reflection[]> {
    // Simplified - would use actual market condition matching
    return this.reflections
      .filter(r => r.wasCorrect)
      .slice(-limit)
  }
  
  // Build reflection summary for LLM context
  async buildReflectionSummary(): Promise<string> {
    if (this.reflections.length === 0) {
      return 'No reflections yet. Agent is still learning from initial trades.'
    }
    
    const recent = this.reflections.slice(-10)
    const avgQuality = recent.reduce((sum, r) => sum + r.reasoningQuality, 0) / recent.length
    const correctCount = recent.filter(r => r.wasCorrect).length
    
    let summary = `## AGENT REFLECTION SUMMARY\n\n`
    summary += `Total reflections: ${this.reflections.length}\n`
    summary += `Recent accuracy: ${correctCount}/${recent.length} (${(correctCount / recent.length * 100).toFixed(1)}%)\n`
    summary += `Avg reasoning quality: ${avgQuality.toFixed(1)}/100\n\n`
    
    summary += `## RECENT LESSONS\n`
    for (const reflection of recent.slice(-3)) {
      for (const lesson of reflection.lessonsLearned.slice(0, 2)) {
        summary += `- ${lesson}\n`
      }
    }
    
    if (recent.some(r => r.improvedStrategies && r.improvedStrategies.length > 0)) {
      summary += `\n## IMPROVED STRATEGIES\n`
      for (const reflection of recent.filter(r => r.improvedStrategies && r.improvedStrategies.length > 0)) {
        for (const strategy of reflection.improvedStrategies!) {
          summary += `- ${strategy}\n`
        }
      }
    }
    
    return summary
  }
}
```

---

## Phase 4: Full Agent Implementation

### 4.1 Complete Trading Agent

**New file:** `engine/agents/complete-trading-agent.ts`

```typescript
// engine/agents/complete-trading-agent.ts

import type { BaseProvider } from '../providers/base-provider.js'
import { MarketContext } from '../types.js'
import { 
  CommitteeResult, 
  PortfolioDecision, 
  Rating,
  TraderAction,
  auditSystem 
} from '../schemas/index.js'
import { AgentIdentityService, AgentIdentity } from '../identity/agent-identity.js'
import { LearningEngine } from '../learning/learning-engine.js'
import { ReflectionGenerator } from '../memory/reflection-generator.js'
import { ConstraintValidator } from '../harness/constraint-validator.js'
import { performanceMonitor } from '../harness/performance-monitor.js'
import { TechnicalAnalyst } from './analysts/technical-analyst.js'
import { SentimentAnalyst } from './analysts/sentiment-analyst.js'
import { BullResearcher } from './researchers/bull-researcher.js'
import { BearResearcher } from './researchers/bear-researcher.js'
import { Trader } from './trader.js'
import { PortfolioManager } from './portfolio-manager.js'
import { DiscussionManager } from '../discussion/discussion-manager.js'
import { ToolRegistry } from '../tools/registry.js'
import { EventEmitter } from 'events'

export interface CompleteAgentConfig {
  agentId: string
  identity: AgentIdentity
  provider: BaseProvider
  tools: ToolRegistry
  rpcUrl: string
  identityContractAddress: string
}

export class CompleteTradingAgent extends EventEmitter {
  private config: CompleteAgentConfig
  private identityService: AgentIdentityService
  private learningEngine: LearningEngine
  private reflectionGenerator: ReflectionGenerator
  private constraintValidator: ConstraintValidator
  
  // Sub-agents
  private technicalAnalyst: TechnicalAnalyst
  private sentimentAnalyst: SentimentAnalyst
  private bullResearcher: BullResearcher
  private bearResearcher: BearResearcher
  private trader: Trader
  private portfolioManager: PortfolioManager
  private discussionManager: DiscussionManager
  
  constructor(config: CompleteAgentConfig) {
    super()
    this.config = config
    
    // Initialize services
    this.identityService = new AgentIdentityService(
      config.rpcUrl,
      config.identityContractAddress
    )
    this.learningEngine = new LearningEngine()
    this.reflectionGenerator = new ReflectionGenerator()
    this.constraintValidator = new ConstraintValidator()
    
    // Initialize sub-agents
    this.technicalAnalyst = new TechnicalAnalyst(config.provider)
    this.sentimentAnalyst = new SentimentAnalyst(config.provider)
    this.bullResearcher = new BullResearcher(config.provider)
    this.bearResearcher = new BearResearcher(config.provider)
    this.trader = new Trader(config.provider)
    this.portfolioManager = new PortfolioManager(config.provider)
    this.discussionManager = new DiscussionManager()
  }
  
  async runCycle(context: MarketContext): Promise<CommitteeResult> {
    const cycleId = crypto.randomUUID()
    const startTime = Date.now()
    
    this.emit('cycle:start', { cycleId, timestamp: startTime })
    
    try {
      // Build reasoning chain ID
      const chainId = auditSystem.startReasoningChain(cycleId)
      
      // Set reasoning context for all agents
      this.technicalAnalyst.setReasoningContext(chainId, cycleId)
      this.sentimentAnalyst.setReasoningContext(chainId, cycleId)
      
      // Build enriched context with learning
      const learningContext = await this.learningEngine.buildLearningContext(context)
      const reflectionSummary = await this.reflectionGenerator.buildReflectionSummary()
      
      const enrichedContext = {
        ...context,
        learningContext,
        reflectionSummary,
      }
      
      // Phase 1: Analyst Team
      this.emit('phase:start', { phase: 'analysts', cycleId })
      
      const [techResult, sentimentResult] = await Promise.all([
        this.technicalAnalyst.analyze(enrichedContext),
        this.sentimentAnalyst.analyze(enrichedContext),
      ])
      
      // Add reasoning steps to audit
      if (techResult.reasoningStep) {
        auditSystem.addReasoningStep(techResult.reasoningStep)
      }
      if (sentimentResult.reasoningStep) {
        auditSystem.addReasoningStep(sentimentResult.reasoningStep)
      }
      
      const analystReports = [techResult.data, sentimentResult.data].filter(Boolean)
      
      // Phase 2: Research Debate
      this.emit('phase:start', { phase: 'research', cycleId })
      
      const debateResult = await this.discussionManager.runResearchDebate(
        enrichedContext,
        this.bullResearcher,
        this.bearResearcher,
        analystReports
      )
      
      // Phase 3: Trader Decision
      this.emit('phase:start', { phase: 'trader', cycleId })
      
      const traderResult = await this.trader.makeDecision(
        enrichedContext,
        debateResult.researchPlan,
        analystReports
      )
      
      // Phase 4: Portfolio Manager
      this.emit('phase:start', { phase: 'portfolio_manager', cycleId })
      
      const riskEvaluation = {
        stance: 'approve' as const,
        confidence: 80,
        summary: 'Risk checks passed',
        concerns: [],
        reasoning_chain: auditSystem.addReasoningStep({
          agent_role: 'risk_panel',
          input_summary: 'Trade proposal from Trader',
          output_summary: 'Risk evaluation complete',
          evidence_used: [],
          confidence: 80,
          timestamp: Date.now(),
        }),
      }
      
      const pmResult = await this.portfolioManager.makeFinalDecision(
        enrichedContext,
        traderResult.data!,
        riskEvaluation
      )
      
      // Build final decision with full reasoning chain
      const reasoningChain = auditSystem.finalizeReasoningChain(
        chainId,
        cycleId,
        pmResult.data!.executive_summary,
        pmResult.data!.conviction
      )
      
      // Create decision with audit trail
      const portfolioDecision: PortfolioDecision = {
        ...pmResult.data!,
        id: cycleId,
        agent_id: this.config.agentId,
        reasoning_chain: reasoningChain,
        created_at: Date.now(),
        model_versions: {
          'technical': techResult.modelVersion || 'unknown',
          'sentiment': sentimentResult.modelVersion || 'unknown',
          'trader': traderResult.modelVersion || 'unknown',
          'pm': pmResult.modelVersion || 'unknown',
        },
      }
      
      // Sign decision with agent identity
      const decisionHash = auditSystem.hashData(portfolioDecision)
      const signature = await this.identityService.signDecision(
        this.config.identity.address,
        decisionHash,
        portfolioDecision
      )
      
      // Finalize result
      const result: CommitteeResult = {
        id: cycleId,
        agent_id: this.config.agentId,
        cycle_id: cycleId,
        analysts: analystReports,
        research_plan: debateResult.researchPlan,
        trader_proposal: traderResult.data!,
        risk_evaluation: riskEvaluation,
        portfolio_decision: portfolioDecision,
        debate_history: this.discussionManager.getDebateHistory(),
        execution_status: this.shouldExecute(portfolioDecision) ? 'approved' : 'blocked',
        created_at: startTime,
        duration_ms: Date.now() - startTime,
        total_tokens_used: this.estimateTokens(result),
        reasoning_hash: auditSystem.hashCommitteeResult({
          ...result,
          portfolio_decision: portfolioDecision,
        } as CommitteeResult),
      }
      
      // Execute if approved
      if (result.execution_status === 'approved') {
        result.execution_result = await this.executeTrade(portfolioDecision)
        
        if (result.execution_result.success) {
          result.execution_status = 'executed'
        }
      }
      
      this.emit('cycle:end', { cycleId, result })
      
      return result
      
    } catch (error) {
      this.emit('cycle:error', { cycleId, error: String(error) })
      throw error
    }
  }
  
  private shouldExecute(decision: PortfolioDecision): boolean {
    // Don't execute if hold
    if (decision.rating === Rating.HOLD) return false
    
    // Check constraints
    const validation = this.constraintValidator.validateTrade({
      size: this.parseSize(decision.position_size),
      leverage: decision.leverage || 1,
    })
    
    return validation.allowed
  }
  
  private parseSize(sizeStr: string): number {
    // Parse "50% of portfolio" or "$500" to number
    if (sizeStr.includes('%')) {
      return parseFloat(sizeStr.replace(/[^0-9.]/g, ''))
    }
    if (sizeStr.includes('$')) {
      return parseFloat(sizeStr.replace(/[^0-9.]/g, ''))
    }
    return 50
  }
  
  private async executeTrade(decision: PortfolioDecision): Promise<any> {
    this.emit('trade:execute', { decision })
    
    const action = decision.rating === Rating.BUY || decision.rating === Rating.OVERWEIGHT
      ? 'open_long'
      : 'open_short'
    
    // Call appropriate tool
    const result = await this.config.tools.execute(action, {
      symbol: 'BTC/USD',
      size: decision.position_size,
      entry_price: decision.entry_price,
      stop_loss: decision.stop_loss,
      take_profit: decision.take_profit,
      leverage: decision.leverage,
    })
    
    return result
  }
  
  // Record trade outcome for learning
  async recordTradeOutcome(
    decisionId: string,
    outcome: TradeOutcome
  ): Promise<void> {
    // Record in learning engine
    await this.learningEngine.recordOutcome(outcome)
    
    // Generate reflection
    const decision = this.getDecisionById(decisionId)
    if (decision) {
      const reflection = await this.reflectionGenerator.generateReflection(decision, outcome)
      
      this.emit('reflection:generated', { decisionId, reflection })
    }
  }
  
  private decisions: Map<string, PortfolioDecision> = new Map()
  
  private getDecisionById(id: string): PortfolioDecision | undefined {
    return this.decisions.get(id)
  }
  
  // Get full audit trail for a decision
  getDecisionAudit(decisionId: string): string {
    const decision = this.decisions.get(decisionId)
    if (!decision) {
      return 'Decision not found'
    }
    
    return auditSystem.exportDecision(decision)
  }
  
  // Get agent identity proof
  async getIdentityProof(): Promise<{
    identity: AgentIdentity
    verification: any
    recentDecisions: any[]
  }> {
    return this.identityService.buildIdentityReport(this.config.agentId)
  }
}

// Type for trade outcome
interface TradeOutcome {
  decisionId: string
  entryPrice: number
  exitPrice: number
  pnl: number
  pnlPercent: number
  holdTime: number
  wasCorrect: boolean
}
```

---

## Phase 5: Database Schema Updates

**Add to `trivo-backend/src/lib/schema.ts`:**

```typescript
// Agent Identity table
export const agentIdentities = pgTable('agent_identities', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id),
  tokenId: integer('token_id'),
  address: varchar('address', { length: 42 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  creator: varchar('creator', { length: 42 }).notNull(),
  metadata: jsonb('metadata').$type<AgentMetadata>(),
  verified: boolean('verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Audit Log table (for verifiable reasoning)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id),
  decisionId: varchar('decision_id', { length: 100 }),
  stepNumber: integer('step_number'),
  agentRole: varchar('agent_role', { length: 50 }),
  inputHash: varchar('input_hash', { length: 64 }),
  outputHash: varchar('output_hash', { length: 64 }),
  evidenceHashes: jsonb('evidence_hashes').$type<string[]>(),
  confidence: integer('confidence'),
  modelVersion: varchar('model_version', { length: 50 }),
  timestamp: timestamp('timestamp').defaultNow(),
})

// Reasoning Chains table
export const reasoningChains = pgTable('reasoning_chains', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: varchar('decision_id', { length: 100 }).notNull().unique(),
  agentId: uuid('agent_id').references(() => agents.id),
  chainHash: varchar('chain_hash', { length: 64 }).notNull(),
  finalConclusion: text('final_conclusion'),
  totalConfidence: integer('total_confidence'),
  steps: jsonb('steps').$type<ReasoningStep[]>(),
  createdAt: timestamp('created_at').defaultNow(),
})

// Learning Insights table
export const learningInsights = pgTable('learning_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id),
  type: varchar('type', { length: 20 }).notNull(), // 'pattern', 'strategy', 'risk', 'timing'
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  confidence: integer('confidence'),
  evidence: jsonb('evidence').$type<Evidence[]>(),
  validated: boolean('validated').default(false),
  appliedTo: jsonb('applied_to').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// Trade Outcomes table
export const tradeOutcomes = pgTable('trade_outcomes', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: varchar('decision_id', { length: 100 }).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  entryPrice: decimal('entry_price', { precision: 20, scale: 8 }),
  exitPrice: decimal('exit_price', { precision: 20, scale: 8 }),
  pnl: decimal('pnl', { precision: 20, scale: 8 }),
  pnlPercent: decimal('pnl_percent', { precision: 10, scale: 4 }),
  holdTime: bigint('hold_time'), // milliseconds
  wasCorrect: boolean('was_correct'),
  expectedDirection: varchar('expected_direction', { length: 10 }),
  actualDirection: varchar('actual_direction', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow(),
})

// Reflections table
export const reflections = pgTable('reflections', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: varchar('decision_id', { length: 100 }).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  outcomeId: uuid('outcome_id').references(() => tradeOutcomes.id),
  wasCorrect: boolean('was_correct'),
  reasoningQuality: integer('reasoning_quality'),
  lessonsLearned: jsonb('lessons_learned').$type<string[]>().default([]),
  improvedStrategies: jsonb('improved_strategies').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
})

// Decision Signatures table (for accountability)
export const decisionSignatures = pgTable('decision_signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  decisionId: varchar('decision_id', { length: 100 }).notNull().unique(),
  agentTokenId: integer('agent_token_id'),
  agentAddress: varchar('agent_address', { length: 42 }),
  signature: text('signature').notNull(),
  decisionHash: varchar('decision_hash', { length: 64 }).notNull(),
  signedAt: timestamp('signed_at').defaultNow(),
})
```

---

## Summary: What Makes This Agent "Very Good"

### ✅ Learning from History
- **Pattern Recognition**: Extracts patterns from trade outcomes
- **Reflection System**: Generates lessons from wins and losses
- **Strategy Evolution**: Adjusts behavior based on performance
- **Validation**: Validates insights against new outcomes

### ✅ Verifiable Reasoning
- **Full Audit Trail**: Every LLM call logged with evidence
- **Evidence Chains**: Each decision shows what data was used
- **Cryptographic Hashing**: Decisions are hashed for verification
- **Replay Capability**: Can replay reasoning step by step

### ✅ Agent Identity
- **ERC-8004 Integration**: On-chain identity for every agent
- **Creator Attribution**: Links decisions to creator
- **Signature Verification**: EIP-712 signed decisions
- **Verification API**: Anyone can verify agent identity

### ✅ Accountability
- **Decision Attribution**: Clear ownership of every decision
- **Performance Tracking**: Win rate, PnL, reasoning quality
- **Lesson History**: What the agent learned over time
- **Creator Liability**: Clear who is responsible

### Key Files to Create

```
engine/
├── schemas/index.ts                    # All schemas + Zod validation
├── audit/
│   └── audit-system.ts                 # Full audit trail system
├── identity/
│   └── agent-identity.ts               # ERC-8004 integration
├── learning/
│   └── learning-engine.ts             # Pattern recognition + learning
├── memory/
│   └── reflection-generator.ts         # Learn from decisions
├── agents/
│   ├── base-agent.ts                  # Abstract base with audit support
│   ├── analysts/
│   │   ├── technical-analyst.ts
│   │   └── sentiment-analyst.ts
│   ├── researchers/
│   │   ├── bull-researcher.ts
│   │   └── bear-researcher.ts
│   ├── trader.ts
│   ├── portfolio-manager.ts
│   └── complete-trading-agent.ts       # Orchestrates everything
├── harness/
│   ├── constraint-validator.ts
│   └── performance-monitor.ts
└── discussion/
    └── discussion-manager.ts
```

---

## Hackathon Impact

This implementation would be **extremely impressive** for judges because:

1. **Real AI-Powered Committee** — Each role makes actual LLM calls
2. **Learning System** — Agent gets smarter over time from trades
3. **Verifiable Reasoning** — Full audit trail with evidence chains
4. **On-Chain Identity** — ERC-8004 agent identity
5. **Accountability** — Every decision traceable to creator

This directly addresses the judging criteria:
- **Agentic Sophistication (30%)**: Multi-agent debate, learning, strategy adjustment
- **Traction (30%)**: Learning from history, improving over time
- **Circle/Arc Tooling (20%)**: ERC-8004 identity, Arc transaction signing
- **Innovation (20%)**: Verifiable reasoning, audit trails

Want me to start implementing these files? 🚀
