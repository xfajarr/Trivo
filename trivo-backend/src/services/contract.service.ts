import { createPublicClient, http, keccak256, toHex } from 'viem'
import { config } from '../config'
import type { Account } from 'viem'

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

let _account: Account | null = null

async function getAccount(): Promise<Account> {
  if (!_account) {
    const pk = config.DEPLOYER_PRIVATE_KEY
    if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set in .env')
    const { privateKeyToAccount } = await import('viem/accounts')
    _account = privateKeyToAccount(pk as `0x${string}`)
  }
  return _account
}

// ── SimpleOracle ──

export async function updatePrice(pair: string, price: number) {
  const { createWalletClient } = await import('viem')
  const account = await getAccount()
  const wc = createWalletClient({ account, transport: http(config.ARC_RPC_URL) })

  const pairHash = keccak256(toHex(pair))
  const tx = await wc.writeContract({
    address: config.SIMPLE_ORACLE as `0x${string}`,
    abi: [
      {
        type: 'function', name: 'updatePrice',
        inputs: [{ name: 'pair', type: 'bytes32' }, { name: 'price', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }],
        outputs: [], stateMutability: 'nonpayable',
      },
    ],
    functionName: 'updatePrice',
    args: [pairHash, BigInt(Math.floor(price)), BigInt(Math.floor(Date.now() / 1000))],
    chain: arcTestnet,
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function getPrice(pair: string): Promise<number> {
  const pairHash = keccak256(toHex(pair))
  const result = await publicClient.readContract({
    address: config.SIMPLE_ORACLE as `0x${string}`,
    abi: [
      {
        type: 'function', name: 'getPrice',
        inputs: [{ name: 'pair', type: 'bytes32' }],
        outputs: [{ name: 'price', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }],
        stateMutability: 'view',
      },
    ],
    functionName: 'getPrice',
    args: [pairHash],
  } as any)
  const r = result as readonly bigint[]; return Number(r[0])
}

// ── CopyTrading ──

async function copyTradingWrite(functionName: string, args: unknown[]) {
  const { createWalletClient } = await import('viem')
  const account = await getAccount()
  const wc = createWalletClient({ account, transport: http(config.ARC_RPC_URL) })

  const tx = await wc.writeContract({
    address: config.COPY_TRADING as `0x${string}`,
    abi: [
      {
        type: 'function', name: 'registerAgent',
        inputs: [
          { name: 'agentId', type: 'uint256' }, { name: 'agentAddress', type: 'address' }, { name: 'agentOwner', type: 'address' },
        ],
        outputs: [], stateMutability: 'nonpayable',
      },
      {
        type: 'function', name: 'attachFollower',
        inputs: [
          { name: 'follower', type: 'address' }, { name: 'targetAgentId', type: 'uint256' }, { name: 'allocationBps', type: 'uint256' },
        ],
        outputs: [], stateMutability: 'nonpayable',
      },
    ],
    functionName,
    args,
    chain: arcTestnet,
  } as any)
  return publicClient.waitForTransactionReceipt({ hash: tx })
}

export async function registerAgentOnChain(agentId: number, agentAddress: string, agentOwner: string) {
  return copyTradingWrite('registerAgent', [BigInt(agentId), agentAddress as `0x${string}`, agentOwner as `0x${string}`])
}

export async function attachFollowerOnChain(follower: string, targetAgentId: number, allocationBps: number) {
  return copyTradingWrite('attachFollower', [follower as `0x${string}`, BigInt(targetAgentId), BigInt(allocationBps)])
}
