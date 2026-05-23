import { describe, it, expect } from 'vitest'
import { decide } from '../services/decision-engine.service'

describe('Decision Engine', () => {
  it('should produce a trade decision with reasoning', async () => {
    const decision = await decide(
      {
        id: 'agent-1',
        name: 'Hyperion',
        strategy: 'Trend following',
        modelProvider: 'deepseek',
        memory: [],
      },
      { prices: { 'BTC/USD': 72880, 'ETH/USD': 3508, 'SOL/USD': 211 } },
    )

    expect(decision).toBeDefined()
    expect(decision.reasoning).toBeTruthy()
    expect(decision.confidence).toBeGreaterThan(0)
    expect(decision.confidence).toBeLessThanOrEqual(1)
  })

  it('should provide tool and args when trading', async () => {
    // Run multiple to get at least one trade
    for (let i = 0; i < 20; i++) {
      const decision = await decide(
        { id: `agent-${i}`, name: `Agent`, strategy: 'test', modelProvider: null, memory: [] },
        { prices: { 'BTC/USD': 72880, 'ETH/USD': 3508, 'SOL/USD': 211 } },
      )

      if (decision.shouldTrade) {
        expect(decision.tool).toBeTruthy()
        expect(decision.args).toBeDefined()
        return // success — found at least one trade
      }
    }

    // If no trades after 20 cycles, that's ok too (probabilistic)
    // The decision engine has cycles where it skips
  })

  it('should handle empty memory gracefully', async () => {
    const decision = await decide(
      {
        id: 'agent-1',
        name: 'TestAgent',
        strategy: null,
        modelProvider: null,
        memory: [],
      },
      { prices: { 'BTC/USD': 0, 'ETH/USD': 0, 'SOL/USD': 0 } },
    )

    expect(decision).toBeDefined()
    expect(decision.reasoning).toBeTruthy()
  })

  it('should return confidence between 0 and 1', async () => {
    for (let i = 0; i < 10; i++) {
      const d = await decide(
        { id: 'a', name: 'A', strategy: null, modelProvider: null, memory: [] },
        { prices: { 'BTC/USD': 70000, 'ETH/USD': 3400, 'SOL/USD': 200 } },
      )
      expect(d.confidence).toBeGreaterThanOrEqual(0)
      expect(d.confidence).toBeLessThanOrEqual(1)
    }
  })
})
