-- ============================================================================
-- Add missing indexes on assets table
--
-- 1. Partial UNIQUE index on asset_number (non-deleted rows only).
--    The app already catches duplicate-key error 23505, but the DB had no
--    constraint to enforce it.  Partial so that soft-deleted rows don't block
--    reuse of an asset number.
--
-- 2. Partial index on qr_code_data (non-deleted, non-null rows).
--    getAssetByQRCode() filters on qr_code_data = ? AND deleted_at IS NULL
--    but was doing a full seq-scan.
-- ============================================================================

-- Enforce one live asset per asset_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_unique_asset_number
  ON assets (asset_number)
  WHERE deleted_at IS NULL;

-- Speed up QR-code lookups
CREATE INDEX IF NOT EXISTS idx_assets_qr_code_data
  ON assets (qr_code_data)
  WHERE deleted_at IS NULL AND qr_code_data IS NOT NULL;
