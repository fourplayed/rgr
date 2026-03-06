-- ============================================================================
-- Fix accept_defect_report: replace non-existent 'admin' with 'superuser'
--
-- The user_role enum is ('driver','mechanic','manager','superuser').
-- The previous migration used 'admin' which doesn't exist in the enum,
-- silently blocking superusers from accepting defect reports.
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
