import { config } from '../config'
import { publicClient } from './contract.service'

/**
 * Simple non-custodial wallet service
 * Agent wallets = user-controlled. Backend doesn't hold private keys.
 * User transfers USDC directly to agent wallet address.
 */

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

const USDC_ABI = [
  {
    type: 'function' as const,
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' as const,
  },
]

export async function getWalletBalance(walletAddress: string): Promise<number> {
  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`],
    }) as bigint

    // USDC on Arc has 18 decimals (native)
    return Number(balance) / 1e18
  } catch {
    return 0
  }
}

export function generateDepositAddress(agentId: string): string {
  // In production: create Circle Agent Wallet
  // For MVP: user deposits to their own wallet, agent reads balance
  return '(use your connected wallet)'
}
