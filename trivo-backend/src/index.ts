import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { validateConfig } from './config'

if (!process.env.VITEST) {
  validateConfig()
}

import { healthRoutes } from './routes/health'
import { authRoutes } from './routes/auth'
import { agentRoutes } from './routes/agents'
import { positionRoutes } from './routes/positions'
import { feedRoutes } from './routes/feed'
import { copyRoutes } from './routes/copy'
import { walletRoutes } from './routes/wallets'
import { strategyRoutes } from './routes/strategy'
import { memoryRoutes } from './routes/memory'
import { backtestRoutes } from './routes/backtest'
import { thinkingRoutes } from './routes/thinking'
import { setupDocs } from './lib/openapi'

const app = new Hono()

app.use('*', cors())
app.use('*', logger())

app.route('/', healthRoutes)
app.route('/api/auth', authRoutes)
app.route('/api/agents', agentRoutes)
app.route('/api/positions', positionRoutes)
app.route('/api/feed', feedRoutes)
app.route('/api/copy', copyRoutes)
app.route('/api/wallets', walletRoutes)
app.route('/api/strategy', strategyRoutes)
app.route('/api', memoryRoutes)
app.route('/api/backtest', backtestRoutes)
app.route('/api', thinkingRoutes)

// API documentation
setupDocs(app)

setTimeout(async () => {
  try {
    const { startAllCrons } = await import('./services/cron')
    startAllCrons()
    const { startAgentEngineV2 } = await import('./services/agent-engine-v2')
    startAgentEngineV2()
  } catch {
    console.warn('⏰ Cron not started (DB may not be available yet)')
  }
}, 1000)

const port = parseInt(process.env.PORT || '3000')
serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`⚡ Trivo API running on http://localhost:${info.port}`)
  console.log(`📋 API Docs: http://localhost:${info.port}/api/docs`)
})

export default app
