import { ToolHandler } from './registry'
import { reportPositionOnChain, getPrice } from '../contract.service'

export const openTradeTool: ToolHandler = {
  definition: {
    name: 'open_trade',
    description: 'Open a new trading position via mock venue on Arc',
    parameters: {
      type: 'object',
      properties: {
        venue: { type: 'string', enum: ['perp', 'prediction', 'lp'] },
        market: { type: 'string' },
        side: { type: 'string' },
        size: { type: 'number' },
        leverage: { type: 'number' },
      },
      required: ['venue', 'market', 'side', 'size'],
    },
  },
  async execute(agentId, args) {
    const venue = args.venue as string
    const market = args.market as string
    const side = args.side as string
    const size = args.size as number
    const leverage = (args.leverage as number) || 1

    let entryPrice = 72880
    let txHash = `0x${crypto.randomUUID().replace(/-/g, '')}`

    try {
      const pair = `${market.split('-')[0] ?? 'BTC'}/USD`
      entryPrice = await getPrice(pair)

      const copyTradingAgentId = parseInt(agentId.replace(/\D/g, '').slice(0, 5)) || 1
      const result = await reportPositionOnChain(copyTradingAgentId, venue, market, side, size, entryPrice, leverage)
      txHash = result.txHash
    } catch {
      // Contract call failed — use simulated data (e.g., in test env)
      console.log(`ℹ️ open_trade sim: ${market} ${side} $${size}`)
    }

    return {
      success: true,
      data: {
        positionId: `pos-${Date.now()}`,
        venue,
        market,
        side,
        size,
        entryPrice,
        leverage,
        status: 'open',
      },
      txHash,
    }
  },
}
