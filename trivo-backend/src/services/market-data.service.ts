import { updatePrice, mockPolymarketCreateMarket, mockLpCreatePool, mockLpSimulateFeeAccrual } from './contract.service'

interface CoinGeckoPrice {
  bitcoin: { usd: number }
  ethereum: { usd: number }
  solana: { usd: number }
}

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd'

let polymarketInitialized = false
let lpPoolInitialized = false

export async function fetchAndPushPrices(): Promise<Record<string, number>> {
  try {
    const res = await fetch(COINGECKO_URL)
    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`)

    const data: CoinGeckoPrice = await res.json()
    const prices = {
      'BTC/USD': data.bitcoin.usd,
      'ETH/USD': data.ethereum.usd,
      'SOL/USD': data.solana.usd,
    }

    for (const [pair, price] of Object.entries(prices)) {
      try {
        await updatePrice(pair, price)
        console.log(`📊 ${pair} → $${price} (on-chain)`)

        // Initialize LP pools on first run
        if (!lpPoolInitialized && pair === 'ETH/USD') {
          try {
            await mockLpCreatePool('ETH/USDC', 500)
            await mockLpCreatePool('WBTC/ETH', 3000)
            lpPoolInitialized = true
            console.log('💧 LP pools created on-chain')
          } catch { /* pool may already exist */ }
        }
      } catch (err) {
        console.error(`❌ Failed to push ${pair}:`, err)
      }
    }

    // Initialize Polymarket markets periodically
    if (!polymarketInitialized || Math.floor(Date.now() / 600000) % 3 === 0) {
      await initializePolymarketMarkets()
    }

    // Simulate LP fee accrual
    try {
      await mockLpSimulateFeeAccrual(1, 500000)
    } catch { /* non-critical */ }

    return prices
  } catch (err) {
    console.error('❌ Market data fetch failed:', err)
    return {}
  }
}

async function initializePolymarketMarkets() {
  try {
    const btcPrice = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
      .then(r => r.json()).then(d => d.bitcoin.usd).catch(() => 72880)

    const targetPrice = Math.round(btcPrice * 1.02) // 2% above current
    const question = `BTC > $${targetPrice} in 1 hour?`
    
    await mockPolymarketCreateMarket(question, 45, 55)
    polymarketInitialized = true
    console.log(`🎯 Polymarket market created: ${question}`)
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
