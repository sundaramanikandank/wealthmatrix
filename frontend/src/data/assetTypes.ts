export type AssetType = 
  | 'BANK_INDIA'
  | 'BANK_FOREIGN'
  | 'GOLD_PHYSICAL'
  | 'GOLD_ETF_SGB'
  | 'NCD'
  | 'NPS'
  | 'STOCK_INDIA'
  | 'STOCK_US'
  | 'MUTUAL_FUND_INDIA'
  | 'MUTUAL_FUND_US'
  | 'EPF_PPF'
  | 'REAL_ESTATE'
  | 'CRYPTO'
  | 'VEHICLE'
  | 'OTHER'

export type Currency = 'INR' | 'USD' | 'EUR' | 'AED' | 'GBP' | 'SGD'

export type Purity = '24K' | '22K' | '18K'

export const PURITY_FACTORS: Record<Purity, number> = {
  '24K': 1.0,
  '22K': 0.916,
  '18K': 0.75,
}

export interface BaseAsset {
  id: string
  user_id: string
  asset_type: AssetType
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface BankIndiaAsset extends BaseAsset {
  asset_type: 'BANK_INDIA'
  bank_name: string
  account_type: 'Savings' | 'FD' | 'RD' | 'Current'
  account_number_last4: string
  balance_inr: number
  currency: 'INR'
}

export interface BankForeignAsset extends BaseAsset {
  asset_type: 'BANK_FOREIGN'
  bank_name: string
  country: string
  account_type: string
  account_number_last4: string
  balance_foreign: number
  currency: Currency
}

export interface GoldPhysicalAsset extends BaseAsset {
  asset_type: 'GOLD_PHYSICAL'
  weight_grams: number
  purity: Purity
  purchase_price_per_gram: number
}

export interface GoldETFSGBAsset extends BaseAsset {
  asset_type: 'GOLD_ETF_SGB'
  scheme_name: string
  units: number
  purchase_nav: number
  type: 'ETF' | 'SGB'
}

export interface NCDAsset extends BaseAsset {
  asset_type: 'NCD'
  issuer_name: string
  face_value: number
  units: number
  coupon_rate: number
  maturity_date: string
  purchase_price: number
  current_price: number
}

export interface NPSAsset extends BaseAsset {
  asset_type: 'NPS'
  pran_number_last4: string
  scheme_name: string
  tier: 'Tier-I' | 'Tier-II'
  nav: number
  units: number
  total_invested: number
}

export interface StockIndiaAsset extends BaseAsset {
  asset_type: 'STOCK_INDIA'
  symbol: string
  company_name: string
  quantity: number
  avg_buy_price: number
  exchange: 'NSE' | 'BSE'
}

export interface StockUSAsset extends BaseAsset {
  asset_type: 'STOCK_US'
  symbol: string
  company_name: string
  quantity: number
  avg_buy_price: number
  currency: 'USD'
}

export interface MutualFundIndiaAsset extends BaseAsset {
  asset_type: 'MUTUAL_FUND_INDIA'
  scheme_name: string
  folio_number_last4: string
  units: number
  purchase_nav: number
  scheme_type: 'Equity' | 'Debt' | 'Hybrid' | 'Index'
}

export interface MutualFundUSAsset extends BaseAsset {
  asset_type: 'MUTUAL_FUND_US'
  fund_name: string
  ticker: string
  units: number
  purchase_price: number
  currency: 'USD'
}

export interface EPFPPFAsset extends BaseAsset {
  asset_type: 'EPF_PPF'
  account_type: 'EPF' | 'PPF'
  account_number_last4: string
  balance: number
  currency: 'INR'
}

export interface RealEstateAsset extends BaseAsset {
  asset_type: 'REAL_ESTATE'
  property_type: 'Residential' | 'Commercial' | 'Land'
  location: string
  area_sqft: number
  purchase_price: number
  current_value: number
  currency: 'INR'
}

export interface CryptoAsset extends BaseAsset {
  asset_type: 'CRYPTO'
  coin_symbol: string
  coin_name: string
  quantity: number
  avg_buy_price_usd: number
}

export interface VehicleAsset extends BaseAsset {
  asset_type: 'VEHICLE'
  vehicle_type: 'Car' | 'Bike' | 'Other'
  make_model: string
  year: number
  purchase_price: number
  current_value: number
  currency: 'INR'
}

export interface OtherAsset extends BaseAsset {
  asset_type: 'OTHER'
  category: string
  purchase_price: number
  current_value: number
  currency: Currency
}

export type Asset = 
  | BankIndiaAsset
  | BankForeignAsset
  | GoldPhysicalAsset
  | GoldETFSGBAsset
  | NCDAsset
  | NPSAsset
  | StockIndiaAsset
  | StockUSAsset
  | MutualFundIndiaAsset
  | MutualFundUSAsset
  | EPFPPFAsset
  | RealEstateAsset
  | CryptoAsset
  | VehicleAsset
  | OtherAsset

export const ASSET_TYPE_CONFIG: Record<AssetType, { label: string; icon: string; color: string }> = {
  BANK_INDIA: { label: 'Bank (India)', icon: '🏦', color: '#00d4aa' },
  BANK_FOREIGN: { label: 'Bank (Foreign)', icon: '🌐', color: '#0099ff' },
  GOLD_PHYSICAL: { label: 'Physical Gold', icon: '🥇', color: '#ffc848' },
  GOLD_ETF_SGB: { label: 'Gold ETF/SGB', icon: '📊', color: '#ffa500' },
  NCD: { label: 'NCD', icon: '📄', color: '#a855f7' },
  NPS: { label: 'NPS', icon: '🏛', color: '#8a9ab0' },
  STOCK_INDIA: { label: 'Stocks (India)', icon: '📈', color: '#00d4aa' },
  STOCK_US: { label: 'Stocks (US)', icon: '🇺🇸', color: '#0099ff' },
  MUTUAL_FUND_INDIA: { label: 'Mutual Funds (India)', icon: '💼', color: '#00d4aa' },
  MUTUAL_FUND_US: { label: 'Mutual Funds (US)', icon: '💰', color: '#0099ff' },
  EPF_PPF: { label: 'EPF/PPF', icon: '🏛', color: '#4a5568' },
  REAL_ESTATE: { label: 'Real Estate', icon: '🏠', color: '#ff4d6a' },
  CRYPTO: { label: 'Cryptocurrency', icon: '₿', color: '#ffc848' },
  VEHICLE: { label: 'Vehicle', icon: '🚗', color: '#8a9ab0' },
  OTHER: { label: 'Other Assets', icon: '📦', color: '#4a5568' },
}

export interface MonthlySnapshot {
  id: string
  user_id: string
  snapshot_date: string // YYYY-MM-DD (1st of month)
  total_assets_inr: number
  total_liabilities_inr: number
  net_worth_inr: number
  asset_breakdown: Record<AssetType, number> // value in INR
  created_at: string
  updated_at: string
}
