import { describe, it, expect } from 'vitest'
import type { OptionChainData } from '../maxpain'
import { calcMaxPain } from '../maxpain'

// Symmetric chain — manually verified:
// S=21000: payout=2_000_000 | S=21500: 1_550_000
// S=22000: payout=1_400_000 ← minimum (max pain)
// S=22500: payout=1_550_000 | S=23000: 2_000_000
const chain: OptionChainData = [
  { strikePrice: 21000, ce: { openInterest: 500 }, pe: { openInterest: 100 } },
  { strikePrice: 21500, ce: { openInterest: 400 }, pe: { openInterest: 200 } },
  { strikePrice: 22000, ce: { openInterest: 300 }, pe: { openInterest: 300 } },
  { strikePrice: 22500, ce: { openInterest: 200 }, pe: { openInterest: 400 } },
  { strikePrice: 23000, ce: { openInterest: 100 }, pe: { openInterest: 500 } },
]

describe('calcMaxPain', () => {
  it('returns 22000 for a symmetric balanced chain', () => {
    expect(calcMaxPain(chain)).toBe(22000)
  })

  it('returns the lowest strike when all OI is in deep ITM puts', () => {
    const lowPainChain: OptionChainData = [
      { strikePrice: 21000, ce: { openInterest: 1000 }, pe: { openInterest: 0 } },
      { strikePrice: 22000, ce: { openInterest: 0 },    pe: { openInterest: 10 } },
      { strikePrice: 23000, ce: { openInterest: 0 },    pe: { openInterest: 10 } },
    ]
    expect(calcMaxPain(lowPainChain)).toBe(21000)
  })

  it('handles missing CE side gracefully (only PE data)', () => {
    const partialChain: OptionChainData = [
      { strikePrice: 21000, pe: { openInterest: 100 } },
      { strikePrice: 22000, pe: { openInterest: 200 } },
      { strikePrice: 23000, pe: { openInterest: 50 }  },
    ]
    expect(() => calcMaxPain(partialChain)).not.toThrow()
  })

  it('handles missing PE side gracefully (only CE data)', () => {
    const partialChain: OptionChainData = [
      { strikePrice: 21000, ce: { openInterest: 100 } },
      { strikePrice: 22000, ce: { openInterest: 200 } },
      { strikePrice: 23000, ce: { openInterest: 50 }  },
    ]
    expect(() => calcMaxPain(partialChain)).not.toThrow()
  })

  it('handles null CE/PE fields without throwing', () => {
    const nullChain: OptionChainData = [
      { strikePrice: 21000, ce: null, pe: null },
      { strikePrice: 22000, ce: { openInterest: 100 }, pe: null },
    ]
    expect(() => calcMaxPain(nullChain)).not.toThrow()
  })

  it('throws for an empty chain', () => {
    expect(() => calcMaxPain([])).toThrow()
  })

  it('returns the only strike for a single-row chain', () => {
    const single: OptionChainData = [
      { strikePrice: 22000, ce: { openInterest: 100 }, pe: { openInterest: 100 } },
    ]
    expect(calcMaxPain(single)).toBe(22000)
  })

  it('result is always one of the strikes in the chain', () => {
    const result = calcMaxPain(chain)
    const strikes = chain.map((r) => r.strikePrice)
    expect(strikes).toContain(result)
  })
})
