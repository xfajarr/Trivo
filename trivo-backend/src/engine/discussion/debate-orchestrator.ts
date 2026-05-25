// engine/discussion/debate-orchestrator.ts
// Phase 6: Multi-agent debate orchestration for committee decision-making

import type { BaseProvider } from '../providers/base-provider.js'
import {
  DebaterResultSchema,
  type DebaterResult
} from './schemas.js'
import { auditSystem } from '../audit/audit-system.js'
import type { Evidence } from '../schemas/index.js'

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

  registerDebater(config: DebaterConfig): void {
    this.debaters.push(config)
  }

  registerEvidence(evidence: Evidence): void {
    this.evidenceUsed.push(evidence)
  }

  /**
   * Run a full debate with market context string
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

    // Round 1: Opening statements
    const round1Statements: DebateRound['statements'] = []
    for (const debater of this.debaters) {
      const result = await this.getDebaterInput(debater, marketContext, evidenceSummary, 'opening')
      round1Statements.push({
        role: debater.role,
        stance: result.stance,
        summary: result.summary,
        confidence: result.confidence,
      })
      auditSystem.createEvidence('model_output', `LLM:${debater.role}`, result.summary, result.confidence)
    }
    rounds.push({ round: 1, statements: round1Statements })

    // Round 2: Rebuttals
    const round2Statements: DebateRound['statements'] = []
    if (this.debaters.length >= 2) {
      const otherViews = round1Statements.map(s => `- ${s.role}: ${s.stance} (confidence: ${s.confidence}%): ${s.summary}`).join('\n')

      for (const debater of this.debaters) {
        const result = await this.getDebaterInput(
          debater, marketContext, evidenceSummary, 'rebuttal', otherViews
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

    // Round 3: Challenge round (if disagreement > 30%)
    let round3Statements: DebateRound['statements'] | undefined
    if (this.debaters.length >= 3) {
      const max = Math.max(...round1Statements.map(s => s.confidence))
      const min = Math.min(...round1Statements.map(s => s.confidence))
      if (max - min > 30) {
        round3Statements = []
        const challengesText = round2Statements.map(s =>
          `- ${s.role}: "${s.summary}"`
        ).join('\n')

        for (const debater of this.debaters) {
          const result = await this.getDebaterInput(
            debater, marketContext, evidenceSummary, 'challenge', challengesText
          )
          round3Statements.push({
            role: debater.role,
            stance: result.stance,
            summary: result.summary,
            confidence: result.confidence,
          })
        }
        rounds.push({ round: 3, statements: round3Statements })
      }
    }

    // Final consensus
    const finalStatements = round3Statements || round2Statements.length > 0 ? round2Statements : round1Statements
    if (this.debaters.length > 0) {
      consensus = await this.synthesizeConsensus(this.debaters[0]!, finalStatements)
    }

    const debateSummary = this.buildDebateSummary(rounds, consensus!)

    return { rounds, consensus: consensus!, debateSummary }
  }

  /**
   * Run a research debate with structured inputs (analyst reports + bull/bear cases)
   */
  async runResearchDebate(
    marketContext: string,
    bullCase: string,
    bearCase: string,
    analystReports: Array<{ role: string; stance: string; confidence: number; summary: string }>
  ): Promise<{
    rounds: DebateRound[]
    consensus: DebaterResult
    researchPlan: string
    debateSummary: string
  }> {
    const enrichedContext = `${marketContext}

Bull Case:
${bullCase}

Bear Case:
${bearCase}

Analyst Reports:
${analystReports.map(r => `- ${r.role}: ${r.stance.toUpperCase()} (${r.confidence}%): ${r.summary}`).join('\n')}`

    const result = await this.runDebate(enrichedContext)
    const consensus = result.consensus

    // Build research plan summary
    const researchPlan = `Research Plan:
- Consensus: ${consensus.stance.toUpperCase()} (${consensus.confidence}% confidence)
- Summary: ${consensus.summary}
- Key Reasoning: ${consensus.reasoning}
- Evidence Count: ${consensus.evidence_hashes.length}
- Debate Rounds: ${result.rounds.length}`

    return { ...result, researchPlan }
  }

  /**
   * Get debate history
   */
  getDebateHistory(): Array<{ round: number; statements: unknown[] }> {
    return []
  }

  /**
   * Synthesize a research plan from analyst views
   */
  async synthesizeResearchPlan(
    _bullCase: string,
    _bearCase: string,
    analystViews: string,
    finalStatements: DebateRound['statements']
  ): Promise<string> {
    const viewsSummary = finalStatements.map(s =>
      `- ${s.role}: ${s.stance} (${s.confidence}%): ${s.summary}`
    ).join('\n')

    try {
      const systemPrompt = `You are a research synthesis moderator. Combine bull/bear cases and analyst views into a clear research plan.
Produce a balanced recommendation with specific entry/exit parameters.`

      const userPrompt = `Analyst Views:
${analystViews}

${viewsSummary}

Synthesize a research plan including:
1. Consensus direction (bullish/bearish/neutral)
2. Conviction level (0-100)
3. Key catalysts or risks
4. Entry and exit strategy
5. Position sizing recommendation`

      const response = await this.provider.completeWithSchema(
        systemPrompt,
        userPrompt,
        DebaterResultSchema
      )
      return `Research Plan:
- Recommendation: ${response.stance.toUpperCase()}
- Conviction: ${response.confidence}%
- Rationale: ${response.reasoning}
- Summary: ${response.summary}`
    } catch {
      return `Research Plan:
- Recommendation: NEUTRAL
- Conviction: 50%
- Rationale: Default fallback plan
- Summary: Unable to synthesize research`
    }
  }

  private async getDebaterInput(
    debater: DebaterConfig,
    marketContext: string,
    evidenceSummary: string,
    round: 'opening' | 'rebuttal' | 'challenge',
    otherViews?: string
  ): Promise<DebaterResult> {
    const systemPrompt = debater.systemPrompt
    let userPrompt: string

    if (round === 'opening') {
      userPrompt = `Market Context:
${marketContext}

Available Evidence:
${evidenceSummary}

As a ${debater.description}, provide your analysis.
Respond with JSON:
{
  "stance": "bullish" | "bearish" | "neutral",
  "confidence": <number 0-100>,
  "summary": "<2-3 sentence analysis>",
  "reasoning": "<detailed reasoning>",
  "evidence_hashes": []
}`
    } else if (round === 'rebuttal') {
      userPrompt = `Market Context:
${marketContext}

Available Evidence:
${evidenceSummary}

Other analysts say:
${otherViews}

As a ${debater.description}, respond to the other analysts' views.
You may keep or change your stance based on their arguments.
Respond with JSON:
{
  "stance": "bullish" | "bearish" | "neutral",
  "confidence": <number 0-100>,
  "summary": "<rebuttal or updated view>",
  "reasoning": "<why you agree or disagree>",
  "evidence_hashes": []
}`
    } else {
      userPrompt = `Market Context:
${marketContext}

Available Evidence:
${evidenceSummary}

Current Debate:
${otherViews}

As a ${debater.description}, challenge the viewpoints presented.
Identify weaknesses in opposing arguments and strengthen your position.
Respond with JSON:
{
  "stance": "bullish" | "bearish" | "neutral",
  "confidence": <number 0-100>,
  "summary": "<challenge to other views>",
  "reasoning": "<why you disagree>",
  "evidence_hashes": []
}`
    }

    try {
      const result = await this.provider.completeWithSchema(
        systemPrompt, userPrompt, DebaterResultSchema
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
