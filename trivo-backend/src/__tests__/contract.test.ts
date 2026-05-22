import { describe, it, expect } from 'vitest'
import { keccak256, toHex } from 'viem'

describe('Contract Service - Pair Hashing', () => {
  it('should generate correct pair hash for BTC/USD', () => {
    const pair = 'BTC/USD'
    const hash = keccak256(toHex(pair))
    expect(hash).toBeTypeOf('string')
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

describe('Contract Service - Price Update', () => {
  it('should format price as BigInt correctly', () => {
    const price = 72880.50
    const bigIntPrice = BigInt(Math.floor(price))
    expect(bigIntPrice).toBe(72880n)
  })

  it('should handle zero price edge case', () => {
    const price = 0
    expect(BigInt(Math.floor(price))).toBe(0n)
  })
})

describe('Contract Service - ABI Structure', () => {
  it('should have valid ABI for SimpleOracle updatePrice', () => {
    const abiFunction = {
      type: 'function' as const,
      name: 'updatePrice',
      inputs: [
        { name: 'pair', type: 'bytes32' },
        { name: 'price', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable' as const,
    }

    expect(abiFunction.name).toBe('updatePrice')
    expect(abiFunction.inputs).toHaveLength(3)
    expect(abiFunction.stateMutability).toBe('nonpayable')
  })

  it('should have valid ABI for CopyTrading registerAgent', () => {
    const abiFunction = {
      type: 'function' as const,
      name: 'registerAgent',
      inputs: [
        { name: 'agentId', type: 'uint256' },
        { name: 'agentAddress', type: 'address' },
        { name: 'agentOwner', type: 'address' },
      ],
      outputs: [],
      stateMutability: 'nonpayable' as const,
    }

    expect(abiFunction.inputs).toHaveLength(3)
    expect(abiFunction.inputs[0].type).toBe('uint256')
    expect(abiFunction.inputs[1].type).toBe('address')
    expect(abiFunction.inputs[2].type).toBe('address')
  })
})

describe('Contract Service - CopyTrading Flow', () => {
  it('should correctly build registerAgent args', () => {
    const agentId = 1
    const agentAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const agentOwner = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`

    const args = [BigInt(agentId), agentAddress, agentOwner] as const
    expect(args[0]).toBe(1n)
    expect(args[1]).toBe(agentAddress)
    expect(args[2]).toBe(agentOwner)
  })

  it('should correctly build attachFollower args', () => {
    const follower = '0x1111111111111111111111111111111111111111' as `0x${string}`
    const targetAgentId = 5
    const allocationBps = 5000

    const args = [follower, BigInt(targetAgentId), BigInt(allocationBps)] as const
    expect(args[1]).toBe(5n)
    expect(args[2]).toBe(5000n)
  })
})
