export const MockPolymarketABI = [
  {
    type: 'function' as const,
    name: 'createMarket',
    inputs: [
      { name: 'question', type: 'string' },
      { name: 'endTime', type: 'uint256' },
    ],
    outputs: [{ name: 'marketId', type: 'uint256' }],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'buyOutcome',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'isYes', type: 'bool' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'resolveMarket',
    inputs: [
      { name: 'marketId', type: 'uint256' },
      { name: 'outcome', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'claimwinnings',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'getMarket',
    inputs: [{ name: 'marketId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'question', type: 'string' },
          { name: 'endTime', type: 'uint256' },
          { name: 'resolved', type: 'bool' },
          { name: 'outcome', type: 'bool' },
          { name: 'yesPool', type: 'uint256' },
          { name: 'noPool', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view' as const,
  },
  {
    type: 'error' as const,
    name: 'MarketNotFound',
    inputs: [],
  },
  {
    type: 'error' as const,
    name: 'MarketAlreadyResolved',
    inputs: [],
  },
  {
    type: 'error' as const,
    name: 'MarketNotResolved',
    inputs: [],
  },
] as const
