// engine/autonomous/event-store.ts
// Phase 6 - Ticket AU1: Event Store with DB persistence for 24/7 autonomous operation
// Event sourcing: writes to both in-memory (cache) AND PostgreSQL (durable)
// All reads come from DB for consistency across restarts

import { db } from '../../lib/db.js'
import { agentEvents } from '../../lib/schema.js'
import { eq, and, desc, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export enum EventType {
  CYCLE_START = 'CYCLE_START',
  CYCLE_END = 'CYCLE_END',
  DECISION_MADE = 'DECISION_MADE',
  DECISION_EXECUTED = 'DECISION_EXECUTED',
  DECISION_REJECTED = 'DECISION_REJECTED',
  TRADE_OPENED = 'TRADE_OPENED',
  TRADE_CLOSED = 'TRADE_CLOSED',
  GOAL_UPDATED = 'GOAL_UPDATED',
  GOAL_COMPLETED = 'GOAL_COMPLETED',
  ERROR = 'ERROR',
  RECOVERY = 'RECOVERY',
  PNL_SNAPSHOT = 'PNL_SNAPSHOT',
  HEARTBEAT = 'HEARTBEAT',
}

export interface AgentEvent {
  id: string
  agentId: string
  type: EventType
  data: Record<string, unknown>
  timestamp: number
  sequence?: number
}

export class EventStore {
  // In-memory cache for hot reads (small, bounded)
  private cache: AgentEvent[] = []
  private maxCacheSize: number
  private sequence: number = 0

  constructor(maxCacheSize: number = 1000, skipWarmup: boolean = false) {
    this.maxCacheSize = maxCacheSize
    // Warm cache from DB on startup (skip in tests to avoid stale data)
    if (!skipWarmup) {
      this.warmCache().catch((err) =>
        console.warn('[EventStore] Cache warm-up skipped (DB may be unavailable):', (err as Error).message),
      )
    }
  }

  /**
   * Append a new event — writes to both DB (durable) and in-memory cache (fast reads).
   * Never silently fails; errors are logged but don't crash the agent loop.
   */
  async append(
    agentId: string,
    type: EventType,
    data: Record<string, unknown> = {},
  ): Promise<AgentEvent> {
    const id = randomUUID()
    const timestamp = Date.now()
    const seq = ++this.sequence

    const event: AgentEvent = { id, agentId, type, data, timestamp, sequence: seq }

    // ── Persist to PostgreSQL (durable source of truth) ─────────────────────
    try {
      await db
        .insert(agentEvents)
        .values({
          id,
          agentId,
          type,
          data: JSON.stringify(data),
          timestamp: new Date(timestamp),
          sequence: seq,
        })
        .execute()
    } catch (err) {
      console.error(`[EventStore] DB write failed for ${type}: ${(err as Error).message}`)
      // Continue with in-memory cache even if DB fails
    }

    // ── Update in-memory cache ───────────────────────────────────────────────
    this.cache.push(event)
    if (this.cache.length > this.maxCacheSize) {
      this.cache = this.cache.slice(-this.maxCacheSize)
    }

    return event
  }

  /**
   * Get all events for an agent — reads from DB for consistency.
   * Falls back to cache if DB is unavailable.
   */
  async getEvents(
    agentId: string,
    options: { limit?: number; type?: EventType; afterTimestamp?: number } = {},
  ): Promise<AgentEvent[]> {
    const { limit = 100, type, afterTimestamp } = options

    try {
      const conditions = [eq(agentEvents.agentId, agentId)]
      if (type) conditions.push(eq(agentEvents.type, type))
      if (afterTimestamp)
        conditions.push(sql`${agentEvents.timestamp} > ${new Date(afterTimestamp)}`)

      const rows = await db
        .select()
        .from(agentEvents)
        .where(and(...conditions))
        .orderBy(desc(agentEvents.sequence))
        .limit(limit)
        .execute()

      return rows.map((r) => ({
        id: r.id,
        agentId: r.agentId,
        type: r.type as EventType,
        data: JSON.parse(r.data) as Record<string, unknown>,
        timestamp: r.timestamp.getTime(),
        sequence: r.sequence,
      }))
    } catch {
      // Fallback to cache on DB error — return newest first to match DB ordering
      return this.cache
        .filter((e) => e.agentId === agentId && (!type || e.type === type))
        .slice(-limit)
        .reverse()
    }
  }

  /**
   * Get latest event of a given type for an agent — hot path for watchdog/heartbeat.
   */
  async getLatest(agentId: string, type: EventType): Promise<AgentEvent | null> {
    const events = await this.getEvents(agentId, { limit: 1, type })
    return events[0] ?? null
  }

  /**
   * Get all events (all agents) — reads from cache only.
   */
  getAllEvents(): AgentEvent[] {
    return [...this.cache]
  }

  /**
   * Prune old events from DB (call periodically, e.g., daily cron).
   */
  async prune(olderThanMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMs)
    try {
      await db
        .delete(agentEvents)
        .where(sql`${agentEvents.timestamp} < ${cutoff}`)
        .execute()
      return 1 // pruned (count not critical for this use case)
    } catch (err) {
      console.error(`[EventStore] Prune failed: ${(err as Error).message}`)
      return 0
    }
  }

  /**
   * Get event count for an agent — useful for monitoring.
   */
  async count(agentId: string): Promise<number> {
    try {
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agentEvents)
        .where(eq(agentEvents.agentId, agentId))
        .execute()
      return Number(row?.count ?? 0)
    } catch {
      return this.cache.filter((e) => e.agentId === agentId).length
    }
  }

  /**
   * Warm in-memory cache from DB on startup.
   */
  private async warmCache(): Promise<void> {
    try {
      const rows = await db
        .select()
        .from(agentEvents)
        .orderBy(desc(agentEvents.sequence))
        .limit(this.maxCacheSize)
        .execute()

      // Get current max sequence from DB
      if (rows.length > 0) {
        this.sequence = rows[0]!.sequence
        this.cache = rows
          .reverse()
          .map((r) => ({
            id: r.id,
            agentId: r.agentId,
            type: r.type as EventType,
            data: JSON.parse(r.data) as Record<string, unknown>,
            timestamp: r.timestamp.getTime(),
            sequence: r.sequence,
          }))
      }

      console.log(`[EventStore] Cache warmed: ${rows.length} events loaded, seq=${this.sequence}`)
    } catch (err) {
      console.warn('[EventStore] Could not warm cache:', (err as Error).message)
    }
  }

  /**
   * Clear all events (use with caution — for testing or reset only).
   */
  async clear(): Promise<void> {
    try {
      await db.delete(agentEvents).execute()
      this.cache = []
      this.sequence = 0
    } catch (err) {
      console.error(`[EventStore] Clear failed: ${(err as Error).message}`)
    }
  }
}

// ─── Module-level singleton (matches existing usage pattern) ──────────────────

export const eventStore = new EventStore()
