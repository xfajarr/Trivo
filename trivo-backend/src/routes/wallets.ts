import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { agents } from '../lib/schema'
import { authMiddleware } from '../middleware/auth'
import { createAgentWallet, getWalletBalance, sendFromAgentWallet } from '../services/wallet.service'
import { getUsdcBalance } from '../services/contract.service'

export const walletRoutes = new Hono()

walletRoutes.post('/create', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { agentId } = await c.req.json()

  const existing = await db.select().from(agents).where(eq(agents.id, agentId))
  if (existing.length === 0) return c.json({ error: 'Agent not found' }, 404)
  if (existing[0]?.ownerId !== userId) return c.json({ error: 'Not your agent' }, 403)

  try {
    const { walletId, walletAddress } = await createAgentWallet(existing[0]?.name ?? 'Agent')

    await db
      .update(agents)
      .set({
        circleWalletId: walletId,
        circleWalletAddress: walletAddress,
      })
      .where(eq(agents.id, agentId))

    return c.json(
      {
        message: 'Agent wallet created',
        agentId,
        walletId,
        walletAddress,
        chain: 'Arc Testnet',
        chainId: 5042002,
      },
      201,
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Wallet creation failed: ${msg}` }, 500)
  }
})

walletRoutes.get('/:agentId/balance', async (c) => {
  const agentId = c.req.param('agentId')
  const agent = await db.select().from(agents).where(eq(agents.id, agentId))
  if (agent.length === 0) return c.json({ error: 'Agent not found' }, 404)

  const walletAddress = agent[0]?.circleWalletAddress
  if (!walletAddress) return c.json({ balance: '0', walletAddress: null })

  const balance = await getWalletBalance(walletAddress)
  return c.json({
    agentId,
    balance: balance.toString(),
    currency: 'USDC',
    walletAddress,
  })
})

walletRoutes.get('/:agentId/deposit', async (c) => {
  const agentId = c.req.param('agentId')
  const agent = await db.select().from(agents).where(eq(agents.id, agentId))
  if (agent.length === 0) return c.json({ error: 'Agent not found' }, 404)

  return c.json({
    agentId,
    walletAddress: agent[0]?.circleWalletAddress || 'Create wallet first via POST /api/wallets/create',
    network: 'Arc Testnet',
    chainId: 5042002,
  })
})

walletRoutes.post('/withdraw', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { agentId, amount, destinationAddress } = await c.req.json()

  if (!amount || !destinationAddress) {
    return c.json({ error: 'amount and destinationAddress are required' }, 400)
  }

  const existing = await db.select().from(agents).where(eq(agents.id, agentId))
  if (existing.length === 0) return c.json({ error: 'Agent not found' }, 404)
  if (existing[0]?.ownerId !== userId) return c.json({ error: 'Not your agent' }, 403)

  const walletId = existing[0]?.circleWalletId
  const walletAddress = existing[0]?.circleWalletAddress
  if (!walletId || !walletAddress) {
    return c.json({ error: 'Agent wallet not created yet' }, 400)
  }

  try {
    const result = await sendFromAgentWallet(walletId, destinationAddress, amount)
    return c.json({
      message: 'Withdrawal initiated',
      agentId,
      fromAddress: walletAddress,
      destinationAddress,
      amount,
      txHash: result.txHash,
      transactionId: result.transactionId,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Withdrawal failed: ${msg}` }, 500)
  }
})

// ── USDC Balance for any address (no auth — public balance query) ──

walletRoutes.get('/usdc/:address', async (c) => {
  const address = c.req.param('address')

  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return c.json({ error: 'Invalid address' }, 400)
  }

  const balance = await getUsdcBalance(address)
  return c.json({ address, balance, currency: 'USDC', chain: 'Arc Testnet' })
})
