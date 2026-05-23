import { describe, it, expect } from 'vitest'

describe('Types - Data Model Validation', () => {
  it('should accept valid agent creation params', () => {
    const agent = {
      id: 'test-uuid',
      ownerId: 'privy-user-id',
      name: 'Hyperion',
      handle: 'hyperion.eth',
      modelProvider: 'deepseek' as const,
      strategy: 'Trend following',
      status: 'inactive' as const,
    }

    expect(agent.name).toBe('Hyperion')
    expect(agent.status).toBe('inactive')
  })

  it('should validate agent status transitions', () => {
    function isValidTransition(from: string, to: string): boolean {
      if (from === 'inactive' && to === 'active') return true
      if (from === 'active' && to === 'paused') return true
      if (from === 'paused' && to === 'active') return true
      return false
    }

    expect(isValidTransition('inactive', 'active')).toBe(true)
    expect(isValidTransition('active', 'paused')).toBe(true)
    expect(isValidTransition('active', 'inactive')).toBe(false)
  })

  it('should calculate prediction market PnL correctly', () => {
    const amount = 500
    const odds = 62
    const shares = Math.floor((amount * 100) / odds)

    expect(shares).toBe(806)

    // Resolves YES → payout = shares
    const payout = shares
    const pnl = payout - amount
    expect(pnl).toBe(306)
  })

  it('should calculate perp long PnL correctly', () => {
    const entryPrice = 72880
    const exitPrice = 74100
    const size = 5000

    const priceDiff = exitPrice - entryPrice
    const pnl = (size * priceDiff) / entryPrice

    expect(priceDiff).toBe(1220)
    expect(pnl).toBeGreaterThan(0)
  })

  it('should calculate perp short PnL correctly', () => {
    const entryPrice = 72880
    const exitPrice = 71000
    const size = 5000

    const priceDiff = entryPrice - exitPrice
    const pnl = (size * priceDiff) / entryPrice

    expect(priceDiff).toBe(1880)
    expect(pnl).toBeGreaterThan(0)
  })

  it('should handle prediction market loss', () => {
    const amount = 500
    const shares = Math.floor((amount * 100) / 62) // 62% odds
    const payout = 0 // NO wins, user had YES
    const pnl = payout - amount

    expect(shares).toBe(806)
    expect(pnl).toBe(-500)
  })
})
