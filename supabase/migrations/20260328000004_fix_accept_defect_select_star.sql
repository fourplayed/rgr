-- Fix: accept_defect_report RPC uses SELECT * which is fragile if columns are
-- added/removed from defect_reports. Pin to only the columns the function body
-- actually references (status, reported_by).

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
  v_defect_status TEXT;
  v_defect_reported_by UUID;
  v_caller_role user_role;
BEGIN
  v_caller_role := auth_user_role();
  IF v_caller_role NOT IN ('mechanic', 'manager', 'superuser') THEN
    RAISE EXCEPTION 'Insufficient role to accept defect reports';
  END IF;

  SELECT status, reported_by
    INTO v_defect_status, v_defect_reported_by
    FROM defect_reports
   WHERE id = p_defect_report_id;

  IF v_defect_status IS NULL THEN
    RAISE EXCEPTION 'Defect report not found';
  END IF;

  IF v_defect_status != 'reported' THEN
    RAISE EXCEPTION 'Cannot accept: status is %', v_defect_status;
  END IF;

  IF v_caller_role = 'mechanic' AND v_defect_reported_by = auth.uid() THEN
    RAISE EXCEPTION 'Cannot accept your own defect report';
  END IF;

  INSERT INTO maintenance_records (
    asset_id, title, description, priority, status, maintenance_type,
    reported_by, assigned_to, scheduled_date, due_date,
    hazard_alert_id, scan_event_id, notes
  )
  VALUES (
    (p_maintenance_input->>'asset_id')::UUID,
    p_maintenance_input->>'title',
    p_maintenance_input->>'description',
    COALESCE(p_maintenance_input->>'priority', 'medium')::maintenance_priority,
    'scheduled'::maintenance_status,
    p_maintenance_input->>'maintenance_type',
    auth.uid(),
    (p_maintenance_input->>'assigned_to')::UUID,
    (p_maintenance_input->>'scheduled_date')::TIMESTAMPTZ,
    (p_maintenance_input->>'due_date')::TIMESTAMPTZ,
    (p_maintenance_input->>'hazard_alert_id')::UUID,
    (p_maintenance_input->>'scan_event_id')::UUID,
    p_maintenance_input->>'notes'
  )
  RETURNING id INTO v_maintenance_id;

  UPDATE defect_reports
  SET
    status = 'task_created',
    accepted_at = NOW(),
    maintenance_record_id = v_maintenance_id
  WHERE id = p_defect_report_id
    AND status = 'reported';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update defect status — it may have been modified by another request';
  END IF;

  RETURN jsonb_build_object(
    'maintenance_id', v_maintenance_id,
    'defect_report_id', p_defect_report_id
  );
END;
$$;
