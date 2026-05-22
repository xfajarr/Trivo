import { describe, it, expect } from 'vitest'

describe('Types - Data Model Validation', () => {
  it('should accept valid agent creation params', () => {
    const agent = {
      id: 'test-uuid',
      ownerId: 'privy-user-id',
      name: 'Hyperion',
      handle: 'hyperion.eth',
      modelProvider: 'deepseek' as const,
      strategy: 'Trend-following perp scalper across BTC/ETH/SOL.',
      skills: JSON.stringify([{ id: 'perp', name: 'Perpetual Trading', venue: 'perp' }]),
      status: 'inactive' as const,
    }

    expect(agent.name).toBe('Hyperion')
    expect(agent.handle).toBe('hyperion.eth')
    expect(agent.status).toBe('inactive')
    expect(['deepseek', 'claude', 'openai', 'qwen', 'byok']).toContain(agent.modelProvider)
  })

  it('should validate agent status transitions', () => {
    const validStatuses = ['inactive', 'active', 'paused'] as const
    type AgentStatus = typeof validStatuses[number]

    function isValidTransition(from: AgentStatus, to: AgentStatus): boolean {
      if (from === 'inactive' && to === 'active') return true
      if (from === 'active' && to === 'paused') return true
      if (from === 'paused' && to === 'active') return true
      return false
    }

    expect(isValidTransition('inactive', 'active')).toBe(true)
    expect(isValidTransition('active', 'paused')).toBe(true)
    expect(isValidTransition('paused', 'active')).toBe(true)
    expect(isValidTransition('active', 'inactive')).toBe(false)
  })

  it('should calculate correct PnL for prediction market (integer math)', () => {
    // In Solidity: shares = (amount * 100) / odds
    // $500 at 62% odds = 500 * 100 / 62 = 806 (truncated)
    const amount = 500
    const odds = 62
    const shares = Math.floor((amount * 100) / odds)

    expect(shares).toBe(806)

    // Resolves YES → payout = shares
    const payout = shares
    expect(payout).toBe(806)

    // PnL = payout - amount
    const pnl = payout - amount
    expect(pnl).toBe(306)
  })

  it('should calculate correct PnL for prediction market loss', () => {
    const amount = 500
    const odds = 62
    const shares = Math.floor((amount * 100) / odds) // 806

    // Resolves NO → payout = 0
    const payout = 0
    const pnl = payout - amount

    expect(pnl).toBe(-500)
  })

  it('should calculate correct PnL for perp long trade', () => {
    const entryPrice = 72880
    const exitPrice = 74100
    const size = 5000

    const priceDiff = exitPrice - entryPrice
    const pnl = (size * priceDiff) / entryPrice

    expect(priceDiff).toBe(1220)
    expect(pnl).toBeGreaterThan(0)
    expect(Math.floor(pnl)).toBe(83)
  })

  it('should calculate correct PnL for perp short trade', () => {
    const entryPrice = 72880
    const exitPrice = 71000
    const size = 5000

    const priceDiff = entryPrice - exitPrice
    const pnl = (size * priceDiff) / entryPrice

    expect(priceDiff).toBe(1880)
    expect(pnl).toBeGreaterThan(0)
  })
})
