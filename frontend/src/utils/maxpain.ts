/**
 * Max Pain calculation for options chains.
 *
 * The "max pain" strike is the expiry price at which option buyers collectively
 * lose the most (i.e. where total intrinsic-value payout to buyers is minimised).
 * Empirically, the underlying often gravitates toward this level into expiry.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Open interest data for one side of a strike */
export interface OISide {
  openInterest: number
}

/** A single strike row in the option chain */
export interface ChainStrike {
  /** Strike price (₹) */
  strikePrice: number
  /** Call-side data (optional — some strikes may only have puts) */
  ce?: OISide | null
  /** Put-side data (optional — some strikes may only have calls) */
  pe?: OISide | null
}

/**
 * Option chain data — an array of strike rows, each containing CE and/or PE
 * open interest. Order does not matter; the function sorts internally.
 */
export type OptionChainData = ChainStrike[]

// ---------------------------------------------------------------------------
// Max Pain
// ---------------------------------------------------------------------------

/**
 * Calculates the max pain strike for the given option chain.
 *
 * **Algorithm (intrinsic-value method):**
 * For each potential expiry price S (one of the actual strikes):
 * 1. Sum `(S − K) × CE_OI` for all calls with strike K < S  (ITM calls)
 * 2. Sum `(K − S) × PE_OI` for all puts with strike K > S   (ITM puts)
 * 3. total_payout(S) = (1) + (2)
 *
 * Max pain = the strike S with the **minimum** `total_payout(S)`,
 * i.e. where option buyers collectively receive the least.
 *
 * @param chain - {@link OptionChainData} — array of strike rows with OI
 * @returns The max pain strike price (₹)
 * @throws If the chain is empty
 *
 * @example
 * const mp = calcMaxPain(optionChain)
 * console.log(`Max pain: ₹${mp}`)
 */
export function calcMaxPain(chain: OptionChainData): number {
  if (chain.length === 0) {
    throw new Error('calcMaxPain: chain must not be empty')
  }

  const strikes = chain.map((row) => row.strikePrice).sort((a, b) => a - b)

  let minPayout = Infinity
  let maxPainStrike = strikes[0]

  for (const S of strikes) {
    let payout = 0

    for (const { strikePrice: K, ce, pe } of chain) {
      if (K < S && ce) {
        payout += (S - K) * ce.openInterest
      }
      if (K > S && pe) {
        payout += (K - S) * pe.openInterest
      }
    }

    if (payout < minPayout) {
      minPayout = payout
      maxPainStrike = S
    }
  }

  return maxPainStrike
}
