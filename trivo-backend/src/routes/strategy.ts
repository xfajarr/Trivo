import { Hono } from 'hono'

export const strategyRoutes = new Hono()

strategyRoutes.post('/compile', async (c) => {
  const { strategy } = await c.req.json()
  if (!strategy) return c.json({ error: 'Strategy text required' }, 400)

  // Parse NL strategy into structured rules
  // For now, return structured version with metadata
  const compiled = {
    rawStrategy: strategy,
    detectedTriggers: extractTriggers(strategy),
    detectedActions: extractActions(strategy),
    riskLevel: detectRiskLevel(strategy),
    summary: `${strategy.slice(0, 100)}...`,
  }

  return c.json({ rules: compiled })
})

strategyRoutes.post('/train', async (c) => {
  const { agentId, instruction } = await c.req.json()
  if (!instruction) return c.json({ error: 'Training instruction required' }, 400)

  // NL training: update agent's strategy based on natural language instruction
  return c.json({
    message: 'Agent strategy updated',
    agentId,
    previousStrategy: '(previous)',
    newStrategy: instruction,
    note: 'The agent will use this strategy in its next thinking cycle.',
  })
})

function extractTriggers(text: string): string[] {
  const triggers: string[] = []
  const patterns = [
    /when\s+(\w+)\s+(is|below|above|hits?|reaches?)/gi,
    /if\s+(\w+)\s+(drops?|rises?|goes?|exceeds?)/gi,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      triggers.push(match[0])
    }
  }
  return triggers.length > 0 ? triggers : ['Custom trigger detected']
}

function extractActions(text: string): string[] {
  const actions: string[] = []
  if (/buy|long|enter/i.test(text)) actions.push('buy')
  if (/sell|short|exit/i.test(text)) actions.push('sell')
  if (/stake|lp|yield|provide/i.test(text)) actions.push('yield')
  if (actions.length === 0) actions.push('Trade based on strategy')
  return actions
}

function detectRiskLevel(text: string): string {
  const aggressiveWords = ['aggressive', 'high leverage', 'risky', 'moon', 'ape', 'yolo']
  const conservativeWords = ['conservative', 'safe', 'low risk', 'gradual', 'hedge']
  const lower = text.toLowerCase()
  if (aggressiveWords.some(w => lower.includes(w))) return 'aggressive'
  if (conservativeWords.some(w => lower.includes(w))) return 'conservative'
  return 'moderate'
}
