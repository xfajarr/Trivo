import { createPublicClient, createWalletClient, http, getContract, parseAbiItem, keccak256, toHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { config } from '../../config.js'

// Official ERC-8004 contracts on Arc Testnet
const IDENTITY_REGISTRY = '0x8004A818BFB912233c491871b3d84c89A494BD9e'
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713'

const arcChain = {
  id: Number(config.ARC_CHAIN_ID),
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [config.ARC_RPC_URL] } },
} as const

const IDENTITY_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'metadataURI', type: 'string' }],
    outputs: [],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

const REPUTATION_ABI = [
  {
    name: 'giveFeedback',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const

export class ERC8004Service {
  private publicClient: ReturnType<typeof createPublicClient>
  private walletClient: ReturnType<typeof createWalletClient> | null = null
  private account: ReturnType<typeof privateKeyToAccount>

  constructor() {
    const pk = config.DEPLOYER_PRIVATE_KEY
    if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set for ERC-8004')
    this.account = privateKeyToAccount(pk as `0x${string}`)
    this.publicClient = createPublicClient({ chain: arcChain, transport: http(config.ARC_RPC_URL) })
  }

  private getWalletClient(): ReturnType<typeof createWalletClient> {
    if (!this.walletClient) {
      this.walletClient = createWalletClient({
        account: this.account,
        chain: arcChain,
        transport: http(config.ARC_RPC_URL),
      })
    }
    return this.walletClient
  }

  async registerAgent(metadataURI: string): Promise<{ agentId: string; txHash: string }> {
    const wc = this.getWalletClient()
    const identityContract = getContract({
      address: IDENTITY_REGISTRY as `0x${string}`,
      abi: IDENTITY_ABI,
      client: { public: this.publicClient, wallet: wc },
    })

    const txHash = await identityContract.write.register([metadataURI], { account: this.account, chain: arcChain })
    await this.publicClient.waitForTransactionReceipt({ hash: txHash })

    const latestBlock = await this.publicClient.getBlockNumber()
    const fromBlock = latestBlock > 10000n ? latestBlock - 10000n : 0n

    const transferLogs = await this.publicClient.getLogs({
      address: IDENTITY_REGISTRY as `0x${string}`,
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
      args: { to: this.account.address },
      fromBlock,
      toBlock: latestBlock,
    })

    if (transferLogs.length === 0) {
      // Try reading totalSupply or latest token as fallback
      try {
        // Scan for ALL Transfer events from address(0) (mint events)
        const mintLogs = await this.publicClient.getLogs({
          address: IDENTITY_REGISTRY as `0x${string}`,
          event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
          args: { from: '0x0000000000000000000000000000000000000000' as `0x${string}` },
          fromBlock,
          toBlock: latestBlock,
        })
        const agentId = mintLogs[mintLogs.length - 1]?.args?.tokenId?.toString() ?? '0'
        if (agentId !== '0') {
          console.log(`🆔 ERC-8004 agent #${agentId} registered (via mint scan)`)
          return { agentId, txHash }
        }
      } catch {
        // fall through
      }
      console.warn('⚠️ ERC-8004 registered but could not determine token ID from events')
      return { agentId: '0', txHash }
    }
    const agentId = transferLogs[transferLogs.length - 1]?.args?.tokenId?.toString() ?? '0'
    return { agentId, txHash }
  }

  async recordTradeOutcome(agentId: string, isWin: boolean, score: number = isWin ? 95 : 20): Promise<string> {
    const wc = this.getWalletClient()
    const reputationContract = getContract({
      address: REPUTATION_REGISTRY as `0x${string}`,
      abi: REPUTATION_ABI,
      client: { public: this.publicClient, wallet: wc },
    })

    const tag = isWin ? 'successful_trade' : 'failed_trade'
    const feedbackHash = keccak256(toHex(tag))

    const txHash = await reputationContract.write.giveFeedback(
      [BigInt(agentId), BigInt(score), 0, tag, '', '', '', feedbackHash],
      { account: this.account, chain: arcChain },
    )
    await this.publicClient.waitForTransactionReceipt({ hash: txHash })
    return txHash
  }

  async getAgentIdentity(agentId: string) {
    const identityContract = getContract({
      address: IDENTITY_REGISTRY as `0x${string}`,
      abi: IDENTITY_ABI,
      client: this.publicClient,
    })
    const [owner, tokenURI] = await Promise.all([
      identityContract.read.ownerOf([BigInt(agentId)]),
      identityContract.read.tokenURI([BigInt(agentId)]),
    ])
    return { agentId, owner, metadataURI: tokenURI }
  }

  createAgentMetadata(agent: {
    name: string
    description: string
    strategy: string
    skills: string[]
    riskParams: Record<string, unknown>
  }): Record<string, unknown> {
    return {
      name: agent.name,
      description: agent.description,
      image: `https://trivo.xyz/agents/${agent.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      agent_type: 'trading',
      capabilities: agent.skills,
      version: '1.0.0',
      platform: 'trivo',
      chain: 'arc-testnet',
      strategy: agent.strategy,
      risk_params: agent.riskParams,
    }
  }

  uploadMetadata(metadata: Record<string, unknown>): string {
    const jsonString = JSON.stringify(metadata)
    return `data:application/json;base64,${Buffer.from(jsonString).toString('base64')}`
  }
}

export const erc8004Service = new ERC8004Service()
