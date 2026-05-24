/**
 * ═══════════════════════════════════════════════════
 * Prepare Service — unsigned transaction encoding
 *
 * Backend encodes transactions (calldata, gas, to)
 * but NEVER signs. The user signs via Privy wallet.
 * ═══════════════════════════════════════════════════
 */
import { createViemAdapterFromPrivateKey, resolveChainIdentifier } from '@circle-fin/adapter-viem-v2'
import { http, createPublicClient, createWalletClient, encodeFunctionData, parseAbi } from 'viem'
import { config } from '../config'
import { parseUsdc } from './app-kit.service'

// ── Constants ──

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const

/** ERC-20 approve ABI fragment */
const ERC20_APPROVE_ABI = parseAbi(['function approve(address spender, uint256 amount) returns (bool)'])

// ── Types ──

export interface PreparedTx {
  to: string
  data: string
  value?: string
  gas: bigint
  gasPrice: bigint
  chainId: number
}

type Adapter = Awaited<ReturnType<typeof createViemAdapterFromPrivateKey>>
let adapter: Adapter | null = null

const viemChain = {
  id: Number(config.ARC_CHAIN_ID),
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [config.ARC_RPC_URL] } },
  blockExplorers: { default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' } },
} as const

async function getAdapter(): Promise<Adapter> {
  if (adapter) return adapter
  const pk = config.DEPLOYER_PRIVATE_KEY
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set')

  adapter = await createViemAdapterFromPrivateKey({
    privateKey: pk,
    getPublicClient: () =>
      createPublicClient({ chain: viemChain, transport: http(config.ARC_RPC_URL) }),
    getWalletClient: async ({ account }) =>
      createWalletClient({ account, chain: viemChain, transport: http(config.ARC_RPC_URL) }),
  })
  return adapter
}

// ── Helpers ──

/**
 * Encode an ERC-20 approve call directly with viem.
 * Avoids the adapter's usdc.approve action which fails due to deployer balance issues.
 */
function encodeApprove(spender: `0x${string}`, amount: bigint): PreparedTx {
  const data = encodeFunctionData({
    abi: ERC20_APPROVE_ABI,
    functionName: 'approve',
    args: [spender, amount],
  })
  return {
    to: USDC_ADDRESS,
    data,
    value: '0',
    gas: 100_000n,
    gasPrice: 20_000_000_000n,
    chainId: 5042002,
  }
}

/**
 * Build a PreparedTx from adapter's prepared action result.
 * Skips gas estimation (simulation reverts on deployer wallet) — uses hardcoded limits.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFromPrepared(prepared: any, gas: bigint): PreparedTx {
  const cd = prepared.getCallData() as { to: string; data: string; value?: bigint }
  return {
    to: cd.to,
    data: cd.data,
    value: cd.value?.toString() ?? '0',
    gas,
    gasPrice: 20_000_000_000n,
    chainId: 5042002,
  }
}

// ── Public API ──

/** Prepare a USDC transfer — single tx */
export async function prepareSend(to: string, amount: string): Promise<PreparedTx> {
  const a = await getAdapter()
   
  const prepared = await a.prepareAction('usdc.transfer', {
    to: to as `0x${string}`,
    amount: parseUsdc(amount),
  }, { chain: 'Arc_Testnet' })
  return buildFromPrepared(prepared, 300_000n)
}

/** Prepare CCTP v2 bridge — approval + depositForBurn */
export async function prepareBridge(destinationChain: string, amount: string, mintRecipient: string): Promise<{
  approval: PreparedTx
  bridge: PreparedTx
}> {
  const a = await getAdapter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromChain = resolveChainIdentifier('Arc_Testnet') as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toChain = resolveChainIdentifier(destinationChain as any) as any

  // Step 1: Prepare the bridge tx FIRST to get the actual contract address
  const parsed = parseUsdc(amount)
   
  const prepared = await a.prepareAction('cctp.v2.depositForBurn', {
    amount: parsed,
    mintRecipient,
    maxFee: 0n,
    minFinalityThreshold: 1000,
    fromChain,
    toChain,
  }, { chain: 'Arc_Testnet' })

  // Step 2: Approve the EXACT TokenMessenger contract the adapter resolved
  const bridgeCallData = (prepared as unknown as { getCallData: () => { to: string; data: string; value?: bigint } }).getCallData()
  const approval = encodeApprove(bridgeCallData.to as `0x${string}`, parsed)

  return { approval, bridge: buildFromPrepared(prepared, 500_000n) }
}

/** Prepare Gateway deposit — approval + depositFor */
export async function prepareGatewayDeposit(owner: string, amount: string): Promise<{
  approval: PreparedTx
  deposit: PreparedTx
}> {
  const a = await getAdapter()
  const parsed = parseUsdc(amount)

  // Step 1: Prepare the deposit tx FIRST to get the actual Gateway contract address
   
  const prepared = await a.prepareAction('gateway.v1.depositFor', {
    token: USDC_ADDRESS,
    depositor: owner as `0x${string}`,
    value: parsed,
  }, { chain: 'Arc_Testnet' })

  // Step 2: Approve the EXACT Gateway contract the adapter resolved
  const depositCallData = (prepared as unknown as { getCallData: () => { to: string; data: string; value?: bigint } }).getCallData()
  const approval = encodeApprove(depositCallData.to as `0x${string}`, parsed)

  return { approval, deposit: buildFromPrepared(prepared, 400_000n) }
}
