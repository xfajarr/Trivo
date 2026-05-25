// engine/identity/identity-service.ts
// Phase 6: Agent Identity - ERC-8004 on-chain identity + real wallet signing
// All signatures use the deployer wallet via viem — no deterministic fakes

import { createPublicClient, http, createWalletClient, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { recoverMessageAddress } from 'viem'
import { config } from '../../config.js'
import type { Hex } from 'viem'

const ARC_RPC_URL = config.ARC_RPC_URL

// ERC-8004 ABI — Identity Registry on Arc Testnet
const ERC8004_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const

// ─── Wallet signer for decision signing ──────────────────────────────────────

function getSignerWallet() {
  const pk = config.DEPLOYER_PRIVATE_KEY
  if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set — cannot sign decisions')
  const account = privateKeyToAccount(pk as `0x${string}`)
  return createWalletClient({ account, transport: http(ARC_RPC_URL) })
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IdentityVerification {
  tokenId: string
  owner: Address
  tokenURI: string
  verified: boolean
}

export interface IdentityReport {
  agentId: string
  verified: boolean
  owner: Address | null
  tokenURI: string
  decisionsSigned: number
  lastActivity: number
}

export interface DecisionSignature {
  signature: Hex
  signedAt: number
  signer: Address
}

// ─── IdentityService ─────────────────────────────────────────────────────────

export class IdentityService {
  private publicClient = createPublicClient({
    transport: http(ARC_RPC_URL),
  })

  /**
   * Verify ERC-8004 identity by checking token ownership on-chain.
   */
  async verifyIdentity(contractAddress: Address, tokenId: bigint): Promise<IdentityVerification> {
    try {
      const [owner, tokenURI] = await Promise.all([
        this.publicClient.readContract({
          address: contractAddress,
          abi: ERC8004_ABI,
          functionName: 'ownerOf',
          args: [tokenId],
        }),
        this.publicClient.readContract({
          address: contractAddress,
          abi: ERC8004_ABI,
          functionName: 'tokenURI',
          args: [tokenId],
        }),
      ])
      return { tokenId: tokenId.toString(), owner, tokenURI, verified: true }
    } catch {
      return {
        tokenId: tokenId.toString(),
        owner: '0x0000000000000000000000000000000000000000' as Address,
        tokenURI: '',
        verified: false,
      }
    }
  }

  /**
   * Get ERC-8004 token balance for an owner.
   */
  async getBalance(contractAddress: Address, owner: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: contractAddress,
      abi: ERC8004_ABI,
      functionName: 'balanceOf',
      args: [owner],
    })
  }

  /**
   * Resolve agent address → tokenId by scanning owned tokens.
   */
  async resolveIdentity(agentAddress: Address, contractAddress: Address): Promise<string | null> {
    try {
      const balance = await this.getBalance(contractAddress, agentAddress)
      if (balance === 0n) return null

      for (let i = 1; i <= Number(balance); i++) {
        try {
          const owner = await this.publicClient.readContract({
            address: contractAddress,
            abi: ERC8004_ABI,
            functionName: 'ownerOf',
            args: [BigInt(i)],
          })
          if (owner.toLowerCase() === agentAddress.toLowerCase()) {
            return String(i)
          }
        } catch { continue }
      }
      return null
    } catch { return null }
  }

  /**
   * Sign a decision hash using the deployer wallet (EIP-191).
   * Creates a REAL cryptographic signature verifiable by anyone.
   */
  async signDecision(agentId: string, decisionHash: string): Promise<DecisionSignature> {
    const wallet = getSignerWallet()
    const signedAt = Date.now()

    const message = [
      'TRIVO DECISION SIGNATURE',
      `Agent: ${agentId}`,
      `Decision Hash: ${decisionHash}`,
      `Timestamp: ${signedAt}`,
    ].join('\n')

    const signature = await wallet.signMessage({
      account: wallet.account,
      message,
    })

    return {
      signature,
      signedAt,
      signer: wallet.account.address,
    }
  }

  /**
   * Verify a decision signature using EIP-191 address recovery.
   */
  async verifyDecisionSignature(
    agentId: string,
    decisionHash: string,
    signature: Hex,
    signedAt: number,
  ): Promise<boolean> {
    const message = [
      'TRIVO DECISION SIGNATURE',
      `Agent: ${agentId}`,
      `Decision Hash: ${decisionHash}`,
      `Timestamp: ${signedAt}`,
    ].join('\n')

    try {
      const recovered = await recoverMessageAddress({ message, signature })
      const expected = getSignerWallet().account.address
      return recovered.toLowerCase() === expected.toLowerCase()
    } catch { return false }
  }

  /**
   * Get the deployer wallet address (signer for all agent decisions).
   */
  getSignerAddress(): Address {
    return getSignerWallet().account.address
  }

  /**
   * Build a comprehensive identity report.
   */
  async buildIdentityReport(agentId: string): Promise<IdentityReport> {
    return {
      agentId,
      verified: false,
      owner: null,
      tokenURI: '',
      decisionsSigned: 0,
      lastActivity: Date.now(),
    }
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

export const identityService = new IdentityService()
