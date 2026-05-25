import {
  updatePrice,
  mockPolymarketCreateMarket,
  mockLpCreatePool,
  mockLpSimulateFeeAccrual,
  getPrice,
} from './contract.service'

interface CoinGeckoPrice {
  bitcoin: { usd: number }
  ethereum: { usd: number }
  solana: { usd: number }
}

let lpPoolInitialized = false
let polymarketInitialized = false

export async function fetchAndPushPrices(): Promise<Record<string, number>> {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd',
    )
    const data = (await response.json()) as CoinGeckoPrice

    const prices: Record<string, number> = {
      'BTC/USD': data.bitcoin.usd,
      'ETH/USD': data.ethereum.usd,
      'SOL/USD': data.solana.usd,
    }

    for (const [pair, price] of Object.entries(prices)) {
      try {
        const shortPair = pair.split('/')[0]
        const receipt = await updatePrice(pair, price)
        console.log(`📊 ${shortPair} → $${price} (🔗 https://testnet.arcscan.app/tx/${receipt?.transactionHash ?? 'pending'})`)
      } catch (err) {
        console.error(`❌ Failed to push ${pair}:`, err)
      }
    }

    // Initialize LP pools on first run
    if (!lpPoolInitialized) {
      try {
        const r1 = await mockLpCreatePool('0x01', '0x02', 500, 0)
        await mockLpCreatePool('0x03', '0x01', 3000, 0)
        lpPoolInitialized = true
        console.log(`💧 LP pools created (🔗 https://testnet.arcscan.app/tx/${r1.transactionHash})`)
      } catch {
        /* pool may already exist */
      }
    }

    // Polymarket 5m prediction — every 5 minutes
    if (!polymarketInitialized || Math.floor(Date.now() / 300000) % 3 === 0) {
      await initializePolymarketMarkets(prices)
    }

    // Simulate LP fee accrual
    try {
      const r = await mockLpSimulateFeeAccrual(1, 500000)
      console.log(`💧 LP fee accrual simulated (🔗 https://testnet.arcscan.app/tx/${r.transactionHash})`)
    } catch {
      /* non-critical */
    }

    return prices
  } catch (err) {
    console.error('❌ Market data fetch failed:', err)
    return {}
  }
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface CandleResult {
  symbol: string
  timeframe: string
  candles: Candle[]
}

const TIMEFRAME_SECONDS: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
}

function symbolSeed(symbol: string): number {
  return [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0)
}

function basePriceForSymbol(symbol: string): number {
  switch (symbol.toUpperCase()) {
    case 'BTC/USD':
      return 72880
    case 'ETH/USD':
      return 3508
    case 'SOL/USD':
      return 211.2
    default:
      return 100
  }
}

export async function getCandles(symbol: string, timeframe: string, limit: number): Promise<CandleResult> {
  const step = TIMEFRAME_SECONDS[timeframe]
  if (!step) throw new Error(`Unsupported timeframe: ${timeframe}`)

  const normalizedLimit = Math.min(Math.max(limit, 10), 500)
  const currentPrice = await getPrice(symbol)
  const anchorPrice = currentPrice > 0 ? currentPrice : basePriceForSymbol(symbol)
  const seed = symbolSeed(symbol) % 97
  const now = Math.floor(Date.now() / 1000)
  const currentBucket = Math.floor(now / step)

  const candles: Candle[] = []

  for (let index = normalizedLimit - 1; index >= 0; index--) {
    const bucket = currentBucket - index
    const phase = bucket + seed
    const drift = Math.sin(phase / 5) * anchorPrice * 0.004
    const trend = ((index - normalizedLimit / 2) / normalizedLimit) * anchorPrice * 0.006
    const open = anchorPrice + drift + trend
    const close = anchorPrice + Math.sin((phase + 1) / 5) * anchorPrice * 0.004 + trend
    const high = Math.max(open, close) * 1.0018
    const low = Math.min(open, close) * 0.9982
    const volume = 100 + Math.abs(Math.sin(phase)) * 250

    candles.push({
      time: bucket * step,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
    })
  }

  return { symbol, timeframe, candles }
}

async function initializePolymarketMarkets(prices: Record<string, number>) {
  try {
    const tokens = [
      { token: 'BTC', price: prices['BTC/USD'] },
      { token: 'ETH', price: prices['ETH/USD'] },
      { token: 'SOL', price: prices['SOL/USD'] },
    ]

    for (const { token, price } of tokens) {
      if (price ?? 0 > 0) {
        const question = `${token}/USD 5m: Up or Down? ($${Math.round(price ?? 0).toLocaleString()})`
        const result = await mockPolymarketCreateMarket(question, 50, 50)
        console.log(`🎯 Polymarket: ${question} (🔗 https://testnet.arcscan.app/tx/${result.transactionHash})`)
      }
    }
    polymarketInitialized = true
  } catch (err) {
    console.error('❌ Failed to create Polymarket market:', err)
  }
}

export async function getSimulatedPrices(): Promise<Record<string, number>> {
  const basePrices = { 'BTC/USD': 72880, 'ETH/USD': 3508, 'SOL/USD': 211.2 }
  const prices: Record<string, number> = {}
  for (const [pair, base] of Object.entries(basePrices)) {
    const change = (Math.random() - 0.5) * 0.02
    prices[pair] = Number((base * (1 + change)).toFixed(2))
  }
  return prices
}
