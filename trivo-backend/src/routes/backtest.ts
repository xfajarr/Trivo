import { Hono } from 'hono'
import { runBacktest } from '../services/backtest.service'

export const backtestRoutes = new Hono()

backtestRoutes.post('/run', async (c) => {
  const body = await c.req.json()
  const result = await runBacktest({
    agentId: body.agentId ?? 'demo',
    initialCapital: body.initialCapital ?? 10000,
    startDate: body.startDate ?? '2026-01-01',
    endDate: body.endDate ?? '2026-05-23',
    strategy: body.strategy ?? 'Trend following',
  })

  return c.json({ result })
})
