-- ============================================================================
-- Maintenance management indexes and RPC
--
-- This migration adds:
-- 1. Composite index for status/priority filtering (most common query pattern)
-- 2. Simple index on status for dashboard counts
-- 3. RPC function for efficient maintenance statistics
-- ============================================================================

-- Composite index for filtered list queries: status + priority + created_at ordering
-- Covers: "Show me scheduled or in_progress records, sorted by newest"
CREATE INDEX IF NOT EXISTS idx_maintenance_status_priority_created
  ON maintenance_records (status, priority, created_at DESC);

-- Simple status index for dashboard filtering and counts
CREATE INDEX IF NOT EXISTS idx_maintenance_status_only
  ON maintenance_records (status);

-- RPC function for dashboard statistics
-- Returns counts by status plus overdue count in a single efficient query
CREATE OR REPLACE FUNCTION get_maintenance_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'scheduled', COUNT(*) FILTER (WHERE status = 'scheduled'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'overdue', COUNT(*) FILTER (WHERE status = 'scheduled' AND due_date < CURRENT_DATE)
  ) FROM maintenance_records;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_maintenance_stats() TO authenticated;
