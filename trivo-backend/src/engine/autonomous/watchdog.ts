// engine/autonomous/watchdog.ts
// Phase 6 - Ticket AU2: Watchdog for health monitoring
// Heartbeat tracking, failure detection, auto-restart capability

export interface WatchdogConfig {
  maxSilenceMs: number
  checkIntervalMs: number
}

export class Watchdog {
  private config: WatchdogConfig
  private lastHeartbeat: Map<string, number> = new Map()
  private intervalId: ReturnType<typeof setInterval> | null = null
  private failureCallback: ((agentId: string, silenceMs: number) => void) | null = null
  private running: boolean = false

  constructor(config: Partial<WatchdogConfig> = {}) {
    this.config = {
      maxSilenceMs: config.maxSilenceMs ?? 60_000,  // 1 minute max silence
      checkIntervalMs: config.checkIntervalMs ?? 10_000, // Check every 10s
    }
  }

  /**
   * Start monitoring
   */
  start(onFailure?: (agentId: string, silenceMs: number) => void): void {
    if (this.running) return
    this.running = true
    this.failureCallback = onFailure ?? null

    this.intervalId = setInterval(() => {
      this.checkHealth()
    }, this.config.checkIntervalMs)

    console.log(`[Watchdog] Started (maxSilence: ${this.config.maxSilenceMs}ms)`)
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.running = false
    console.log('[Watchdog] Stopped')
  }

  /**
   * Register a heartbeat for an agent
   */
  ping(agentId: string): void {
    this.lastHeartbeat.set(agentId, Date.now())
  }

  /**
   * Check if an agent is healthy
   */
  isHealthy(agentId: string): boolean {
    const last = this.lastHeartbeat.get(agentId)
    if (!last) return false
    return (Date.now() - last) < this.config.maxSilenceMs
  }

  /**
   * Get time since last heartbeat
   */
  getTimeSinceLastHeartbeat(agentId: string): number {
    const last = this.lastHeartbeat.get(agentId)
    if (!last) return Infinity
    return Date.now() - last
  }

  /**
   * Get status report for all tracked agents
   */
  getStatus(): Array<{ agentId: string; healthy: boolean; lastHeartbeat: number | null; silenceMs: number }> {
    const now = Date.now()
    const status: Array<{ agentId: string; healthy: boolean; lastHeartbeat: number | null; silenceMs: number }> = []

    for (const [agentId, last] of this.lastHeartbeat.entries()) {
      status.push({
        agentId,
        healthy: (now - last) < this.config.maxSilenceMs,
        lastHeartbeat: last,
        silenceMs: now - last,
      })
    }
    return status
  }

  /**
   * Check health and trigger failure callback
   */
  private checkHealth(): void {
    const now = Date.now()
    for (const [agentId, last] of this.lastHeartbeat.entries()) {
      const silenceMs = now - last
      if (silenceMs > this.config.maxSilenceMs) {
        console.warn(`[Watchdog] Agent ${agentId} unresponsive for ${silenceMs}ms`)
        this.failureCallback?.(agentId, silenceMs)
      }
    }
  }

  /**
   * Remove an agent from monitoring
   */
  unregister(agentId: string): void {
    this.lastHeartbeat.delete(agentId)
  }

  /**
   * Get the running state
   */
  isRunning(): boolean {
    return this.running
  }
}

// Singleton
export const watchdog = new Watchdog()
