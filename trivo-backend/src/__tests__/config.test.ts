import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('Config', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset env for each test
    process.env = { ...originalEnv }
    process.env.PRIVY_APP_ID = 'test-app-id'
    process.env.PRIVY_APP_SECRET = 'test-secret'
    process.env.ARC_RPC_URL = 'https://rpc.testnet.arc-node.thecanteenapp.com/v1/test'
    process.env.SIMPLE_ORACLE = '0x0000000000000000000000000000000000000001'
    process.env.COPY_TRADING = '0x0000000000000000000000000000000000000002'
    process.env.MOCK_PERP = '0x0000000000000000000000000000000000000003'
    process.env.MOCK_POLYMARKET = '0x0000000000000000000000000000000000000004'
    process.env.MOCK_LPV3 = '0x0000000000000000000000000000000000000005'
    process.env.FEE_MANAGER = '0x0000000000000000000000000000000000000006'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should load config with all required fields', async () => {
    const { config } = await import('../config')
    expect(config.PORT).toBe('3000')
    expect(config.PRIVY_APP_ID).toBe('test-app-id')
    expect(config.ARC_CHAIN_ID).toBe('5042002')
  })

  it('should have valid contract addresses', async () => {
    const { config } = await import('../config')
    expect(config.SIMPLE_ORACLE).toMatch(/^0x[a-f0-9]{40}$/i)
    expect(config.COPY_TRADING).toMatch(/^0x[a-f0-9]{40}$/i)
  })
})
