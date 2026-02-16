-- ============================================================================
-- get_fleet_statistics() — server-side aggregation replacing client-side
-- counting of every asset row.
-- Returns a single JSON object with status and category counts.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_fleet_statistics()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
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

-- Grant execute to authenticated users (RLS not applicable to functions,
-- but the underlying query respects deleted_at soft-delete)
GRANT EXECUTE ON FUNCTION get_fleet_statistics() TO authenticated;
