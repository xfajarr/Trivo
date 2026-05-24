// engine/autonomous/event-store.ts
// Phase 6 - Ticket AU1: Event Store for 24/7 autonomous operation
// Event sourcing for agent state, persistence, and replay

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
}

export class EventStore {
  private events: AgentEvent[] = []
  private maxEvents: number

  constructor(maxEvents: number = 10_000) {
    this.maxEvents = maxEvents
  }

  /**
   * Append a new event
   */
  append(agentId: string, type: EventType, data: Record<string, unknown> = {}): AgentEvent {
    const event: AgentEvent = {
      id: randomUUID(),
      agentId,
      type,
      data,
      timestamp: Date.now(),
    }
    this.events.push(event)

    // Prune if over limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }

    return event
  }

  /**
   * Get events since a timestamp
   */
  getEventsSince(agentId: string, sinceTimestamp: number): AgentEvent[] {
    return this.events.filter(e => e.agentId === agentId && e.timestamp >= sinceTimestamp)
  }

  /**
   * Get events by type
   */
  getEventsByType(agentId: string, type: EventType): AgentEvent[] {
    return this.events.filter(e => e.agentId === agentId && e.type === type)
  }

  /**
   * Get all events for an agent
   */
  getAgentEvents(agentId: string, limit: number = 100): AgentEvent[] {
    return this.events
      .filter(e => e.agentId === agentId)
      .slice(-limit)
  }

  /**
   * Get recent events across all agents
   */
  getRecentEvents(limit: number = 50): AgentEvent[] {
    return this.events.slice(-limit)
  }

  /**
   * Get event count for an agent
   */
  getEventCount(agentId: string): number {
    return this.events.filter(e => e.agentId === agentId).length
  }

  /**
   * Get the last event of a type for an agent
   */
  getLastEvent(agentId: string, type: EventType): AgentEvent | undefined {
    const agentEvents = this.events
      .filter(e => e.agentId === agentId && e.type === type)
    return agentEvents[agentEvents.length - 1]
  }

  /**
   * Get agent error rate (recent errors / total events)
   */
  getErrorRate(agentId: string, windowEvents: number = 50): number {
    const recent = this.events
      .filter(e => e.agentId === agentId)
      .slice(-windowEvents)

    if (recent.length === 0) return 0
    const errors = recent.filter(e => e.type === EventType.ERROR).length
    return errors / recent.length
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = []
  }

  /**
   * Serialize to JSON for persistence
   */
  toJSON(): string {
    return JSON.stringify(this.events)
  }

  /**
   * Restore from JSON
   */
  fromJSON(json: string): void {
    try {
      this.events = JSON.parse(json)
    } catch {
      console.warn('[EventStore] Failed to restore from JSON')
    }
  }
}

// Singleton
export const eventStore = new EventStore()
