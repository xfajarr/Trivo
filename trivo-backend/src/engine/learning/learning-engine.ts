// engine/learning/learning-engine.ts
// Phase 6: Learning Engine - processes trade outcomes into actionable lessons

import { db } from '../../lib/db.js'
import { agentMemory, tradeOutcomes, agentReflections } from '../../lib/schema.js'
import { eq, desc, and } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import type { BaseProvider } from '../providers/base-provider.js'
import { LessonSchema, type Lesson } from '../schemas/index.js'

export interface LearningInput {
  agentId: string
  tradeOutcomeId: string
}

export class LearningEngine {
  constructor(private provider: BaseProvider) {}

  /**
   * Process a completed trade into a reflection entry
   * Uses LLM to analyze what went right/wrong
   */
  async processTradeOutcome(agentId: string, outcomeId: string): Promise<void> {
    // Get the trade outcome
    const [outcome] = await db
      .select()
      .from(tradeOutcomes)
      .where(eq(tradeOutcomes.id, outcomeId))
      .limit(1)

    if (!outcome) return

    const won = outcome.won === 'true'
    const netPnl = parseFloat(outcome.netPnl || '0')

    // Build a reflection using LLM
    let lesson: Lesson
    try {
      lesson = await this.generateLesson(outcome)
    } catch {
      // Deterministic fallback if LLM fails
      lesson = {
        lesson: `${outcome.market} ${outcome.side} ${won ? 'profitable' : 'lost'} on ${outcome.size} size`,
        mistakePattern: won ? 'none' : 'unfavorable market movement',
        improvement: won ? 'maintain current strategy' : 'add tighter stop loss',
        usableInPrompt: true,
      }
    }

    // Save the reflection
    const reflectionId = randomUUID()
    await db.insert(agentReflections).values({
      id: reflectionId,
      agentId,
      decisionId: outcome.decisionId,
      positionId: outcome.positionId,
      outcomePnl: netPnl.toString(),
      wasCorrect: outcome.wasCorrect,
      lesson: lesson.lesson,
      mistakePattern: lesson.mistakePattern,
      improvement: lesson.improvement,
      usableInPrompt: lesson.usableInPrompt ? 'true' : 'false',
    })

    // Also store as agent memory
    await db.insert(agentMemory).values({
      id: randomUUID(),
      agentId,
      type: won ? 'win_reflection' : 'loss_reflection',
      content: lesson.lesson,
      reasoning: JSON.stringify({
        mistakePattern: lesson.mistakePattern,
        improvement: lesson.improvement,
        market: outcome.market,
        side: outcome.side,
        pnl: netPnl,
      }),
    })
  }

  /**
   * Get actionable lessons for an agent to use in prompts
   */
  async getActionableLessons(agentId: string, limit: number = 5): Promise<string[]> {
    const reflections = await db
      .select()
      .from(agentReflections)
      .where(
        and(
          eq(agentReflections.agentId, agentId),
          eq(agentReflections.usableInPrompt, 'true')
        )
      )
      .orderBy(desc(agentReflections.createdAt))
      .limit(limit)

    return reflections.map(r => r.lesson || '').filter(Boolean)
  }

  /**
   * Generate a lesson from a trade outcome using LLM with Zod validation
   */
  private async generateLesson(outcome: typeof tradeOutcomes.$inferSelect): Promise<Lesson> {
    const won = outcome.won === 'true'

    const systemPrompt = `You are a trading analyst reviewing a completed trade.
Analyze the outcome and produce structured feedback.
Be specific about what happened and what can be improved.
Focus on actionable insights, not generic advice.`

    const userPrompt = `Review this trade outcome:
Market: ${outcome.market}
Side: ${outcome.side}
Size: ${outcome.size}
Entry: ${outcome.entryPrice} → Exit: ${outcome.exitPrice}
Gross PnL: ${outcome.grossPnl}
Net PnL: ${outcome.netPnl}
Hold Time: ${outcome.holdTimeMs}ms
Was correct direction: ${outcome.wasCorrect}
${won ? 'RESULT: PROFIT' : 'RESULT: LOSS'}

Generate a JSON with:
1. "lesson": One-sentence lesson learned (max 200 chars)
2. "mistakePattern": What pattern caused this result (or "none" if profit)
3. "improvement": One actionable improvement (max 200 chars)
4. "usableInPrompt": boolean - whether this lesson is valuable enough to include in future prompts`

    return this.provider.completeWithSchema(systemPrompt, userPrompt, LessonSchema)
  }
}
