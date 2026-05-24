import { describe, expect, it, vi } from 'vitest'

vi.mock('../services/market-data.service.js', () => ({
  getCandles: vi.fn(async (symbol: string, timeframe: string, limit: number) => ({
    symbol,
    timeframe,
    candles: Array.from({ length: limit }, (_, index) => ({
      time: 1_760_000_000 + index * 60,
      open: 100 + index,
      high: 101 + index,
      low: 99 + index,
      close: 100.5 + index,
      volume: 10 + index,
    })),
  })),
}))

describe('market routes', () => {
  it('returns candles with valid query params', async () => {
    const { marketRoutes } = await import('../routes/market')
    const res = await marketRoutes.request('/candles?symbol=BTC/USD&timeframe=1m&limit=10')
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.symbol).toBe('BTC/USD')
    expect(body.timeframe).toBe('1m')
    expect(body.candles).toHaveLength(10)
    expect(body.candles[0]).toMatchObject({ open: 100, high: 101, low: 99, close: 100.5 })
  })

  it('rejects unsupported timeframe', async () => {
    const { marketRoutes } = await import('../routes/market')
    const res = await marketRoutes.request('/candles?symbol=BTC/USD&timeframe=9h&limit=10')
    expect(res.status).toBe(400)
  })
})
