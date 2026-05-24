import WebSocket from 'ws'

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

let latestPrices: PriceData = {}
let latestMarketData: MarketData[] = []
let isConnecting = false
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function startRealtimePriceFeed(): void {
  if (isConnecting) return // Prevent duplicate connections
  isConnecting = true
  console.log('📡 Starting real-time price feed...')

  // Price WebSocket
  const priceWs = new WebSocket('wss://data-api.speedtrading.pandora.fun/ws/?EIO=4&transport=websocket', {
    headers: { Origin: 'https://trivo.xyz', 'User-Agent': 'Trivo/1.0' },
  })

  priceWs.on('open', () => {
    console.log('✅ Price WS connected')
    if (priceWs.readyState === WebSocket.OPEN) priceWs.send('40')
  })

  priceWs.on('message', (data: WebSocket.Data) => {
    const msg = data.toString()
    if (msg === '40' || msg.startsWith('40{')) {
      if (priceWs.readyState === WebSocket.OPEN) {
        priceWs.send('42' + JSON.stringify(['subscribe', '{"method":"ezmodePriceInfo"}']))
      }
      return
    }
    try {
      const parsed = JSON.parse(msg.slice(2))
      if (parsed[0] === 'message' && parsed[1]?.event === 'ezmodePriceInfo') {
        latestPrices = parsed[1].data || {}
      }
    } catch {
      /* ignore */
    }
  })

  priceWs.on('error', (e: Error) => console.warn('⚠️ Price WS:', e.message))
  priceWs.on('close', () => {
    console.log('Price WS closed — reconnecting in 5s...')
    isConnecting = false
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(startRealtimePriceFeed, 5000)
  })

  // Market WebSocket
  setTimeout(() => {
    const marketWs = new WebSocket('wss://ws-api.speedtrading.pandora.fun/ws/?EIO=4&transport=websocket', {
      headers: { Origin: 'https://trivo.xyz', 'User-Agent': 'Trivo/1.0' },
    })

    marketWs.on('open', () => {
      console.log('✅ Market WS connected')
      if (marketWs.readyState === WebSocket.OPEN) marketWs.send('40')
    })

    marketWs.on('message', (data: WebSocket.Data) => {
      const msg = data.toString()
      if (msg === '40' || msg.startsWith('40{')) {
        if (marketWs.readyState === WebSocket.OPEN) {
          marketWs.send('42' + JSON.stringify(['subscribe', { method: 'market', params: ['all', 2741] }]))
        }
        return
      }
      try {
        const parsed = JSON.parse(msg.slice(2))
        if (parsed[0] === 'message' && parsed[1]?.event === 'moonMarketStatus') {
          latestMarketData = parsed[1].status || []
        }
      } catch {
        /* ignore */
      }
    })

    marketWs.on('error', (e: Error) => console.warn('⚠️ Market WS:', e.message))
    marketWs.on('close', () => console.log('Market WS closed'))
  }, 2000) // Stagger market WS connection
}

export function getRealtimePrice(token: string): number {
  const upper = token.toUpperCase().replace('/USD', '')
  return latestPrices[upper]?.indexPrice || 0
}

export function getAllRealtimePrices(): PriceData {
  return latestPrices
}
export function getMarketData(): MarketData[] {
  return latestMarketData
}
export function getFundingRate(marketId: number): number {
  return latestMarketData.find((m) => m.marketId === marketId)?.fundingRate || 0
}
