/**
 * Strategy payoff utilities — calculate P&L at expiry, breakevens,
 * max profit / max loss for multi-leg options strategies.
 * All monetary results are in ₹.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single option leg in a strategy */
export interface Leg {
  /** Option type */
  type: 'CE' | 'PE'
  /** Whether the position is long (bought) or short (sold) */
  action: 'BUY' | 'SELL'
  /** Strike price (₹) */
  strike: number
  /** Premium paid (BUY) or received (SELL) per unit of underlying (₹) */
  premium: number
  /** Number of lots in this leg */
  lots: number
}

/** A single point on the payoff curve */
export interface PayoffPoint {
  /** Underlying spot price at this point (₹) */
  spot: number
  /** Total strategy P&L at this spot price (₹) */
  pnl: number
}

// ---------------------------------------------------------------------------
// Core payoff calculation
// ---------------------------------------------------------------------------

/**
 * Calculates the total strategy P&L in ₹ at a given spot price at expiry.
 *
 * @param legs - Array of option legs
 * @param spotAtExpiry - Underlying price at expiry (₹)
 * @param lotSize - Number of underlying units per lot (e.g. 50 for NIFTY)
 * @returns Total P&L in ₹
 *
 * @example
 * // Long call at strike 22000, premium 200, 1 lot
 * calcPayoffAtExpiry([{ type:'CE', action:'BUY', strike:22000, premium:200, lots:1 }], 22500, 50)
 * // Returns 15000 → (500 - 200) * 1 * 50
 */
export function calcPayoffAtExpiry(
  legs: Leg[],
  spotAtExpiry: number,
  lotSize: number,
): number {
  return legs.reduce((total, leg) => {
    const { type, action, strike, premium, lots } = leg
    const intrinsic =
      type === 'CE'
        ? Math.max(spotAtExpiry - strike, 0)
        : Math.max(strike - spotAtExpiry, 0)
    const pnlPerUnit = action === 'BUY' ? intrinsic - premium : premium - intrinsic
    return total + pnlPerUnit * lots * lotSize
  }, 0)
}

// ---------------------------------------------------------------------------
// Payoff range
// ---------------------------------------------------------------------------

/**
 * Generates an array of { spot, pnl } points across a spot price range.
 * Useful for rendering payoff diagrams.
 *
 * @param legs - Array of option legs
 * @param spotMin - Minimum spot price to evaluate (₹)
 * @param spotMax - Maximum spot price to evaluate (₹)
 * @param step - Spot price increment between points (₹)
 * @param lotSize - Number of underlying units per lot
 * @returns Array of {@link PayoffPoint}
 */
export function calcPayoffRange(
  legs: Leg[],
  spotMin: number,
  spotMax: number,
  step: number,
  lotSize: number,
): PayoffPoint[] {
  const result: PayoffPoint[] = []
  const safeStep = step > 0 ? step : 1

  for (let spot = spotMin; spot <= spotMax + safeStep * 1e-9; spot += safeStep) {
    const rounded = Math.round(spot * 100) / 100
    result.push({ spot: rounded, pnl: calcPayoffAtExpiry(legs, rounded, lotSize) })
  }

  return result
}

// ---------------------------------------------------------------------------
// Breakevens
// ---------------------------------------------------------------------------

/**
 * Finds breakeven spot prices for a strategy by scanning ±30% around
 * `spotCurrent` and detecting zero-crossings in the payoff curve.
 * Uses linear interpolation for sub-step accuracy.
 *
 * @param legs - Array of option legs
 * @param spotCurrent - Current spot price used to set the scan window (₹)
 * @param lotSize - Number of underlying units per lot
 * @returns Sorted array of breakeven spot prices (₹), rounded to 2 decimals
 */
export function calcBreakevens(
  legs: Leg[],
  spotCurrent: number,
  lotSize: number,
): number[] {
  const spotMin = spotCurrent * 0.70
  const spotMax = spotCurrent * 1.30
  const step    = Math.max(Math.round(spotCurrent * 0.001), 1)
  const range   = calcPayoffRange(legs, spotMin, spotMax, step, lotSize)

  const breakevens: number[] = []

  for (let i = 1; i < range.length; i++) {
    const prev = range[i - 1]
    const curr = range[i]

    if (Math.abs(curr.pnl) < 0.01 * Math.abs(lotSize)) {
      breakevens.push(Math.round(curr.spot * 100) / 100)
    } else if (prev.pnl * curr.pnl < 0) {
      const span = curr.pnl - prev.pnl
      if (span !== 0) {
        const be = prev.spot - prev.pnl * (curr.spot - prev.spot) / span
        breakevens.push(Math.round(be * 100) / 100)
      }
    }
  }

  const deduped = [...new Set(breakevens)].sort((a, b) => a - b)
  return deduped
}

// ---------------------------------------------------------------------------
// Max profit / Max loss
// ---------------------------------------------------------------------------

/**
 * Returns the maximum P&L achievable within the given spot range.
 * Scans the full range in 1-point increments.
 *
 * @param legs - Array of option legs
 * @param spotMin - Lower bound of the scan range (₹)
 * @param spotMax - Upper bound of the scan range (₹)
 * @param lotSize - Number of underlying units per lot
 * @returns Maximum P&L in ₹ (`Infinity` if theoretically unlimited beyond spotMax)
 */
export function calcMaxProfit(
  legs: Leg[],
  spotMin: number,
  spotMax: number,
  lotSize: number,
): number {
  const range = calcPayoffRange(legs, spotMin, spotMax, 1, lotSize)
  return Math.max(...range.map((p) => p.pnl))
}

/**
 * Returns the maximum loss (most negative P&L) within the given spot range.
 * Scans the full range in 1-point increments.
 *
 * @param legs - Array of option legs
 * @param spotMin - Lower bound of the scan range (₹)
 * @param spotMax - Upper bound of the scan range (₹)
 * @param lotSize - Number of underlying units per lot
 * @returns Maximum loss in ₹ (a negative number; `-Infinity` if unlimited beyond spotMax)
 */
export function calcMaxLoss(
  legs: Leg[],
  spotMin: number,
  spotMax: number,
  lotSize: number,
): number {
  const range = calcPayoffRange(legs, spotMin, spotMax, 1, lotSize)
  return Math.min(...range.map((p) => p.pnl))
}
