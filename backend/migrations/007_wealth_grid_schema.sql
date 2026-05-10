-- Migration 007: Wealth Grid Schema
-- Add wealth_columns table and modify wealth_snapshots for grid functionality

-- Create wealth_columns table
CREATE TABLE IF NOT EXISTS wealth_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  asset_type TEXT,
  color TEXT NOT NULL DEFAULT '#0099ff',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for wealth_columns
ALTER TABLE wealth_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own columns"
  ON wealth_columns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own columns"
  ON wealth_columns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own columns"
  ON wealth_columns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own columns"
  ON wealth_columns FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_wealth_columns_user_id ON wealth_columns(user_id);
CREATE INDEX idx_wealth_columns_sort_order ON wealth_columns(user_id, sort_order) WHERE is_active = true;

-- Create wealth_assets table (if not exists)
CREATE TABLE IF NOT EXISTS wealth_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  description TEXT,
  balance_inr NUMERIC DEFAULT 0,
  symbol TEXT,
  quantity NUMERIC,
  avg_buy_price NUMERIC,
  exchange TEXT,
  company_name TEXT,
  weight_grams NUMERIC,
  purity TEXT,
  purchase_price_per_gram NUMERIC,
  bank_name TEXT,
  account_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wealth_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own assets"
  ON wealth_assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create wealth_snapshots table (if not exists)
CREATE TABLE IF NOT EXISTS wealth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_inr NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE wealth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own snapshots"
  ON wealth_snapshots FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add grid columns to wealth_snapshots
ALTER TABLE wealth_snapshots 
  ADD COLUMN IF NOT EXISTS column_config JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS row_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_calculated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS manually_overridden JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN wealth_snapshots.column_config IS 'Ordered list of asset columns: [{ id, label, type, color }]';
COMMENT ON COLUMN wealth_snapshots.row_data IS 'Cell values for each column: { [column_id]: value_inr }';
COMMENT ON COLUMN wealth_snapshots.manually_overridden IS 'Track which cells were manually edited: { [column_id]: true }';

-- Create index for faster grid queries
CREATE INDEX idx_wealth_snapshots_month ON wealth_snapshots(user_id, snapshot_date DESC);
