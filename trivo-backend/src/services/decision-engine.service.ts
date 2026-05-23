import { getTool } from './tools'
import type { ToolResult } from './tools'
export interface TradeDecision {
  shouldTrade: boolean
  tool?: string
  args?: Record<string, unknown>
  reasoning: string
  confidence: number // 0-1
}

interface AgentContext {
  id: string
  name: string
  strategy: string | null
  modelProvider: string | null
  memory: { type: string | null; content: string | null; reasoning: string | null }[]
}

interface MarketContext {
  prices: Record<string, number>
}

/**
 * Main decision engine: given agent context + market data, decide what to do.
 * In production, this calls the AI model. For MVP, uses rule-based logic.
 */
export async function decide(
  agent: AgentContext,
  market: MarketContext
): Promise<TradeDecision> {
  const btcPrice = market.prices['BTC/USD'] ?? 0
  const ethPrice = market.prices['ETH/USD'] ?? 0

  // Demo rule-based strategy for hackathon
  // Cycles through different behaviors to generate varied feed activity

  // Every ~3 cycles, open a trade
  const cycleKey = Math.floor(Date.now() / 30000) // changes every 30s
  const cycleMod = cycleKey % 5

  if (cycleMod === 0) {
    // Open a perp trade
    const isLong = cycleKey % 7 < 4 // 4/7 chance long
    return {
      shouldTrade: true,
      tool: 'open_trade',
      args: {
        venue: 'perp',
        market: 'BTC-PERP',
        side: isLong ? 'LONG' : 'SHORT',
        size: 1000 + (cycleKey % 5) * 1000,
        leverage: 3,
      },
      reasoning: `BTC at $${btcPrice}, momentum looks ${isLong ? 'bullish' : 'bearish'} based on recent price action`,
      confidence: 0.65 + Math.random() * 0.2,
    }
  }

  if (cycleMod === 1) {
    // Get price observation
    return {
      shouldTrade: false,
      tool: 'get_price',
      args: { pair: 'BTC/USD' },
      reasoning: `Checking BTC price before next decision. Current: $${btcPrice}`,
      confidence: 0.9,
    }
  }

  if (cycleMod === 2) {
    // Prediction market trade
    return {
      shouldTrade: true,
      tool: 'open_trade',
      args: {
        venue: 'prediction',
        market: 'BTC > $75k by tomorrow?',
        side: Math.random() > 0.5 ? 'YES' : 'NO',
        size: 500,
      },
      reasoning: `BTC volatility suggests ${Math.random() > 0.5 ? 'upward' : 'downward'} movement`,
      confidence: 0.55,
    }
  }

  if (cycleMod === 3) {
    // LP add
    return {
      shouldTrade: true,
      tool: 'open_trade',
      args: {
        venue: 'lp',
        market: 'ETH/USDC',
        side: 'ADD',
        size: 5000,
      },
      reasoning: `Providing ETH/USDC liquidity to earn fees. ETH at $${ethPrice}`,
      confidence: 0.7,
    }
  }

  // Skip this cycle
  return {
    shouldTrade: false,
    reasoning: `Analyzing market conditions. BTC: $${btcPrice}, ETH: $${ethPrice}. Waiting for clear signal.`,
    confidence: 0.3,
  }
}

/**
 * Execute a tool call from a decision
 */
export async function executeDecision(
  agentId: string,
  decision: TradeDecision
): Promise<ToolResult | null> {
  if (!decision.shouldTrade || !decision.tool) return null

  const tool = getTool(decision.tool)
  if (!tool) {
    return { success: false, error: `Unknown tool: ${decision.tool}` }
  }

  return tool.execute(agentId, decision.args ?? {})
}
