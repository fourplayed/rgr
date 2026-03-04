-- ============================================================================
-- Asset Scan Context RPC + Undo support
-- Provides a single-round-trip RPC for the mechanic scan context card,
-- a partial index on defect_reports for open statuses, and a DELETE policy
-- on scan_events so users can undo their own recent scans.
-- ============================================================================

-- ── 1. Mechanic context card RPC ────────────────────────────────────────────
-- Returns open defect/task counts plus the top-3 items in one round-trip.

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
      WHERE asset_id = p_asset_id AND status IN ('scheduled', 'in_progress')
    ),
    'open_defects', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT id, title, status, created_at FROM defect_reports
            WHERE asset_id = p_asset_id AND status IN ('reported', 'accepted')
            ORDER BY created_at DESC
            LIMIT 3) d
    ),
    'active_tasks', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status, 'priority', priority, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT id, title, status, priority, created_at FROM maintenance_records
            WHERE asset_id = p_asset_id AND status IN ('scheduled', 'in_progress')
            ORDER BY created_at DESC
            LIMIT 3) m
    )
  );
END;
$$;

-- ── 2. Partial index on defect_reports for open statuses ────────────────────
-- Mirrors the existing idx_maintenance_asset_active on maintenance_records.

CREATE INDEX IF NOT EXISTS idx_defect_reports_asset_open
  ON defect_reports (asset_id) WHERE status IN ('reported', 'accepted');

-- ── 3. Undo support: DELETE policy on scan_events ───────────────────────────
-- Users can only delete their own scans created within the last 30 seconds.
-- The mobile undo toast has an 8-second window; 30s provides a generous margin.

CREATE POLICY "scan_events_delete_own_recent"
    ON scan_events FOR DELETE
    TO authenticated
    USING (
        scanned_by = auth.uid()
        AND created_at > now() - interval '30 seconds'
    );
