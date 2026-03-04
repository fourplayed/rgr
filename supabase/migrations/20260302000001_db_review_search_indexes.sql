-- ============================================================================
-- DB Review: Replace dead expression GIN index with per-column indexes
--
-- The original idx_assets_search_trgm was an expression index on a
-- concatenated string. PostgreSQL cannot use expression GIN indexes for
-- individual column ILIKE/similarity queries — making it dead weight.
--
-- Replace with per-column trigram indexes on the 4 high-selectivity
-- short-field columns. Skip `description` (low selectivity on free-text,
-- trigram matching produces many false positives).
-- ============================================================================

DROP INDEX IF EXISTS idx_assets_search_trgm;

CREATE INDEX IF NOT EXISTS idx_assets_asset_number_trgm
    ON assets USING gin (asset_number gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_make_trgm
    ON assets USING gin (make gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_model_trgm
    ON assets USING gin (model gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_registration_trgm
    ON assets USING gin (registration_number gin_trgm_ops) WHERE deleted_at IS NULL;
