-- ============================================================================
-- Add get_asset_counts_by_status() RPC function and missing indexes
--
-- This migration adds:
-- 1. Simple RPC function for asset counts by status (lighter than get_fleet_statistics)
-- 2. Index on assets.created_at for time-based queries
-- ============================================================================

-- Simple RPC function to get asset counts by status
-- Returns table format for easy consumption: [{status: 'serviced', count: 10}, ...]
CREATE OR REPLACE FUNCTION get_asset_counts_by_status()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    status::text,
    COUNT(*) as count
  FROM assets
  WHERE deleted_at IS NULL
  GROUP BY status;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_asset_counts_by_status() TO authenticated;

-- Index on assets.created_at for time-based queries (newest assets, reporting, etc.)
CREATE INDEX IF NOT EXISTS idx_assets_created_at
  ON assets (created_at DESC)
  WHERE deleted_at IS NULL;
