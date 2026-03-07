-- ============================================================================
-- RPC Security Hardening
--
-- Fixes three security gaps identified in the codebase audit:
--   1. cancel_maintenance_task() checks role but not ownership
--   2. defect_reports/maintenance_records INSERT policies allow attribution spoofing
--   3. accept_defect_report() accepts arbitrary status from input
-- ============================================================================

-- ============================================================================
-- 1. cancel_maintenance_task: add ownership check
--
-- A mechanic should only cancel their own tasks. Managers and superusers
-- can cancel any task. This prevents a mechanic from deleting records
-- they didn't create.
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_maintenance_task(p_maintenance_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_role user_role;
  v_reporter UUID;
BEGIN
  v_role := auth_user_role();
  IF v_role NOT IN ('mechanic', 'manager', 'superuser') THEN
    RAISE EXCEPTION 'Insufficient role to cancel maintenance tasks';
  END IF;

  -- Mechanics can only cancel tasks they reported
  IF v_role = 'mechanic' THEN
    SELECT reported_by INTO v_reporter
      FROM maintenance_records WHERE id = p_maintenance_id;

    IF v_reporter IS NULL THEN
      RAISE EXCEPTION 'Maintenance record not found';
    END IF;

    IF v_reporter != auth.uid() THEN
      RAISE EXCEPTION 'You can only cancel your own maintenance tasks';
    END IF;
  END IF;

  -- Delete linked defects first (before FK SET NULL clears the link)
  DELETE FROM defect_reports WHERE maintenance_record_id = p_maintenance_id;
  -- Delete the maintenance record (triggers handle asset status reversion)
  DELETE FROM maintenance_records WHERE id = p_maintenance_id;
END;
$$;


-- ============================================================================
-- 2. Tighten INSERT policies to enforce reported_by = auth.uid()
--
-- Admins (manager/superuser) can still insert records, but reported_by
-- must match their own UID. This prevents attribution spoofing via
-- direct PostgREST calls.
-- ============================================================================

-- defect_reports: replace insert policy
DROP POLICY IF EXISTS "defect_reports_insert_mechanic_or_above" ON defect_reports;
CREATE POLICY "defect_reports_insert_mechanic_or_above"
    ON defect_reports FOR INSERT
    TO authenticated
    WITH CHECK (
      is_mechanic_or_above()
      AND reported_by = auth.uid()
    );

-- maintenance_records: replace insert policy
-- Note: the accept_defect_report() RPC uses SECURITY INVOKER so it still
-- goes through RLS. The RPC sets reported_by from input, so we allow
-- manager/superuser to set reported_by to auth.uid() (which the RPC does).
DROP POLICY IF EXISTS "maintenance_insert_mechanic_or_above" ON maintenance_records;
DROP POLICY IF EXISTS "maintenance_insert_manager" ON maintenance_records;
CREATE POLICY "maintenance_insert_mechanic_or_above"
    ON maintenance_records FOR INSERT
    TO authenticated
    WITH CHECK (
      is_mechanic_or_above()
      AND reported_by = auth.uid()
    );


-- ============================================================================
-- 3. accept_defect_report: hardcode status to 'scheduled'
--
-- Previously accepted arbitrary status from JSONB input, allowing a caller
-- to create maintenance records in 'completed' state. Now always 'scheduled'.
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

  -- Validate defect exists and is in 'reported' status
  SELECT * INTO v_defect FROM defect_reports WHERE id = p_defect_report_id;

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

  -- Create maintenance record with hardcoded 'scheduled' status
  -- (ignores any status value from input to prevent status spoofing)
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
    'scheduled',  -- hardcoded: never accept status from client input
    p_maintenance_input->>'maintenance_type',
    auth.uid(),   -- always use caller's UID, not input value
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
    RAISE EXCEPTION 'Failed to update defect status -- it may have been modified by another request';
  END IF;

  RETURN jsonb_build_object(
    'maintenance_id', v_maintenance_id,
    'defect_report_id', p_defect_report_id
  );
END;
$$;
