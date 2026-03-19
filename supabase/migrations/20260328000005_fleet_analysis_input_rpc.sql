-- Consolidate the 15+ sequential queries from fleet-analysis-daily edge function
-- into a single RPC that returns all metrics as JSON.

CREATE OR REPLACE FUNCTION get_fleet_analysis_input()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    -- Fleet statistics (same as get_fleet_statistics)
    'total_assets',    (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL),
    'serviced',        (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL AND status = 'serviced'),
    'maintenance',     (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL AND status = 'maintenance'),
    'out_of_service',  (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL AND status = 'out_of_service'),
    'trailer_count',   (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL AND category = 'trailer'),
    'dolly_count',     (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL AND category = 'dolly'),

    -- Scan volumes
    'scans_24h',       (SELECT COUNT(*) FROM scan_events WHERE created_at > now() - interval '24 hours'),
    'scans_7d',        (SELECT COUNT(*) FROM scan_events WHERE created_at > now() - interval '7 days'),
    'scans_all_time',  (SELECT COUNT(*) FROM scan_events),

    -- Active users (distinct scanners in last 7 days)
    'active_users_7d', (SELECT COUNT(DISTINCT scanned_by) FROM scan_events WHERE created_at > now() - interval '7 days'),

    -- Maintenance by status
    'maintenance_scheduled',   (SELECT COUNT(*) FROM maintenance_records WHERE status = 'scheduled'),
    'maintenance_in_progress', (SELECT COUNT(*) FROM maintenance_records WHERE status = 'in_progress'),
    'maintenance_completed',   (SELECT COUNT(*) FROM maintenance_records WHERE status = 'completed'),
    'maintenance_overdue',     (SELECT COUNT(*) FROM maintenance_records WHERE status = 'scheduled' AND due_date < CURRENT_DATE),

    -- Defects by status
    'defects_open',     (SELECT COUNT(*) FROM defect_reports WHERE status = 'reported'),
    'defects_accepted', (SELECT COUNT(*) FROM defect_reports WHERE status = 'accepted'),
    'defects_resolved', (SELECT COUNT(*) FROM defect_reports WHERE status = 'resolved'),

    -- Overdue registrations
    'overdue_registrations', (SELECT COUNT(*) FROM assets WHERE deleted_at IS NULL AND registration_overdue = true),

    -- Active depot names
    'depots', (SELECT COALESCE(json_agg(name ORDER BY name), '[]'::json) FROM depots WHERE is_active = true)
  );
$$;

-- Only service_role calls this (from the edge function via pg_cron)
GRANT EXECUTE ON FUNCTION get_fleet_analysis_input() TO service_role;
