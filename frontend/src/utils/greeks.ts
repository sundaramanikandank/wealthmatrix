/**
 * Black-Scholes Greeks and option pricing utilities for Indian equity derivatives.
 * All price/strike inputs are in ₹. Time (T) is in years. Rates and sigma are decimals.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Error function approximation — Abramowitz & Stegun formula 7.1.26.
 * Maximum absolute error: 1.5e-7.
 */
function erf(x: number): number {
  const a1 =  0.254829592
  const a2 = -0.284496736
  const a3 =  1.421413741
  const a4 = -1.453152027
  const a5 =  1.061405429
  const p  =  0.3275911

  const sign = x >= 0 ? 1 : -1
  const ax = Math.abs(x)
  const t = 1.0 / (1.0 + p * ax)
  const poly = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t
  const y = 1.0 - poly * Math.exp(-ax * ax)
  return sign * y
}

// ---------------------------------------------------------------------------
// Public statistical functions
// ---------------------------------------------------------------------------

/**
 * Standard normal cumulative distribution function Φ(x).
 * Uses the relationship Φ(x) = (1 + erf(x / √2)) / 2.
 *
 * @param x - Input value
 * @returns Probability P(Z ≤ x) for Z ~ N(0,1)
 */
export function normalCDF(x: number): number {
  return 0.5 * (1.0 + erf(x / Math.SQRT2))
}

/**
 * Standard normal probability density function φ(x).
 *
 * @param x - Input value
 * @returns Density (1/√2π) * exp(-x²/2)
 */
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Parameters for Black-Scholes calculations */
export interface GreeksParams {
  /** Current spot price of the underlying (₹) */
  S: number
  /** Strike price (₹) */
  K: number
  /** Time to expiry in years (e.g. 30 days = 30/365) */
  T: number
  /** Risk-free rate as a decimal (e.g. 6.5% → 0.065) */
  r: number
  /** Implied volatility as a decimal (e.g. 15% → 0.15) */
  sigma: number
  /** Option type: Call (CE) or Put (PE) */
  type: 'CE' | 'PE'
}

/** Black-Scholes Greeks for a single option leg */
export interface Greeks {
  /** Rate of change of option price with respect to underlying price */
  delta: number
  /** Rate of change of delta with respect to underlying price */
  gamma: number
  /**
   * Time decay — change in option price per calendar day (÷365).
   * Expressed in ₹ per unit of underlying. Negative for long options.
   */
  theta: number
  /**
   * Sensitivity to 1 percentage-point change in implied volatility.
   * Expressed in ₹ per unit of underlying.
   */
  vega: number
  /**
   * Sensitivity to 1 percentage-point change in risk-free rate.
   * Expressed in ₹ per unit of underlying.
   */
  rho: number
}

// ---------------------------------------------------------------------------
// Core Black-Scholes functions
// ---------------------------------------------------------------------------

/**
 * Computes Black-Scholes Greeks for a European option.
 *
 * @param params - {@link GreeksParams}
 * @returns {@link Greeks} — delta, gamma, theta (per day), vega (per 1% IV), rho (per 1% r)
 *
 * @example
 * const g = calcGreeks({ S: 22000, K: 22000, T: 30/365, r: 0.065, sigma: 0.15, type: 'CE' })
 */
export function calcGreeks(params: GreeksParams): Greeks {
  const { S, K, T, r, sigma, type } = params

  if (T <= 0 || sigma <= 0) {
    const itm = type === 'CE' ? S > K : S < K
    return {
      delta: itm ? (type === 'CE' ? 1 : -1) : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    }
  }

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT

  const nd1  = normalCDF(d1)
  const nd2  = normalCDF(d2)
  const nnd2 = normalCDF(-d2)
  const pdf1 = normalPDF(d1)
  const disc = Math.exp(-r * T)

  // Shared terms
  const thetaShared = -(S * pdf1 * sigma) / (2 * sqrtT)
  const gamma = pdf1 / (S * sigma * sqrtT)
  const vega  = S * pdf1 * sqrtT / 100

  if (type === 'CE') {
    const delta = nd1
    const theta = (thetaShared - r * K * disc * nd2) / 365
    const rho   = K * T * disc * nd2 / 100
    return { delta, gamma, theta, vega, rho }
  } else {
    const delta = nd1 - 1
    const theta = (thetaShared + r * K * disc * nnd2) / 365
    const rho   = -K * T * disc * nnd2 / 100
    return { delta, gamma, theta, vega, rho }
  }
}

/**
 * Returns the theoretical (fair value) price of a European option
 * using the Black-Scholes formula.
 *
 * @param S - Spot price (₹)
 * @param K - Strike price (₹)
 * @param T - Time to expiry in years
 * @param r - Risk-free rate (decimal)
 * @param sigma - Implied volatility (decimal)
 * @param type - 'CE' for call, 'PE' for put
 * @returns Theoretical option price (₹)
 *
 * @example
 * const ltp = estimateLTP(22000, 22000, 30/365, 0.065, 0.15, 'CE')
 */
export function estimateLTP(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: 'CE' | 'PE',
): number {
  if (T <= 0 || sigma <= 0) {
    return type === 'CE' ? Math.max(S - K, 0) : Math.max(K - S, 0)
  }

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  const disc = Math.exp(-r * T)

  if (type === 'CE') {
    return S * normalCDF(d1) - K * disc * normalCDF(d2)
  } else {
    return K * disc * normalCDF(-d2) - S * normalCDF(-d1)
  }
}
