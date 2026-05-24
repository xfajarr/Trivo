import type { RiskConfig } from '../types.js'

export interface CircuitBreakerStatus {
  canTrade: boolean
  reason?: string
  resumeAt?: Date
}

export class CircuitBreaker {
  private consecutiveLosses = 0
  private isPaused = false
  private pauseUntil: Date | null = null
  private dailyPnl = 0
  private dailyResetTime: Date
  private tradeHistory: Array<{ pnl: number; timestamp: Date }> = []

  constructor(private readonly config: RiskConfig) {
    this.dailyResetTime = this.getMidnightUTC()
  }

  private getMidnightUTC(): Date {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    return d
  }

  recordTradeResult(pnlUsd: number): void {
    const now = new Date()

    // Reset daily PnL at midnight
    const nextMidnight = new Date(this.dailyResetTime.getTime() + 86400000)
    if (now >= nextMidnight) {
      this.dailyPnl = 0
      this.consecutiveLosses = 0
      this.dailyResetTime = this.getMidnightUTC()
    }

    this.dailyPnl += pnlUsd
    this.tradeHistory.push({ pnl: pnlUsd, timestamp: now })

    if (this.tradeHistory.length > 20) {
      this.tradeHistory = this.tradeHistory.slice(-20)
    }

    if (pnlUsd < 0) {
      this.consecutiveLosses++
    } else {
      this.consecutiveLosses = 0
    }

    this.checkAndTrigger()
  }

  private checkAndTrigger(): void {
    const reasons: string[] = []

    if (this.consecutiveLosses >= this.config.pauseOnConsecutiveLosses) {
      reasons.push(`${this.consecutiveLosses} consecutive losses`)
    }

    if (this.dailyPnl < -this.config.maxDailyLossUsd) {
      reasons.push(`Daily loss $${Math.abs(this.dailyPnl).toFixed(0)} exceeded limit`)
    }

    if (reasons.length > 0) {
      this.isPaused = true
      this.pauseUntil = new Date(Date.now() + this.config.cooldownMinutes * 60 * 1000)
      console.log(`🚨 CIRCUIT BREAKER: ${reasons.join(', ')}`)
      console.log(`   Paused until ${this.pauseUntil.toISOString()}`)
    }
  }

  canTrade(): CircuitBreakerStatus {
    if (!this.isPaused) return { canTrade: true }

    const now = new Date()
    if (this.pauseUntil && now >= this.pauseUntil) {
      this.isPaused = false
      this.consecutiveLosses = 0
      this.pauseUntil = null
      return { canTrade: true }
    }

    const remainingMs = (this.pauseUntil?.getTime() ?? 0) - now.getTime()
    const remainingMin = Math.ceil(remainingMs / 60000)

    return {
      canTrade: false,
      reason: `Circuit breaker active — paused for ${remainingMin} more minutes`,
      resumeAt: this.pauseUntil ?? undefined,
    }
  }

  getStatus() {
    return {
      dailyPnl: this.dailyPnl,
      consecutiveLosses: this.consecutiveLosses,
      isPaused: this.isPaused,
      pauseUntil: this.pauseUntil,
      recentWinRate: this.calculateWinRate(),
    }
  }

  private calculateWinRate(): number {
    if (this.tradeHistory.length === 0) return 0
    const wins = this.tradeHistory.filter((t) => t.pnl > 0).length
    return (wins / this.tradeHistory.length) * 100
  }

  getDailyPnl(): number {
    return this.dailyPnl
  }
}
