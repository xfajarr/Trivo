import { ToolHandler } from './registry'
import { getPrice } from '../contract.service'

export const getPriceTool: ToolHandler = {
  definition: {
    name: 'get_price',
    description: 'Get current price for a trading pair',
    parameters: {
      type: 'object',
      properties: {
        pair: { type: 'string', enum: ['BTC/USD', 'ETH/USD', 'SOL/USD'] },
      },
      required: ['pair'],
    },
  },
  async execute(_agentId, args) {
    try {
      const pair = args.pair as string
      const price = await getPrice(pair)
      return { success: true, data: { pair, price } }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}
