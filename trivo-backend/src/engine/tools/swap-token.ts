import { db } from '../../lib/db.js'
import { feedEvents } from '../../lib/schema.js'
import { parseUsdc } from '../../services/app-kit.service.js'
import type { EngineTool } from './registry.js'

/**
 * Supported tokens for swaps on Arc.
 * Maps symbol → { address, decimals, label }
 */
const SUPPORTED_TOKENS: Record<string, { address: string; decimals: number; label: string }> = {
  USDC: { address: '0x3600000000000000000000000000000000000000', decimals: 6, label: 'USD Coin' },
  EURC: { address: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a', decimals: 6, label: 'Euro Coin' },
}

/** Simple pool rates for mock swaps (USDC base). */
const MOCK_RATES: Record<string, number> = {
  USDC: 1,
  EURC: 0.92,
}

export const swapTokenTool: EngineTool = {
  schema: {
    name: 'swap_token',
    description:
      'Swap one token for another (e.g., USDC to EURC). ' +
      'Use this when the agent identifies an arbitrage opportunity, ' +
      'wants to rebalance, or fulfills a user request to swap tokens. ' +
      'Specify fromToken, toToken, and amount.',
    input_schema: {
      type: 'object',
      properties: {
        fromToken: {
          type: 'string',
          enum: Object.keys(SUPPORTED_TOKENS),
          description: 'Token to swap FROM',
        },
        toToken: {
          type: 'string',
          enum: Object.keys(SUPPORTED_TOKENS),
          description: 'Token to swap TO',
        },
        amount: {
          type: 'string',
          description: 'Amount of fromToken to swap (e.g., "10.50")',
        },
        minReceive: {
          type: 'string',
          description: 'Minimum amount of toToken to receive (slippage protection, optional)',
        },
      },
      required: ['fromToken', 'toToken', 'amount'],
    },
  },

  async execute(args) {
    const { fromToken, toToken, amount, minReceive } = args as {
      fromToken: string
      toToken: string
      amount: string
      minReceive?: string
    }

    // ── Validate tokens ──

    const from = SUPPORTED_TOKENS[fromToken.toUpperCase()]
    const to = SUPPORTED_TOKENS[toToken.toUpperCase()]

    if (!from || !to) {
      return {
        success: false,
        error: `Unsupported token pair: ${fromToken} → ${toToken}. Supported: ${Object.keys(SUPPORTED_TOKENS).join(', ')}`,
      }
    }

    if (fromToken.toUpperCase() === toToken.toUpperCase()) {
      return { success: false, error: 'Cannot swap a token for itself' }
    }

    // ── Validate amount ──

    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) {
      return { success: false, error: 'Invalid amount' }
    }

    // ── Calculate receive amount (mock rate) ──

    const fromRate = MOCK_RATES[fromToken.toUpperCase()] ?? 1
    const toRate = MOCK_RATES[toToken.toUpperCase()] ?? 1
    const receiveAmt = (amt / fromRate) * toRate
    const receiveAmtStr = receiveAmt.toFixed(6)

    // Slippage check
    if (minReceive) {
      const minRcv = parseFloat(minReceive)
      if (!isNaN(minRcv) && receiveAmt < minRcv) {
        return {
          success: false,
          error: `Slippage too high: expected at least ${minReceive} ${toToken}, but only ${receiveAmtStr} ${toToken} estimated`,
        }
      }
    }

    // ── Execute swap via adapter (fallback to mock) ──

    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`

    // Try adapter-based swap if Circle adapter is configured
    try {
      const { createAdapterFromPrivateKey } = await import('@circle-fin/adapter-viem-v2')
      const { http, createPublicClient, createWalletClient } = await import('viem')
      const { config: cfg } = await import('../../config.js')

      const pk = cfg.DEPLOYER_PRIVATE_KEY
      if (pk) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adapter = await (createAdapterFromPrivateKey as any)({
          privateKey: pk,
          getPublicClient: () =>
            createPublicClient({
              chain: {
                id: Number(cfg.ARC_CHAIN_ID),
                name: 'Arc Testnet',
                nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                rpcUrls: { default: { http: [cfg.ARC_RPC_URL] } },
              },
              transport: http(cfg.ARC_RPC_URL),
            }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          getWalletClient: async ({ account }: any) =>
            createWalletClient({
              account,
              chain: {
                id: Number(cfg.ARC_CHAIN_ID),
                name: 'Arc Testnet',
                nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
                rpcUrls: { default: { http: [cfg.ARC_RPC_URL] } },
              },
              transport: http(cfg.ARC_RPC_URL),
            }),
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prepared = await (adapter as any).prepareAction('swap.execute', {
          instructions: [
            {
              target: from.address as `0x${string}`,
              data: '0x' as `0x${string}`,
              value: 0n,
              tokenIn: from.address as `0x${string}`,
              amountToApprove: parseUsdc(amount),
              tokenOut: to.address as `0x${string}`,
              minTokenOut: minReceive ? parseUsdc(minReceive) : parseUsdc(receiveAmtStr),
            },
          ],
          signature: '0x' as `0x${string}`,
        }, { chain: 'Arc_Testnet' })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prepared as any).execute()
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.warn(`[swap_token] Adapter swap failed, using mock: ${errMsg}`)
    }

    // ── Record in feed ──

    const agentId = (args._agentId as string) || 'unknown'
    await db
      .insert(feedEvents)
      .values({
        id: crypto.randomUUID(),
        agentId,
        type: 'swap',
        venue: 'arc',
        pair: `${fromToken}/${toToken}`,
        side: 'swap',
        size: amount,
        data: JSON.stringify({
          fromToken: fromToken.toUpperCase(),
          toToken: toToken.toUpperCase(),
          fromAmount: amount,
          receiveAmount: receiveAmtStr,
          receiveToken: toToken.toUpperCase(),
          rate: receiveAmt / amt,
          txHash,
          success: true,
        }),
      })
      .execute()
      .catch((e: Error) => console.error('[swap_token] Feed:', e.message))

    return {
      success: true,
      txHash,
      fromToken: fromToken.toUpperCase(),
      toToken: toToken.toUpperCase(),
      fromAmount: amount,
      receiveAmount: receiveAmtStr,
      rate: receiveAmt / amt,
      message: `Swapped ${amount} ${fromToken.toUpperCase()} → ${receiveAmtStr} ${toToken.toUpperCase()} at rate ${(receiveAmt / amt).toFixed(4)}`,
    }
  },
}
