import WebSocket from 'ws'

// Real-time price data from WebSocket
interface PriceData {
  [token: string]: { indexPrice: number; timestamp: number }
}

interface MarketData {
  marketId: number
  fundingRate: number
  isBlocked: boolean
  longOI: number
  shortOI: number
  skewness: number
  minLeverage: number
  maxLeverage: number
}

// In-memory state
let latestPrices: PriceData = {}
let latestMarketData: MarketData[] = []
let priceWs: WebSocket | null = null
let marketWs: WebSocket | null = null
let isConnected = false

export function startRealtimePriceFeed(): void {
  console.log('📡 Starting real-time price feed...')

  // Price WebSocket
  priceWs = new WebSocket('wss://data-api.speedtrading.pandora.fun/ws/?EIO=4&transport=websocket', {
    headers: { Origin: 'https://trivo.xyz', 'User-Agent': 'Trivo/1.0' }
  })

  priceWs.on('open', () => { console.log('✅ Price WS connected'); priceWs!.send('40') })
  priceWs.on('message', (data: WebSocket.Data) => {
    const msg = data.toString()
    if (msg === '40' || msg.startsWith('40{')) {
      priceWs!.send('42' + JSON.stringify(['subscribe', '{"method":"ezmodePriceInfo"}']))
      return
    }
    try {
      const parsed = JSON.parse(msg.slice(2)) // Remove "42" prefix
      if (parsed[0] === 'message' && parsed[1]?.event === 'ezmodePriceInfo') {
        latestPrices = parsed[1].data || {}
      }
    } catch { /* ignore */ }
  })
  priceWs.on('error', (e: Error) => console.warn('⚠️ Price WS:', e.message))
  priceWs.on('close', () => { console.log('Price WS closed — reconnecting...'); setTimeout(startRealtimePriceFeed, 5000) })

  // Market Data WebSocket  
  marketWs = new WebSocket('wss://ws-api.speedtrading.pandora.fun/ws/?EIO=4&transport=websocket', {
    headers: { Origin: 'https://trivo.xyz', 'User-Agent': 'Trivo/1.0' }
  })

  marketWs.on('open', () => { console.log('✅ Market WS connected'); marketWs!.send('40') })
  marketWs.on('message', (data: WebSocket.Data) => {
    const msg = data.toString()
    if (msg === '40' || msg.startsWith('40{')) {
      marketWs!.send('42' + JSON.stringify(['subscribe', { method: 'market', params: ['all', 2741] }]))
      return
    }
    try {
      const parsed = JSON.parse(msg.slice(2))
      if (parsed[0] === 'message' && parsed[1]?.event === 'moonMarketStatus') {
        latestMarketData = parsed[1].status || []
      }
    } catch { /* ignore */ }
  })
  marketWs.on('error', (e: Error) => console.warn('⚠️ Market WS:', e.message))
  marketWs.on('close', () => { console.log('Market WS closed — reconnecting...'); setTimeout(startRealtimePriceFeed, 5000) })

  isConnected = true
}

export function stopRealtimePriceFeed(): void {
  priceWs?.close()
  marketWs?.close()
  isConnected = false
}

// Get latest price for a token
export function getRealtimePrice(token: string): number {
  const upper = token.toUpperCase().replace('/USD', '')
  return latestPrices[upper]?.indexPrice || 0
}

// Get all latest prices
export function getAllRealtimePrices(): PriceData {
  return latestPrices
}

// Get market data (funding rate, OI, etc.)
export function getMarketData(): MarketData[] {
  return latestMarketData
}

// Check if connected
export function isRealtimeConnected(): boolean {
  return isConnected
}

// Get funding rate for a specific market
export function getFundingRate(marketId: number): number {
  return latestMarketData.find(m => m.marketId === marketId)?.fundingRate || 0
}
