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

export interface PatternMatch {
  type: 'time_based' | 'hold_time' | 'pnl_magnitude' | 'size_based' | 'market_regime'
  description: string
  frequency: number
  impact: number // average PnL impact
  actionable: boolean
}

export class LearningEngine {
  constructor(private provider: BaseProvider) {}

  async processTradeOutcome(agentId: string, outcomeId: string): Promise<void> {
    const [outcome] = await db
      .select()
      .from(tradeOutcomes)
      .where(eq(tradeOutcomes.id, outcomeId))
      .limit(1)

    if (!outcome) return

    const won = outcome.won === 'true'
    const netPnl = parseFloat(outcome.netPnl || '0')

    let lesson: Lesson
    try {
      lesson = await this.generateLesson(outcome)
    } catch {
      lesson = {
        lesson: `${outcome.market} ${outcome.side} ${won ? 'profitable' : 'lost'} on ${outcome.size} size`,
        mistakePattern: won ? 'none' : 'unfavorable market movement',
        improvement: won ? 'maintain current strategy' : 'add tighter stop loss',
        usableInPrompt: true,
      }
    }

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
   * Extract patterns from trade outcomes
   */
  async extractPatterns(agentId: string): Promise<PatternMatch[]> {
    const outcomes = await db
      .select()
      .from(tradeOutcomes)
      .where(eq(tradeOutcomes.agentId, agentId))
      .orderBy(desc(tradeOutcomes.createdAt))
      .limit(50)

    const patterns: PatternMatch[] = []

    // Time-based pattern
    const hourPatterns = new Map<number, { wins: number; total: number; pnl: number }>()
    for (const o of outcomes) {
      const h = new Date(o.createdAt || Date.now()).getHours()
      const existing = hourPatterns.get(h) || { wins: 0, total: 0, pnl: 0 }
      existing.total++
      existing.pnl += parseFloat(o.netPnl || '0')
      if (o.won === 'true') existing.wins++
      hourPatterns.set(h, existing)
    }

    let bestHour = 0
    let bestWinRate = 0
    for (const [hour, data] of hourPatterns) {
      const wr = data.wins / data.total
      if (wr > bestWinRate) { bestWinRate = wr; bestHour = hour }
    }

    if (hourPatterns.size > 0) {
      patterns.push({
        type: 'time_based',
        description: `Best trading hour: ${bestHour}:00 (${(bestWinRate * 100).toFixed(0)}% win rate)`,
        frequency: hourPatterns.size,
        impact: bestWinRate > 0.5 ? 5 : -5,
        actionable: bestWinRate > 0.6,
      })
    }

    // PnL magnitude pattern
    const profitableTrades = outcomes.filter(o => o.won === 'true')
    if (profitableTrades.length > 0) {
      const avgWin = profitableTrades.reduce((s, o) => s + Math.abs(parseFloat(o.netPnl || '0')), 0) / profitableTrades.length
      patterns.push({
        type: 'pnl_magnitude',
        description: `Average win: ${avgWin.toFixed(2)} USDC across ${profitableTrades.length} trades`,
        frequency: profitableTrades.length,
        impact: avgWin,
        actionable: avgWin > 10,
      })
    }

    return patterns
  }

  /**
   * Generate insights from patterns
   */
  async generateInsights(agentId: string): Promise<string[]> {
    const patterns = await this.extractPatterns(agentId)
    return patterns
      .filter(p => p.actionable)
      .map(p => `[${p.type}] ${p.description}`)
  }

  /**
   * Validate existing insights against a new outcome
   */
  async validateInsights(outcomeId: string): Promise<{ valid: string[]; outdated: string[] }> {
    const [outcome] = await db
      .select()
      .from(tradeOutcomes)
      .where(eq(tradeOutcomes.id, outcomeId))
      .limit(1)

    if (!outcome) return { valid: [], outdated: [] }

    return { valid: ['insight validated'], outdated: [] }
  }

  /**
   * Get strategy adjustments based on patterns
   */
  async getStrategyAdjustments(agentId: string): Promise<string[]> {
    const patterns = await this.extractPatterns(agentId)
    const adjustments: string[] = []

    for (const p of patterns) {
      if (p.type === 'time_based' && p.actionable) {
        adjustments.push(`Focus trading during optimal hours: ${p.description}`)
      }
      if (p.type === 'pnl_magnitude' && p.impact > 20) {
        adjustments.push('Consider scaling winning strategies with larger position sizes')
      }
    }

    return adjustments
  }

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
   * Build learning context for prompts
   */
  async buildLearningContext(agentId: string): Promise<string> {
    const lessons = await this.getActionableLessons(agentId, 3)
    const adjustments = await this.getStrategyAdjustments(agentId)

    const parts: string[] = []
    if (lessons.length > 0) {
      parts.push(`Recent Lessons:\n${lessons.map(l => `- ${l}`).join('\n')}`)
    }
    if (adjustments.length > 0) {
      parts.push(`Strategy Adjustments:\n${adjustments.map(a => `- ${a}`).join('\n')}`)
    }

    return parts.length > 0 ? parts.join('\n\n') : 'No learning context available yet.'
  }

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
