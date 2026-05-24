// engine/memory/reflection-generator.ts
// Phase 6 - Ticket L2: Reflection Generator (LLM-powered rewrite)
// Evaluates reasoning quality, extracts lessons, generates improved strategies

import { z } from 'zod'
import { db } from '../../lib/db.js'
import { agentReflections, agentDecisions } from '../../lib/schema.js'
import { eq, desc } from 'drizzle-orm'
import type { BaseProvider } from '../providers/base-provider.js'

// ── Schemas ────────────────────────────────────────────────────────────────

const ReflectionSchema = z.object({
  outcome: z.enum(['profit', 'loss', 'breakeven']),
  wasCorrect: z.boolean(),
  reasoningQuality: z.number().min(0).max(100),
  lesson: z.string().max(300),
  missReasons: z.string(),
  mistakePattern: z.string(),
  improvement: z.string().max(300),
  summary: z.string().max(500),
  usableInPrompt: z.boolean(),
})

type Reflection = z.infer<typeof ReflectionSchema>

const SYSTEM_PROMPT = `You are a Trading Reflection Analyst — you evaluate completed trades to extract lessons.
Your job:
1. Evaluate the quality of reasoning that led to the trade
2. Identify what went right or wrong
3. Generate specific, actionable improvements
4. Determine if the lesson is valuable enough for future prompts

Be brutally honest about mistakes. Focus on patterns, not excuses.`

// ── ReflectionGenerator Class ──────────────────────────────────────────────

export class ReflectionGenerator {
  private provider: BaseProvider

  constructor(provider: BaseProvider) {
    this.provider = provider
  }

  /**
   * Generate a reflection from a completed trade
   */
  async generateReflection(
    agentId: string,
    decisionId: string,
    pnl: number,
    reasoning: string
  ): Promise<Reflection> {
    const userPrompt = `Evaluate this completed trade:

Agent: ${agentId}
Decision: ${decisionId}
PnL: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)} USDC
Proposed Reasoning: ${reasoning}

Generate a trading reflection as JSON:
{
  "outcome": "profit" | "loss" | "breakeven",
  "wasCorrect": true | false,
  "reasoningQuality": <0-100>,
  "lesson": "<one-sentence lesson>",
  "missReasons": "<what caused the result>",
  "mistakePattern": "<recurring pattern or 'none'>",
  "improvement": "<actionable improvement>",
  "summary": "<brief summary>",
  "usableInPrompt": true | false
}`

    try {
      return await this.provider.completeWithSchema(SYSTEM_PROMPT, userPrompt, ReflectionSchema)
    } catch {
      // Deterministic fallback
      return this.fallbackReflection(pnl, reasoning)
    }
  }

  /**
   * Evaluate reasoning quality score
   */
  async evaluateReasoningQuality(agentId: string, decisionId: string): Promise<number> {
    const [decision] = await db
      .select()
      .from(agentDecisions)
      .where(eq(agentDecisions.id, decisionId))
      .limit(1)

    if (!decision) return 50 // Default score

    const userPrompt = `Evaluate the reasoning quality of this trading decision:
Decision ID: ${decisionId}
Action: ${decision.action}
Reasoning: ${decision.finalReasoning}
Confidence: ${decision.calibratedConfidence}

Rate the reasoning quality from 0-100 based on:
- Clarity and specificity
- Evidence backing
- Risk consideration
- Logical coherence

Respond with ONLY a number between 0 and 100.`

    try {
      const response = await this.provider.completeWithSchema(
        'You evaluate trading decision quality. Respond with a number 0-100.',
        userPrompt,
        z.object({ score: z.number().min(0).max(100) })
      )
      return response.score
    } catch {
      return 50
    }
  }

  /**
   * Get recent lessons for LLM prompt context
   */
  async buildReflectionSummary(agentId: string, limit: number = 5): Promise<string> {
    const reflections = await db
      .select()
      .from(agentReflections)
      .where(eq(agentReflections.agentId, agentId))
      .orderBy(desc(agentReflections.createdAt))
      .limit(limit)

    if (reflections.length === 0) {
      return 'No past reflections available.'
    }

    const parts = reflections.map((r, i) =>
      `Lesson ${i + 1}: ${r.lesson || 'N/A'}
  Outcome: ${r.outcomePnl ? (parseFloat(r.outcomePnl) >= 0 ? 'Win' : 'Loss') : 'Unknown'}
  Mistake: ${r.mistakePattern || 'None noted'}
  Improvement: ${r.improvement || 'N/A'}`
    )

    return `Recent Trading Lessons (last ${reflections.length} trades):\n\n${parts.join('\n\n')}`
  }

  /**
   * Extract lessons from a reflection
   */
  extractLessons(reflection: Reflection): string[] {
    const lessons: string[] = []
    if (reflection.lesson) lessons.push(reflection.lesson)
    if (reflection.improvement) lessons.push(reflection.improvement)
    if (reflection.mistakePattern && reflection.mistakePattern !== 'none') {
      lessons.push(`Avoid: ${reflection.mistakePattern}`)
    }
    return lessons
  }

  /**
   * Deterministic fallback reflection
   */
  private fallbackReflection(pnl: number, reasoning: string): Reflection {
    const isProfit = pnl > 0
    return {
      outcome: isProfit ? 'profit' : pnl < 0 ? 'loss' : 'breakeven',
      wasCorrect: isProfit,
      reasoningQuality: isProfit ? 70 : 40,
      lesson: isProfit
        ? 'Strategy worked as expected.'
        : 'Strategy did not perform as expected.',
      missReasons: isProfit ? 'none' : reasoning || 'unfavorable market conditions',
      mistakePattern: isProfit ? 'none' : 'timing or direction error',
      improvement: isProfit
        ? 'Continue current approach with strict risk management.'
        : 'Reduce position size and wait for stronger confirmation.',
      summary: `${isProfit ? 'Profitable' : 'Loss'} trade${reasoning ? ': ' + reasoning.substring(0, 100) : ''}`,
      usableInPrompt: true,
    }
  }
}

// Kept for backwards compatibility with agent-runner.ts and decision-memory.test.ts

export interface ReflectionSummaryInput {
  market: string
  side: string
  pnl: number
  reasoning: string
  missReasons?: string[]
  nextAction?: string
}

export interface ReflectionSummary {
  outcome: 'profit' | 'loss' | 'breakeven'
  wasCorrect: boolean
  lesson: string
  missReasons: string
  nextAction: string
  mistakePattern: string
  improvement: string
  summary: string
}

function text(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  return JSON.stringify(value).replace(/\s+/g, ' ').trim()
}

function compactList(items: string[] | undefined, fallback: string): string {
  const cleaned = (items ?? [])
    .map((item) => text(item))
    .filter((item) => item.length > 0)
  return cleaned.length > 0 ? cleaned.join('; ') : fallback
}

export function buildReflectionSummary(input: ReflectionSummaryInput): ReflectionSummary {
  const market = text(input.market)
  const side = text(input.side)
  const reasoning = text(input.reasoning)
  const outcome: ReflectionSummary['outcome'] = input.pnl > 0 ? 'profit' : input.pnl < 0 ? 'loss' : 'breakeven'
  const wasCorrect = outcome === 'profit'
  const missReasons = compactList(input.missReasons, wasCorrect ? 'none' : reasoning || 'insufficient confirmation')
  const nextAction = text(
    input.nextAction ??
      (wasCorrect
        ? 'Keep the same thesis, but only scale after confirmation.'
        : 'Reduce size, wait for confirmation, and tighten risk on the next setup.'),
  )

  const lesson = wasCorrect
    ? `${market} ${side} worked because ${reasoning || 'the setup held'}.`
    : `${market} ${side} lost because ${reasoning || 'the setup failed'}.`

  const mistakePattern = wasCorrect ? 'none' : missReasons
  const improvement = wasCorrect
    ? 'Keep the same setup and only add size after confirmation.'
    : 'Reduce size, wait for stronger confirmation, and avoid the same miss pattern.'

  const nextActionLine = nextAction.replace(/[.?!]+$/, '')
  const summary = `${market} ${side} ended in ${outcome}. Miss reasons: ${missReasons}. Next action: ${nextActionLine}.`

  return {
    outcome,
    wasCorrect,
    lesson,
    missReasons,
    nextAction,
    mistakePattern,
    improvement,
    summary,
  }
}
