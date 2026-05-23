import WebSocket from 'ws'

interface AgentEvent {
  event: 'thinking' | 'deciding' | 'execution' | 'error' | 'connected'
  agentId: string
  content?: string
  decision?: unknown
  result?: unknown
  error?: string
}

const agentConnections = new Map<string, Set<WebSocket>>()

export function subscribeAgent(agentId: string, ws: WebSocket) {
  if (!agentConnections.has(agentId)) {
    agentConnections.set(agentId, new Set())
  }
  agentConnections.get(agentId)!.add(ws)

  ws.addEventListener('close', () => {
    agentConnections.get(agentId)?.delete(ws)
    if (agentConnections.get(agentId)?.size === 0) {
      agentConnections.delete(agentId)
    }
  })
}

export function broadcastAgentEvent(agentId: string, event: AgentEvent) {
  const connections = agentConnections.get(agentId)
  if (!connections) return
  for (const ws of connections) {
    try {
      ws.send(JSON.stringify(event))
    } catch {
      connections.delete(ws)
    }
  }
}

export type { AgentEvent }
