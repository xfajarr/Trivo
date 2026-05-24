// services/pnl.service.ts
// Core PnL tracking: realized/unrealized, mark-to-market, aggregation, performance metrics

import { db } from '../lib/db.js'
import { positions } from '../lib/schema.js'
import { agentPnlSnapshots } from '../lib/schema.js'
import { tradeOutcomes } from '../lib/schema.js'
import { eq, and, gte, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export interface PositionPnL {
  unrealizedPnl: number
  unrealizedPnlPct: number
  grossPnl: number
  netPnl: number
  pnlPct: number
}

export interface AggregatedPnL {
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  fees: number
  tradeCount: number
  winCount: number
  lossCount: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  maxDrawdown: number
  sharpeRatio: number
}

export interface TradeOutcomeRecord {
  decisionId: string
  positionId: string
  market: string
  side: 'long' | 'short'
  size: number
  entryPrice: number
  exitPrice: number
  grossPnl: number
  fees: number
  netPnl: number
  pnlPct: number
  holdTimeMs: number
  wasCorrect: boolean
  won: boolean
}

export class PnLService {
  /**
   * Calculate unrealized PnL for a position based on current market price
   */
  calculateUnrealizedPnL(
    side: 'long' | 'short',
    size: number,
    entryPrice: number,
    currentPrice: number
  ): PositionPnL {
    let grossPnl: number

    if (side === 'long') {
      grossPnl = (currentPrice - entryPrice) * size
    } else {
      grossPnl = (entryPrice - currentPrice) * size
    }

    const pnlPct = entryPrice * size !== 0
      ? ((grossPnl / (entryPrice * size)) * 100)
      : 0

    return {
      unrealizedPnl: grossPnl,
      unrealizedPnlPct: pnlPct,
      grossPnl,
      netPnl: grossPnl, // Fees will be subtracted on close
      pnlPct,
    }
  }

  /**
   * Calculate realized PnL when closing a position
   */
  calculateRealizedPnL(
    side: 'long' | 'short',
    size: number,
    entryPrice: number,
    exitPrice: number,
    fees: number
  ): PositionPnL {
    let grossPnl: number

    if (side === 'long') {
      grossPnl = (exitPrice - entryPrice) * size
    } else {
      grossPnl = (entryPrice - exitPrice) * size
    }

    const pnlPct = entryPrice * size !== 0
      ? ((grossPnl / (entryPrice * size)) * 100)
      : 0
    const netPnl = grossPnl - fees

    return {
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      grossPnl,
      netPnl,
      pnlPct,
    }
  }

  /**
   * Update mark-to-market for all open positions
   * Called by price update cron job
   */
  async updateMarkToMarket(prices: Record<string, number>): Promise<void> {
    const openPositions = await db
      .select()
      .from(positions)
      .where(eq(positions.status, 'open'))

    for (const position of openPositions) {
      const currentPrice = prices[position.market]
      if (!currentPrice) continue

      const side = position.side as 'long' | 'short'
      const size = parseFloat(position.size)
      const entryPrice = parseFloat(position.entryPrice)

      const pnl = this.calculateUnrealizedPnL(side, size, entryPrice, currentPrice)

      await db
        .update(positions)
        .set({
          markPrice: currentPrice.toString(),
        })
        .where(eq(positions.id, position.id))
    }
  }

  /**
   * Close a position and record realized PnL
   */
  async closePosition(
    positionId: string,
    exitPrice: number,
    fees: number = 0
  ): Promise<TradeOutcomeRecord | null> {
    const position = await db
      .select()
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1)

    if (!position[0] || position[0].status !== 'open') {
      return null
    }

    const p = position[0]
    const side = p.side as 'long' | 'short'
    const size = parseFloat(p.size)
    const entryPrice = parseFloat(p.entryPrice)
    const openedAt = new Date(p.openedAt!).getTime()
    const closedAt = Date.now()

    const realizedPnL = this.calculateRealizedPnL(side, size, entryPrice, exitPrice, fees)

    // Update position
    await db
      .update(positions)
      .set({
        markPrice: exitPrice.toString(),
        realizedPnl: realizedPnL.grossPnl.toString(),
        realizedPnlPct: realizedPnL.pnlPct.toString(),
        fees: fees.toString(),
        netPnl: realizedPnL.netPnl.toString(),
        pnl: realizedPnL.netPnl.toString(),
        pnlPct: realizedPnL.pnlPct.toString(),
        status: 'closed',
        closedAt: new Date(closedAt),
      })
      .where(eq(positions.id, positionId))

    // Determine if trade was "correct" (matched expected direction)
    const expectedDirection = side
    const actualDirection = realizedPnL.grossPnl >= 0 ? ('long' as const) : ('short' as const)
    const wasCorrect = expectedDirection === actualDirection

    // Record trade outcome for learning
    const outcome: TradeOutcomeRecord = {
      decisionId: p.id,
      positionId: p.id,
      market: p.market,
      side,
      size,
      entryPrice,
      exitPrice,
      grossPnl: realizedPnL.grossPnl,
      fees,
      netPnl: realizedPnL.netPnl,
      pnlPct: realizedPnL.pnlPct,
      holdTimeMs: closedAt - openedAt,
      wasCorrect,
      won: realizedPnL.netPnl > 0,
    }

    // Save to trade_outcomes table
    await db.insert(tradeOutcomes as never).values({
      id: randomUUID(),
      agentId: p.agentId,
      decisionId: outcome.decisionId,
      positionId: outcome.positionId,
      market: outcome.market,
      side: outcome.side,
      size: outcome.size.toString(),
      entryPrice: outcome.entryPrice.toString(),
      exitPrice: outcome.exitPrice.toString(),
      grossPnl: outcome.grossPnl.toString(),
      fees: outcome.fees.toString(),
      netPnl: outcome.netPnl.toString(),
      pnlPct: outcome.pnlPct.toString(),
      holdTimeMs: outcome.holdTimeMs.toString(),
      wasCorrect: outcome.wasCorrect,
      won: outcome.won,
    })

    return outcome
  }

  /**
   * Aggregate PnL for an agent over a time window
   */
  async aggregatePnL(
    agentId: string,
    window: 'day' | 'week' | 'month' | 'all' = 'all'
  ): Promise<AggregatedPnL> {
    let startDate: Date

    switch (window) {
      case 'day':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'all':
        startDate = new Date(0)
        break
    }

    // Get closed positions in window
    const closedPositions = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.agentId, agentId),
          eq(positions.status, 'closed'),
          gte(positions.closedAt!, startDate)
        )
      )
      .orderBy(desc(positions.closedAt))

    // Get open positions
    const openPositions = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.agentId, agentId),
          eq(positions.status, 'open')
        )
      )

    // Calculate aggregates
    let realizedPnl = 0
    let unrealizedPnl = 0
    let fees = 0
    let wins = 0
    let losses = 0
    const pnlValues: number[] = []
    let peak = 0
    let maxDrawdown = 0
    let cumulative = 0

    for (const p of closedPositions) {
      const netPnl = parseFloat(p.netPnl || '0')
      const pnlFee = parseFloat(p.fees || '0')

      realizedPnl += netPnl
      fees += pnlFee
      cumulative += netPnl
      peak = Math.max(peak, cumulative)
      maxDrawdown = Math.max(maxDrawdown, peak - cumulative)

      if (netPnl > 0) {
        wins++
      } else if (netPnl < 0) {
        losses++
      }

      if (netPnl !== 0) {
        pnlValues.push(netPnl)
      }
    }

    // Calculate unrealized from open positions
    for (const p of openPositions) {
      unrealizedPnl += parseFloat(p.unrealizedPnl || '0')
    }

    const totalTrades = wins + losses
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0

    const winningPnls = pnlValues.filter(p => p > 0)
    const losingPnls = pnlValues.filter(p => p < 0)

    const avgWin = winningPnls.length > 0
      ? winningPnls.reduce((a, b) => a + b, 0) / winningPnls.length
      : 0
    const avgLoss = losingPnls.length > 0
      ? Math.abs(losingPnls.reduce((a, b) => a + b, 0) / losingPnls.length)
      : 0

    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0

    const sharpeRatio = this.calculateSharpeRatio(pnlValues)

    return {
      realizedPnl,
      unrealizedPnl,
      totalPnl: realizedPnl + unrealizedPnl,
      fees,
      tradeCount: totalTrades,
      winCount: wins,
      lossCount: losses,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      maxDrawdown,
      sharpeRatio,
    }
  }

  /**
   * Calculate simplified Sharpe-like ratio
   */
  private calculateSharpeRatio(pnlValues: number[]): number {
    if (pnlValues.length < 2) return 0

    const returns = pnlValues
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)

    if (stdDev === 0) return 0

    return (avgReturn / stdDev) * Math.sqrt(252)
  }

  /**
   * Get PnL history for charting
   */
  async getPnLHistory(
    agentId: string,
    window: 'hourly' | 'daily' | 'weekly' = 'daily'
  ): Promise<Array<{
    timestamp: Date
    realizedPnl: number
    unrealizedPnl: number
    totalPnl: number
    portfolioValue: number
  }>> {
    const snapshots = await db
      .select()
      .from(agentPnlSnapshots)
      .where(
        and(
          eq(agentPnlSnapshots.agentId, agentId),
          eq(agentPnlSnapshots.window, window)
        )
      )
      .orderBy(desc(agentPnlSnapshots.snapshotAt))

    return snapshots.map(s => ({
      timestamp: s.snapshotAt!,
      realizedPnl: parseFloat(s.realizedPnl || '0'),
      unrealizedPnl: parseFloat(s.unrealizedPnl || '0'),
      totalPnl: parseFloat(s.totalPnl || '0'),
      portfolioValue: parseFloat(s.portfolioValue || '0'),
    }))
  }

  /**
   * Create hourly/daily snapshot for charting
   */
  async createSnapshot(agentId: string): Promise<void> {
    const aggregated = await this.aggregatePnL(agentId, 'day')

    // Get current portfolio value (would come from wallet service)
    const portfolioValue = 10000 + aggregated.totalPnl

    await db.insert(agentPnlSnapshots as never).values({
      id: randomUUID(),
      agentId,
      window: 'hourly',
      realizedPnl: aggregated.realizedPnl.toString(),
      unrealizedPnl: aggregated.unrealizedPnl.toString(),
      totalPnl: aggregated.totalPnl.toString(),
      openPositions: aggregated.tradeCount - aggregated.winCount - aggregated.lossCount,
      closedPositions: aggregated.winCount + aggregated.lossCount,
      winningPositions: aggregated.winCount,
      losingPositions: aggregated.lossCount,
      winRate: aggregated.winRate.toString(),
      sharpeRatio: aggregated.sharpeRatio.toString(),
      maxDrawdown: aggregated.maxDrawdown.toString(),
      portfolioValue: portfolioValue.toString(),
      snapshotAt: new Date(),
    })
  }

  /**
   * Get performance metrics for agent scorecard
   */
  async getPerformanceMetrics(agentId: string): Promise<{
    realizedPnl: number
    unrealizedPnl: number
    winRate: number
    sharpeRatio: number
    maxDrawdown: number
    totalTrades: number
    avgHoldTime: number
  }> {
    const [day, week, month, all] = await Promise.all([
      this.aggregatePnL(agentId, 'day'),
      this.aggregatePnL(agentId, 'week'),
      this.aggregatePnL(agentId, 'month'),
      this.aggregatePnL(agentId, 'all'),
    ])

    // Get average hold time from trade outcomes
    const outcomes = await db
      .select()
      .from(tradeOutcomes)
      .where(eq(tradeOutcomes.agentId, agentId))

    const avgHoldTime = outcomes.length > 0
      ? outcomes.reduce((sum, o) => sum + parseInt(o.holdTimeMs || '0'), 0) / outcomes.length
      : 0

    return {
      realizedPnl: all.realizedPnl,
      unrealizedPnl: all.unrealizedPnl,
      winRate: all.winRate,
      sharpeRatio: all.sharpeRatio,
      maxDrawdown: all.maxDrawdown,
      totalTrades: all.tradeCount,
      avgHoldTime,
    }
  }
}

// Singleton instance
export const pnlService = new PnLService()
