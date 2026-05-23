/* eslint-disable @typescript-eslint/no-explicit-any */
import { createPublicClient, http, keccak256, toHex } from 'viem'
import { config } from '../config'

const arcTestnet = {
  id: Number(config.ARC_CHAIN_ID),
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [config.ARC_RPC_URL] } },
  blockExplorers: { default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' } },
} as const

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(config.ARC_RPC_URL),
})

async function getSigner() {
  const { privateKeyToAccount } = await import('viem/accounts')
  const { createWalletClient } = await import('viem')
  const pk = config.DEPLOYER_PRIVATE_KEY
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set')
  const account = privateKeyToAccount(pk as `0x${string}`)
  return createWalletClient({ account, transport: http(config.ARC_RPC_URL) })
}

// ── SimpleOracle ABI (with custom errors) ──

const ORACLE_ABI = [
  {
    type: 'function' as const,
    name: 'updatePrice',
    inputs: [
      { name: 'pair', type: 'bytes32' },
      { name: 'price', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'getPrice',
    inputs: [{ name: 'pair', type: 'bytes32' }],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view' as const,
  },
  {
    type: 'error' as const,
    name: 'PriceStale',
    inputs: [],
  },
  {
    type: 'error' as const,
    name: 'ZeroPrice',
    inputs: [],
  },
  {
    type: 'error' as const,
    name: 'NotAuthorized',
    inputs: [],
  },
] as const

// ── SimpleOracle Functions ──

export async function updatePrice(pair: string, price: number) {
  const wc = await getSigner()
  const pairHash = keccak256(toHex(pair))
  const tx = await wc.writeContract({
    address: config.SIMPLE_ORACLE as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'updatePrice',
    args: [pairHash, BigInt(Math.floor(price)), BigInt(Math.floor(Date.now() / 1000))],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function getPrice(pair: string): Promise<number> {
  const pairHash = keccak256(toHex(pair))
  try {
    const result = (await publicClient.readContract({
      address: config.SIMPLE_ORACLE as `0x${string}`,
      abi: ORACLE_ABI,
      functionName: 'getPrice',
      args: [pairHash],
    })) as readonly [bigint, bigint]
    return Number(result[0])
  } catch (error: any) {
    const errorSig = error?.data?.slice(0, 10)
    if (errorSig === '0x4dfba023') {
      console.warn(`⚠️ PriceStale: ${pair} — price not updated in >1 hour`)
      return 0
    }
    if (errorSig === '0x28771d91') {
      console.warn(`⚠️ ZeroPrice: ${pair} — no price data`)
      return 0
    }
    throw error
  }
}

// ── CopyTrading Functions ──

export async function reportPositionOnChain(
  agentId: number,
  venue: string,
  market: string,
  side: string,
  size: number,
  entryPrice: number,
  leverage: number,
): Promise<{ txHash: string; positionId: number }> {
  const wc = await getSigner()
  const refId = keccak256(toHex(`${agentId}-${Date.now()}`))
  const tx = await wc.writeContract({
    address: config.COPY_TRADING as `0x${string}`,
    abi: [
      {
        type: 'function' as const,
        name: 'reportPosition',
        inputs: [
          { name: 'agentId', type: 'uint256' },
          { name: 'venue', type: 'string' },
          { name: 'market', type: 'string' },
          { name: 'side', type: 'string' },
          { name: 'size', type: 'uint256' },
          { name: 'entryPrice', type: 'uint256' },
          { name: 'leverage', type: 'uint256' },
          { name: 'refId', type: 'bytes32' },
        ],
        outputs: [{ name: 'positionId', type: 'uint256' }],
        stateMutability: 'nonpayable' as const,
      },
    ],
    functionName: 'reportPosition',
    args: [BigInt(agentId), venue, market, side, BigInt(size), BigInt(entryPrice), BigInt(leverage), refId],
  } as any)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  return { txHash: receipt.transactionHash, positionId: 0 }
}

export async function closePositionOnChain(positionId: number, exitPrice: number, pnl: number) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.COPY_TRADING as `0x${string}`,
    abi: [
      {
        type: 'function' as const,
        name: 'closePosition',
        inputs: [
          { name: 'positionId', type: 'uint256' },
          { name: 'exitPrice', type: 'uint256' },
          { name: 'pnl', type: 'int256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable' as const,
      },
    ],
    functionName: 'closePosition',
    args: [BigInt(positionId), BigInt(exitPrice), BigInt(pnl)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

// ── Mock Venue Functions (for compatibility with old tools) ──

export async function mockPerpOpenPosition(
  _pair: string, _isLong: boolean, _size: number, _leverage: number
): Promise<{ transactionHash: string }> {
  return { transactionHash: `0x${Date.now().toString(16)}mock` }
}

export async function mockPolymarketBuyOutcome(
  _marketId: number, _isYes: boolean, _amount: number
): Promise<{ transactionHash: string }> {
  return { transactionHash: `0x${Date.now().toString(16)}mock` }
}

export async function mockPolymarketCreateMarket(
  _question: string, _yesOdds?: number, _noOdds?: number
): Promise<{ transactionHash: string; marketId: string }> {
  return { transactionHash: `0x${Date.now().toString(16)}mock`, marketId: `market-${Date.now()}` }
}

export async function mockLpAddLiquidity(
  _poolId: number, _tickLower?: number, _tickUpper?: number, _amount?: number
): Promise<{ transactionHash: string }> {
  return { transactionHash: `0x${Date.now().toString(16)}mock` }
}

export async function mockLpCreatePool(
  _pair: string, _fee?: number, _sqrtPriceX96?: number
): Promise<{ transactionHash: string; poolId: string }> {
  return { transactionHash: `0x${Date.now().toString(16)}mock`, poolId: `pool-${Date.now()}` }
}

export async function mockLpSimulateFeeAccrual(
  _poolId: string | number, _amount?: number
): Promise<{ transactionHash: string }> {
  return { transactionHash: `0x${Date.now().toString(16)}mock` }
}

export async function depositFeeOnChain(
  _agentId: number, _amount: number
): Promise<{ transactionHash: string }> {
  return { transactionHash: `0x${Date.now().toString(16)}mock` }
}
