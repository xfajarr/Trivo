# Trivo PnL Tracking System

> **Purpose:** Realized & Unrealized PnL for AI Trading Agents
> **Date:** 2026-05-24

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PnL TRACKING SYSTEM                            │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ POSITIONS TABLE                                                  │   │
│  │                                                                  │   │
│  │  position                                                         │   │
│  │  ├── id, agent_id, market, side, size                           │   │
│  │  ├── entry_price ←── Set on open                                 │   │
│  │  ├── mark_price ←── Updated every tick (unrealized PnL)         │   │
│  │  ├── realized_pnl ←── Set on close                              │   │
│  │  ├── unrealized_pnl ←── (mark - entry) × size                   │   │
│  │  ├── pnl ←── Total PnL (realized + unrealized)                 │   │
│  │  ├── pnl_pct ←── Percentage return                              │   │
│  │  ├── fees ←── Gas + trading fees                               │   │
│  │  ├── net_pnl ←── pnl - fees                                    │   │
│  │  ├── status ←── 'open' | 'closed'                              │   │
│  │  ├── closed_at ←── Timestamp when closed                       │   │
│  │  └── reasoning ←── Why this trade was made                     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ PnL SERVICE                                                       │   │
│  │                                                                  │   │
│  │  calculateUnrealizedPnL(position, currentPrice) → number         │   │
│  │  calculateRealizedPnL(position, exitPrice) → number             │   │
│  │  updateMarkToMarket() → updates all open positions              │   │
│  │  settlePosition(positionId, exitPrice) → closes & records      │   │
│  │  aggregatePnL(agentId, window) → Daily|Weekly|Monthly totals    │   │
│  │  getPerformanceMetrics(agentId) → WinRate, Sharpe, Drawdown     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                           │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ LEARNING ENGINE INTEGRATION                                       │   │
│  │                                                                  │   │
│  │  recordTradeOutcome(decision, position, outcome)               │   │
│  │  └── Feeds into pattern recognition                            │   │
│  │  └── Feeds into reflection generator                            │   │
│  │  └── Feeds into strategy adjustment                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Updates

### Updated: `positions` table

```typescript
// Add these columns to positions table
export const positions = pgTable('positions', {
  id: text('id').primaryKey(),
  copyTradingPositionId: text('copy_trading_position_id'),
  agentId: text('agent_id').notNull(),
  decisionId: text('decision_id'),  // NEW: Link to decision
  
  // ... existing fields ...
  market: text('market').notNull(),
  side: text('side').notNull(),
  size: text('size').notNull(),
  entryPrice: text('entry_price').notNull(),
  markPrice: text('mark_price'),
  
  // NEW PnL Fields
  unrealizedPnl: text('unrealized_pnl').default('0'),     // Current unrealized
  unrealizedPnlPct: text('unrealized_pnl_pct').default('0'),
  realizedPnl: text('realized_pnl').default('0'),         // Set on close
  realizedPnlPct: text('realized_pnl_pct').default('0'),
  fees: text('fees').default('0'),                         // Gas + trading fees
  netPnl: text('net_pnl').default('0'),                   // realized - fees
  priceAtOpen: text('price_at_open'),                     // Price when opened
  priceAtClose: text('price_at_close'),                    // Price when closed
  
  // ... existing fields ...
  status: text('status').default('open'),                  // 'open' | 'closed' | 'liquidated'
  openedAt: timestamp('opened_at').defaultNow(),
  closedAt: timestamp('closed_at'),
})
```

### New: `agent_pnl_snapshots` table

```typescript
// Track PnL over time for charts
export const agentPnlSnapshots = pgTable('agent_pnl_snapshots', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  
  // Snapshot type
  window: text('window').notNull(),  // 'hourly' | 'daily' | 'weekly' | 'monthly'
  
  // PnL metrics
  realizedPnl: text('realized_pnl').default('0'),
  unrealizedPnl: text('unrealized_pnl').default('0'),
  totalPnl: text('total_pnl').default('0'),
  
  // Position counts
  openPositions: integer('open_positions').default(0),
  closedPositions: integer('closed_positions').default(0),
  winningPositions: integer('winning_positions').default(0),
  losingPositions: integer('losing_positions').default(0),
  
  // Performance metrics at snapshot
  winRate: text('win_rate'),
  sharpeRatio: text('sharpe_ratio'),
  maxDrawdown: text('max_drawdown'),
  
  // Portfolio value at snapshot
  portfolioValue: text('portfolio_value'),
  
  // Timestamp
  snapshotAt: timestamp('snapshot_at').defaultNow(),
})
```

### New: `trade_outcomes` table (for learning)

```typescript
// Structured trade outcomes for learning engine
export const tradeOutcomes = pgTable('trade_outcomes', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  decisionId: text('decision_id'),
  positionId: text('position_id'),
  
  // Trade details
  market: text('market').notNull(),
  side: text('side').notNull(),
  size: text('size').notNull(),
  
  // Prices
  entryPrice: text('entry_price').notNull(),
  exitPrice: text('exit_price').notNull(),
  expectedDirection: text('expected_direction'),  // 'long' | 'short'
  actualDirection: text('actual_direction'),
  
  // PnL
  grossPnl: text('gross_pnl'),
  fees: text('fees'),
  netPnl: text('net_pnl'),
  pnlPct: text('pnl_pct'),
  
  // Outcome
  wasCorrect: boolean('was_correct'),  // Did it match expected direction?
  won: boolean('won'),                  // Did it make money?
  
  // Timing
  holdTimeMs: bigint('hold_time_ms'),  // How long position was held
  
  // Reasoning quality at time of decision
  decisionConfidence: text('decision_confidence'),
  reasoningQuality: text('reasoning_quality'),
  
  // Pattern tags (auto-extracted)
  patterns: text('patterns').array(),   // e.g., ['momentum', 'hour_14', 'short_term']
  
  // Market conditions at entry
  marketConditions: text('market_conditions'),  // JSON: { trend, volatility, regime }
  
  // Created
  closedAt: timestamp('closed_at').defaultNow(),
})
```

---

## PnL Service

**New file:** `engine/services/pnl.service.ts`

```typescript
// engine/services/pnl.service.ts

import { db } from '../lib/db.js'
import { positions, agentPnlSnapshots, tradeOutcomes } from '../lib/schema.js'
import { eq, and, gte, lte, desc } from 'drizzle-orm'

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

export interface TradeOutcome {
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
    
    const pnlPct = ((grossPnl / (entryPrice * size)) * 100)
    
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
    
    const pnlPct = ((grossPnl / (entryPrice * size)) * 100)
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
    // Get all open positions
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
          unrealizedPnl: pnl.unrealizedPnl.toString(),
          unrealizedPnlPct: pnl.unrealizedPnlPct.toString(),
          pnl: pnl.unrealizedPnl.toString(),
          pnlPct: pnl.unrealizedPnlPct.toString(),
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
    fees: number
  ): Promise<TradeOutcome | null> {
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
        priceAtClose: exitPrice.toString(),
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
    const expectedDirection = side // The agent expected this direction
    const actualDirection = realizedPnL.grossPnl >= 0 ? 'long' : 'short'
    const wasCorrect = expectedDirection === actualDirection
    
    // Record trade outcome for learning
    const outcome: TradeOutcome = {
      decisionId: p.decisionId || p.id,
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
    await db.insert(tradeOutcomes).values({
      id: crypto.randomUUID(),
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
    window: 'day' | 'week' | 'month' | 'all'
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
    
    // Simplified Sharpe-like ratio (would need returns for proper calculation)
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
    
    // Annualized (assuming daily returns)
    return (avgReturn / stdDev) * Math.sqrt(252)
  }
  
  /**
   * Get PnL history for charting
   */
  async getPnLHistory(
    agentId: string,
    window: 'hourly' | 'daily' | 'weekly'
  ): Promise<Array<{
    timestamp: Date
    realizedPnl: number
    unrealizedPnl: number
    totalPnl: number
    portfolioValue: number
  }>> {
    // Check snapshots first
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
    const portfolioValue = 10000 + aggregated.totalPnl // Placeholder
    
    await db.insert(agentPnlSnapshots).values({
      id: crypto.randomUUID(),
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
```

---

## Integration with Learning Engine

**Updated:** `engine/learning/learning-engine.ts`

```typescript
// Add PnL integration

import { pnlService, TradeOutcome as PnLTradeOutcome } from '../services/pnl.service.js'

export class LearningEngine {
  // ... existing code ...
  
  // Record trade outcome with full PnL data
  async recordTradeOutcome(outcome: PnLTradeOutcome): Promise<void> {
    // Record in PnL service
    const tradeOutcome = await pnlService.closePosition(
      outcome.positionId,
      outcome.exitPrice,
      outcome.fees
    )
    
    if (!tradeOutcome) return
    
    // Extract patterns from PnL
    const patterns = this.extractPnLPatterns(tradeOutcome)
    
    // Generate insights from PnL
    const insights = this.generatePnLInsights(tradeOutcome)
    
    // Update pattern success rates
    for (const pattern of patterns) {
      this.updatePatternSuccess(pattern, tradeOutcome.won)
    }
    
    // Update strategy adjustments based on PnL
    await this.updateStrategyFromPnL(tradeOutcome)
  }
  
  // Extract patterns from trade outcome
  private extractPnLPatterns(outcome: PnLTradeOutcome): string[] {
    const patterns: string[] = []
    
    // Time-based patterns
    const hour = new Date().getHours()
    patterns.push(`hour_${hour}`)
    
    // Hold time patterns
    if (outcome.holdTimeMs < 3600000) {
      patterns.push('short_term')
    } else if (outcome.holdTimeMs > 86400000) {
      patterns.push('long_term')
    } else {
      patterns.push('medium_term')
    }
    
    // PnL magnitude patterns
    if (outcome.pnlPct > 5) {
      patterns.push('high_return')
    } else if (outcome.pnlPct < -3) {
      patterns.push('high_loss')
    }
    
    // Size patterns
    if (outcome.size > 1000) {
      patterns.push('large_size')
    } else if (outcome.size < 100) {
      patterns.push('small_size')
    }
    
    return patterns
  }
  
  // Generate insights from PnL performance
  private generatePnLInsights(outcome: PnLTradeOutcome): LearningInsight[] {
    const insights: LearningInsight[] = []
    
    // Insight: Short-term trades are working
    if (outcome.holdTimeMs < 3600000 && outcome.won) {
      insights.push({
        type: 'timing',
        title: 'Short-term momentum plays working',
        description: `Trade held for ${Math.round(outcome.holdTimeMs / 60000)}min and won ${outcome.pnlPct.toFixed(2)}%`,
        evidence: [],
        confidence: 75,
        createdAt: Date.now(),
        validated: false,
      })
    }
    
    // Insight: Large positions losing
    if (outcome.size > 1000 && !outcome.won) {
      insights.push({
        type: 'risk',
        title: 'Large positions losing',
        description: `Position size ${outcome.size} lost ${outcome.pnlPct.toFixed(2)}%. Consider reducing size.`,
        evidence: [],
        confidence: 80,
        createdAt: Date.now(),
        validated: false,
      })
    }
    
    return insights
  }
  
  // Update strategy based on PnL
  private async updateStrategyFromPnL(outcome: PnLTradeOutcome): Promise<void> {
    const recentTrades = await pnlService.aggregatePnL(outcome.decisionId.split('-')[0], 'day')
    
    // If losing streak, reduce position size
    if (recentTrades.lossCount >= 3 && recentTrades.winRate < 40) {
      this.strategyAdjustments.push({
        type: 'decrease_size',
        reason: `Recent win rate ${recentTrades.winRate.toFixed(1)}% is below 40%`,
        confidence: 85,
        basedOn: [outcome.decisionId],
      })
    }
    
    // If winning streak, increase confidence threshold
    if (recentTrades.winCount >= 5 && recentTrades.winRate > 70) {
      this.strategyAdjustments.push({
        type: 'increase_confidence',
        reason: `Win rate ${recentTrades.winRate.toFixed(1)}% is strong`,
        confidence: 70,
        basedOn: [outcome.decisionId],
      })
    }
  }
}
```

---

## Cron Jobs for PnL Updates

**Update:** `engine/services/cron.ts`

```typescript
// Add PnL-related cron jobs

// 1. Mark-to-market update (every 10 seconds for real-time PnL)
cron.schedule('*/10 * * * * *', async () => {
  try {
    const prices = await marketDataService.getPrices()
    await pnlService.updateMarkToMarket(prices)
  } catch (error) {
    console.error('Mark-to-market update failed:', error)
  }
})

// 2. Hourly snapshots for charting
cron.schedule('0 * * * *', async () => {
  try {
    const activeAgents = await db.select().from(agents).where(eq(agents.status, 'active'))
    
    for (const agent of activeAgents) {
      await pnlService.createSnapshot(agent.id)
    }
  } catch (error) {
    console.error('Snapshot creation failed:', error)
  }
})

// 3. Auto-close positions at stop loss / take profit
cron.schedule('*/30 * * * * *', async () => {
  try {
    const openPositions = await db
      .select()
      .from(positions)
      .where(eq(positions.status, 'open'))
    
    const prices = await marketDataService.getPrices()
    
    for (const position of openPositions) {
      const currentPrice = prices[position.market]
      if (!currentPrice) continue
      
      const entryPrice = parseFloat(position.entryPrice)
      const side = position.side as 'long' | 'short'
      const stopLoss = parseFloat(position.stopLoss || '0')
      const takeProfit = parseFloat(position.takeProfit || '0')
      
      // Check stop loss
      if (stopLoss > 0) {
        const hitStopLoss = side === 'long' 
          ? currentPrice <= stopLoss 
          : currentPrice >= stopLoss
        
        if (hitStopLoss) {
          await pnlService.closePosition(position.id, currentPrice, 5) // $5 fees estimate
          continue
        }
      }
      
      // Check take profit
      if (takeProfit > 0) {
        const hitTakeProfit = side === 'long' 
          ? currentPrice >= takeProfit 
          : currentPrice <= takeProfit
        
        if (hitTakeProfit) {
          await pnlService.closePosition(position.id, currentPrice, 5)
          continue
        }
      }
    }
  } catch (error) {
    console.error('Auto-close check failed:', error)
  }
})
```

---

## API Endpoints for PnL

```typescript
// routes/pnl.ts

import { pnlService } from '../services/pnl.service.js'

// GET /api/pnl/:agentId/summary
// Returns aggregated PnL for an agent
app.get('/api/pnl/:agentId/summary', async (c) => {
  const agentId = c.req.param('agentId')
  const window = c.req.query('window') as 'day' | 'week' | 'month' | 'all' || 'day'
  
  const summary = await pnlService.aggregatePnL(agentId, window)
  
  return c.json(summary)
})

// GET /api/pnl/:agentId/history
// Returns PnL history for charting
app.get('/api/pnl/:agentId/history', async (c) => {
  const agentId = c.req.param('agentId')
  const window = c.req.query('window') as 'hourly' | 'daily' | 'weekly' || 'daily'
  
  const history = await pnlService.getPnLHistory(agentId, window)
  
  return c.json(history)
})

// GET /api/pnl/:agentId/metrics
// Returns performance metrics for scorecard
app.get('/api/pnl/:agentId/metrics', async (c) => {
  const agentId = c.req.param('agentId')
  
  const metrics = await pnlService.getPerformanceMetrics(agentId)
  
  return c.json(metrics)
})

// POST /api/pnl/close
// Manually close a position
app.post('/api/pnl/close', async (c) => {
  const { positionId, exitPrice, fees } = await c.req.json()
  
  const outcome = await pnlService.closePosition(positionId, exitPrice, fees)
  
  return c.json(outcome)
})
```

---

## Summary

### What's Included

| Component | Status | Description |
|-----------|--------|-------------|
| `positions` table update | ✅ | Added realized/unrealized PnL fields |
| `agent_pnl_snapshots` table | ✅ | Hourly/daily PnL for charts |
| `trade_outcomes` table | ✅ | Structured outcomes for learning |
| `pnl.service.ts` | ✅ | Core PnL calculations |
| Learning integration | ✅ | Feeds PnL into pattern recognition |
| Cron jobs | ✅ | Mark-to-market, snapshots, auto-close |
| API endpoints | ✅ | Frontend can display PnL |

### PnL Flow

```
1. Position opened
   └── Record entry price, size, side

2. Every 10 seconds (mark-to-market)
   └── Calculate unrealized PnL
   └── Update position.unrealizedPnl

3. Position closed (manual or auto)
   └── Calculate realized PnL
   └── Record fees
   └── Calculate net PnL
   └── Save to trade_outcomes

4. Learning engine
   └── Extract patterns from PnL
   └── Generate insights
   └── Adjust strategies

5. Charts/Dashboard
   └── Read from agent_pnl_snapshots
   └── Aggregate for day/week/month
```

---

## Files to Create/Update

```
trivo-backend/src/
├── lib/schema.ts                    # UPDATE: Add PnL fields
├── services/
│   └── pnl.service.ts               # NEW: Core PnL service
└── routes/
    └── pnl.ts                       # NEW: PnL API endpoints

trivo-backend/src/engine/
├── learning/
│   └── learning-engine.ts           # UPDATE: Add PnL integration
└── services/
    └── cron.ts                      # UPDATE: Add PnL cron jobs
```

This ensures **every trade** is tracked with full PnL, feeding into the learning system and providing users with transparent performance data. 🚀
