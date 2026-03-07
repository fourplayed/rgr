-- ============================================================================
-- DB Review Fixes (2026-03-19)
--
-- Addresses security, data integrity, and performance issues identified by
-- the db-review audit. Grouped by criticality.
-- ============================================================================

-- ============================================================================
-- A1. cancel_maintenance_task — add role check (Critical)
--
-- Previously any authenticated user could call this SECURITY DEFINER function
-- and delete maintenance records. Now gates on mechanic/manager/superuser,
-- matching the accept_defect_report pattern.
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_maintenance_task(p_maintenance_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF auth_user_role() NOT IN ('mechanic', 'manager', 'superuser') THEN
    RAISE EXCEPTION 'Insufficient role to cancel maintenance tasks';
  END IF;

  -- Delete linked defects first (before FK SET NULL clears the link)
  DELETE FROM defect_reports WHERE maintenance_record_id = p_maintenance_id;
  -- Delete the maintenance record (triggers handle asset status reversion)
  DELETE FROM maintenance_records WHERE id = p_maintenance_id;
END;
$$;


-- ============================================================================
-- A2. audit_log_insert_auth — restrict to own user_id (Critical)
--
-- The previous WITH CHECK (TRUE) allowed any authenticated user to insert
-- audit log entries attributed to other users. This restricts inserts to
-- rows matching the caller's auth.uid().
-- ============================================================================

DROP POLICY IF EXISTS "audit_log_insert_auth" ON audit_log;
CREATE POLICY "audit_log_insert_auth" ON audit_log FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());


-- ============================================================================
-- A3. Revert asset location when a scan event is deleted (Critical)
--
-- When a scan is undone (deleted), the asset's last-known location should
-- revert to the previous scan's location, or NULL if no scans remain.
-- ============================================================================

CREATE OR REPLACE FUNCTION revert_asset_location_on_scan_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev RECORD;
BEGIN
  -- Find the most recent remaining scan for this asset
  SELECT latitude, longitude, location_description, created_at
  INTO v_prev
  FROM scan_events
  WHERE asset_id = OLD.asset_id
    AND id != OLD.id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_prev IS NOT NULL THEN
    UPDATE assets
    SET last_latitude = v_prev.latitude,
        last_longitude = v_prev.longitude,
        last_location_updated_at = v_prev.created_at,
        updated_at = now()
    WHERE id = OLD.asset_id;
  ELSE
    -- No scans remain — clear location
    UPDATE assets
    SET last_latitude = NULL,
        last_longitude = NULL,
        last_location_updated_at = NULL,
        updated_at = now()
    WHERE id = OLD.asset_id;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_revert_asset_location_on_scan_delete
  AFTER DELETE ON scan_events
  FOR EACH ROW
  EXECUTE FUNCTION revert_asset_location_on_scan_delete();


-- ============================================================================
-- A4. maybe_revert_asset_to_serviced — add FOR UPDATE lock (Important)
--
-- Prevents a TOCTOU race where two concurrent defect resolutions both read
-- status = 'maintenance' and both attempt to revert. The FOR UPDATE lock
-- serializes the critical section.
-- ============================================================================

CREATE OR REPLACE FUNCTION maybe_revert_asset_to_serviced(p_asset_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Lock the asset row to serialize concurrent revert attempts
  SELECT status INTO v_current_status
  FROM assets
  WHERE id = p_asset_id
  FOR UPDATE;

  IF v_current_status IS DISTINCT FROM 'maintenance' THEN
    RETURN;
  END IF;

  -- Atomic revert: only if no open defects AND no scheduled maintenance
  UPDATE assets
  SET status = 'serviced', updated_at = now()
  WHERE id = p_asset_id
    AND status = 'maintenance'
    AND NOT EXISTS (
      SELECT 1 FROM defect_reports
      WHERE asset_id = p_asset_id
        AND status IN ('reported', 'accepted')
    )
    AND NOT EXISTS (
      SELECT 1 FROM maintenance_records
      WHERE asset_id = p_asset_id
        AND status = 'scheduled'
    );
END;
$$;


-- ============================================================================
-- A5. Drop redundant indexes (Important)
--
-- idx_count_items_session on (session_id) is covered by
-- idx_count_items_session_combination on (session_id, combination_id).
-- idx_combination_photos_session on (session_id) is a single-column index
-- on a small table where the FK cascade handles cleanup.
-- ============================================================================

DROP INDEX IF EXISTS idx_combination_photos_session;
DROP INDEX IF EXISTS idx_count_items_session;


-- ============================================================================
-- A6. freight_analysis.photo_id — enforce uniqueness (Important)
--
-- Each photo should have at most one freight analysis row. Replace the
-- non-unique index with a UNIQUE index to enforce this at the DB level.
-- ============================================================================

DROP INDEX IF EXISTS idx_freight_analysis_photo;
CREATE UNIQUE INDEX idx_freight_analysis_photo ON freight_analysis(photo_id);


-- ============================================================================
-- A7. accept_defect_report — optimize SELECT (Important)
--
-- Replace SELECT * with only the columns we actually use in the function body
-- (status, reported_by, asset_id). Reduces row transfer overhead.
-- ============================================================================

CREATE OR REPLACE FUNCTION accept_defect_report(
  p_defect_report_id UUID,
  p_maintenance_input JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_maintenance_id UUID;
  v_defect RECORD;
  v_caller_role user_role;
BEGIN
  -- Check caller has sufficient role
  v_caller_role := auth_user_role();
  IF v_caller_role NOT IN ('mechanic', 'manager', 'superuser') THEN
    RAISE EXCEPTION 'Insufficient role to accept defect reports';
  END IF;

  -- Validate defect exists and is in 'reported' status (select only needed columns)
  SELECT status, reported_by, asset_id
  INTO v_defect
  FROM defect_reports
  WHERE id = p_defect_report_id;

  IF v_defect IS NULL THEN
    RAISE EXCEPTION 'Defect report not found';
  END IF;

  IF v_defect.status != 'reported' THEN
    RAISE EXCEPTION 'Cannot accept: status is %', v_defect.status;
  END IF;

  -- Prevent mechanic self-acceptance (reporter cannot accept own report)
  IF v_caller_role = 'mechanic' AND v_defect.reported_by = auth.uid() THEN
    RAISE EXCEPTION 'Cannot accept your own defect report';
  END IF;

  -- Create maintenance record from JSONB input
  INSERT INTO maintenance_records (
    asset_id,
    title,
    description,
    priority,
    status,
    maintenance_type,
    reported_by,
    assigned_to,
    scheduled_date,
    due_date,
    hazard_alert_id,
    scan_event_id,
    notes
  )
  VALUES (
    (p_maintenance_input->>'asset_id')::UUID,
    p_maintenance_input->>'title',
    p_maintenance_input->>'description',
    COALESCE(p_maintenance_input->>'priority', 'medium'),
    COALESCE(p_maintenance_input->>'status', 'scheduled'),
    p_maintenance_input->>'maintenance_type',
    (p_maintenance_input->>'reported_by')::UUID,
    (p_maintenance_input->>'assigned_to')::UUID,
    (p_maintenance_input->>'scheduled_date')::TIMESTAMPTZ,
    (p_maintenance_input->>'due_date')::TIMESTAMPTZ,
    (p_maintenance_input->>'hazard_alert_id')::UUID,
    (p_maintenance_input->>'scan_event_id')::UUID,
    p_maintenance_input->>'notes'
  )
  RETURNING id INTO v_maintenance_id;

  -- Atomically update defect status and link maintenance record
  UPDATE defect_reports
  SET
    status = 'accepted',
    accepted_at = NOW(),
    maintenance_record_id = v_maintenance_id
  WHERE id = p_defect_report_id
    AND status = 'reported';

  -- Verify the update actually happened (optimistic concurrency)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update defect status — it may have been modified by another request';
  END IF;

  RETURN jsonb_build_object(
    'maintenance_id', v_maintenance_id,
    'defect_report_id', p_defect_report_id
  );
END;
$$;


-- ============================================================================
-- A8. maintenance_type CHECK constraint (Important)
--
-- Enforces valid maintenance_type values at the database level, preventing
-- invalid strings from being stored.
-- ============================================================================

ALTER TABLE maintenance_records ADD CONSTRAINT chk_maintenance_type
  CHECK (maintenance_type IS NULL OR maintenance_type IN ('scheduled', 'reactive', 'inspection', 'defect_report'));
