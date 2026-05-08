import { describe, it, expect } from 'vitest'
import { normalCDF, normalPDF, calcGreeks, estimateLTP } from '../greeks'

// ---------------------------------------------------------------------------
// normalCDF
// ---------------------------------------------------------------------------
describe('normalCDF', () => {
  it('returns 0.5 for x = 0', () => {
    expect(normalCDF(0)).toBeCloseTo(0.5, 8)
  })

  it('returns ~0.8413 for x = 1', () => {
    expect(normalCDF(1)).toBeCloseTo(0.8413, 3)
  })

  it('returns ~0.1587 for x = -1 (symmetry)', () => {
    expect(normalCDF(-1)).toBeCloseTo(0.1587, 3)
  })

  it('satisfies CDF(-x) = 1 - CDF(x)', () => {
    const x = 1.5
    expect(normalCDF(-x) + normalCDF(x)).toBeCloseTo(1, 8)
  })

  it('approaches 1 for large positive x', () => {
    expect(normalCDF(5)).toBeGreaterThan(0.9999)
  })

  it('approaches 0 for large negative x', () => {
    expect(normalCDF(-5)).toBeLessThan(0.0001)
  })
})

// ---------------------------------------------------------------------------
// normalPDF
// ---------------------------------------------------------------------------
describe('normalPDF', () => {
  it('returns peak value 1/sqrt(2π) at x = 0', () => {
    expect(normalPDF(0)).toBeCloseTo(1 / Math.sqrt(2 * Math.PI), 8)
  })

  it('is symmetric: pdf(x) === pdf(-x)', () => {
    expect(normalPDF(1.2)).toBeCloseTo(normalPDF(-1.2), 10)
  })
})

// ---------------------------------------------------------------------------
// calcGreeks — ATM call  (S=100, K=100, T=1, r=0.065, σ=0.20)
// Known computed values:
//   d1 = 0.425, d2 = 0.225
//   delta ≈ 0.6646, gamma ≈ 0.01823, theta ≈ -0.01982,
//   vega  ≈ 0.3645, rho   ≈ 0.5519
// ---------------------------------------------------------------------------
describe('calcGreeks — ATM European call', () => {
  const g = calcGreeks({ S: 100, K: 100, T: 1, r: 0.065, sigma: 0.20, type: 'CE' })

  it('delta ≈ 0.6646', () => {
    expect(g.delta).toBeCloseTo(0.6646, 2)
  })

  it('gamma ≈ 0.01823 (positive)', () => {
    expect(g.gamma).toBeGreaterThan(0)
    expect(g.gamma).toBeCloseTo(0.01823, 3)
  })

  it('theta < 0 (time decay for long option)', () => {
    expect(g.theta).toBeLessThan(0)
    expect(g.theta).toBeCloseTo(-0.01982, 3)
  })

  it('vega > 0, ≈ 0.3645', () => {
    expect(g.vega).toBeGreaterThan(0)
    expect(g.vega).toBeCloseTo(0.3645, 3)
  })

  it('rho > 0 for calls', () => {
    expect(g.rho).toBeGreaterThan(0)
    expect(g.rho).toBeCloseTo(0.5519, 2)
  })
})

// ---------------------------------------------------------------------------
// calcGreeks — ATM put
// ---------------------------------------------------------------------------
describe('calcGreeks — ATM European put', () => {
  const g = calcGreeks({ S: 100, K: 100, T: 1, r: 0.065, sigma: 0.20, type: 'PE' })

  it('delta ≈ -0.3354 (negative for puts)', () => {
    expect(g.delta).toBeCloseTo(-0.3354, 2)
  })

  it('gamma equals call gamma (same underlying, same T, σ)', () => {
    const gc = calcGreeks({ S: 100, K: 100, T: 1, r: 0.065, sigma: 0.20, type: 'CE' })
    expect(g.gamma).toBeCloseTo(gc.gamma, 8)
  })

  it('vega equals call vega (put-call parity)', () => {
    const gc = calcGreeks({ S: 100, K: 100, T: 1, r: 0.065, sigma: 0.20, type: 'CE' })
    expect(g.vega).toBeCloseTo(gc.vega, 8)
  })

  it('theta < 0 (time decay for long put)', () => {
    expect(g.theta).toBeLessThan(0)
  })

  it('rho < 0 for puts', () => {
    expect(g.rho).toBeLessThan(0)
  })
})

// ---------------------------------------------------------------------------
// calcGreeks — edge cases
// ---------------------------------------------------------------------------
describe('calcGreeks — T ≤ 0 (at expiry)', () => {
  it('ITM call has delta = 1', () => {
    const g = calcGreeks({ S: 110, K: 100, T: 0, r: 0.065, sigma: 0.20, type: 'CE' })
    expect(g.delta).toBe(1)
    expect(g.gamma).toBe(0)
    expect(g.theta).toBe(0)
  })

  it('OTM call has delta = 0', () => {
    const g = calcGreeks({ S: 90, K: 100, T: 0, r: 0.065, sigma: 0.20, type: 'CE' })
    expect(g.delta).toBe(0)
  })

  it('ITM put has delta = -1', () => {
    const g = calcGreeks({ S: 90, K: 100, T: 0, r: 0.065, sigma: 0.20, type: 'PE' })
    expect(g.delta).toBe(-1)
  })
})

// ---------------------------------------------------------------------------
// estimateLTP
// ---------------------------------------------------------------------------
describe('estimateLTP', () => {
  it('ATM call price ≈ 11.27 (S=100, K=100, T=1, r=0.065, σ=0.20)', () => {
    const price = estimateLTP(100, 100, 1, 0.065, 0.20, 'CE')
    expect(price).toBeCloseTo(11.27, 1)
  })

  it('option price is always non-negative', () => {
    expect(estimateLTP(100, 100, 0.5, 0.065, 0.15, 'CE')).toBeGreaterThanOrEqual(0)
    expect(estimateLTP(100, 100, 0.5, 0.065, 0.15, 'PE')).toBeGreaterThanOrEqual(0)
  })

  it('deep ITM call approaches intrinsic value at low T', () => {
    const price = estimateLTP(100, 80, 0.001, 0.065, 0.20, 'CE')
    expect(price).toBeGreaterThan(19.9)
    expect(price).toBeLessThan(20.5)
  })

  it('put-call parity holds: C - P = S - K*e^(-rT)', () => {
    const S = 100, K = 100, T = 1, r = 0.065, sigma = 0.20
    const c = estimateLTP(S, K, T, r, sigma, 'CE')
    const p = estimateLTP(S, K, T, r, sigma, 'PE')
    const parity = S - K * Math.exp(-r * T)
    expect(c - p).toBeCloseTo(parity, 4)
  })

  it('T = 0 returns intrinsic value', () => {
    expect(estimateLTP(110, 100, 0, 0.065, 0.20, 'CE')).toBe(10)
    expect(estimateLTP(90,  100, 0, 0.065, 0.20, 'PE')).toBe(10)
    expect(estimateLTP(90,  100, 0, 0.065, 0.20, 'CE')).toBe(0)
  })
})
