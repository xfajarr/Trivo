import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { agents as agentsTable, agentSessions, agentMemory } from '../lib/schema'
import { erc8004Service } from '../engine/services/erc8004.service.js'
import { createAgentWallet } from '../services/wallet.service.js'
import { authMiddleware } from '../middleware/auth'

export const agentRoutes = new Hono()

const createAgentSchema = z.object({
  name: z.string().min(1).max(32),
  handle: z.string().min(1).max(32),
  avatar: z.string().optional(),
  hostingType: z.enum(['trivo', 'self_hosted']).optional(),
  endpoint: z.string().optional(),
  modelProvider: z.enum(['deepseek', 'claude', 'openai', 'qwen', 'byok', 'asi1-mini', 'asi1', 'asi1-ultra']),
  modelConfig: z.string().optional(),
  skills: z.string().optional(),
  strategy: z.string().optional(),
  spendLimit: z.string().optional(),
  maxLeverage: z.string().optional(),
  stopLossPct: z.string().optional(),
  takeProfitPct: z.string().optional(),
  copyable: z.boolean().optional(),
})

agentRoutes.get('/', async (c) => {
  const allAgents = await db.select().from(agentsTable)
  return c.json({ agents: allAgents, total: allAgents.length })
})

agentRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const agent = await db.select().from(agentsTable).where(eq(agentsTable.id, id))
  if (agent.length === 0) return c.json({ error: 'Agent not found' }, 404)
  return c.json({ agent: agent[0] })
})

agentRoutes.post('/', authMiddleware, zValidator('json', createAgentSchema), async (c) => {
  const userId = c.get('userId')
  const data = c.req.valid('json')

  // Check for duplicate handle
  const existing = await db
    .select({ id: agentsTable.id })
    .from(agentsTable)
    .where(eq(agentsTable.handle, data.handle))
  if (existing.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return c.json({ error: 'Handle already taken', code: 'HANDLE_TAKEN' }, 409) as any
  }

  const agentId = crypto.randomUUID()

  await db.insert(agentsTable).values({
    id: agentId,
    ownerId: userId,
    name: data.name,
    handle: data.handle,
    avatar: data.avatar,
    hostingType: data.hostingType ?? 'trivo',
    endpoint: data.endpoint,
    modelProvider: data.modelProvider,
    modelConfig: data.modelConfig,
    skills: data.skills,
    strategy: data.strategy,
    spendLimit: data.spendLimit,
    maxLeverage: data.maxLeverage,
    stopLossPct: data.stopLossPct,
    status: 'active',
  })

  // 🆔 ERC-8004: Register agent identity on-chain
  try {
    const metadata = erc8004Service.createAgentMetadata({
      name: data.name,
      description: data.strategy ?? 'AI trading agent on Trivo',
      strategy: data.strategy ?? '',
      skills: (data.skills ?? 'perp').split(','),
      riskParams: {
        maxLeverage: data.maxLeverage ?? '5',
        stopLossPct: data.stopLossPct ?? '10',
        spendLimit: data.spendLimit ?? '100',
      },
    })
    const metadataURI = erc8004Service.uploadMetadata(metadata)
    const { agentId: erc8004Id, txHash } = await erc8004Service.registerAgent(metadataURI)
    await db
      .update(agentsTable)
      .set({ erc8004TokenId: erc8004Id, erc8004TxHash: txHash, metadataUri: metadataURI })
      .where(eq(agentsTable.id, agentId))
    console.log(`🆔 ERC-8004 agent #${erc8004Id} registered: https://testnet.arcscan.app/tx/${txHash}`)
  } catch (err) {
    console.warn('⚠️ ERC-8004 registration failed (non-blocking):', (err as Error).message)
  }

  // 💳 Circle wallet: create agent wallet independently from ERC-8004
  try {
    const wallet = await createAgentWallet(data.name || 'Agent')
    if (wallet) {
      await db
        .update(agentsTable)
        .set({ circleWalletId: wallet.walletId, circleWalletAddress: wallet.walletAddress })
        .where(eq(agentsTable.id, agentId))
      console.log(`💳 Wallet created for ${data.name}: ${wallet.walletAddress}`)
    }
  } catch (err) {
    const walletErr = (err as Error).message
    if (walletErr.includes('entity secret') || walletErr.includes('invalid')) {
      console.warn('⚠️ Circle entity secret expired or invalid. Rotate it at https://console.circle.com')
    } else {
      console.warn('⚠️ Wallet creation failed (non-blocking):', walletErr)
    }
  }

  const systemPrompt = `You are ${data.name}, an AI trading agent on Trivo.
Strategy: ${data.strategy || 'No specific strategy'}
Always return structured trade decisions with reasoning.`

  await db.insert(agentSessions).values({
    id: crypto.randomUUID(),
    agentId,
    systemPrompt,
    modelProvider: data.modelProvider,
    modelConfig: data.modelConfig,
    sessionData: JSON.stringify({ turnCount: 0 }),
  })

  await db.insert(agentMemory).values({
    id: crypto.randomUUID(),
    agentId,
    type: 'reflection',
    content: `Agent ${data.name} created with ${data.modelProvider} model, strategy: ${data.strategy || 'none'}`,
    reasoning: 'Agent initialization',
  })

  const agent = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId))
  return c.json({ agent: agent[0] }, 201)
})

agentRoutes.put('/:id', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = await c.req.json()

  const existing = await db.select().from(agentsTable).where(eq(agentsTable.id, id))
  if (existing.length === 0) return c.json({ error: 'Agent not found' }, 404)
  if (existing[0]?.ownerId !== userId) return c.json({ error: 'Not your agent' }, 403)

  await db
    .update(agentsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(agentsTable.id, id))
  const agent = await db.select().from(agentsTable).where(eq(agentsTable.id, id))
  return c.json({ agent: agent[0] })
})

agentRoutes.patch('/:id/status', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const { status } = await c.req.json()

  const existing = await db.select().from(agentsTable).where(eq(agentsTable.id, id))
  if (existing.length === 0) return c.json({ error: 'Agent not found' }, 404)
  if (existing[0]?.ownerId !== userId) return c.json({ error: 'Not your agent' }, 403)

  await db.update(agentsTable).set({ status, updatedAt: new Date() }).where(eq(agentsTable.id, id))
  return c.json({ status })
})

// ── Phase 6: Decision / Insight / Identity Routes ─────────────────────────

import { agentDecisions, agentReflections, tradeOutcomes } from '../lib/schema'
import { desc, and } from 'drizzle-orm'

// GET /:id/decisions — recent decisions
agentRoutes.get('/:id/decisions', async (c) => {
  const agentId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit') || '20'), 100)

  const decisions = await db
    .select()
    .from(agentDecisions)
    .where(eq(agentDecisions.agentId, agentId))
    .orderBy(desc(agentDecisions.createdAt))
    .limit(limit)

  return c.json({
    decisions: decisions.map(d => ({
      id: d.id,
      cycleId: d.cycleId,
      action: d.action,
      market: d.market,
      confidence: d.calibratedConfidence || d.rawConfidence,
      riskLevel: d.riskLevel,
      status: d.status,
      reasoning: d.finalReasoning,
      createdAt: d.createdAt,
    })),
    total: decisions.length,
  })
})

// GET /:id/decisions/:decisionId — full decision detail
agentRoutes.get('/:id/decisions/:decisionId', async (c) => {
  const { id: _agentId, decisionId } = c.req.param()

  const decision = await db
    .select()
    .from(agentDecisions)
    .where(eq(agentDecisions.id, decisionId))
    .limit(1)

  if (!decision[0]) {
    return c.json({ error: 'Decision not found' }, 404)
  }

  return c.json({
    decision: decision[0],
  })
})

// GET /:id/insights — learning insights
agentRoutes.get('/:id/insights', async (c) => {
  const agentId = c.req.param('id')
  const limit = Math.min(Number(c.req.query('limit') || '10'), 50)

  const insights = await db
    .select()
    .from(agentReflections)
    .where(eq(agentReflections.agentId, agentId))
    .orderBy(desc(agentReflections.createdAt))
    .limit(limit)

  return c.json({
    insights: insights.map(r => ({
      id: r.id,
      lesson: r.lesson,
      mistakePattern: r.mistakePattern,
      improvement: r.improvement,
      outcomePnl: r.outcomePnl,
      wasCorrect: r.wasCorrect === 'true',
      usableInPrompt: r.usableInPrompt === 'true',
      createdAt: r.createdAt,
    })),
    total: insights.length,
  })
})

// GET /:id/identity — agent identity proof
agentRoutes.get('/:id/identity', async (c) => {
  const id = c.req.param('id')

  const agent = await db
    .select()
    .from(agentsTable)
    .where(eq(agentsTable.id, id))
    .limit(1)

  if (!agent[0]) {
    return c.json({ error: 'Agent not found' }, 404)
  }

  const a = agent[0]

  // Verify on-chain if ERC-8004 token exists
  let identityProof = null
  if (a.erc8004TokenId) {
    try {
      const { identityService } = await import('../engine/identity/identity-service.js')
      identityProof = await identityService.verifyIdentity(
        '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const,
        BigInt(a.erc8004TokenId)
      )
    } catch {
      // On-chain verification failed (network issue)
    }
  }

  return c.json({
    agent: {
      id: a.id,
      name: a.name,
      handle: a.handle,
      ownerId: a.ownerId,
    },
    onChain: {
      erc8004TokenId: a.erc8004TokenId,
      erc8004TxHash: a.erc8004TxHash,
      metadataUri: a.metadataUri,
      verified: identityProof?.verified ?? false,
      owner: identityProof?.owner ?? null,
    },
    performance: {
      totalPnl: a.totalPnl,
      aum: a.aum,
      tradeCount: a.tradeCount,
      winRate: a.winRate,
      copiers: a.copiers,
    },
    identityProof,
  })
})
