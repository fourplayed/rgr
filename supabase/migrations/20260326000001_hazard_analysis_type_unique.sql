-- ============================================================================
-- Unique constraint on (freight_analysis_id, hazard_type)
--
-- Prerequisite for submit_hazard_feedback() RPC which uses UPDATE ... FROM
-- unnest() and relies on this pair being unique per analysis.
--
-- Uses CONCURRENTLY to avoid locking the table during creation.
-- NOTE: This migration must NOT be wrapped in a transaction.
-- ============================================================================

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
  idx_hazard_alerts_analysis_type_uniq
  ON hazard_alerts (freight_analysis_id, hazard_type);
