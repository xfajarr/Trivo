/* eslint-disable @typescript-eslint/no-explicit-any */
import { createPublicClient, http, keccak256, toHex } from 'viem'
import { config } from '../config'
import { getRealtimePrice } from './realtime-price.service.js'
import { SimpleOracleABI, CopyTradingABI, MockPerpABI, MockPolymarketABI, MockLPV3ABI } from '../abi'

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

// ── SimpleOracle ──

export async function updatePrice(pair: string, price: number) {
  const wc = await getSigner()
  const pairHash = keccak256(toHex(pair))
  const tx = await wc.writeContract({
    address: config.SIMPLE_ORACLE as `0x${string}`,
    abi: SimpleOracleABI,
    functionName: 'updatePrice',
    args: [pairHash, BigInt(Math.floor(price)), BigInt(Math.floor(Date.now() / 1000))],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function getPrice(pair: string): Promise<number> {
  // Try real-time WS price first (faster)
  const rtPrice = getRealtimePrice(pair)
  if (rtPrice > 0) return rtPrice
  const pairHash = keccak256(toHex(pair))
  try {
    const result = (await publicClient.readContract({
      address: config.SIMPLE_ORACLE as `0x${string}`,
      abi: SimpleOracleABI,
      functionName: 'getPrice',
      args: [pairHash],
    })) as readonly [bigint, bigint]
    return Number(result[0])
  } catch (error: any) {
    const errorSig = error?.data?.slice(0, 10)
    const errorName = error?.data?.errorName

    // ZeroPrice() - no price data for this pair
    if (errorSig === '0x4dfba023' || errorName === 'ZeroPrice') {
      console.warn(`⚠️ ZeroPrice: ${pair} — no price data, returning 0`)
      return 0
    }

    // PriceStale() - price not updated in >1 hour
    if (errorSig === '0x28771d91' || errorName === 'PriceStale') {
      console.warn(`⚠️ PriceStale: ${pair} — price not updated in >1 hour, returning 0`)
      return 0
    }

    // For any other error, return 0 instead of throwing
    console.warn(`⚠️ getPrice failed for ${pair}:`, error?.message || error)
    return 0
  }
}

export async function getMultiplePrices(pairs: string[]): Promise<number[]> {
  const pairHashes = pairs.map((p) => keccak256(toHex(p)))
  try {
    const result = (await publicClient.readContract({
      address: config.SIMPLE_ORACLE as `0x${string}`,
      abi: SimpleOracleABI,
      functionName: 'getMultiplePrices',
      args: [pairHashes],
    })) as readonly bigint[]
    return result.map(Number)
  } catch (error: any) {
    console.warn('getMultiplePrices failed:', error?.message)
    return pairs.map(() => 0)
  }
}

// ── CopyTrading ──

export async function registerAgentOnChain(agentId: number, agentAddress: string, agentOwner: string) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.COPY_TRADING as `0x${string}`,
    abi: CopyTradingABI,
    functionName: 'registerAgent',
    args: [BigInt(agentId), agentAddress as `0x${string}`, agentOwner as `0x${string}`],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

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
    abi: CopyTradingABI,
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
    abi: CopyTradingABI,
    functionName: 'closePosition',
    args: [BigInt(positionId), BigInt(exitPrice), BigInt(pnl)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

// ── MockPerp ──

export async function mockPerpOpenPosition(
  pair: string,
  isLong: boolean,
  size: number,
  leverage: number,
): Promise<{ transactionHash: string }> {
  const wc = await getSigner()
  const pairHash = keccak256(toHex(pair))
  const tx = await wc.writeContract({
    address: config.MOCK_PERP as `0x${string}`,
    abi: MockPerpABI,
    functionName: 'openPosition',
    args: [pairHash, isLong, BigInt(size), BigInt(leverage)],
  } as any)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  return { transactionHash: receipt.transactionHash }
}

export async function mockPerpClosePosition(
  positionId: number,
  exitPrice: number,
): Promise<{ transactionHash: string; pnl: number }> {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_PERP as `0x${string}`,
    abi: MockPerpABI,
    functionName: 'closePosition',
    args: [BigInt(positionId), BigInt(exitPrice)],
  } as any)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  return { transactionHash: receipt.transactionHash, pnl: 0 }
}

// ── MockPolymarket ──

export async function mockPolymarketCreateMarket(
  question: string,
  yesOdds: number = 50,
  noOdds: number = 50,
): Promise<{ transactionHash: string; marketId: string }> {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_POLYMARKET as `0x${string}`,
    abi: MockPolymarketABI,
    functionName: 'createMarket',
    args: [question, BigInt(yesOdds), BigInt(noOdds)],
  } as any)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  return { transactionHash: receipt.transactionHash, marketId: `market-${Date.now()}` }
}

export async function mockPolymarketBuyOutcome(
  marketId: number,
  isYes: boolean,
  amount: number,
): Promise<{ transactionHash: string }> {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_POLYMARKET as `0x${string}`,
    abi: MockPolymarketABI,
    functionName: 'buyOutcome',
    args: [BigInt(marketId), isYes, BigInt(amount)],
  } as any)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  return { transactionHash: receipt.transactionHash }
}

// ── MockLPV3 ──

export async function mockLpCreatePool(
  token0: string,
  token1: string,
  fee: number,
  sqrtPriceX96: number,
): Promise<{ transactionHash: string; poolId: string }> {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_LPV3 as `0x${string}`,
    abi: MockLPV3ABI,
    functionName: 'createPool',
    args: [token0 as `0x${string}`, token1 as `0x${string}`, fee, BigInt(sqrtPriceX96)],
  } as any)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  return { transactionHash: receipt.transactionHash, poolId: `pool-${Date.now()}` }
}

export async function mockLpAddLiquidity(
  poolId: number,
  tickLower: number,
  tickUpper: number,
  amount: number,
): Promise<{ transactionHash: string }> {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_LPV3 as `0x${string}`,
    abi: MockLPV3ABI,
    functionName: 'addLiquidity',
    args: [BigInt(poolId), tickLower, tickUpper, BigInt(amount)],
  } as any)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  return { transactionHash: receipt.transactionHash }
}

export async function mockLpSimulateFeeAccrual(
  poolId: string | number,
  amount?: number,
): Promise<{ transactionHash: string }> {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_LPV3 as `0x${string}`,
    abi: MockLPV3ABI,
    functionName: 'simulateFeeAccrual',
    args: [BigInt(poolId), BigInt(amount ?? 1000)],
  } as any)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
  return { transactionHash: receipt.transactionHash }
}

export async function depositFeeOnChain(_agentId: number, _amount: number): Promise<{ transactionHash: string }> {
  // Mock implementation for now
  return { transactionHash: `0x${Date.now().toString(16)}mock` }
}

// ── USDC ERC-20 Balance ──

const USDC_CONTRACT = '0x3600000000000000000000000000000000000000'

// Minimal ERC-20 ABI — just balanceOf
const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const

/**
 * Fetch USDC balance (ERC-20) for any address on Arc testnet.
 * Returns the balance as a string with 2 decimal places (e.g. "12.34").
 */
export async function getUsdcBalance(address: string): Promise<string> {
  try {
    const result = (await publicClient.readContract({
      address: USDC_CONTRACT,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    })) as bigint

    const whole = result / 10n ** 6n
    const frac = result % 10n ** 6n
    const fracStr = frac.toString().padStart(6, '0').slice(0, 2)
    return `${whole}.${fracStr}`
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn('[usdc] balanceOf failed:', msg)
    return '0.00'
  }
}
