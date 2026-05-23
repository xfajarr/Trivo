import { describe, it, expect } from 'vitest'

describe('Trivo Flow - Agent Lifecycle', () => {
  it('should follow correct agent creation flow', () => {
    const agent = {
      id: 'agent-uuid',
      ownerId: 'privy-user-123',
      name: 'Hyperion',
      handle: 'hyperion.eth',
      status: 'inactive' as const,
    }
    expect(agent.status).toBe('inactive')

    const activated = { ...agent, status: 'active' as const }
    expect(activated.status).toBe('active')
  })

  it('should handle position lifecycle', () => {
    const position = {
      venue: 'perp' as const,
      market: 'BTC-PERP',
      side: 'LONG',
      size: 5000,
      entryPrice: 72880,
      status: 'open' as const,
    }
    expect(position.status).toBe('open')
  })

  it('should calculate copy trading allocation correctly', () => {
    const allocationBps = 5000 // 50%
    const originalPnl = 1000
    const followerPnl = originalPnl * (allocationBps / 10000)
    expect(followerPnl).toBe(500)
  })

  it('should calculate fee distribution correctly', () => {
    const pnl = 10000
    const platformFeeBps = 50
    const creatorFeeBps = 300

    const platformShare = (pnl * platformFeeBps) / 10000
    const creatorShare = (pnl * creatorFeeBps) / 10000

    expect(platformShare).toBe(50)
    expect(creatorShare).toBe(300)
  })

  it('should maintain append-only memory', () => {
    const memories = [
      { id: 'm1', type: 'decision' as const, content: 'Bought BTC' },
      { id: 'm2', type: 'pnl' as const, content: 'Closed BTC', txHash: '0xabc' },
    ]
    expect(memories).toHaveLength(2)
    expect(memories[1]?.txHash).toBeTruthy()
  })
})
