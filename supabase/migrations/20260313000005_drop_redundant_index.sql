-- ============================================================================
-- Drop redundant index idx_combination_metadata_session
--
-- idx_combination_metadata_session indexes (session_id) which is a prefix of
-- idx_combination_metadata_combination on (session_id, combination_id).
-- The composite index serves all queries that the single-column index would,
-- making it purely redundant write overhead.
-- ============================================================================

DROP INDEX IF EXISTS idx_combination_metadata_session;
