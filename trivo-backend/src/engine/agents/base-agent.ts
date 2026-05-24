// engine/agents/base-agent.ts
// Abstract base class for all AI agents with audit logging and structured output

import { createHash } from 'crypto'
import { z } from 'zod'
import type { BaseProvider } from '../providers/base-provider.js'
import type { MarketContext } from '../types.js'
import { auditSystem } from '../audit/audit-system.js'
import type { Evidence, ReasoningStep } from '../schemas/index.js'

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

  // Get agent role name
  getRole(): string {
    return this.config.role
  }

  // Build system prompt for this agent with market context
  protected buildSystemPrompt(context: MarketContext): string {
    const btcPrice = context.prices['BTC/USD']?.toLocaleString() || 'N/A'
    const ethPrice = context.prices['ETH/USD']?.toLocaleString() || 'N/A'
    const solPrice = context.prices['SOL/USD']?.toLocaleString() || 'N/A'

    return `${this.config.systemPrompt}

Current Market Context:
- BTC/USD: $${btcPrice}
- ETH/USD: $${ethPrice}
- SOL/USD: $${solPrice}

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
      // Use a minimal market context for the system prompt
      // The actual context is passed at the agent level
      const minimalContext = {
        prices: {},
        priceChanges: {},
        sentiment: {},
        recentTrades: [],
        openPositions: [],
        todayPnl: 0,
        winRate: 0,
        totalTrades: 0,
      } as MarketContext

      const response = await this.provider.completeWithSchema(
        this.buildSystemPrompt(minimalContext),
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

      // Add to audit system if we have context
      if (this.currentChainId && this.currentDecisionId) {
        auditSystem.addReasoningStep(reasoningStep)
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
  protected addEvidence(_evidence: Evidence) {
    // Evidence will be attached to the reasoning step
    // Implementation in sub-classes as needed
  }
}
