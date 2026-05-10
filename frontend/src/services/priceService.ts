const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000'

// Forex rates cache
let forexCache: { rates: Record<string, number>; timestamp: number } | null = null
const FOREX_CACHE_TTL = 3600000 // 1 hour

// Gold price cache
let goldCache: { price: number; timestamp: number } | null = null
const GOLD_CACHE_TTL = 300000 // 5 minutes

/**
 * Fetch live forex rates (INR as base)
 */
export async function fetchForexRates(): Promise<Record<string, number>> {
  // Check cache
  if (forexCache && Date.now() - forexCache.timestamp < FOREX_CACHE_TTL) {
    return forexCache.rates
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/prices/forex`)
    if (!response.ok) throw new Error('Failed to fetch forex rates')
    
    const data = await response.json()
    forexCache = { rates: data.rates, timestamp: Date.now() }
    return data.rates
  } catch (error) {
    console.error('Forex fetch error:', error)
    // Fallback rates (approximate)
    return {
      USD: 83.0,
      EUR: 90.0,
      GBP: 105.0,
      AED: 22.6,
      SGD: 62.0,
    }
  }
}

/**
 * Convert foreign currency to INR
 */
export async function convertToINR(amount: number, currency: string): Promise<number> {
  if (currency === 'INR') return amount
  
  const rates = await fetchForexRates()
  const rate = rates[currency] || 1
  return amount * rate
}

/**
 * Fetch live gold price (per gram, 24K, in INR)
 */
export async function fetchGoldPrice(): Promise<number> {
  // Check cache
  if (goldCache && Date.now() - goldCache.timestamp < GOLD_CACHE_TTL) {
    return goldCache.price
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/prices/gold`)
    if (!response.ok) throw new Error('Failed to fetch gold price')
    
    const data = await response.json()
    goldCache = { price: data.price_per_gram, timestamp: Date.now() }
    return data.price_per_gram
  } catch (error) {
    console.error('Gold price fetch error:', error)
    // Fallback price (approximate)
    return 6500
  }
}

/**
 * Fetch Indian stock price (NSE/BSE)
 */
export async function fetchIndianStockPrice(symbol: string, exchange: 'NSE' | 'BSE' = 'NSE'): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prices/stock-india?symbol=${symbol}&exchange=${exchange}`)
    if (!response.ok) throw new Error(`Failed to fetch price for ${symbol}`)
    
    const data = await response.json()
    return data.ltp || 0
  } catch (error) {
    console.error(`Stock price fetch error for ${symbol}:`, error)
    return 0
  }
}

/**
 * Fetch US stock price (Yahoo Finance)
 */
export async function fetchUSStockPrice(symbol: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prices/stock-us?symbol=${symbol}`)
    if (!response.ok) throw new Error(`Failed to fetch price for ${symbol}`)
    
    const data = await response.json()
    return data.price || 0
  } catch (error) {
    console.error(`US stock price fetch error for ${symbol}:`, error)
    return 0
  }
}

/**
 * Fetch mutual fund NAV (India)
 */
export async function fetchMutualFundNAV(schemeCode: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prices/mutual-fund?scheme=${schemeCode}`)
    if (!response.ok) throw new Error(`Failed to fetch NAV for ${schemeCode}`)
    
    const data = await response.json()
    return data.nav || 0
  } catch (error) {
    console.error(`Mutual fund NAV fetch error for ${schemeCode}:`, error)
    return 0
  }
}

/**
 * Fetch crypto price (in USD)
 */
export async function fetchCryptoPrice(symbol: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/prices/crypto?symbol=${symbol}`)
    if (!response.ok) throw new Error(`Failed to fetch price for ${symbol}`)
    
    const data = await response.json()
    return data.price_usd || 0
  } catch (error) {
    console.error(`Crypto price fetch error for ${symbol}:`, error)
    return 0
  }
}

/**
 * Calculate current value for any asset
 */
export async function calculateAssetValue(asset: any): Promise<number> {
  try {
    switch (asset.asset_type) {
      case 'BANK_INDIA':
        return asset.balance_inr || 0

      case 'BANK_FOREIGN': {
        const inr = await convertToINR(asset.balance_foreign || 0, asset.currency)
        return inr
      }

      case 'GOLD_PHYSICAL': {
        const goldPrice = await fetchGoldPrice()
        const purityFactors: Record<string, number> = { '24K': 1.0, '22K': 0.916, '18K': 0.75 }
        const factor = purityFactors[asset.purity] || 1.0
        return (asset.weight_grams || 0) * goldPrice * factor
      }

      case 'GOLD_ETF_SGB':
        // For ETF, fetch live NAV; for SGB, use manual entry
        if (asset.type === 'ETF') {
          // Placeholder - would need scheme code
          return (asset.units || 0) * (asset.purchase_nav || 0)
        }
        return (asset.units || 0) * (asset.purchase_nav || 0)

      case 'STOCK_INDIA': {
        const ltp = await fetchIndianStockPrice(asset.symbol, asset.exchange)
        return (asset.quantity || 0) * ltp
      }

      case 'STOCK_US': {
        const price = await fetchUSStockPrice(asset.symbol)
        const inr = await convertToINR(price, 'USD')
        return (asset.quantity || 0) * inr
      }

      case 'MUTUAL_FUND_INDIA':
        return (asset.units || 0) * (asset.purchase_nav || 0)

      case 'MUTUAL_FUND_US': {
        const price = asset.purchase_price || 0
        const inr = await convertToINR(price, 'USD')
        return (asset.units || 0) * inr
      }

      case 'NCD':
        return (asset.units || 0) * (asset.current_price || asset.purchase_price || 0)

      case 'NPS':
        return (asset.units || 0) * (asset.nav || 0)

      case 'EPF_PPF':
        return asset.balance || 0

      case 'REAL_ESTATE':
        return asset.current_value || asset.purchase_price || 0

      case 'CRYPTO': {
        const priceUSD = await fetchCryptoPrice(asset.coin_symbol)
        const inr = await convertToINR(priceUSD, 'USD')
        return (asset.quantity || 0) * inr
      }

      case 'VEHICLE':
        return asset.current_value || asset.purchase_price || 0

      case 'OTHER':
        return asset.current_value || asset.purchase_price || 0

      default:
        return 0
    }
  } catch (error) {
    console.error('Error calculating asset value:', error)
    return 0
  }
}
