import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { agents } from '../lib/schema'
import { authMiddleware } from '../middleware/auth'
import { getWalletBalance } from '../services/wallet.service'

export const walletRoutes = new Hono()

walletRoutes.get('/:agentId/balance', async (c) => {
  const agentId = c.req.param('agentId')
  const agent = await db.select().from(agents).where(eq(agents.id, agentId))
  if (agent.length === 0) return c.json({ error: 'Agent not found' }, 404)

  const walletAddress = agent[0].circleWalletAddress
  const balance = walletAddress ? await getWalletBalance(walletAddress) : 0

  return c.json({
    agentId,
    balance: balance.toString(),
    currency: 'USDC',
    walletAddress: walletAddress || 'Not assigned',
  })
})

walletRoutes.get('/:agentId/deposit', async (c) => {
  const agentId = c.req.param('agentId')
  const agent = await db.select().from(agents).where(eq(agents.id, agentId))
  if (agent.length === 0) return c.json({ error: 'Agent not found' }, 404)

  return c.json({
    agentId,
    message: 'Deposit USDC to your agent wallet address',
    walletAddress: agent[0].circleWalletAddress || 'Connect wallet to create agent wallet',
    network: 'Arc Testnet',
    chainId: 5042002,
  })
})

walletRoutes.post('/create', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { agentId } = await c.req.json()

  const existing = await db.select().from(agents).where(eq(agents.id, agentId))
  if (existing.length === 0) return c.json({ error: 'Agent not found' }, 404)
  if (existing[0].ownerId !== userId) return c.json({ error: 'Not your agent' }, 403)

  // Non-custodial: user's own wallet is the agent wallet
  // In production: create Circle Agent Wallet here
  return c.json({
    message: 'Agent wallet is non-custodial — use your connected wallet',
    agentId,
    note: 'For Circle Agent Wallet integration, set CIRCLE_API_KEY in .env',
  })
})

walletRoutes.post('/withdraw', authMiddleware, async (c) => {
  // Non-custodial: user signs the withdrawal themselves via their wallet
  return c.json({
    message: 'Withdrawals are non-custodial — sign the transaction from your wallet',
    note: 'We recommend using Circle Agent Wallets for automated withdrawals',
  })
})
