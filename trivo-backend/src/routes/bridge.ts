import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'


export const bridgeRoutes = new Hono()

/**
 * Supported destination chains for bridging USDC from Arc.
 * Maps human-readable names to AppKit chain identifiers.
 */
const SUPPORTED_DESTINATIONS: Record<string, string> = {
  'base-sepolia': 'Base_Sepolia',
  'ethereum-sepolia': 'Ethereum_Sepolia',
  'arbitrum-sepolia': 'Arbitrum_Sepolia',
  'polygon-amoy': 'Polygon_Amoy',
  'solana-devnet': 'Solana_Devnet',
}

// ── List supported chains ──

bridgeRoutes.get('/chains', (c) => {
  return c.json({
    source: {
      chain: 'Arc Testnet',
      chainId: 5042002,
    },
    destinations: Object.entries(SUPPORTED_DESTINATIONS).map(([key, val]) => ({
      id: key,
      chain: val,
    })),
  })
})

// ── Bridge from Arc → external chain ──

bridgeRoutes.post('/withdraw', authMiddleware, async (c) => {
  const { destination, amount, destinationAddress } = await c.req.json()

  if (!destination || !amount || !destinationAddress) {
    return c.json({ error: 'destination, amount, and destinationAddress required' }, 400)
  }

  const destChain = SUPPORTED_DESTINATIONS[destination as string]
  if (!destChain) {
    return c.json(
      {
        error: `Unsupported destination "${destination}". Supported: ${Object.keys(SUPPORTED_DESTINATIONS).join(', ')}`,
      },
      400,
    )
  }

  const amt = parseFloat(amount as string)
  if (isNaN(amt) || amt <= 0) {
    return c.json({ error: 'Invalid amount' }, 400)
  }

  // Pad destination address to 32 bytes if it's a 20-byte EVM address
  const mintRecipient = (destinationAddress as string).startsWith('0x')
    ? '0x000000000000000000000000' + (destinationAddress as string).slice(2)
    : (destinationAddress as string)

  try {
    const { prepareBridge } = await import('../services/prepare.service')
    const result = await prepareBridge(destChain, amount as string, mintRecipient)

    const txs = [
      {
        label: 'Approve USDC for CCTP Bridge',
        to: result.approval.to,
        data: result.approval.data,
        value: result.approval.value || '0',
        gas: result.approval.gas.toString(),
        gasPrice: result.approval.gasPrice.toString(),
        chainId: result.approval.chainId,
      },
      {
        label: `Bridge ${amount} USDC to ${destChain}`,
        to: result.bridge.to,
        data: result.bridge.data,
        value: result.bridge.value || '0',
        gas: result.bridge.gas.toString(),
        gasPrice: result.bridge.gasPrice.toString(),
        chainId: result.bridge.chainId,
      },
    ]

    return c.json({
      message: `Bridge prepared (${txs.length} transaction${txs.length > 1 ? 's' : ''}). Sign with your wallet.`,
      type: 'cctp-bridge',
      txs,
      meta: {
        fromChain: 'Arc Testnet',
        toChain: destChain,
        amount,
        destinationAddress,
        note: 'After signing all, wait ~2-5 min for attestation.',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return c.json({ error: `Prepare failed: ${msg}` }, 500)
  }
})
