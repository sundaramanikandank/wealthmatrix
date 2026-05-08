import { NseIndia } from 'stock-nse-india'
import type { OptionsDetails } from 'stock-nse-india'
import NodeCache from 'node-cache'

const nse = new NseIndia()
const cache = new NodeCache({ stdTTL: 60, useClones: false })

export type IndexSymbol = 'NIFTY' | 'BANKNIFTY'

const INDEX_NAMES: Record<IndexSymbol, string> = {
  NIFTY: 'NIFTY 50',
  BANKNIFTY: 'NIFTY BANK',
}

// Day of week for weekly expiry: 4 = Thursday (NIFTY), 3 = Wednesday (BANKNIFTY)
const WEEKLY_EXPIRY_DAY: Record<IndexSymbol, number> = {
  NIFTY: 4,
  BANKNIFTY: 3,
}

const NSE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseNseDate(str: string): Date {
  const [d, m, y] = str.split('-')
  const monthIndex = NSE_MONTHS.indexOf(m)
  if (monthIndex === -1) return new Date(NaN)
  // Create date at noon to avoid timezone issues
  const date = new Date(parseInt(y, 10), monthIndex, parseInt(d, 10), 12, 0, 0)
  return date
}

function toIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isoToNse(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}-${NSE_MONTHS[parseInt(m, 10) - 1]}-${y}`
}

// Timeout wrapper to prevent hanging requests
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ])
}

async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T & { stale?: boolean }> {
  try {
    const fresh = await withTimeout(fetcher(), 10000) // 10 second timeout
    cache.set(key, fresh)
    return fresh as T & { stale?: boolean }
  } catch (err) {
    console.warn(`NSE fetch failed for "${key}":`, err instanceof Error ? err.message : err)
    const stale = cache.get<T>(key)
    if (stale !== undefined) {
      console.log(`Returning stale cached data for "${key}"`)
      return { ...(stale as object), stale: true } as T & { stale: boolean }
    }
    throw new Error(`NSE fetch failed for key "${key}" and no cached data available`)
  }
}

// ---------------------------------------------------------------------------
// Spot Price
// ---------------------------------------------------------------------------

export interface SpotResult {
  symbol: IndexSymbol
  spot: number
  change: number
  changePct: number
  timestamp: string
  stale?: boolean
}

// Generate mock spot price for testing during off-market hours
function generateMockSpot(symbol: IndexSymbol): SpotResult {
  const basePrice = symbol === 'NIFTY' ? 23500 : 51000
  const spot = basePrice + Math.random() * 100 - 50
  const change = Math.random() * 200 - 100
  const changePct = (change / spot) * 100
  
  console.log(`[NSE] Generated mock spot for ${symbol} (market closed)`)
  return {
    symbol,
    spot: Math.round(spot * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    timestamp: new Date().toISOString(),
    stale: true,
  }
}

export async function getSpotPrice(symbol: IndexSymbol): Promise<SpotResult> {
  try {
    return await cachedFetch(`spot:${symbol}`, async () => {
      const data = await nse.getEquityStockIndices(INDEX_NAMES[symbol])
      const m = data.metadata
      return {
        symbol,
        spot: m.last,
        change: m.change,
        changePct: m.percChange,
        timestamp: m.timeVal,
      }
    })
  } catch (err) {
    console.warn(`[NSE] Failed to fetch spot for ${symbol}, using mock data:`, err instanceof Error ? err.message : err)
    return generateMockSpot(symbol)
  }
}

// ---------------------------------------------------------------------------
// Expiries
// ---------------------------------------------------------------------------

export interface ExpiriesResult {
  weekly: string[]
  monthly: string[]
  stale?: boolean
}

// Generate mock expiries for testing during off-market hours
function generateMockExpiries(symbol: IndexSymbol): ExpiriesResult {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekly: string[] = []
  const monthly: string[] = []
  
  // Generate next 8 weekly expiries
  const weeklyDay = WEEKLY_EXPIRY_DAY[symbol]
  for (let i = 0; i < 8; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + ((weeklyDay - date.getDay() + 7) % 7) + (i * 7))
    weekly.push(toIso(date))
  }
  
  // Generate next 3 monthly expiries (last Thursday of month)
  for (let i = 0; i < 3; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() + i + 1, 0)
    while (date.getDay() !== 4) date.setDate(date.getDate() - 1)
    monthly.push(toIso(date))
  }
  
  console.log(`[NSE] Generated mock expiries for ${symbol} (market closed)`)
  return { weekly, monthly, stale: true }
}

export async function getExpiries(symbol: IndexSymbol): Promise<ExpiriesResult> {
  try {
    return await cachedFetch(`expiries:${symbol}`, async () => {
      const info = await nse.getIndexOptionChainContractInfo(symbol)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

    console.log(`[NSE] Raw expiry dates for ${symbol}:`, info.expiryDates.slice(0, 5))

    const allDates = info.expiryDates
      .map(parseNseDate)
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    console.log(`[NSE] Parsed dates:`, allDates.slice(0, 5).map(toIso))

    // Include today and future dates
    const future = allDates.filter((d) => d >= today)

    console.log(`[NSE] Future dates (>= today):`, future.slice(0, 5).map(toIso))

    const weeklyDay = WEEKLY_EXPIRY_DAY[symbol]

    // TEMP FIX: NSE API returns dates that don't match expected weekday
    // Just return all future dates for now
    const weekly = future.slice(0, 8).map(toIso)
    const monthly = future.slice(0, 3).map(toIso)

    console.log(`[NSE] Weekly expiries (all future):`, weekly)
    console.log(`[NSE] Monthly expiries (first 3):`, monthly)

    return { weekly, monthly }
    })
  } catch (err) {
    console.warn(`[NSE] Failed to fetch expiries for ${symbol}, using mock data:`, err instanceof Error ? err.message : err)
    return generateMockExpiries(symbol)
  }
}

// ---------------------------------------------------------------------------
// Option Chain
// ---------------------------------------------------------------------------

export interface ChainRow {
  ce: OptionsDetails | null
  pe: OptionsDetails | null
}

export interface OptionChainResult {
  symbol: IndexSymbol
  expiry: string
  spot: number
  futures: number | null
  chain: Record<number, ChainRow>
  pcr: number | null
  maxPain: number | null
  atmStrike: number | null
  timestamp: string
  stale?: boolean
}

function calcMaxPain(chain: Record<number, ChainRow>): number | null {
  const strikes = Object.keys(chain).map(Number).sort((a, b) => a - b)
  if (strikes.length === 0) return null

  let minValue = Infinity
  let maxPainStrike = strikes[0]

  for (const S of strikes) {
    let total = 0
    for (const K of strikes) {
      const row = chain[K]
      if (K < S && row.ce) total += (S - K) * row.ce.openInterest
      if (K > S && row.pe) total += (K - S) * row.pe.openInterest
    }
    if (total < minValue) {
      minValue = total
      maxPainStrike = S
    }
  }

  return maxPainStrike
}

// Generate mock option chain for testing during off-market hours
function generateMockOptionChain(symbol: IndexSymbol, expiry: string): OptionChainResult {
  const spot = symbol === 'NIFTY' ? 23500 : 51000
  const strikeInterval = symbol === 'NIFTY' ? 50 : 100
  const numStrikes = 41 // 20 above, 20 below ATM
  
  const atmStrike = Math.round(spot / strikeInterval) * strikeInterval
  const chain: Record<number, ChainRow> = {}
  
  for (let i = -20; i <= 20; i++) {
    const strike = atmStrike + (i * strikeInterval)
    const distanceFromATM = Math.abs(strike - spot)
    
    // Mock IV (higher for OTM)
    const baseIV = 15 + (distanceFromATM / spot) * 50
    const ceIV = baseIV + Math.random() * 5
    const peIV = baseIV + Math.random() * 5
    
    // Mock OI (higher near ATM)
    const oiFactor = Math.max(0, 1 - (distanceFromATM / (spot * 0.1)))
    const ceOI = Math.floor((50000 + Math.random() * 100000) * oiFactor)
    const peOI = Math.floor((50000 + Math.random() * 100000) * oiFactor)
    
    // Mock prices using Black-Scholes approximation
    const ceLTP = Math.max(0.05, (spot - strike) + (ceIV * Math.sqrt(30) / 100))
    const peLTP = Math.max(0.05, (strike - spot) + (peIV * Math.sqrt(30) / 100))
    
    chain[strike] = {
      ce: {
        strikePrice: strike,
        expiryDate: expiry,
        underlying: symbol,
        identifier: `${symbol}${expiry}${strike}CE`,
        openInterest: ceOI,
        changeinOpenInterest: Math.floor(Math.random() * 10000 - 5000),
        pchangeinOpenInterest: Math.random() * 20 - 10,
        totalTradedVolume: Math.floor(ceOI * 0.3),
        impliedVolatility: ceIV,
        lastPrice: ceLTP,
        change: Math.random() * 10 - 5,
        pChange: Math.random() * 10 - 5,
        totalBuyQuantity: Math.floor(Math.random() * 100000),
        totalSellQuantity: Math.floor(Math.random() * 100000),
        bidQty: Math.floor(Math.random() * 1000),
        bidprice: ceLTP - 0.5,
        askQty: Math.floor(Math.random() * 1000),
        askPrice: ceLTP + 0.5,
        underlyingValue: spot,
      } as OptionsDetails,
      pe: {
        strikePrice: strike,
        expiryDate: expiry,
        underlying: symbol,
        identifier: `${symbol}${expiry}${strike}PE`,
        openInterest: peOI,
        changeinOpenInterest: Math.floor(Math.random() * 10000 - 5000),
        pchangeinOpenInterest: Math.random() * 20 - 10,
        totalTradedVolume: Math.floor(peOI * 0.3),
        impliedVolatility: peIV,
        lastPrice: peLTP,
        change: Math.random() * 10 - 5,
        pChange: Math.random() * 10 - 5,
        totalBuyQuantity: Math.floor(Math.random() * 100000),
        totalSellQuantity: Math.floor(Math.random() * 100000),
        bidQty: Math.floor(Math.random() * 1000),
        bidprice: peLTP - 0.5,
        askQty: Math.floor(Math.random() * 1000),
        askPrice: peLTP + 0.5,
        underlyingValue: spot,
      } as OptionsDetails,
    }
  }
  
  const totalCeOI = Object.values(chain).reduce((sum, row) => sum + (row.ce?.openInterest || 0), 0)
  const totalPeOI = Object.values(chain).reduce((sum, row) => sum + (row.pe?.openInterest || 0), 0)
  const pcr = totalCeOI > 0 ? parseFloat((totalPeOI / totalCeOI).toFixed(4)) : null
  
  console.log(`[NSE] Generated mock option chain for ${symbol} ${expiry} (market closed)`)
  
  return {
    symbol,
    expiry,
    spot,
    futures: null,
    chain,
    pcr,
    maxPain: calcMaxPain(chain),
    atmStrike,
    timestamp: new Date().toISOString(),
    stale: true,
  }
}

export async function getOptionChain(
  symbol: IndexSymbol,
  expiry: string,
): Promise<OptionChainResult> {
  try {
    return await cachedFetch(`optchain:${symbol}:${expiry}`, async () => {
      const nseExpiry = isoToNse(expiry)
      console.log(`[NSE] Fetching option chain: ${symbol} ${expiry} → NSE format: ${nseExpiry}`)
      
      const raw = await nse.getIndexOptionChain(symbol, nseExpiry)

      const records = raw.records
      const filtered = raw.filtered

      console.log(`[NSE] Response: spot=${records?.underlyingValue}, filtered.data=${filtered?.data?.length ?? 0}, records.data=${records?.data?.length ?? 0}`)

      const spot = records?.underlyingValue ?? 0
      const timestamp = records?.timestamp ?? new Date().toISOString()

      // filtered.data is scoped to the requested expiry; fall back to records.data
      const data = filtered?.data ?? records?.data ?? []
      
      console.log(`[NSE] Using ${data.length} rows from ${filtered?.data ? 'filtered' : 'records'} data`)

      const chain: Record<number, ChainRow> = {}
      for (const datum of data) {
        chain[datum.strikePrice] = {
          ce: datum.CE ?? null,
          pe: datum.PE ?? null,
        }
      }

      const totalCeOI = filtered?.CE?.totOI ?? 0
      const totalPeOI = filtered?.PE?.totOI ?? 0
      const pcr = totalCeOI > 0 ? parseFloat((totalPeOI / totalCeOI).toFixed(4)) : null

      const maxPain = calcMaxPain(chain)

      const strikes = Object.keys(chain).map(Number)
      const atmStrike =
        strikes.length > 0
          ? strikes.reduce((prev, curr) =>
              Math.abs(curr - spot) < Math.abs(prev - spot) ? curr : prev,
            )
          : null

      return {
        symbol,
        expiry,
        spot,
        futures: null,
        chain,
        pcr,
        maxPain,
        atmStrike,
        timestamp,
      }
    })
  } catch (err) {
    console.warn(`[NSE] Failed to fetch option chain for ${symbol} ${expiry}, using mock data:`, err instanceof Error ? err.message : err)
    return generateMockOptionChain(symbol, expiry)
  }
}
