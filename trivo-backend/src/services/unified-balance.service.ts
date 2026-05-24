/**
 * ═══════════════════════════════════════════════════════════
 * Unified Balance Service — Gateway deposit + balance + spend
 *
 * Wraps Circle Gateway v1 actions via App Kit adapter for
 * chain-abstracted USDC balance management.
 *
 * Gateway Wallet (Arc): 0x0077777d7EBA4688BDeF3E311b846F25870A19B9
 * USDC (Arc):           0x3600000000000000000000000000000000000000
 * ═══════════════════════════════════════════════════════════
 */
import { http, createPublicClient, createWalletClient } from 'viem'
import { createAdapterFromPrivateKey } from '@circle-fin/adapter-viem-v2'
import { config } from '../config'
import { parseUsdc, formatUsdc } from './app-kit.service'

// ── Constants ──

const GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const
const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const

export { parseUsdc, formatUsdc }

// ── Adapter singleton ──

type AppKitAdapter = Awaited<ReturnType<typeof createAdapterFromPrivateKey>>
let adapter: AppKitAdapter | null = null

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

  adapter = await createAdapterFromPrivateKey({
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

/** Minimal ABI fragment for Gateway Wallet contract reads. */
const gatewayAbi = [
  {
    name: 'balances',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [
      { name: 'token', type: 'address' as const },
      { name: 'depositor', type: 'address' as const },
    ],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
  {
    name: 'withdrawingBalance',
    type: 'function' as const,
    stateMutability: 'view' as const,
    inputs: [
      { name: 'token', type: 'address' as const },
      { name: 'depositor', type: 'address' as const },
    ],
    outputs: [{ name: '', type: 'uint256' as const }],
  },
]

// ── Gateway operations ──

/**
 * Approve the Gateway Wallet contract to spend the adapter's USDC.
 * Only needs to be called once (or when allowance runs low).
 * Returns the approval transaction hash.
 */
export async function approveGateway(amount: string): Promise<string> {
  const a = await getAdapter()
  const prepared = await a.prepareAction('usdc.approve', {
    delegate: GATEWAY_WALLET,
    amount: parseUsdc(amount),
  }, { chain: 'Arc_Testnet' })
  return prepared.execute() as Promise<string>
}

/**
 * Deposit USDC into the Gateway unified balance for a given owner address.
 * The Gateway credit is chain-agnostic — it can be spent to any supported chain.
 * @param owner - Address that will own the resulting Gateway balance
 * @param amount - Human-readable USDC amount (e.g. "10.50")
 * @returns The deposit transaction hash
 */
export async function depositToGateway(owner: string, amount: string): Promise<string> {
  const a = await getAdapter()
  const prepared = await a.prepareAction('gateway.v1.depositFor', {
    token: USDC_ADDRESS,
    depositor: owner as `0x${string}`,
    value: parseUsdc(amount),
  }, { chain: 'Arc_Testnet' })
  return prepared.execute() as Promise<string>
}

/**
 * Read the USDC Gateway balance for any address.
 * Uses the Gateway Wallet contract's `balances` mapping directly.
 * @param address - Address to query
 * @returns Balance as raw bigint (6 decimals)
 */
export async function getGatewayBalance(address: string): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(config.ARC_RPC_URL),
  })

  try {
    const balance = (await publicClient.readContract({
      address: GATEWAY_WALLET,
      abi: gatewayAbi,
      functionName: 'balances',
      args: [USDC_ADDRESS, address as `0x${string}`],
    })) as bigint
    return balance
  } catch {
    return 0n
  }
}

/**
 * Withdraw USDC from Gateway back to the depositor's wallet on the same chain.
 * Uses a two-step process: initiate (start the delay timer) + complete after delay.
 * @param owner - Address that owns the Gateway balance
 * @returns The initiate-withdrawal transaction hash
 */
export async function initiateGatewayWithdrawal(owner: string): Promise<string> {
  const a = await getAdapter()
  const prepared = await a.prepareAction('gateway.v1.initiateWithdrawal', {
    token: USDC_ADDRESS,
    value: await getGatewayBalance(owner),
  }, { chain: 'Arc_Testnet' })
  return prepared.execute() as Promise<string>
}

/**
 * Complete a pending Gateway withdrawal (call after the delay period).
 * @returns The withdrawal transaction hash
 */
export async function completeGatewayWithdrawal(): Promise<string> {
  const a = await getAdapter()
  const prepared = await a.prepareAction('gateway.v1.withdraw', {
    token: USDC_ADDRESS,
  }, { chain: 'Arc_Testnet' })
  return prepared.execute() as Promise<string>
}

/**
 * Check the pending withdrawal amount for a depositor.
 * Uses the Gateway Wallet contract's `withdrawingBalance` mapping.
 * @returns Amount waiting to be withdrawn (raw bigint, 6 decimals)
 */
export async function getPendingWithdrawal(owner: string): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: viemChain,
    transport: http(config.ARC_RPC_URL),
  })

  try {
    const balance = (await publicClient.readContract({
      address: GATEWAY_WALLET,
      abi: gatewayAbi,
      functionName: 'withdrawingBalance',
      args: [USDC_ADDRESS, owner as `0x${string}`],
    })) as bigint
    return balance
  } catch {
    return 0n
  }
}
