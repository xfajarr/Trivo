import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import {
  getGatewayBalance,
  initiateGatewayWithdrawal,
  completeGatewayWithdrawal,
  getPendingWithdrawal,
  formatUsdc,
} from '../services/unified-balance.service'

export const unifiedBalanceRoutes = new Hono()

// ── Check Gateway balance ──

/**
 * GET /api/unified/balance/:address
 * Public — read any address's Gateway balance.
 */
unifiedBalanceRoutes.get('/balance/:address', async (c) => {
  const address = c.req.param('address')

  if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return c.json({ error: 'Invalid address format' }, 400)
  }

  try {
    const raw = await getGatewayBalance(address)
    return c.json({
      address,
      balance: raw.toString(),
      balanceDisplay: formatUsdc(raw),
      token: 'USDC',
      gateway: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Balance check failed: ${msg}` }, 500)
  }
})

// ── Deposit into Gateway ──

/**
 * POST /api/unified/deposit
 * Auth required — deposit USDC from platform wallet into Gateway for a user.
 * Body: { owner: string, amount: string }
 */
unifiedBalanceRoutes.post('/deposit', authMiddleware, async (c) => {
  const { owner, amount } = await c.req.json()

  if (!owner || !amount) {
    return c.json({ error: 'owner and amount required' }, 400)
  }

  const amt = parseFloat(amount as string)
  if (isNaN(amt) || amt <= 0) {
    return c.json({ error: 'Invalid amount' }, 400)
  }
  try {
    const { prepareGatewayDeposit } = await import('../services/prepare.service')
    const result = await prepareGatewayDeposit(owner as string, amount as string)

    const txs = [
      {
        to: result.approval.to,
        data: result.approval.data,
        value: result.approval.value || '0',
        gas: result.approval.gas.toString(),
        gasPrice: result.approval.gasPrice.toString(),
        chainId: result.approval.chainId,
        label: 'Approve USDC for Gateway',
      },
      {
        to: result.deposit.to,
        data: result.deposit.data,
        value: result.deposit.value || '0',
        gas: result.deposit.gas.toString(),
        gasPrice: result.deposit.gasPrice.toString(),
        chainId: result.deposit.chainId,
        label: 'Deposit to Gateway',
      },
    ]

    return c.json({
      message: `Gateway deposit prepared (${txs.length} transaction${txs.length > 1 ? 's' : ''}). Sign with your wallet.`,
      type: 'gateway-deposit',
      txs,
      meta: { amount, owner, token: 'USDC', note: 'After signing, balance is chain-abstracted.' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Prepare failed: ${msg}` }, 500)
  }
})

// ── Initiate Gateway withdrawal ──

/**
 * POST /api/unified/initiate-withdrawal
 * Auth required — start the withdrawal delay timer for the caller's Gateway balance.
 * After the delay (~1-2 min), call POST /api/unified/complete-withdrawal.
 */
unifiedBalanceRoutes.post('/initiate-withdrawal', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const owner = (body?.owner as string) ?? userId

  try {
    const txHash = await initiateGatewayWithdrawal(owner)
    return c.json({
      message: 'Withdrawal initiated. Wait for delay period, then call complete-withdrawal.',
      owner,
      txHash,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Initiate withdrawal failed: ${msg}` }, 500)
  }
})

// ── Complete Gateway withdrawal ──

/**
 * POST /api/unified/complete-withdrawal
 * Auth required — complete the pending withdrawal.
 * Must be called after initiate-withdrawal delay has elapsed.
 */
unifiedBalanceRoutes.post('/complete-withdrawal', authMiddleware, async (c) => {
  try {
    const txHash = await completeGatewayWithdrawal()
    return c.json({
      message: 'Withdrawal completed. USDC returned to your wallet.',
      txHash,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Complete withdrawal failed: ${msg}` }, 500)
  }
})

// ── Check pending withdrawal ──

/**
 * GET /api/unified/pending-withdrawal/:owner
 * Public — check the pending withdrawal amount for an owner.
 */
unifiedBalanceRoutes.get('/pending-withdrawal/:owner', async (c) => {
  const owner = c.req.param('owner')

  try {
    const raw = await getPendingWithdrawal(owner)
    return c.json({
      owner,
      pendingAmount: raw.toString(),
      pendingDisplay: formatUsdc(raw),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Check pending withdrawal failed: ${msg}` }, 500)
  }
})
