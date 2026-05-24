// engine/schemas/index.ts
// Structured output schemas for AI Engine v2
// All decision data, evidence chains, and audit trails

import { z } from 'zod'

// ========================
// CORE ENUMS
// ========================

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

// ========================
// EVIDENCE & AUDIT SCHEMAS
// ========================

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

// ========================
// ANALYST SCHEMAS
// ========================

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

// ========================
// COMMITTEE RESULT
// ========================

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

// ========================
// ZOD SCHEMAS FOR VALIDATION
// ========================

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

// Analyst report schema
export const AnalystReportSchema = z.object({
  role: z.string(),
  stance: z.enum(['bullish', 'bearish', 'neutral']),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  evidence: z.array(EvidenceSchema),
  reasoning_chain: ReasoningStepSchema,
  challenges: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
  model_version: z.string().optional(),
  created_at: z.number(),
})

// Trader proposal schema
export const TraderProposalSchema = z.object({
  action: z.enum(['buy', 'sell', 'hold']),
  reasoning: z.string(),
  entry_price: z.number().optional(),
  stop_loss: z.number().optional(),
  take_profit: z.number().optional(),
  position_size: z.string(),
  leverage: z.number().optional(),
  timeframe: z.string().optional(),
  reasoning_chain: ReasoningStepSchema,
})

// Risk evaluation schema
export const RiskEvaluationSchema = z.object({
  stance: z.enum(['approve', 'modify', 'reject', 'risk_off']),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  concerns: z.array(z.string()),
  modifications: z.array(z.string()).optional(),
  max_position_size: z.string().optional(),
  required_conditions: z.array(z.string()).optional(),
  reasoning_chain: ReasoningStepSchema,
})

// Research plan schema
export const ResearchPlanSchema = z.object({
  recommendation: z.enum(['buy', 'overweight', 'hold', 'underweight', 'sell']),
  rationale: z.string(),
  conviction: z.number().min(0).max(100),
  strategic_actions: z.string(),
  bull_case: z.string(),
  bear_case: z.string(),
  evidence_used: z.array(EvidenceSchema),
  debate_summary: z.string(),
  moderator_synthesis: z.string(),
})

// Debate message schema
export const DebateMessageSchema = z.object({
  from: z.string(),
  to: z.union([z.string(), z.literal('all')]).optional(),
  type: z.enum(['opening', 'challenge', 'rebuttal', 'concession', 'closing', 'evidence']),
  content: z.string(),
  evidence: z.array(EvidenceSchema).optional(),
  timestamp: z.number(),
  verifiable: z.boolean(),
})

// Learning / Reflection schemas
export const LessonSchema = z.object({
  lesson: z.string().max(500),
  mistakePattern: z.string(),
  improvement: z.string().max(500),
  usableInPrompt: z.boolean(),
})
export type Lesson = z.infer<typeof LessonSchema>
