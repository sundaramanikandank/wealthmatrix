import { create } from 'zustand'
import { fetchSpot, fetchExpiries, fetchOptionChain } from '../api/market'

// ─── Shared types ─────────────────────────────────────────────────────────────

export type Instrument = 'NIFTY' | 'BANKNIFTY'
export type OptionType  = 'CE' | 'PE' | 'FUT'
export type Side        = 'BUY' | 'SELL'

export interface StoreLeg {
  id: number
  type: OptionType
  expiry: string
  strike: number
  lots: number
  ltp: number
  side: Side
  iv?: number
}

export interface SpotData {
  symbol: string
  spot: number
  change: number
  changePct: number
  timestamp: string
  stale?: boolean
}

export interface ExpiriesData {
  weekly: string[]
  monthly: string[]
  stale?: boolean
}

export interface ChainEntry {
  lastPrice: number
  openInterest: number
  impliedVolatility: number
  change: number
}

export interface ChainData {
  spot: number
  futures: number | null
  chain: Record<number, { ce: ChainEntry | null; pe: ChainEntry | null }>
  pcr: number | null
  maxPain: number | null
  atmStrike: number | null
  timestamp: string
  stale?: boolean
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface StrategyState {
  instrument: Instrument
  spotData: SpotData | null
  expiriesData: ExpiriesData | null
  selectedExpiry: string
  chainData: ChainData | null
  legs: StoreLeg[]
  isLoading: { spot: boolean; expiries: boolean; chain: boolean }
  hasLoadedOnce: { spot: boolean; expiries: boolean; chain: boolean }
  error: string | null
  lastUpdated: number | null

  setInstrument: (symbol: Instrument) => void
  setExpiry: (expiry: string) => void
  addLeg: (leg: Omit<StoreLeg, 'id'>) => void
  removeLeg: (id: number) => void
  clearLegs: () => void
  setLegs: (legs: Omit<StoreLeg, 'id'>[]) => void
  fetchSpotAndExpiries: (symbol: Instrument) => Promise<void>
  fetchChain: (symbol: Instrument, expiry: string) => Promise<void>
  clearError: () => void
}

export const useStrategyStore = create<StrategyState>((set, get) => ({
  instrument:     'NIFTY',
  spotData:       null,
  expiriesData:   null,
  selectedExpiry: '',
  chainData:      null,
  legs:           [],
  isLoading:      { spot: false, expiries: false, chain: false },
  hasLoadedOnce:  { spot: false, expiries: false, chain: false },
  error:          null,
  lastUpdated:    null,

  setInstrument: (symbol) => {
    set({ instrument: symbol, chainData: null, selectedExpiry: '' })
    get().fetchSpotAndExpiries(symbol)
  },

  setExpiry: (expiry) => {
    set({ selectedExpiry: expiry, chainData: null })
    get().fetchChain(get().instrument, expiry)
  },

  addLeg: (leg) => set((s) => ({
    legs: [...s.legs, { ...leg, id: Date.now() + Math.random() * 1000000 }],
  })),

  removeLeg: (id) => set((s) => ({
    legs: s.legs.filter((l) => l.id !== id),
  })),

  clearLegs: () => set({ legs: [] }),

  setLegs: (legs) => set({
    legs: legs.map((l, i) => ({ ...l, id: Date.now() + i * 1000 + Math.random() * 100 })),
  }),

  fetchSpotAndExpiries: async (symbol) => {
    set((s) => ({ 
      isLoading: { ...s.isLoading, spot: true, expiries: true }, 
      error: null 
    }))
    try {
      const [spotData, expiriesData] = await Promise.all([
        fetchSpot(symbol),
        fetchExpiries(symbol),
      ])
      const firstExpiry = expiriesData.weekly[0] ?? expiriesData.monthly[0] ?? ''
      set((s) => ({
        spotData,
        expiriesData,
        selectedExpiry: s.selectedExpiry || firstExpiry,
        isLoading: { ...s.isLoading, spot: false, expiries: false },
        hasLoadedOnce: { ...s.hasLoadedOnce, spot: true, expiries: true },
        lastUpdated: Date.now(),
      }))
      const expiry = get().selectedExpiry || firstExpiry
      if (expiry) get().fetchChain(symbol, expiry)
    } catch (err) {
      set((s) => ({
        isLoading: { ...s.isLoading, spot: false, expiries: false },
        hasLoadedOnce: { ...s.hasLoadedOnce, spot: true, expiries: true },
        error: err instanceof Error ? err.message : 'Failed to fetch spot/expiries',
      }))
    }
  },

  fetchChain: async (symbol, expiry) => {
    if (!expiry) return
    set((s) => ({ isLoading: { ...s.isLoading, chain: true }, error: null }))
    try {
      const chainData = await fetchOptionChain(symbol, expiry)
      set((s) => ({
        chainData,
        isLoading: { ...s.isLoading, chain: false },
        hasLoadedOnce: { ...s.hasLoadedOnce, chain: true },
        lastUpdated: Date.now(),
      }))
    } catch (err) {
      set((s) => ({
        isLoading: { ...s.isLoading, chain: false },
        hasLoadedOnce: { ...s.hasLoadedOnce, chain: true },
        error: err instanceof Error ? err.message : 'Failed to fetch option chain',
      }))
    }
  },

  clearError: () => set({ error: null }),
}))
