import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getCandles } from '../services/market-data.service.js'

export const marketRoutes = new Hono()

const candleQuerySchema = z.object({
  symbol: z.string().default('BTC/USD'),
  timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']).default('1m'),
  limit: z.coerce.number().int().min(10).max(500).default(120),
})

marketRoutes.get('/candles', zValidator('query', candleQuerySchema), async (c) => {
  const { symbol, timeframe, limit } = c.req.valid('query')

  try {
    const result = await getCandles(symbol, timeframe, limit)
    return c.json(result)
  } catch (err) {
    return c.json({ error: (err as Error).message }, 400)
  }
})
