import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'
import { config } from '../config'
import { getUsdcBalance } from './contract.service'

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
    const response = await c.createWalletSet({ name: 'Trivo Agents' })
    _walletSetId = response.data?.walletSet?.id ?? null
    if (_walletSetId) return _walletSetId
  } catch {
    // Wallet set may already exist — use a deterministic ID
    _walletSetId = 'trivo-agents-wallet-set'
    return _walletSetId
  }

  throw new Error('Failed to create wallet set')
}

/**
 * Create a wallet for an agent on Arc Testnet
 */
export async function createAgentWallet(_agentName: string): Promise<{ walletId: string; walletAddress: string }> {
  const c = getClient()
  const setId = await getWalletSetId()

  const response = await c.createWallets({
    accountType: 'SCA',
    blockchains: ['ARC-TESTNET'],
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
 * Check USDC balance on Arc for a wallet address.
 * Uses ERC-20 balanceOf (6 decimals) — NOT native getBalance.
 */
export async function getWalletBalance(walletAddress: string): Promise<number> {
  try {
    const bal = await getUsdcBalance(walletAddress)
    return parseFloat(bal)
  } catch {
    return 0
  }
}

/**
 * Send USDC from an agent's Circle dev-controlled wallet to any address.
 * Uses Circle SDK's createTransaction (v10 API).
 */
export async function sendFromAgentWallet(
  walletId: string,
  destinationAddress: string,
  amount: string,
): Promise<{ txHash: string; transactionId: string }> {
  const c = getClient()

  // USDC token address on Arc Testnet
  const tokenAddress = '0x3600000000000000000000000000000000000000'

  const response = await (c as unknown as { createTransaction: (args: Record<string, unknown>) => Promise<unknown> }).createTransaction({
    walletId,
    tokenAddress,
    blockchain: 'ARC-TESTNET',
    amounts: [amount],
    destinationAddress,
    feeLevel: 'MEDIUM',
  })

  const data = (response as unknown as { data?: { id?: string } }).data
  if (!data) throw new Error('Transfer transaction creation failed')

  return {
    txHash: data.id ?? 'pending',
    transactionId: data.id ?? '',
  }
}
