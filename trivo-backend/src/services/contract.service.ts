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
