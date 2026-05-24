export interface BacktestConfig {
  agentId: string
  initialCapital: number
  startDate: string
  endDate: string
  strategy: string
}

export interface BacktestResult {
  totalTrades: number
  winRate: number
  totalPnl: number
  sharpeRatio: number
  maxDrawdown: number
  trades: BacktestTrade[]
}

export interface BacktestTrade {
  timestamp: string
  action: string
  market: string
  side: string
  size: number
  entryPrice: number
  exitPrice: number
  pnl: number
}

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  // TODO: Historical price data replay
  // For now, return simulated results
  const simulatedTrades: BacktestTrade[] = Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 86400000).toISOString(),
    action: i % 2 === 0 ? 'BUY' : 'SELL',
    market: 'BTC-PERP',
    side: i % 3 === 0 ? 'LONG' : 'SHORT',
    size: 1000 + Math.random() * 4000,
    entryPrice: 70000 + Math.random() * 5000,
    exitPrice: 70000 + Math.random() * 5000,
    pnl: (Math.random() - 0.4) * 500,
  }))

  const winningTrades = simulatedTrades.filter((t) => t.pnl > 0)
  const totalPnl = simulatedTrades.reduce((s, t) => s + t.pnl, 0)
  const returns = simulatedTrades.map((t) => t.pnl / config.initialCapital)
  const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length
  const stdDev = Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length)
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(365) : 0

  let peak = config.initialCapital
  let maxDrawdown = 0
  let balance = config.initialCapital
  for (const t of simulatedTrades) {
    balance += t.pnl
    if (balance > peak) peak = balance
    const dd = (peak - balance) / peak
    if (dd > maxDrawdown) maxDrawdown = dd
  }

  return {
    totalTrades: simulatedTrades.length,
    winRate: (winningTrades.length / simulatedTrades.length) * 100,
    totalPnl,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
    trades: simulatedTrades,
  }
}
