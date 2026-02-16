-- ============================================================================
-- M4: Trigram indexes for ILIKE search on assets
-- M5: BRIN indexes on high-volume append-only tables for time-range queries
-- ============================================================================

-- M4: Enable pg_trgm for trigram-based ILIKE acceleration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Composite GIN index covering the 5 columns used in listAssets() search
-- Only indexes non-deleted assets to keep the index small
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_search_trgm
    ON assets USING gin (
        (
            COALESCE(asset_number, '') || ' ' ||
            COALESCE(make, '') || ' ' ||
            COALESCE(model, '') || ' ' ||
            COALESCE(registration_number, '') || ' ' ||
            COALESCE(description, '')
        ) gin_trgm_ops
    )
    WHERE deleted_at IS NULL;

-- M5: BRIN indexes for time-range queries on append-only tables
-- Much smaller than B-tree, ideal for naturally ordered insert timestamps
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_created_at_brin
    ON scan_events USING brin (created_at)
    WITH (pages_per_range = 32);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at_brin
    ON audit_log USING brin (created_at)
    WITH (pages_per_range = 32);
