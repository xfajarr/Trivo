import { describe, it, expect, beforeAll } from 'vitest'
import { registerAllTools, getAllTools, getTool, buildToolsSystemPrompt } from '../services/tools'

describe('Tool Registry', () => {
  beforeAll(() => {
    registerAllTools()
  })

  it('should register all 3 tools', () => {
    const tools = getAllTools()
    expect(tools).toHaveLength(3)
  })

  it('should have get_price tool', () => {
    const tool = getTool('get_price')
    expect(tool).toBeDefined()
    expect(tool!.definition.name).toBe('get_price')
    expect(tool!.definition.parameters.required).toContain('pair')
  })

  it('should have open_trade tool', () => {
    const tool = getTool('open_trade')
    expect(tool).toBeDefined()
    expect(tool!.definition.parameters.required).toContain('venue')
    expect(tool!.definition.parameters.required).toContain('market')
  })

  it('should have close_trade tool', () => {
    const tool = getTool('close_trade')
    expect(tool).toBeDefined()
    expect(tool!.definition.parameters.required).toContain('positionId')
  })

  it('should build tools system prompt', () => {
    const prompt = buildToolsSystemPrompt()
    expect(prompt).toContain('get_price')
    expect(prompt).toContain('open_trade')
    expect(prompt).toContain('Available tools')
  })
})

describe('Tool Handlers', () => {
  beforeAll(() => {
    registerAllTools()
  })

  it('open_trade should return simulated position', async () => {
    const tool = getTool('open_trade')!
    const result = await tool.execute('agent-1', {
      venue: 'perp',
      market: 'BTC-PERP',
      side: 'LONG',
      size: 5000,
      leverage: 3,
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect((result.data as any).positionId).toContain('pos-')
  })

  it('close_trade should return success', async () => {
    const tool = getTool('close_trade')!
    const result = await tool.execute('agent-1', { positionId: 'pos-123' })

    expect(result.success).toBe(true)
    expect((result.data as any).status).toBe('closed')
  })
})
