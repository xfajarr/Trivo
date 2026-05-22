import { updatePrice } from './contract.service'

interface CoinGeckoPrice {
  bitcoin: { usd: number }
  ethereum: { usd: number }
  solana: { usd: number }
}

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd'

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
        console.log(`📊 ${pair} → $${price}`)
      } catch (err) {
        console.error(`❌ Failed to push ${pair}:`, err)
      }
    }

    return prices
  } catch (err) {
    console.error('❌ Market data fetch failed:', err)
    return {}
  }
}

export async function getSimulatedPrices(): Promise<Record<string, number>> {
  // Fallback: generate random walk prices if CoinGecko fails
  const basePrices = { 'BTC/USD': 72880, 'ETH/USD': 3508, 'SOL/USD': 211.2 }
  const prices: Record<string, number> = {}

  for (const [pair, base] of Object.entries(basePrices)) {
    const change = (Math.random() - 0.5) * 0.02 // ±1%
    prices[pair] = Number((base * (1 + change)).toFixed(2))
  }

  return prices
}
