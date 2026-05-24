import WebSocket from 'ws'

console.log('🔌 Testing Price WS with correct format...\n')

const ws = new WebSocket('wss://data-api.speedtrading.pandora.fun/ws/?EIO=4&transport=websocket', {
  headers: {
    'Origin': 'https://moverace.vercel.app',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
})

ws.on('open', () => {
  console.log('✅ Connected')
  ws.send('40')
})

ws.on('message', (data) => {
  const msg = data.toString().slice(0, 400)
  console.log('📩', msg)
  
  if (msg === '40' || msg.startsWith('40{')) {
    console.log('   → Sending subscribe (STRING format)...')
    // KEY FIX: subscribe data as JSON STRING, not object
    ws.send('42' + JSON.stringify(['subscribe', '{"method":"ezmodePriceInfo"}']))
  }
  
  if (msg.startsWith('42') && msg.length > 10) {
    console.log('✅ Price data received!')
  }
})

ws.on('error', (e) => console.log('❌', e.message))
ws.on('close', (code) => console.log('Closed:', code))

setTimeout(() => { console.log('\n⏰ Done'); process.exit(0) }, 10000)
