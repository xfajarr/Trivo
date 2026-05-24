import { Hono } from 'hono'
import { apiReference } from '@scalar/hono-api-reference'

export function setupDocs(app: Hono) {
  // JSON spec endpoint
  app.get('/api/docs.json', (c) => {
    return c.json(getSpec())
  })

  // Scalar UI
  app.get(
    '/api/docs',
    apiReference({
      spec: { url: '/api/docs.json' },
      theme: 'purple',
    }),
  )
}

function getSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Trivo API',
      version: '0.1.0',
      description: 'AI trading agent platform on Arc — launch agents, copy trade, track positions.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local dev' }],
    tags: [
      { name: 'Auth' },
      { name: 'Agents' },
      { name: 'Positions' },
      { name: 'Feed' },
      { name: 'Copy Trading' },
      { name: 'Wallets' },
      { name: 'Strategy' },
      { name: 'Memory' },
      { name: 'Backtest' },
      { name: 'Market' },
      { name: 'Intelligence' },
    ],
    paths: {
      '/api/auth/verify': {
        post: {
          tags: ['Auth'],
          summary: 'Verify Privy access token',
          requestBody: {
            content: {
              'application/json': { schema: { type: 'object', properties: { accessToken: { type: 'string' } } } },
            },
          },
          responses: { '200': { description: 'User data' } },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'User profile' } },
        },
      },
      '/api/agents': {
        get: { tags: ['Agents'], summary: 'List all agents', responses: { '200': { description: 'Agent list' } } },
        post: {
          tags: ['Agents'],
          summary: 'Create agent',
          security: [{ bearerAuth: [] }],
          responses: { '201': { description: 'Agent created' } },
        },
      },
      '/api/agents/{id}': {
        get: {
          tags: ['Agents'],
          summary: 'Get agent',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Agent detail' } },
        },
        put: {
          tags: ['Agents'],
          summary: 'Update agent',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated' } },
        },
      },
      '/api/agents/{id}/status': {
        patch: {
          tags: ['Agents'],
          summary: 'Pause/resume agent',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Status updated' } },
        },
      },
      '/api/agents/{id}/memory': {
        get: {
          tags: ['Memory'],
          summary: 'Get agent memory',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Memory' } },
        },
        post: {
          tags: ['Memory'],
          summary: 'Add memory',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '201': { description: 'Saved' } },
        },
      },
      '/api/agents/{id}/traces': {
        get: {
          tags: ['Memory'],
          summary: 'Get thinking traces',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Traces' } },
        },
      },
      '/api/positions': {
        get: {
          tags: ['Positions'],
          summary: 'List positions',
          parameters: [
            { name: 'agentId', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Positions' } },
        },
      },
      '/api/feed': {
        get: {
          tags: ['Feed'],
          summary: 'Get feed',
          parameters: [{ name: 'venue', in: 'query', schema: { type: 'string' } }],
          responses: { '200': { description: 'Feed' } },
        },
      },
      '/api/copy/attach': {
        post: {
          tags: ['Copy Trading'],
          summary: 'Attach follower',
          security: [{ bearerAuth: [] }],
          responses: { '201': { description: 'Attached' } },
        },
      },
      '/api/copy/detach': {
        post: { tags: ['Copy Trading'], summary: 'Detach follower', responses: { '200': { description: 'Detached' } } },
      },
      '/api/copy/relations/{agentId}': {
        get: {
          tags: ['Copy Trading'],
          summary: 'Get followers',
          parameters: [{ name: 'agentId', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Followers' } },
        },
      },
      '/api/wallets/create': {
        post: {
          tags: ['Wallets'],
          summary: 'Create Circle wallet',
          security: [{ bearerAuth: [] }],
          responses: { '201': { description: 'Created' } },
        },
      },
      '/api/wallets/{agentId}/balance': {
        get: {
          tags: ['Wallets'],
          summary: 'Get balance',
          parameters: [{ name: 'agentId', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Balance' } },
        },
      },
      '/api/strategy/compile': {
        post: { tags: ['Strategy'], summary: 'Compile strategy', responses: { '200': { description: 'Compiled' } } },
      },
      '/api/strategy/train': {
        post: { tags: ['Strategy'], summary: 'Train agent', responses: { '200': { description: 'Trained' } } },
      },
      '/api/backtest/run': {
        post: { tags: ['Backtest'], summary: 'Run backtest', responses: { '200': { description: 'Results' } } },
      },
      '/api/user/memory': {
        get: {
          tags: ['Memory'],
          summary: 'Get user memory',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Memory' } },
        },
        post: {
          tags: ['Memory'],
          summary: 'Save user memory',
          security: [{ bearerAuth: [] }],
          responses: { '201': { description: 'Saved' } },
        },
      },
      '/api/pnl/agents/{id}': {
        get: {
          tags: ['Backtest'],
          summary: 'Get agent PnL summary',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'PnL summary' } },
        },
      },
      '/api/positions/history/{agentId}': {
        get: {
          tags: ['Positions'],
          summary: 'Get trade history',
          parameters: [{ name: 'agentId', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Trade history' } },
        },
      },
      '/api/chat': {
        post: { tags: ['Memory'], summary: 'General chat', responses: { '200': { description: 'Chat response' } } },
      },
      '/api/chat/agent/{id}': {
        post: {
          tags: ['Memory'],
          summary: 'Agent training chat',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Chat response' } },
        },
      },
      '/api/models': {
        get: { tags: ['Strategy'], summary: 'List model settings', responses: { '200': { description: 'Models' } } },
      },
      '/api/models/agents/{id}': {
        get: {
          tags: ['Strategy'],
          summary: 'Get agent model config',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Model config' } },
        },
        put: {
          tags: ['Strategy'],
          summary: 'Update agent model config',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Updated' } },
        },
      },
      '/api/market/candles': {
        get: {
          tags: ['Market'],
          summary: 'Get market candles',
          parameters: [
            { name: 'symbol', in: 'query', schema: { type: 'string' } },
            { name: 'timeframe', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'number' } },
          ],
          responses: { '200': { description: 'Candles' } },
        },
      },
      '/api/intelligence/skill-packs': {
        get: { tags: ['Intelligence'], summary: 'List built-in skill packs', responses: { '200': { description: 'Skill packs' } } },
      },
      '/api/intelligence/agents/{id}/decisions': {
        get: {
          tags: ['Intelligence'],
          summary: 'List agent decisions',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Agent decisions' } },
        },
      },
      '/api/intelligence/agents/{id}/committee-reports': {
        get: {
          tags: ['Intelligence'],
          summary: 'List committee reports',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Committee reports' } },
        },
      },
      '/api/intelligence/agents/{id}/reflections': {
        get: {
          tags: ['Intelligence'],
          summary: 'List agent reflections',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Agent reflections' } },
        },
      },
      '/api/intelligence/agents/{id}/scorecard': {
        get: {
          tags: ['Intelligence'],
          summary: 'Get agent scorecard',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Agent scorecard' } },
        },
      },
      '/api/intelligence/scorecards': {
        get: {
          tags: ['Intelligence'],
          summary: 'List scorecards',
          parameters: [{ name: 'window', in: 'query', schema: { type: 'string' } }],
          responses: { '200': { description: 'Scorecards' } },
        },
      },
      '/api/intelligence/agents/{id}/skill-packs': {
        get: {
          tags: ['Intelligence'],
          summary: 'List agent skill packs',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Skill packs' } },
        },
      },
      '/api/intelligence/market-regimes': {
        get: {
          tags: ['Intelligence'],
          summary: 'List market regimes',
          parameters: [
            { name: 'symbol', in: 'query', schema: { type: 'string' } },
            { name: 'timeframe', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Market regimes' } },
        },
      },
      '/api/intelligence/agents/{id}/risk-policy': {
        get: {
          tags: ['Intelligence'],
          summary: 'Get agent risk policy',
          parameters: [{ name: 'id', in: 'path', schema: { type: 'string' } }],
          responses: { '200': { description: 'Risk policy' } },
        },
      },
      '/health': { get: { tags: ['Health'], summary: 'Health check', responses: { '200': { description: 'OK' } } } },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  }
}
