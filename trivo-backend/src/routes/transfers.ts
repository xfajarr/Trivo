import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { agents } from '../lib/schema'
import { authMiddleware } from '../middleware/auth'
import { sendFromAgentWallet } from '../services/wallet.service'
import { parseUsdc } from '../services/app-kit.service'

export const transferRoutes = new Hono()

// ── Deposit (user → agent) ──
// User sends USDC to their agent's Circle wallet.
// Backend provides the deposit address; user signs via Privy on the frontend.

transferRoutes.get('/deposit/:agentId', async (c) => {
  const agentId = c.req.param('agentId')
  const agent = await db.select().from(agents).where(eq(agents.id, agentId))
  if (agent.length === 0) return c.json({ error: 'Agent not found' }, 404)

  return c.json({
    agentId,
    walletAddress: agent[0]?.circleWalletAddress ?? null,
    network: 'Arc Testnet',
    chainId: 5042002,
    usdcContract: '0x3600000000000000000000000000000000000000',
    instructions: 'Send USDC (ERC-20) to this address from your wallet.',
  })
})

// ── Withdraw (agent → user) ──
// Sends USDC from agent's Circle dev-controlled wallet to user's address.

transferRoutes.post('/withdraw', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const { agentId, amount, destinationAddress } = await c.req.json()

  if (!agentId || !amount || !destinationAddress) {
    return c.json({ error: 'agentId, amount, and destinationAddress required' }, 400)
  }

  const agent = await db.select().from(agents).where(eq(agents.id, agentId))
  if (agent.length === 0) return c.json({ error: 'Agent not found' }, 404)
  if (agent[0]?.ownerId !== userId) return c.json({ error: 'Not your agent' }, 403)

  const walletId = agent[0]?.circleWalletId
  const walletAddr = agent[0]?.circleWalletAddress
  if (!walletId || !walletAddr) {
    return c.json({ error: 'Agent wallet not created yet' }, 400)
  }

  try {
    // Use Circle dev-controlled wallets SDK to send from agent wallet
    const result = await sendFromAgentWallet(walletId, destinationAddress, amount)
    return c.json({
      message: 'Withdrawal successful',
      fromAddress: walletAddr,
      toAddress: destinationAddress,
      amount,
      txHash: result.txHash,
      transactionId: result.transactionId,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Withdrawal failed: ${msg}` }, 500)
  }
})

// ── Platform Send (platform → any address) ──
// Uses the deployer key's USDC to send to any address.
// Useful for platform-initiated payouts, fee distributions, etc.

transferRoutes.post('/platform-send', authMiddleware, async (c) => {
  const { to, amount } = await c.req.json()

  if (!to || !amount) {
    return c.json({ error: 'to and amount required' }, 400)
  }

  if (!to.match(/^0x[a-fA-F0-9]{40}$/)) {
    return c.json({ error: 'Invalid destination address' }, 400)
  }

  const amt = parseFloat(amount)
  if (isNaN(amt) || amt <= 0) {
    return c.json({ error: 'Invalid amount' }, 400)
  }

  try {
    const { prepareSend } = await import('../services/prepare.service')
    const tx = await prepareSend(to, amount)
    return c.json({
      message: 'Transaction prepared. Sign with your wallet to execute.',
      type: 'usdc-transfer',
      txs: [{
        label: `Send ${amount} USDC`,
        to: tx.to,
        data: tx.data,
        value: tx.value || '0',
        gas: tx.gas.toString(),
        gasPrice: tx.gasPrice.toString(),
        chainId: tx.chainId,
      }],
      meta: { to, amount, token: 'USDC', chain: 'Arc Testnet' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Prepare failed: ${msg}` }, 500)
  }
})

// ── Parse/format utils exposed as endpoints ──

transferRoutes.post('/parse', (c) => {
  const { amount } = c.req.query()
  if (!amount) return c.json({ error: '?amount= required' }, 400)
  try {
    return c.json({ input: amount, bigint: parseUsdc(amount).toString() })
  } catch {
    return c.json({ error: 'Failed to parse' }, 400)
  }
})
