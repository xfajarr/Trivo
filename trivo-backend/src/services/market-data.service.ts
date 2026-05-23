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
        const result = await updatePrice(pair, price)
        console.log(`📊 ${pair} → $${price} (🔗 https://testnet.arcscan.app/tx/${result.transactionHash})`)

        // Initialize LP pools on first run
        if (!lpPoolInitialized && pair === 'ETH/USD') {
          try {
            const r1 = await mockLpCreatePool('0x0000000000000000000000000000000000000001', '0x0000000000000000000000000000000000000002', 500, 79228162514264337593543950336)
          await mockLpCreatePool('0x0000000000000000000000000000000000000003', '0x0000000000000000000000000000000000000001', 3000, 79228162514264337593543950336)
          lpPoolInitialized = true
          console.log(`💧 LP pools created (🔗 https://testnet.arcscan.app/tx/${r1.transactionHash})`)
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
      const r = await mockLpSimulateFeeAccrual(1, 500000)
      console.log(`💧 LP fee accrual simulated (🔗 https://testnet.arcscan.app/tx/${r.transactionHash})`)
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
    
    const result = await mockPolymarketCreateMarket(question)
    polymarketInitialized = true
    console.log(`🎯 Polymarket market created: ${question} (🔗 https://testnet.arcscan.app/tx/${result.transactionHash})`)
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
