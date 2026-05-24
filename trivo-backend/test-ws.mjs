import WebSocket from 'ws'

console.log('🔌 Testing WebSocket endpoints...\n')

// Test 1: Market data
const ws1 = new WebSocket('wss://ws-api.speedtrading.pandora.fun/ws/?EIO=4&transport=websocket')
ws1.on('open', () => { console.log('✅ Market connected'); ws1.send('40') })
ws1.on('message', d => { const m = d.toString(); console.log('📩 M1:', m.slice(0,200)); if (m==='40'||m.startsWith('40{')) { console.log('→ subscribe...'); ws1.send('42'+JSON.stringify(['subscribe',{method:'market',params:['all',2741]}])) } })
ws1.on('error', e => console.log('❌ M1:', e.message))

// Test 2: Price
setTimeout(() => {
  const ws2 = new WebSocket('wss://data-api.speedtrading.pandora.fun/ws/?EIO=4&transport=websocket')
  ws2.on('open', () => { console.log('\n✅ Price connected'); ws2.send('40') })
  ws2.on('message', d => { const m = d.toString(); console.log('📩 M2:', m.slice(0,200)); if (m==='40'||m.startsWith('40{')) { console.log('→ subscribe...'); ws2.send('42'+JSON.stringify(['subscribe',{method:'ezmodePriceInfo'}])) } })
  ws2.on('error', e => console.log('❌ M2:', e.message))
}, 2000)

setTimeout(() => { console.log('\n⏰ Done'); process.exit(0) }, 10000)
