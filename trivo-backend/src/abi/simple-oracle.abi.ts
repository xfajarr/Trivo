export const SimpleOracleABI = [
  {
    type: 'function' as const,
    name: 'updatePrice',
    inputs: [
      { name: 'pair', type: 'bytes32' },
      { name: 'price', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'getPrice',
    inputs: [{ name: 'pair', type: 'bytes32' }],
    outputs: [
      { name: 'price', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'getMultiplePrices',
    inputs: [{ name: 'pairs', type: 'bytes32[]' }],
    outputs: [{ name: 'prices', type: 'uint256[]' }],
    stateMutability: 'view' as const,
  },
  {
    type: 'error' as const,
    name: 'PriceStale',
    inputs: [],
  },
  {
    type: 'error' as const,
    name: 'ZeroPrice',
    inputs: [],
  },
  {
    type: 'error' as const,
    name: 'NotAuthorized',
    inputs: [],
  },
] as const
