-- C-2: Change get_fleet_statistics() from SECURITY DEFINER to SECURITY INVOKER
-- Prevents RLS bypass if row-level asset isolation is ever added
CREATE OR REPLACE FUNCTION get_fleet_statistics()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_assets',    COUNT(*),
    'serviced',        COUNT(*) FILTER (WHERE status = 'serviced'),
    'maintenance',     COUNT(*) FILTER (WHERE status = 'maintenance'),
    'out_of_service',  COUNT(*) FILTER (WHERE status = 'out_of_service'),
    'trailer_count',   COUNT(*) FILTER (WHERE category = 'trailer'),
    'dolly_count',     COUNT(*) FILTER (WHERE category = 'dolly')
  )
  FROM assets
  WHERE deleted_at IS NULL;
$$;

-- C-3: Drop redundant service_role RLS policies
-- service_role has bypassrls privilege; these policies are dead code
-- and fragile (depend on JWT claims structure)
DROP POLICY IF EXISTS push_tokens_service_role ON push_tokens;
DROP POLICY IF EXISTS notification_log_service_role ON notification_log;
DROP POLICY IF EXISTS rego_lookup_log_service_role ON rego_lookup_log;
