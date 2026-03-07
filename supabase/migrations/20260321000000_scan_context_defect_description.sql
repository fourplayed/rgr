-- Add description to open_defects; remove LIMIT 3 so all items are returned
-- (the open items tab is scrollable, no need to truncate)

CREATE OR REPLACE FUNCTION get_asset_scan_context(p_asset_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
BEGIN
  RETURN jsonb_build_object(
    'open_defect_count', (
      SELECT count(*) FROM defect_reports
      WHERE asset_id = p_asset_id AND status IN ('reported', 'accepted')
    ),
    'active_task_count', (
      SELECT count(*) FROM maintenance_records
      WHERE asset_id = p_asset_id AND status = 'scheduled'
    ),
    'open_defects', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'description', description, 'status', status, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM defect_reports
      WHERE asset_id = p_asset_id AND status IN ('reported', 'accepted')
    ),
    'active_tasks', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status, 'priority', priority, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM maintenance_records
      WHERE asset_id = p_asset_id AND status = 'scheduled'
    )
  );
END;
$$;
