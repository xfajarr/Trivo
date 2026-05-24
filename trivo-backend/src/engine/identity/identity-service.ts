// engine/identity/identity-service.ts
// Phase 6: Agent Identity - ERC-8004 on-chain identity verification via viem

import { createPublicClient, http, createWalletClient, type Address, type Hash } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const ARC_CHAIN_ID = 5042002
const ARC_RPC_URL = process.env.ARC_RPC_URL || 'https://rpc.testnet.arc-node.thecanteenapp.com/v1/e9d01712d1695a3ffd129275186caf9f'

// ERC-8004 minimal ABI for identity token
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

export interface IdentityVerification {
  tokenId: string
  owner: Address
  tokenURI: string
  verified: boolean
}

export class IdentityService {
  private publicClient = createPublicClient({
    transport: http(ARC_RPC_URL),
  })

  /**
   * Verify an ERC-8004 identity token
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

      return {
        tokenId: tokenId.toString(),
        owner,
        tokenURI,
        verified: true,
      }
    } catch (error) {
      return {
        tokenId: tokenId.toString(),
        owner: '0x0000000000000000000000000000000000000000' as Address,
        tokenURI: '',
        verified: false,
      }
    }
  }

  /**
   * Check if an address owns tokens
   */
  async getBalance(contractAddress: Address, owner: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: contractAddress,
      abi: ERC8004_ABI,
      functionName: 'balanceOf',
      args: [owner],
    })
  }
}

// Singleton
export const identityService = new IdentityService()
