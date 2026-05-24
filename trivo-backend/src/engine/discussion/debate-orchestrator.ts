// engine/discussion/debate-orchestrator.ts
// Phase 6: Multi-agent debate orchestration for committee decision-making

import type { BaseProvider } from '../providers/base-provider.js'
import {
  StanceSchema,
  DebaterResultSchema,
  type DebaterResult
} from './schemas.js'
import { auditSystem } from '../audit/audit-system.js'
import type { Evidence } from '../schemas/index.js'
import { createHash } from 'crypto'

export interface DebaterConfig {
  role: string
  description: string
  systemPrompt: string
}

export interface DebateRound {
  round: number
  statements: Array<{
    role: string
    stance: 'bullish' | 'bearish' | 'neutral'
    summary: string
    confidence: number
  }>
}

export class DebateOrchestrator {
  private debaters: DebaterConfig[] = []
  private provider: BaseProvider
  private evidenceUsed: Evidence[] = []

  constructor(provider: BaseProvider) {
    this.provider = provider
  }

  /**
   * Register a debater (analyst role)
   */
  registerDebater(config: DebaterConfig): void {
    this.debaters.push(config)
  }

  /**
   * Register evidence for all debaters to use
   */
  registerEvidence(evidence: Evidence): void {
    this.evidenceUsed.push(evidence)
  }

  /**
   * Run a full debate cycle
   */
  async runDebate(marketContext: string): Promise<{
    rounds: DebateRound[]
    consensus: DebaterResult
    debateSummary: string
  }> {
    const rounds: DebateRound[] = []
    let consensus: DebaterResult | null = null
    const evidenceSummary = this.evidenceUsed
      .map(e => `[${e.type}] ${e.content} (confidence: ${e.confidence}%)`)
      .join('\n')

    // Round 1: Opening statements from all debaters
    const round1Statements: DebateRound['statements'] = []
    for (const debater of this.debaters) {
      const result = await this.getDebaterInput(debater, marketContext, evidenceSummary, 'opening')
      round1Statements.push({
        role: debater.role,
        stance: result.stance,
        summary: result.summary,
        confidence: result.confidence,
      })

      // Audit the step
      auditSystem.createEvidence('model_output', `LLM:${debater.role}`, result.summary, result.confidence)
    }
    rounds.push({ round: 1, statements: round1Statements })

    // Round 2: Rebuttals based on hearing others (if 2+ debaters)
    const round2Statements: DebateRound['statements'] = []
    if (this.debaters.length >= 2) {
      const otherViews = round1Statements.map(s => `- ${s.role}: ${s.stance} (confidence: ${s.confidence}%): ${s.summary}`).join('\n')

      for (const debater of this.debaters) {
        const result = await this.getDebaterInput(
          debater,
          marketContext,
          evidenceSummary,
          'rebuttal',
          otherViews
        )
        round2Statements.push({
          role: debater.role,
          stance: result.stance,
          summary: result.summary,
          confidence: result.confidence,
        })
      }
      rounds.push({ round: 2, statements: round2Statements })
    }

    // Final round: Consensus building
    const finalStatements = round2Statements.length > 0 ? round2Statements : round1Statements

    // Have the first debater synthesize consensus
    if (this.debaters.length > 0) {
      consensus = await this.synthesizeConsensus(this.debaters[0]!, finalStatements)
    } else {
      consensus = {
        stance: 'neutral',
        confidence: 0,
        summary: 'No debaters registered',
        reasoning: 'No analysis available',
        evidence_hashes: [],
      }
    }

    const debateSummary = this.buildDebateSummary(rounds, consensus)

    return { rounds, consensus, debateSummary }
  }

  /**
   * Get input from a single debater
   */
  private async getDebaterInput(
    debater: DebaterConfig,
    marketContext: string,
    evidenceSummary: string,
    round: 'opening' | 'rebuttal',
    otherViews?: string
  ): Promise<DebaterResult> {
    let systemPrompt = debater.systemPrompt
    let userPrompt: string

    if (round === 'opening') {
      userPrompt = `Market Context:
${marketContext}

Available Evidence:
${evidenceSummary}

As a ${debater.description}, provide your analysis.
Respond with JSON following the schema:
{
  "stance": "bullish" | "bearish" | "neutral",
  "confidence": <number 0-100>,
  "summary": "<2-3 sentence analysis>",
  "reasoning": "<detailed reasoning>",
  "evidence_hashes": []
}`
    } else {
      userPrompt = `Market Context:
${marketContext}

Available Evidence:
${evidenceSummary}

Other analysts say:
${otherViews}

As a ${debater.description}, respond to the other analysts' views.
You may keep or change your stance based on their arguments.
Respond with JSON following the schema:
{
  "stance": "bullish" | "bearish" | "neutral",
  "confidence": <number 0-100>,
  "summary": "<rebuttal or updated view>",
  "reasoning": "<why you agree or disagree>",
  "evidence_hashes": []
}`
    }

    try {
      const result = await this.provider.completeWithSchema(
        systemPrompt,
        userPrompt,
        DebaterResultSchema
      )
      return result
    } catch {
      return {
        stance: 'neutral',
        confidence: 50,
        summary: `${debater.role} analysis unavailable`,
        reasoning: 'Failed to get LLM response',
        evidence_hashes: [],
      }
    }
  }

  /**
   * Synthesize final consensus
   */
  private async synthesizeConsensus(
    moderator: DebaterConfig,
    statements: DebateRound['statements']
  ): Promise<DebaterResult> {
    const viewsSummary = statements.map(s =>
      `- ${s.role}: ${s.stance} (${s.confidence}%)\n  ${s.summary}`
    ).join('\n')

    const systemPrompt = `You are a debate moderator synthesizing diverse analyst views into a consensus.
You must weigh each argument by confidence and evidence strength.
Produce a balanced final recommendation.`

    const userPrompt = `Analyst Views:
${viewsSummary}

Synthesize a consensus. Respond with JSON:
{
  "stance": "bullish" | "bearish" | "neutral",
  "confidence": <number 0-100>,
  "summary": "<final synthesis>",
  "reasoning": "<how you weighed the arguments>",
  "evidence_hashes": []
}`

    try {
      return await this.provider.completeWithSchema(systemPrompt, userPrompt, DebaterResultSchema)
    } catch {
      // Fallback: simple majority
      const bullish = statements.filter(s => s.stance === 'bullish').length
      const bearish = statements.filter(s => s.stance === 'bearish').length
      const stance = bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral'
      const avgConfidence = statements.reduce((sum, s) => sum + s.confidence, 0) / statements.length

      return {
        stance: stance as 'bullish' | 'bearish' | 'neutral',
        confidence: Math.round(avgConfidence),
        summary: `Consensus: ${stance} with ${avgConfidence.toFixed(0)}% confidence`,
        reasoning: 'Fallback: majority vote',
        evidence_hashes: [],
      }
    }
  }

  /**
   * Build a human-readable debate summary
   */
  private buildDebateSummary(
    rounds: DebateRound[],
    consensus: DebaterResult
  ): string {
    let summary = '=== DEBATE SUMMARY ===\n\n'

    for (const round of rounds) {
      summary += `Round ${round.round}:\n`
      for (const stmt of round.statements) {
        summary += `  ${stmt.role}: ${stmt.stance.toUpperCase()} (${stmt.confidence}%)\n`
        summary += `    "${stmt.summary}"\n`
      }
      summary += '\n'
    }

    summary += `=== CONSENSUS ===\n`
    summary += `Stance: ${consensus.stance.toUpperCase()}\n`
    summary += `Confidence: ${consensus.confidence}%\n`
    summary += `Summary: ${consensus.summary}\n`

    return summary
  }
}
