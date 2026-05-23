import { updatePrice, mockPolymarketCreateMarket, mockLpCreatePool, mockLpSimulateFeeAccrual } from './contract.service'

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
        await updatePrice(pair, price)
        const shortPair = pair.split('-')[0] ?? pair
        console.log(
          `📊 ${shortPair} → $${price} (🔗 https://testnet.arcscan.app/tx/latest)`,
        )
      } catch (err) {
        console.error(`❌ Failed to push ${pair}:`, err)
      }
    }

    // Initialize LP pools on first run
    if (!lpPoolInitialized) {
      try {
        const r1 = await mockLpCreatePool("0x01", "0x02", 500, 0)
        await mockLpCreatePool("0x03", "0x01", 3000, 0)
        lpPoolInitialized = true
        console.log(`💧 LP pools created (🔗 https://testnet.arcscan.app/tx/${r1.transactionHash})`)
      } catch { /* pool may already exist */ }
    }

    // Polymarket 5m prediction — every 5 minutes
    if (!polymarketInitialized || Math.floor(Date.now() / 300000) % 3 === 0) {
      await initializePolymarketMarkets(prices)
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
