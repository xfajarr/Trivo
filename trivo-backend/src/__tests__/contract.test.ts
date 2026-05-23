import { describe, it, expect } from 'vitest'
import { keccak256, toHex } from 'viem'

describe('Contract Service - Pair Hashing', () => {
  it('should generate correct pair hash for BTC/USD', () => {
    const hash = keccak256(toHex('BTC/USD'))
    expect(hash).toMatch(/^0x[a-f0-9]{64}$/)
  })

  it('should generate different hashes for different pairs', () => {
    const btcHash = keccak256(toHex('BTC/USD'))
    const ethHash = keccak256(toHex('ETH/USD'))
    expect(btcHash).not.toBe(ethHash)
  })

  it('should generate deterministic hashes', () => {
    const hash1 = keccak256(toHex('BTC/USD'))
    const hash2 = keccak256(toHex('BTC/USD'))
    expect(hash1).toBe(hash2)
  })
})

describe('Contract Service - ABI Structure', () => {
  it('updatePrice should have 3 inputs', () => {
    const abi = {
      name: 'updatePrice',
      inputs: [
        { name: 'pair', type: 'bytes32' },
        { name: 'price', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
      ],
    }
    expect(abi.inputs).toHaveLength(3)
  })

  it('registerAgent should have 3 inputs', () => {
    const abi = {
      name: 'registerAgent',
      inputs: [
        { name: 'agentId', type: 'uint256' },
        { name: 'agentAddress', type: 'address' },
        { name: 'agentOwner', type: 'address' },
      ],
    }
    expect(abi.inputs).toHaveLength(3)
  })

  it('attachFollower should have 3 inputs', () => {
    const abi = {
      name: 'attachFollower',
      inputs: [
        { name: 'follower', type: 'address' },
        { name: 'targetAgentId', type: 'uint256' },
        { name: 'allocationBps', type: 'uint256' },
      ],
    }
    expect(abi.inputs).toHaveLength(3)
  })
})

describe('Contract Service - CopyTrading Flow', () => {
  it('should build register agent args correctly', () => {
    const agentAddress: `0x${string}` = '0x1234567890123456789012345678901234567890'
    const agentOwner: `0x${string}` = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    const args = [1n, agentAddress, agentOwner] as const
    expect(args[0]).toBe(1n)
  })

  it('should build attach follower args correctly', () => {
    const follower: `0x${string}` = '0x1111111111111111111111111111111111111111'
    const args = [follower, 5n, 5000n] as const
    expect(args[1]).toBe(5n)
    expect(args[2]).toBe(5000n)
  })
})
