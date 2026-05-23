import { getPrice } from '../../services/contract.service.js'
import type { EngineTool } from './registry.js'

export const getPriceTool: EngineTool = {
  schema: {
    name: 'get_price',
    description: 'Get current price of a trading pair from the on-chain oracle. Use this to check prices before making trading decisions.',
    input_schema: {
      type: 'object',
      properties: {
        pair: {
          type: 'string',
          description: 'Trading pair (e.g., "BTC/USD", "ETH/USD", "SOL/USD")',
        },
      },
      required: ['pair'],
    },
  },
  async execute(args) {
    const price = await getPrice(args.pair as string)
    return { pair: args.pair, price, timestamp: Date.now() }
  },
}
