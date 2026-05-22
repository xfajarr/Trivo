import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { config } from '../config'
import { publicClient } from './contract.service'

let client: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null

function getClient() {
  if (!client) {
    const apiKey = config.CIRCLE_API_KEY
    const entitySecret = config.CIRCLE_ENTITY_SECRET
    if (!apiKey || !entitySecret) {
      throw new Error('Circle API not configured')
    }
    client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret })
  }
  return client
}

let _walletSetId: string | null = null

/**
 * Get or create the Trivo wallet set.
 * Creates once, then reuses the ID.
 */
async function getWalletSetId(): Promise<string> {
  if (_walletSetId) return _walletSetId

  const c = getClient()
  try {
    const response = await c.createWalletSet({ name: "Trivo Agents" })
    _walletSetId = response.data?.walletSet?.id ?? null
    if (_walletSetId) return _walletSetId
  } catch {
    // Wallet set may already exist — use a deterministic ID
    _walletSetId = "trivo-agents-wallet-set"
    return _walletSetId
  }

  throw new Error('Failed to create wallet set')
}

/**
 * Create a wallet for an agent on Arc Testnet
 */
export async function createAgentWallet(agentName: string): Promise<{ walletId: string; walletAddress: string }> {
  const c = getClient()
  const setId = await getWalletSetId()

  const response = await c.createWallets({
    accountType: "SCA",
    blockchains: ["ARC-TESTNET"],
    count: 1,
    walletSetId: setId,
  })

  const wallet = response.data?.wallets?.[0]
  if (!wallet) throw new Error('Failed to create wallet')

  const walletId = wallet.id ?? ''
  const walletAddress = wallet.address ?? ''
  if (!walletId || !walletAddress) throw new Error('Incomplete wallet data')

  return { walletId, walletAddress }
}

/**
 * Check USDC balance on Arc for a wallet address
 */
export async function getWalletBalance(walletAddress: string): Promise<number> {
  try {
    const balance = await publicClient.getBalance({
      address: walletAddress as `0x${string}`,
    })
    return Number(balance) / 1e18
  } catch {
    return 0
  }
}
