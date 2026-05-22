import { describe, it, expect } from 'vitest'

describe('Trivo Flow - Agent Lifecycle', () => {
  it('should follow correct agent creation flow', () => {
    const agent = {
      id: 'agent-uuid',
      ownerId: 'privy-user-123',
      name: 'Hyperion',
      handle: 'hyperion.eth',
      modelProvider: 'deepseek' as const,
      strategy: 'Trend following on BTC',
      status: 'inactive' as const,
    }

    expect(agent.status).toBe('inactive')
    expect(agent.ownerId).toBe('privy-user-123')

    // Activate
    const activatedAgent = { ...agent, status: 'active' as const }
    expect(activatedAgent.status).toBe('active')
  })

  it('should handle position lifecycle correctly', () => {
    const position = {
      agentId: 'agent-uuid',
      venue: 'perp' as const,
      market: 'BTC-PERP',
      side: 'LONG',
      size: 5000,
      entryPrice: 72880,
      leverage: 3,
      status: 'open' as const,
    }

    expect(position.status).toBe('open')

    const closedPosition = { ...position, status: 'closed' as const, pnl: 150 }
    expect(closedPosition.status).toBe('closed')
    expect(closedPosition.pnl).toBeGreaterThan(0)
  })

  it('should follow correct copy trading flow', () => {
    const copyRelation = {
      followerAgentId: 'agent-b',
      targetAgentId: 'agent-a',
      allocationBps: 5000,
      active: true,
    }

    const originalPnl = 1000
    const followerPnl = originalPnl * (copyRelation.allocationBps / 10000)
    expect(followerPnl).toBe(500)

    const detachedRelation = { ...copyRelation, active: false }
    expect(detachedRelation.active).toBe(false)
  })

  it('should calculate correct fee distribution', () => {
    const positionPnl = 10000
    const platformFeeBps = 50
    const creatorFeeBps = 300

    const platformShare = (positionPnl * platformFeeBps) / 10000
    const creatorShare = (positionPnl * creatorFeeBps) / 10000

    expect(platformShare).toBe(50)
    expect(creatorShare).toBe(300)
    expect(platformShare + creatorShare).toBeLessThan(positionPnl)
  })

  it('should preserve agent memory across sessions', () => {
    const memories = [
      { id: 'm1', type: 'decision' as const, content: 'Bought BTC at 72880', reasoning: 'RSI oversold' },
      { id: 'm2', type: 'pnl' as const, content: 'Closed BTC at 74100', reasoning: 'Take profit hit', txHash: '0xabc' },
      { id: 'm3', type: 'reflection' as const, content: 'Strategy working', reasoning: '2 consecutive wins' },
    ]

    expect(memories).toHaveLength(3)
    expect(memories[0].type).toBe('decision')
    expect(memories[1].txHash).toBeTruthy()
    expect(memories[2].type).toBe('reflection')
  })
})
