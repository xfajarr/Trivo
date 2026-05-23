export const MockLPV3ABI = [
  {
    type: 'function' as const,
    name: 'createPool',
    inputs: [
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'sqrtPriceX96', type: 'uint160' },
    ],
    outputs: [{ name: 'poolId', type: 'uint256' }],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'addLiquidity',
    inputs: [
      { name: 'poolId', type: 'uint256' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'liquidity', type: 'uint256' }],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'removeLiquidity',
    inputs: [
      { name: 'poolId', type: 'uint256' },
      { name: 'liquidity', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'collectFees',
    inputs: [{ name: 'poolId', type: 'uint256' }],
    outputs: [
      { name: 'fees0', type: 'uint256' },
      { name: 'fees1', type: 'uint256' },
    ],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'simulateFeeAccrual',
    inputs: [
      { name: 'poolId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'getPool',
    inputs: [{ name: 'poolId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceX96', type: 'uint160' },
          { name: 'liquidity', type: 'uint256' },
          { name: 'fees0', type: 'uint256' },
          { name: 'fees1', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view' as const,
  },
  {
    type: 'error' as const,
    name: 'PoolNotFound',
    inputs: [],
  },
  {
    type: 'error' as const,
    name: 'InsufficientLiquidity',
    inputs: [],
  },
] as const
