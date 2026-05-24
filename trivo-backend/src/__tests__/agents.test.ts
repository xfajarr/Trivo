import { beforeEach, describe, expect, it, vi } from 'vitest'

const insertValues = vi.fn().mockResolvedValue(undefined)
const updateSet = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))
const selectWhere = vi.fn().mockResolvedValue([
  {
    id: 'agent-1',
    ownerId: 'user-1',
    name: 'Test Agent',
    handle: 'test-agent',
    status: 'active',
    circleWalletId: 'wallet-1',
    circleWalletAddress: '0xabc',
  },
])

vi.mock('../lib/db', () => ({
  db: {
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: selectWhere })) })),
  },
}))

const registerAgent = vi.fn()
const createAgentWallet = vi.fn()

vi.mock('../engine/services/erc8004.service.js', () => ({
  erc8004Service: {
    createAgentMetadata: vi.fn(() => ({ name: 'Test Agent' })),
    uploadMetadata: vi.fn(() => 'data:application/json;base64,eyJuYW1lIjoiVGVzdCJ9'),
    registerAgent,
  },
}))

vi.mock('../services/wallet.service.js', () => ({
  createAgentWallet,
}))

vi.mock('../middleware/auth', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authMiddleware: async (c: any, next: any) => {
    c.set('userId', 'user-1')
    await next()
  },
}))

describe('agent creation provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertValues.mockResolvedValue(undefined)
    updateSet.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    selectWhere.mockResolvedValue([
      {
        id: 'agent-1',
        ownerId: 'user-1',
        name: 'Test Agent',
        handle: 'test-agent',
        status: 'active',
        circleWalletId: 'wallet-1',
        circleWalletAddress: '0xabc',
      },
    ])
    createAgentWallet.mockResolvedValue({ walletId: 'wallet-1', walletAddress: '0xabc' })
  })

  it('creates a Circle wallet when ERC-8004 registration succeeds', async () => {
    registerAgent.mockResolvedValue({ agentId: '123', txHash: '0xerc' })
    const { agentRoutes } = await import('../routes/agents')

    const res = await agentRoutes.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({
        name: 'Test Agent',
        handle: 'test-agent',
        modelProvider: 'asi1-mini',
        strategy: 'Trade BTC momentum',
        skills: 'perp',
      }),
    })

    expect(res.status).toBe(201)
    expect(registerAgent).toHaveBeenCalledTimes(1)
    expect(createAgentWallet).toHaveBeenCalledTimes(1)
    expect(createAgentWallet).toHaveBeenCalledWith('Test Agent')
  })

  it('still creates a Circle wallet when ERC-8004 registration fails', async () => {
    registerAgent.mockRejectedValue(new Error('registry unavailable'))
    const { agentRoutes } = await import('../routes/agents')

    const res = await agentRoutes.request('/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer test' },
      body: JSON.stringify({
        name: 'Test Agent',
        handle: 'test-agent',
        modelProvider: 'asi1-mini',
        strategy: 'Trade BTC momentum',
        skills: 'perp',
      }),
    })

    expect(res.status).toBe(201)
    expect(registerAgent).toHaveBeenCalledTimes(1)
    expect(createAgentWallet).toHaveBeenCalledTimes(1)
    expect(createAgentWallet).toHaveBeenCalledWith('Test Agent')
  })
})
