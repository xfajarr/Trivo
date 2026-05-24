import { ToolHandler } from './registry'
import {
  reportPositionOnChain,
  getPrice,
  mockPerpOpenPosition,
  mockPolymarketBuyOutcome,
  mockLpAddLiquidity,
} from '../contract.service'

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
      try {
        entryPrice = await getPrice(pair)
      } catch {
        /* use default */
      }

      // Try venue contract call (non-blocking)
      try {
        if (venue === 'perp') {
          const isLong = side === 'LONG' || side === 'BUY'
          const r = await mockPerpOpenPosition(pair, isLong, size, leverage)
          txHash = r.transactionHash
        } else if (venue === 'prediction') {
          const isYes = side === 'YES'
          const r = await mockPolymarketBuyOutcome(1, isYes, size)
          txHash = r.transactionHash
        } else if (venue === 'lp') {
          const poolId = market.includes('ETH') ? 1 : 2
          const r = await mockLpAddLiquidity(poolId, -1000, 1000, size)
          txHash = r.transactionHash
        }
      } catch {
        /* contract call failed — use sim data */
      }

      // Try CopyTrading report (non-blocking)
      try {
        const copyTradingAgentId = parseInt(agentId.replace(/\D/g, '').slice(0, 5)) || 1
        const r = await reportPositionOnChain(copyTradingAgentId, venue, market, side, size, entryPrice, leverage)
        txHash = r.txHash || txHash
      } catch {
        /* copy trading report failed — using venue tx */
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
    } catch (err) {
      return { success: false, error: String(err) }
    }
  },
}
