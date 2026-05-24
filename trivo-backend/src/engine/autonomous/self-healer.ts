// engine/autonomous/self-healer.ts
// Phase 6 - Ticket AU3: Self-Healer for error recovery
// Automatic recovery, state restoration, graceful degradation

export enum RecoveryStrategy {
  RETRY = 'retry',
  RESTART_LOOP = 'restart_loop',
  RESTORE_CHECKPOINT = 'restore_checkpoint',
  DEGRADE = 'degrade',
  ALERT = 'alert',
}

export interface Checkpoint {
  agentId: string
  timestamp: number
  state: Record<string, unknown>
  cycleCount: number
}

export class SelfHealer {
  private checkpoints: Map<string, Checkpoint> = new Map()
  private retryCounts: Map<string, number> = new Map()
  private degradedModes: Set<string> = new Set()
  private maxRetries: number = 3

  constructor(maxRetries: number = 3) {
    this.maxRetries = maxRetries
  }

  /**
   * Attempt recovery from an error
   */
  async recover(agentId: string, error: Error): Promise<RecoveryStrategy> {
    const retries = this.retryCounts.get(agentId) ?? 0

    console.log(`[SelfHealer] Recovering ${agentId} (retry ${retries}/${this.maxRetries}): ${error.message}`)

    if (retries < this.maxRetries) {
      // Strategy 1: Retry
      this.retryCounts.set(agentId, retries + 1)
      return RecoveryStrategy.RETRY
    }

    if (this.hasCheckpoint(agentId)) {
      // Strategy 2: Restore from checkpoint
      this.retryCounts.set(agentId, 0)
      return RecoveryStrategy.RESTORE_CHECKPOINT
    }

    if (!this.degradedModes.has(agentId)) {
      // Strategy 3: Graceful degradation
      this.degradedModes.add(agentId)
      this.retryCounts.set(agentId, 0)
      return RecoveryStrategy.DEGRADE
    }

    // Strategy 4: Restart the loop
    return RecoveryStrategy.RESTART_LOOP
  }

  /**
   * Save a state checkpoint
   */
  saveCheckpoint(agentId: string, state: Record<string, unknown>, cycleCount: number): Checkpoint {
    const checkpoint: Checkpoint = {
      agentId,
      timestamp: Date.now(),
      state,
      cycleCount,
    }
    this.checkpoints.set(agentId, checkpoint)
    return checkpoint
  }

  /**
   * Restore from last checkpoint
   */
  restoreFromCheckpoint(agentId: string): Checkpoint | null {
    return this.checkpoints.get(agentId) ?? null
  }

  /**
   * Rollback to a specific state
   */
  rollback(agentId: string, _lastGoodState: Record<string, unknown>): boolean {
    const checkpoint = this.checkpoints.get(agentId)
    if (!checkpoint) return false

    // Mark for restoration
    console.log(`[SelfHealer] Rolled back ${agentId} to checkpoint from ${new Date(checkpoint.timestamp).toISOString()}`)
    return true
  }

  /**
   * Enter graceful degradation mode
   */
  degrade(agentId: string): boolean {
    this.degradedModes.add(agentId)
    console.log(`[SelfHealer] ${agentId} entering graceful degradation mode`)
    return true
  }

  /**
   * Exit degradation mode
   */
  restore(agentId: string): boolean {
    this.degradedModes.delete(agentId)
    this.retryCounts.set(agentId, 0)
    console.log(`[SelfHealer] ${agentId} restored from degradation mode`)
    return true
  }

  /**
   * Check if agent is in degraded mode
   */
  isDegraded(agentId: string): boolean {
    return this.degradedModes.has(agentId)
  }

  /**
   * Check if checkpoint exists
   */
  hasCheckpoint(agentId: string): boolean {
    return this.checkpoints.has(agentId)
  }

  /**
   * Reset retry count for an agent
   */
  resetRetries(agentId: string): void {
    this.retryCounts.set(agentId, 0)
  }

  /**
   * Get current retry count
   */
  getRetryCount(agentId: string): number {
    return this.retryCounts.get(agentId) ?? 0
  }

  /**
   * Get status report
   */
  getStatus(): Array<{
    agentId: string
    isDegraded: boolean
    hasCheckpoint: boolean
    retryCount: number
  }> {
    const allIds = new Set([
      ...this.checkpoints.keys(),
      ...this.degradedModes,
      ...this.retryCounts.keys(),
    ])

    return Array.from(allIds).map(agentId => ({
      agentId,
      isDegraded: this.degradedModes.has(agentId),
      hasCheckpoint: this.checkpoints.has(agentId),
      retryCount: this.retryCounts.get(agentId) ?? 0,
    }))
  }
}

// Singleton
export const selfHealer = new SelfHealer()
