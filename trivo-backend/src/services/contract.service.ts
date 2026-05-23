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

// ── SimpleOracle ──

export async function updatePrice(pair: string, price: number) {
  const wc = await getSigner()
  const pairHash = keccak256(toHex(pair))
  const tx = await wc.writeContract({
    address: config.SIMPLE_ORACLE as `0x${string}`,
    abi: [
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
    ],
    functionName: 'updatePrice',
    args: [pairHash, BigInt(Math.floor(price)), BigInt(Math.floor(Date.now() / 1000))],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function getPrice(pair: string): Promise<number> {
  const pairHash = keccak256(toHex(pair))
  const result = (await publicClient.readContract({
    address: config.SIMPLE_ORACLE as `0x${string}`,
    abi: [
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
    ],
    functionName: 'getPrice',
    args: [pairHash],
  } as any)) as readonly [bigint, bigint]
  return Number(result[0])
}

// ── CopyTrading ──

export async function registerAgentOnChain(agentId: number, agentAddress: string, agentOwner: string) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.COPY_TRADING as `0x${string}`,
    abi: [
      {
        type: 'function' as const,
        name: 'registerAgent',
        inputs: [
          { name: 'agentId', type: 'uint256' },
          { name: 'agentAddress', type: 'address' },
          { name: 'agentOwner', type: 'address' },
        ],
        outputs: [],
        stateMutability: 'nonpayable' as const,
      },
    ],
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
    args: [BigInt(positionId), BigInt(Math.floor(exitPrice)), BigInt(pnl)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function attachFollowerOnChain(follower: string, targetAgentId: number, allocationBps: number) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.COPY_TRADING as `0x${string}`,
    abi: [
      {
        type: 'function' as const,
        name: 'attachFollower',
        inputs: [
          { name: 'follower', type: 'address' },
          { name: 'targetAgentId', type: 'uint256' },
          { name: 'allocationBps', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable' as const,
      },
    ],
    functionName: 'attachFollower',
    args: [follower as `0x${string}`, BigInt(targetAgentId), BigInt(allocationBps)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

// ── FeeManager ──

export async function depositFeeOnChain(agentId: number, amount: number) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.FEE_MANAGER as `0x${string}`,
    abi: [{
      type: 'function' as const, name: 'depositFee',
      inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'amount', type: 'uint256' }],
      outputs: [], stateMutability: 'nonpayable' as const,
    }],
    functionName: 'depositFee',
    args: [BigInt(agentId), BigInt(amount)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

// ── MockPerp ──

export async function mockPerpOpenPosition(
  pair: string, isLong: boolean, sizeUsd: number, leverage: number
) {
  const wc = await getSigner()
  const pairHash = keccak256(toHex(pair))
  const tx = await wc.writeContract({
    address: config.MOCK_PERP as `0x${string}`,
    abi: [{
      type: 'function' as const, name: 'openPosition',
      inputs: [
        { name: 'pair', type: 'bytes32' }, { name: 'isLong', type: 'bool' },
        { name: 'sizeUsd', type: 'uint256' }, { name: 'leverage', type: 'uint256' },
      ],
      outputs: [{ name: 'positionId', type: 'uint256' }],
      stateMutability: 'nonpayable' as const,
    }],
    functionName: 'openPosition',
    args: [pairHash, isLong, BigInt(sizeUsd), BigInt(leverage)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function mockPerpClosePosition(positionId: number) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_PERP as `0x${string}`,
    abi: [{
      type: 'function' as const, name: 'closePosition',
      inputs: [{ name: 'positionId', type: 'uint256' }],
      outputs: [{ name: 'pnl', type: 'int256' }, { name: 'pnlUsd', type: 'uint256' }],
      stateMutability: 'nonpayable' as const,
    }],
    functionName: 'closePosition',
    args: [BigInt(positionId)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

// ── MockPolymarket ──

export async function mockPolymarketCreateMarket(question: string, yesOdds: number, noOdds: number) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_POLYMARKET as `0x${string}`,
    abi: [{
      type: 'function' as const, name: 'createMarket',
      inputs: [
        { name: 'question', type: 'string' },
        { name: 'yesOdds', type: 'uint256' },
        { name: 'noOdds', type: 'uint256' },
      ],
      outputs: [{ name: 'marketId', type: 'uint256' }],
      stateMutability: 'nonpayable' as const,
    }],
    functionName: 'createMarket',
    args: [question, BigInt(yesOdds), BigInt(noOdds)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function mockPolymarketBuyOutcome(marketId: number, isYes: boolean, amount: number) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_POLYMARKET as `0x${string}`,
    abi: [{
      type: 'function' as const, name: 'buyOutcome',
      inputs: [
        { name: 'marketId', type: 'uint256' },
        { name: 'isYes', type: 'bool' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: 'shares', type: 'uint256' }],
      stateMutability: 'nonpayable' as const,
    }],
    functionName: 'buyOutcome',
    args: [BigInt(marketId), isYes, BigInt(amount)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function mockPolymarketResolve(marketId: number, outcome: boolean) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_POLYMARKET as `0x${string}`,
    abi: [{
      type: 'function' as const, name: 'resolveMarket',
      inputs: [{ name: 'marketId', type: 'uint256' }, { name: 'outcome', type: 'bool' }],
      outputs: [], stateMutability: 'nonpayable' as const,
    }],
    functionName: 'resolveMarket',
    args: [BigInt(marketId), outcome],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

// ── MockLPV3 ──

export async function mockLpCreatePool(pair: string, feeTier: number) {
  const wc = await getSigner()
  const pairHash = keccak256(toHex(pair))
  const tx = await wc.writeContract({
    address: config.MOCK_LPV3 as `0x${string}`,
    abi: [{
      type: 'function' as const, name: 'createPool',
      inputs: [{ name: 'pair', type: 'bytes32' }, { name: 'feeTier', type: 'uint24' }],
      outputs: [{ name: 'poolId', type: 'uint256' }],
      stateMutability: 'nonpayable' as const,
    }],
    functionName: 'createPool',
    args: [pairHash, feeTier],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function mockLpAddLiquidity(poolId: number, tickLower: number, tickUpper: number, amountUsd: number) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_LPV3 as `0x${string}`,
    abi: [{
      type: 'function' as const, name: 'addLiquidity',
      inputs: [
        { name: 'poolId', type: 'uint256' },
        { name: 'tickLower', type: 'int24' },
        { name: 'tickUpper', type: 'int24' },
        { name: 'amountUsd', type: 'uint256' },
      ],
      outputs: [{ name: 'positionId', type: 'uint256' }],
      stateMutability: 'nonpayable' as const,
    }],
    functionName: 'addLiquidity',
    args: [BigInt(poolId), tickLower, tickUpper, BigInt(amountUsd)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function mockLpSimulateFeeAccrual(poolId: number, volumeUsd: number) {
  const wc = await getSigner()
  const tx = await wc.writeContract({
    address: config.MOCK_LPV3 as `0x${string}`,
    abi: [{
      type: 'function' as const, name: 'simulateFeeAccrual',
      inputs: [{ name: 'poolId', type: 'uint256' }, { name: 'volumeUsd', type: 'uint256' }],
      outputs: [], stateMutability: 'nonpayable' as const,
    }],
    functionName: 'simulateFeeAccrual',
    args: [BigInt(poolId), BigInt(volumeUsd)],
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}
