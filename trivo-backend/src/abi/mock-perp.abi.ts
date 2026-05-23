export const MockPerpABI = [
  {
    type: 'function' as const,
    name: 'openPosition',
    inputs: [
      { name: 'pair', type: 'bytes32' },
      { name: 'isLong', type: 'bool' },
      { name: 'size', type: 'uint256' },
      { name: 'leverage', type: 'uint256' },
    ],
    outputs: [{ name: 'positionId', type: 'uint256' }],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'closePosition',
    inputs: [
      { name: 'positionId', type: 'uint256' },
      { name: 'exitPrice', type: 'uint256' },
    ],
    outputs: [{ name: 'pnl', type: 'int256' }],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'getPosition',
    inputs: [{ name: 'positionId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'trader', type: 'address' },
          { name: 'pair', type: 'bytes32' },
          { name: 'isLong', type: 'bool' },
          { name: 'size', type: 'uint256' },
          { name: 'leverage', type: 'uint256' },
          { name: 'entryPrice', type: 'uint256' },
          { name: 'open', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'addMargin',
    inputs: [
      { name: 'positionId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'error' as const,
    name: 'PositionNotFound',
    inputs: [],
  },
  {
    type: 'error' as const,
    name: 'PositionAlreadyClosed',
    inputs: [],
  },
  {
    type: 'error' as const,
    name: 'InsufficientMargin',
    inputs: [],
  },
] as const
