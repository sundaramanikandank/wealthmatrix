-- ============================================================================
-- Options Strategy Builder - Supabase Database Setup
-- ============================================================================
-- Run this SQL in your Supabase SQL Editor after creating a new project
-- ============================================================================

-- Table: strategies
-- Stores saved option strategies for users
CREATE TABLE IF NOT EXISTS public.strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    instrument TEXT NOT NULL CHECK (instrument IN ('NIFTY', 'BANKNIFTY')),
    legs JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: paper_positions
-- Stores paper trading positions for users
CREATE TABLE IF NOT EXISTS public.paper_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy_name TEXT NOT NULL,
    instrument TEXT NOT NULL CHECK (instrument IN ('NIFTY', 'BANKNIFTY')),
    legs JSONB NOT NULL,
    entry_premium NUMERIC,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    exit_premium NUMERIC,
    exit_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON public.strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_created_at ON public.strategies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paper_positions_user_id ON public.paper_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_positions_status ON public.paper_positions(status);
CREATE INDEX IF NOT EXISTS idx_paper_positions_entry_date ON public.paper_positions(entry_date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for strategies table
-- ============================================================================

-- Policy: Users can view only their own strategies
CREATE POLICY "Users can view own strategies"
    ON public.strategies
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own strategies
CREATE POLICY "Users can insert own strategies"
    ON public.strategies
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own strategies
CREATE POLICY "Users can update own strategies"
    ON public.strategies
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own strategies
CREATE POLICY "Users can delete own strategies"
    ON public.strategies
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- RLS Policies for paper_positions table
-- ============================================================================

-- Policy: Users can view only their own positions
CREATE POLICY "Users can view own positions"
    ON public.paper_positions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own positions
CREATE POLICY "Users can insert own positions"
    ON public.paper_positions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own positions
CREATE POLICY "Users can update own positions"
    ON public.paper_positions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own positions
CREATE POLICY "Users can delete own positions"
    ON public.paper_positions
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- Trigger to auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.strategies
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- Verify setup
-- ============================================================================

-- Run these queries to verify tables were created successfully:
-- SELECT * FROM public.strategies LIMIT 1;
-- SELECT * FROM public.paper_positions LIMIT 1;

-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
