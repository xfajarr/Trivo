export interface ThinkingTrace {
  id: string
  agentId: string
  type: 'reasoning' | 'decision' | 'execution' | 'reflection'
  content: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

// In-memory thinking trace buffer (flushed to DB periodically)
const traceBuffer = new Map<string, ThinkingTrace[]>()

export function addTrace(trace: ThinkingTrace) {
  if (!traceBuffer.has(trace.agentId)) {
    traceBuffer.set(trace.agentId, [])
  }
  traceBuffer.get(trace.agentId)!.push(trace)
}

export function getAgentTraces(agentId: string, limit = 20): ThinkingTrace[] {
  const traces = traceBuffer.get(agentId) ?? []
  return traces.slice(-limit)
}

export function getAllTraces(): ThinkingTrace[] {
  const all: ThinkingTrace[] = []
  for (const traces of traceBuffer.values()) {
    all.push(...traces)
  }
  return all
}

export function clearAgentTraces(agentId: string) {
  traceBuffer.delete(agentId)
}
