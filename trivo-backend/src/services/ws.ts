import WebSocket from 'ws'

interface AgentEvent {
  event: 'thinking' | 'deciding' | 'execution' | 'error' | 'connected'
  agentId: string
  content?: string
  decision?: unknown
  result?: unknown
  error?: string
}

// Shared connection registry — imported by index.ts for cleanup
export const agentConnections = new Map<string, Set<WebSocket>>()

/**
 * Register a WebSocket client to receive events for a specific agent.
 * The caller (index.ts) is responsible for removing the ws on disconnect.
 */
export function subscribeAgent(agentId: string, ws: WebSocket) {
  if (!agentConnections.has(agentId)) {
    agentConnections.set(agentId, new Set())
  }
  agentConnections.get(agentId)!.add(ws)
}

/**
 * Broadcast an event to all connected clients watching an agent.
 */
export function broadcastAgentEvent(agentId: string, event: AgentEvent) {
  const connections = agentConnections.get(agentId)
  if (!connections || connections.size === 0) return

  const dead: WebSocket[] = []
  for (const ws of connections) {
    if (ws.readyState !== WebSocket.OPEN) {
      dead.push(ws)
      continue
    }
    try {
      ws.send(JSON.stringify(event))
    } catch {
      dead.push(ws)
    }
  }

  // Clean up dead connections
  for (const ws of dead) {
    connections.delete(ws)
  }
  if (connections.size === 0) {
    agentConnections.delete(agentId)
  }
}

export type { AgentEvent }
