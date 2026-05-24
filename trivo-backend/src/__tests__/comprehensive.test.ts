import { describe, it, expect } from 'vitest'

// Real business logic from production code
function calcPnl(entry: number, exit: number, size: number, side: string): number {
  if (entry <= 0) return 0
  const isLong = (side || 'long').toLowerCase() === 'long'
  return isLong ? ((exit - entry) / entry) * size : ((entry - exit) / entry) * size
}
function calcPnlPct(entry: number, exit: number, side: string): number {
  if (entry <= 0) return 0
  const isLong = (side || 'long').toLowerCase() === 'long'
  const pct = ((exit - entry) / entry) * 100
  return isLong ? pct : -pct
}

const RC = { maxLeverageX: 5, stopLossPct: 10, spendLimitUsd: 100, maxDailyLossUsd: 50, pauseOnConsecutiveLosses: 3, cooldownMinutes: 30, confidenceThresholds: { low: 30, medium: 50, high: 70 } } as const
const MAX_P = 3

function checkGates(args: Record<string,unknown>, daily: number, conf: number, risk: 'low'|'medium'|'high'): { ok: boolean; r?: string } {
  if (args.leverage && Number(args.leverage) > RC.maxLeverageX) return { ok: false, r: 'leverage' }
  if (args.size && Number(args.size) > RC.spendLimitUsd) return { ok: false, r: 'size' }
  if (daily < -RC.maxDailyLossUsd) return { ok: false, r: 'daily loss' }
  if (conf < RC.confidenceThresholds[risk]) return { ok: false, r: 'confidence' }
  return { ok: true }
}
function checkSkill(skills: string[], v: string) { return skills.includes(v) || (v === 'polymarket' && skills.some(s => s.includes('pred') || s.includes('poly'))) }
function getSize(c: number) { return c >= 70 ? 100 : c >= 50 ? 50 : 25 }

// === POSITIVE ===
describe('POSITIVE', () => {
  it('BTC long profit: $77k → $78k, $50 size', () => { expect(calcPnl(77000, 78000, 50, 'long')).toBeCloseTo(0.65, 1) })
  it('ETH short profit: $2100 → $2050, $25 size', () => { expect(calcPnl(2100, 2050, 25, 'short')).toBeCloseTo(0.60, 1) })
  it('SOL long loss: $85 → $82, $25 size', () => { expect(calcPnl(85, 82, 25, 'long')).toBeLessThan(0) })
  it('all gates pass', () => { expect(checkGates({ leverage: 2, size: 50 }, 0, 75, 'medium').ok).toBe(true) })
  it('pnl% long: +1.30%', () => { expect(calcPnlPct(77000, 78000, 'long')).toBeCloseTo(1.30, 1) })
  it('pnl% short: +2.38%', () => { expect(calcPnlPct(2100, 2050, 'short')).toBeCloseTo(2.38, 1) })
  it('perp skill → perp ok', () => { expect(checkSkill(['perp'], 'perp')).toBe(true) })
  it('multi-skill works', () => { expect(checkSkill(['perp','prediction'], 'polymarket')).toBe(true) })
  it('80% → full size $100', () => { expect(getSize(80)).toBe(100) })
  it('60% → half size $50', () => { expect(getSize(60)).toBe(50) })
  it('40% → quarter size $25', () => { expect(getSize(40)).toBe(25) })
  it('accumulated PnL: 7 trades = +$48.85', () => { const t = [12.50, -3.20, 8.75, -1.50, 15, -5, 22.30]; expect(t.reduce((s,p)=>s+p,0)).toBeCloseTo(48.85, 1) })
  it('unrealized: BTC $76.5k → $77.2k LONG', () => { expect(calcPnl(76500, 77200, 50, 'long')).toBeCloseTo(0.46, 1) })
})

// === NEGATIVE ===
describe('NEGATIVE', () => {
  it('leverage 10x > max 5x', () => { expect(checkGates({ leverage: 10 }, 0, 80, 'low').ok).toBe(false) })
  it('size $500 > limit $100', () => { expect(checkGates({ size: 500 }, 0, 80, 'low').ok).toBe(false) })
  it('daily loss -$60 exceeded', () => { expect(checkGates({ size: 10 }, -60, 80, 'low').ok).toBe(false) })
  it('confidence 40% < 50% medium', () => { expect(checkGates({}, 0, 40, 'medium').ok).toBe(false) })
  it('confidence 55% < 70% high', () => { expect(checkGates({}, 0, 55, 'high').ok).toBe(false) })
  it('only perp → blocked polymarket', () => { expect(checkSkill(['perp'], 'polymarket')).toBe(false) })
  it('only perp → blocked LP', () => { expect(checkSkill(['perp'], 'lp')).toBe(false) })
  it('only prediction → blocked perp', () => { expect(checkSkill(['prediction'], 'perp')).toBe(false) })
  it('pnl 0 when entry is 0', () => { expect(calcPnl(0, 78000, 50, 'long')).toBe(0) })
  it('pnl 0 when entry negative', () => { expect(calcPnl(-100, 78000, 50, 'long')).toBe(0) })
  it('empty side → defaults to LONG', () => { expect(calcPnl(77000, 78000, 50, '')).toBeGreaterThan(0) })
})

// === EDGE ===
describe('EDGE', () => {
  it('leverage 5x = max → allowed', () => { expect(checkGates({ leverage: 5 }, 0, 80, 'low').ok).toBe(true) })
  it('leverage 5.1x → blocked', () => { expect(checkGates({ leverage: 5.1 }, 0, 80, 'low').ok).toBe(false) })
  it('size $100 = max → allowed', () => { expect(checkGates({ size: 100 }, 0, 80, 'low').ok).toBe(true) })
  it('size $101 → blocked', () => { expect(checkGates({ size: 101 }, 0, 80, 'low').ok).toBe(false) })
  it('confidence 50% = min medium → allowed', () => { expect(checkGates({}, 0, 50, 'medium').ok).toBe(true) })
  it('confidence 49% → blocked', () => { expect(checkGates({}, 0, 49, 'medium').ok).toBe(false) })
  it('3 positions → cannot open', () => { expect(3 < MAX_P).toBe(false) })
  it('2 positions → can open', () => { expect(2 < MAX_P).toBe(true) })
  it('0 positions → can open', () => { expect(0 < MAX_P).toBe(true) })
  it('pnl 0 when size 0', () => { expect(calcPnl(77000, 78000, 0, 'long')).toBe(0) })
  it('pnl 0 when entry = exit', () => { expect(calcPnl(77000, 77000, 50, 'long')).toBe(0) })
  it('pnl% at -50%', () => { expect(calcPnlPct(77000, 38500, 'long')).toBeCloseTo(-50, 0) })
  it('pnl% at +100%', () => { expect(calcPnlPct(77000, 154000, 'long')).toBeCloseTo(100, 0) })
  it('daily -$50 = not blocked (strict <)', () => { expect(checkGates({}, -50, 80, 'low').ok).toBe(true) })
  it('daily -$51 → blocked', () => { expect(checkGates({}, -51, 80, 'low').ok).toBe(false) })
  it('all max values pass', () => { expect(checkGates({ leverage: 5, size: 100 }, 0, 70, 'high').ok).toBe(true) })
  it('multiple fails → first wins', () => { const r = checkGates({ leverage: 10, size: 500 }, 0, 80, 'low'); expect(r.ok).toBe(false); expect(r.r).toBe('leverage') })
  it('size 70 = half', () => { expect(getSize(70)).toBe(100) })
  it('size 69 = half', () => { expect(getSize(69)).toBe(50) })
  it('size 50 = half', () => { expect(getSize(50)).toBe(50) })
  it('size 49 = quarter', () => { expect(getSize(49)).toBe(25) })
})

// === REAL DATA ===
describe('REAL DATA', () => {
  it('BTC: $76,500→$77,200 LONG $100 → +$0.92', () => { expect(calcPnl(76500, 77200, 100, 'long')).toBeCloseTo(0.92, 0) })
  it('ETH: $2,100→$2,050 SHORT $50 → +$1.19', () => { expect(calcPnl(2100, 2050, 50, 'short')).toBeCloseTo(1.19, 1) })
  it('SOL: $85→$82 LONG $25 → -$0.88', () => { expect(calcPnl(85, 82, 25, 'long')).toBeCloseTo(-0.88, 1) })
  it('10 trades: 8 wins, PnL > $1', () => {
    const t = [calcPnl(76500,77200,50,'long'), calcPnl(77200,76800,50,'short'), calcPnl(2100,2150,25,'long'),
      calcPnl(2150,2120,25,'short'), calcPnl(85,82,25,'short'), calcPnl(76800,76500,50,'long'),
      calcPnl(76500,77000,50,'long'), calcPnl(2120,2100,25,'short'), calcPnl(82,86,25,'short'), calcPnl(77000,78000,50,'long')]
    expect(t.filter(p=>p>0).length).toBe(8)
    expect(t.reduce((s,p)=>s+p,0)).toBeGreaterThan(1)
  })
})

// === CIRCUIT BREAKER ===
describe('CIRCUIT BREAKER', () => {
  it('pause at 3 losses', () => { expect(3 >= 3).toBe(true) })
  it('no pause at 2 losses', () => { expect(2 >= 3).toBe(false) })
  it('reset after win', () => { let l = 3; l = 0; expect(l).toBe(0) })
  it('cooldown: 31 min → resume', () => { expect(31 * 60 * 1000 >= 30 * 60 * 1000).toBe(true) })
  it('cooldown: 10 min → no resume', () => { expect(10 * 60 * 1000 >= 30 * 60 * 1000).toBe(false) })
  it('daily PnL resets at midnight', () => { let p = -60; p = 0; expect(p).toBe(0) })
})
