/**
 * ═════════════════════════════════════════════════════════
 * AppKit Service — Unified interface for Send, Bridge, Swap
 *
 * Wraps @circle-fin/app-kit + @circle-fin/adapter-viem-v2
 * to provide type-safe USDC operations on Arc Testnet.
 * ═════════════════════════════════════════════════════════
 */
import { createViemAdapterFromPrivateKey, resolveChainIdentifier } from '@circle-fin/adapter-viem-v2'
import { http, createPublicClient, createWalletClient } from 'viem'
import { config } from '../config'

const USDC_DECIMALS = 6

type AppKitAdapter = Awaited<ReturnType<typeof createViemAdapterFromPrivateKey>>
let adapter: AppKitAdapter | null = null

/** Arc Testnet as a viem-compatible chain object */
const viemChain = {
  id: Number(config.ARC_CHAIN_ID),
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [config.ARC_RPC_URL] } },
  blockExplorers: { default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' } },
} as const

async function getAdapter(): Promise<AppKitAdapter> {
  if (adapter) return adapter

  const pk = config.DEPLOYER_PRIVATE_KEY
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set')

  adapter = await createViemAdapterFromPrivateKey({
    privateKey: pk,
    getPublicClient: () =>
      createPublicClient({
        chain: viemChain,
        transport: http(config.ARC_RPC_URL),
      }),
    getWalletClient: async ({ account }) =>
      createWalletClient({
        account,
        chain: viemChain,
        transport: http(config.ARC_RPC_URL),
      }),
  })

  return adapter
}

// ── Public helpers ──

/**
 * Format a USDC amount string to bigint (6 decimals).
 * "1.00" → 1000000n
 */
export function parseUsdc(amount: string): bigint {
  const [whole = '0', frac = ''] = amount.split('.')
  const padded = frac.padEnd(USDC_DECIMALS, '0').slice(0, USDC_DECIMALS)
  return BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(padded)
}

/**
 * Format a USDC bigint to display string (6 decimals).
 * 1000000n → "1.00"
 */
export function formatUsdc(amount: bigint): string {
  const whole = amount / 10n ** BigInt(USDC_DECIMALS)
  const frac = amount % 10n ** BigInt(USDC_DECIMALS)
  return `${whole}.${frac.toString().padStart(USDC_DECIMALS, '0').slice(0, 2)}`
}

// ── Send USDC ──

/**
 * Send USDC from the platform wallet to any address on Arc.
 * Returns the transaction hash as a string.
 */
export async function sendUsdc(to: string, amount: string): Promise<string> {
  const a = await getAdapter()
  const prepared = await a.prepareAction('usdc.transfer', {
    to: to as `0x${string}`,

    amount: parseUsdc(amount),
  }, { chain: 'Arc_Testnet' })
  return prepared.execute() as Promise<string>
}

// ── CCTP Bridge ──

/**
 * Bridge USDC from Arc → destination chain via CCTP v2.
 * Returns the source transaction hash.
 */
export async function bridgeFromArc(destinationChain: string, amount: string, mintRecipient: string): Promise<string> {
  const a = await getAdapter()
  // resolveChainIdentifier converts string chain names to full ChainDefinition objects
  // Casting needed: resolveChainIdentifier returns ChainDefinition, action expects ChainDefinitionWithCCTPv2
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromChain = resolveChainIdentifier('Arc_Testnet') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toChain = resolveChainIdentifier(destinationChain as any) as any
  const prepared = await a.prepareAction('cctp.v2.depositForBurn', {
    amount: parseUsdc(amount),
    mintRecipient,
    maxFee: 0n,
    minFinalityThreshold: 1000,
    fromChain,
    toChain,
  }, { chain: 'Arc_Testnet' })
  return prepared.execute() as Promise<string>
}
