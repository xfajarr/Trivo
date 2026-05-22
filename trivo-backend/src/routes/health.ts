import { Hono } from 'hono'

export const healthRoutes = new Hono()

healthRoutes.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'trivo-backend',
    chain: 'arc-testnet',
    chainId: 5042002,
  })
})

healthRoutes.get('/', (c) => {
  return c.json({
    name: 'Trivo API',
    version: '0.1.0',
    description: 'Backend for Agentpit — AI trading agents',
  })
})
