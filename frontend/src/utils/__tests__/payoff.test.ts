import { describe, it, expect } from 'vitest'
import type { Leg } from '../payoff'
import {
  calcPayoffAtExpiry,
  calcPayoffRange,
  calcBreakevens,
  calcMaxProfit,
  calcMaxLoss,
} from '../payoff'

const LOT = 50

// ---------------------------------------------------------------------------
// calcPayoffAtExpiry
// ---------------------------------------------------------------------------
describe('calcPayoffAtExpiry — long call', () => {
  const legs: Leg[] = [
    { type: 'CE', action: 'BUY', strike: 22000, premium: 200, lots: 1 },
  ]

  it('profits when spot > breakeven (22200)', () => {
    expect(calcPayoffAtExpiry(legs, 22500, LOT)).toBe(15000)
    // (22500 - 22000 - 200) * 1 * 50 = 300 * 50 = 15000
  })

  it('loses full premium when spot < strike', () => {
    expect(calcPayoffAtExpiry(legs, 21500, LOT)).toBe(-10000)
    // (0 - 200) * 1 * 50 = -10000
  })

  it('P&L = 0 exactly at breakeven (spot = strike + premium)', () => {
    expect(calcPayoffAtExpiry(legs, 22200, LOT)).toBe(0)
  })

  it('expires at-the-money → loss = full premium', () => {
    expect(calcPayoffAtExpiry(legs, 22000, LOT)).toBe(-10000)
  })
})

describe('calcPayoffAtExpiry — long put', () => {
  const legs: Leg[] = [
    { type: 'PE', action: 'BUY', strike: 22000, premium: 150, lots: 1 },
  ]

  it('profits when spot < breakeven (21850)', () => {
    expect(calcPayoffAtExpiry(legs, 21500, LOT)).toBe(17500)
    // (22000 - 21500 - 150) * 50 = 350 * 50 = 17500
  })

  it('loses full premium when spot > strike', () => {
    expect(calcPayoffAtExpiry(legs, 22500, LOT)).toBe(-7500)
    // (0 - 150) * 50 = -7500
  })
})

describe('calcPayoffAtExpiry — short call', () => {
  const legs: Leg[] = [
    { type: 'CE', action: 'SELL', strike: 22000, premium: 200, lots: 2 },
  ]

  it('earns full premium when spot < strike', () => {
    expect(calcPayoffAtExpiry(legs, 21000, LOT)).toBe(20000)
    // 200 * 2 * 50 = 20000
  })

  it('incurs loss when spot > breakeven', () => {
    const pnl = calcPayoffAtExpiry(legs, 22500, LOT)
    expect(pnl).toBeLessThan(0)
  })
})

describe('calcPayoffAtExpiry — bull call spread', () => {
  const legs: Leg[] = [
    { type: 'CE', action: 'BUY',  strike: 22000, premium: 200, lots: 1 },
    { type: 'CE', action: 'SELL', strike: 22500, premium: 100, lots: 1 },
  ]
  const netDebit = (200 - 100) * LOT  // 5000

  it('max loss = net debit below lower strike', () => {
    expect(calcPayoffAtExpiry(legs, 21000, LOT)).toBe(-netDebit)
  })

  it('max profit = spread width − net debit above upper strike', () => {
    expect(calcPayoffAtExpiry(legs, 23000, LOT)).toBe((500 - 100) * LOT)
  })
})

describe('calcPayoffAtExpiry — multi-lot scaling', () => {
  const legs: Leg[] = [
    { type: 'CE', action: 'BUY', strike: 22000, premium: 200, lots: 3 },
  ]

  it('scales linearly with lots', () => {
    const single = calcPayoffAtExpiry(
      [{ type: 'CE', action: 'BUY', strike: 22000, premium: 200, lots: 1 }],
      22500, LOT,
    )
    expect(calcPayoffAtExpiry(legs, 22500, LOT)).toBe(single * 3)
  })
})

// ---------------------------------------------------------------------------
// calcPayoffRange
// ---------------------------------------------------------------------------
describe('calcPayoffRange', () => {
  const legs: Leg[] = [
    { type: 'CE', action: 'BUY', strike: 22000, premium: 200, lots: 1 },
  ]

  it('returns correct number of points', () => {
    const range = calcPayoffRange(legs, 21000, 23000, 100, LOT)
    expect(range.length).toBe(21)
  })

  it('first point has spot = spotMin', () => {
    const range = calcPayoffRange(legs, 21000, 23000, 100, LOT)
    expect(range[0].spot).toBe(21000)
  })

  it('pnl at each point matches calcPayoffAtExpiry', () => {
    const range = calcPayoffRange(legs, 22500, 22500, 1, LOT)
    expect(range[0].pnl).toBe(calcPayoffAtExpiry(legs, 22500, LOT))
  })
})

// ---------------------------------------------------------------------------
// calcBreakevens
// ---------------------------------------------------------------------------
describe('calcBreakevens', () => {
  it('long call: breakeven ≈ strike + premium', () => {
    const legs: Leg[] = [
      { type: 'CE', action: 'BUY', strike: 22000, premium: 200, lots: 1 },
    ]
    const bes = calcBreakevens(legs, 22000, LOT)
    expect(bes.length).toBe(1)
    expect(bes[0]).toBeCloseTo(22200, 0)
  })

  it('long put: breakeven ≈ strike − premium', () => {
    const legs: Leg[] = [
      { type: 'PE', action: 'BUY', strike: 22000, premium: 200, lots: 1 },
    ]
    const bes = calcBreakevens(legs, 22000, LOT)
    expect(bes.length).toBe(1)
    expect(bes[0]).toBeCloseTo(21800, 0)
  })

  it('straddle (long call + long put): two breakevens', () => {
    const legs: Leg[] = [
      { type: 'CE', action: 'BUY', strike: 22000, premium: 200, lots: 1 },
      { type: 'PE', action: 'BUY', strike: 22000, premium: 200, lots: 1 },
    ]
    const bes = calcBreakevens(legs, 22000, LOT)
    expect(bes.length).toBe(2)
    expect(bes[0]).toBeCloseTo(21600, 0)
    expect(bes[1]).toBeCloseTo(22400, 0)
  })
})

// ---------------------------------------------------------------------------
// calcMaxProfit / calcMaxLoss
// ---------------------------------------------------------------------------
describe('calcMaxProfit and calcMaxLoss — bull call spread', () => {
  const legs: Leg[] = [
    { type: 'CE', action: 'BUY',  strike: 22000, premium: 200, lots: 1 },
    { type: 'CE', action: 'SELL', strike: 22500, premium: 100, lots: 1 },
  ]

  it('max profit = (spread − net debit) * lotSize', () => {
    const mp = calcMaxProfit(legs, 20000, 25000, LOT)
    expect(mp).toBeCloseTo((500 - 100) * LOT, 0)
  })

  it('max loss = net debit * lotSize', () => {
    const ml = calcMaxLoss(legs, 20000, 25000, LOT)
    expect(ml).toBeCloseTo(-100 * LOT, 0)
  })
})

describe('calcMaxLoss — short call (unlimited)', () => {
  const legs: Leg[] = [
    { type: 'CE', action: 'SELL', strike: 22000, premium: 200, lots: 1 },
  ]

  it('max profit = premium * lotSize', () => {
    const mp = calcMaxProfit(legs, 20000, 22000, LOT)
    expect(mp).toBe(200 * LOT)
  })

  it('max loss grows with spot (unbounded in reality)', () => {
    const ml25 = calcMaxLoss(legs, 20000, 25000, LOT)
    const ml30 = calcMaxLoss(legs, 20000, 30000, LOT)
    expect(ml30).toBeLessThan(ml25)
  })
})
