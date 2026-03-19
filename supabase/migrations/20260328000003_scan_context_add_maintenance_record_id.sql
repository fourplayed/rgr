-- ============================================================================
-- Add maintenance_record_id to open_defects in get_asset_scan_context()
--
-- Accepted defects (status = 'task_created') have a linked maintenance record.
-- The mobile client needs this ID to open the MaintenanceDetailModal directly
-- when tapping an accepted defect in the scan confirmation Open Items tab.
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
        'id', id, 'title', title, 'description', description, 'status', status,
        'maintenance_record_id', maintenance_record_id, 'created_at', created_at
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
