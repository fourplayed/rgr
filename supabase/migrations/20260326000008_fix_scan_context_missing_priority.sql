-- ============================================================================
-- Fix get_asset_scan_context: restore missing 'priority' field in active_tasks
--
-- Migration 20260326000005 rewrote this function but accidentally dropped
-- the priority column from the active_tasks JSON output. The mobile client
-- expects it (assets.ts:900) and logs a safeParseEnum fallback warning.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_asset_scan_context(p_asset_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'open_defect_count', (
      SELECT count(*) FROM defect_reports
      WHERE asset_id = p_asset_id AND status IN ('reported', 'task_created')
    ),
    'active_task_count', (
      SELECT count(*) FROM maintenance_records
      WHERE asset_id = p_asset_id AND status = 'scheduled'
    ),
    'open_defects', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'description', description, 'status', status, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM defect_reports
      WHERE asset_id = p_asset_id AND status IN ('reported', 'task_created')
    ),
    'active_tasks', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status, 'priority', priority, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM maintenance_records
      WHERE asset_id = p_asset_id AND status = 'scheduled'
    )
  ) INTO result;
  RETURN result;
END;
$$;
