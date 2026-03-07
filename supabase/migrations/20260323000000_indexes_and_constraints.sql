-- ============================================================================
-- Indexes & Coordinate Constraints (2026-03-23)
--
-- Addresses remaining audit findings:
--   Index-2: defect_reports cursor pagination index
--   Index-3: maintenance_records cursor pagination index
--   Index-1: scan_events count estimate function (avoid full COUNT(*))
--   Schema-4: coordinate constraints on assets, scan_events, depots
-- ============================================================================

-- ============================================================================
-- Index-2: defect_reports cursor pagination index
--
-- listDefectReports() paginates with ORDER BY created_at DESC, id DESC
-- and uses a composite cursor (created_at, id) for tie-breaking.
-- Without this index, Postgres does a sequential scan + sort.
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_defect_reports_cursor
  ON defect_reports (created_at DESC, id DESC);


-- ============================================================================
-- Index-3: maintenance_records cursor pagination index
--
-- Same pattern as defect_reports: cursor-based pagination with
-- (created_at DESC, id DESC) ordering.
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_maintenance_records_cursor
  ON maintenance_records (created_at DESC, id DESC);


-- ============================================================================
-- Index-1: Fast scan count estimate
--
-- getTotalScanCount() uses COUNT(*) which is O(N) in Postgres due to MVCC.
-- This function returns the estimated row count from pg_stat_user_tables,
-- which is updated by autovacuum/ANALYZE and is accurate within a few percent.
-- For dashboard display purposes, this is sufficient and returns in <1ms
-- versus potentially seconds for a full COUNT(*) on large tables.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_scan_count_estimate()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(n_live_tup, 0)::BIGINT
  FROM pg_stat_user_tables
  WHERE relname = 'scan_events';
$$;


-- ============================================================================
-- Schema-4: Coordinate constraints on assets, scan_events, depots
--
-- The photos table already has latitude/longitude CHECK constraints
-- (photos_latitude_range, photos_longitude_range). Apply the same
-- validation to all other tables that store coordinates.
-- ============================================================================

-- Assets (last_latitude, last_longitude)
ALTER TABLE assets
  ADD CONSTRAINT assets_latitude_range
    CHECK (last_latitude IS NULL OR (last_latitude >= -90 AND last_latitude <= 90)),
  ADD CONSTRAINT assets_longitude_range
    CHECK (last_longitude IS NULL OR (last_longitude >= -180 AND last_longitude <= 180));

-- Scan events (latitude, longitude)
ALTER TABLE scan_events
  ADD CONSTRAINT scan_events_latitude_range
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  ADD CONSTRAINT scan_events_longitude_range
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Depots (latitude, longitude)
ALTER TABLE depots
  ADD CONSTRAINT depots_latitude_range
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  ADD CONSTRAINT depots_longitude_range
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
