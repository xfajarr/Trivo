import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { healthRoutes } from './routes/health'
import { authRoutes } from './routes/auth'
import { agentRoutes } from './routes/agents'
import { positionRoutes } from './routes/positions'
import { feedRoutes } from './routes/feed'
import { copyRoutes } from './routes/copy'
import { walletRoutes } from './routes/wallets'
import { strategyRoutes } from './routes/strategy'
import { memoryRoutes } from './routes/memory'

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

const port = parseInt(process.env.PORT || '3000')
serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`⚡ Trivo API running on http://localhost:${info.port}`)
})

export default app
