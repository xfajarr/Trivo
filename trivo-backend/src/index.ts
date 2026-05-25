import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { validateConfig } from './config'
import { startAllCrons } from './services/cron.js'
import { startRealtimePriceFeed } from './services/realtime-price.service.js'
import { subscribeAgent, agentConnections } from './services/ws.js'

if (!process.env.VITEST) {
  validateConfig()
}

import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { agentRoutes } from './routes/agents.js'
import { positionRoutes } from './routes/positions.js'
import { feedRoutes } from './routes/feed.js'
import { copyRoutes } from './routes/copy.js'
import { walletRoutes } from './routes/wallets.js'
import { strategyRoutes } from './routes/strategy.js'
import { memoryRoutes } from './routes/memory.js'
import { backtestRoutes } from './routes/backtest.js'
import { thinkingRoutes } from './routes/thinking.js'
import { modelRoutes } from './routes/models.js'
import { pnlRoutes } from './routes/pnl.js'
import { chat } from './routes/chat.js'
import { marketRoutes } from './routes/market.js'
import { intelligenceRoutes } from './routes/intelligence.js'
import { transferRoutes } from './routes/transfers.js'
import { bridgeRoutes } from './routes/bridge.js'
import { unifiedBalanceRoutes } from './routes/unified-balance.js'
import { setupDocs } from './lib/openapi.js'

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
app.route('/api/transfers', transferRoutes)
app.route('/api/bridge', bridgeRoutes)
app.route('/api/unified', unifiedBalanceRoutes)
app.route('/api/strategy', strategyRoutes)
app.route('/api', memoryRoutes)
app.route('/api/backtest', backtestRoutes)
app.route('/api', thinkingRoutes)
app.route('/api/models', modelRoutes)
app.route('/api/pnl', pnlRoutes)
app.route('/api/chat', chat)
app.route('/api/market', marketRoutes)
app.route('/api/intelligence', intelligenceRoutes)

setupDocs(app)

// ─── WebSocket Server ──────────────────────────────────────────────────────────

interface WsMessage {
  action: 'subscribe' | 'unsubscribe'
  agentId: string
}

function setupWebSocketServer(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true })

  wss.on('connection', (ws: WebSocket) => {
    let subscribedAgentId: string | null = null

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as WsMessage
        if (msg.action === 'subscribe' && msg.agentId) {
          subscribedAgentId = msg.agentId
          subscribeAgent(msg.agentId, ws)
          ws.send(JSON.stringify({ event: 'connected', agentId: msg.agentId }))
          console.log(`[WS] Client subscribed to agent ${msg.agentId}`)
        }
      } catch {
        // ignore invalid JSON messages
      }
    })

    ws.on('close', () => {
      if (!subscribedAgentId) return
      const conns = agentConnections.get(subscribedAgentId)
      conns?.delete(ws)
      if (conns?.size === 0) agentConnections.delete(subscribedAgentId)
    })

    ws.on('error', () => {
      // cleanup handled by 'close'
    })
  })

  // Handle HTTP → WS upgrade for /ws/<agentId>
  server.on('upgrade', (req: http.IncomingMessage, socket, head) => {
    const url = req.url || ''
    if (url.startsWith('/ws/agent/')) {
      const agentId = url.replace('/ws/agent/', '')
      wss.handleUpgrade(req, socket, head, (ws) => {
        // Auto-subscribe based on URL path
        subscribeAgent(agentId, ws)
        ws.send(JSON.stringify({ event: 'connected', agentId }))
        console.log(`[WS] Client connected to agent ${agentId}`)
      })
    }
  })

  console.log('[WS] WebSocket server ready at /ws/<agentId>')
}

// ─── HTTP Server ───────────────────────────────────────────────────────────────

/**
 * Convert a Node.js IncomingMessage to a Web API Request so Hono can process it.
 * Must collect the body before the Request consumes it.
 */
function toWebRequest(req: http.IncomingMessage): Promise<Request> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const url = `http://${req.headers.host || 'localhost'}${req.url || '/'}`
      try {
        const headers = new Headers()
        for (const [key, val] of Object.entries(req.headers)) {
          if (val == null) continue
          if (Array.isArray(val)) {
            for (const v of val) headers.append(key, v)
          } else {
            headers.append(key, val)
          }
        }
        resolve(new Request(url, {
          method: req.method || 'GET',
          headers,
          body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
        }))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

const port = parseInt(process.env.PORT || '3000')
const server = http.createServer(async (req, res) => {
  // Let Hono's cors middleware handle preflight (via proper Request)
  try {
    const webReq = await toWebRequest(req)
    const response = await app.fetch(webReq)
    const headers: Record<string, string> = {}
    response.headers.forEach((value, key) => { headers[key] = value })
    res.writeHead(response.status, headers)
    response.text().then((body: string) => res.end(body)).catch(() => res.end())
  } catch {
    res.writeHead(500).end()
  }
})

setupWebSocketServer(server)

server.listen(port, () => {
  console.log(`⚡ Trivo API running on http://localhost:${port}`)
  console.log(`📋 API Docs: http://localhost:${port}/api/docs`)
  console.log(`🔌 WS: ws://localhost:${port}/ws/agent/<agentId>`)
})

// ─── Background Services ───────────────────────────────────────────────────────

setTimeout(async () => {
  try {
    startAllCrons()
    startRealtimePriceFeed()
    const { startEngine } = await import('./engine/index.js')
    startEngine()
  } catch {
    console.warn('⏰ Background services not started (DB may be unavailable)')
  }
}, 1000)

export default app
