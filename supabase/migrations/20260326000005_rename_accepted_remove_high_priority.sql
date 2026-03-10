-- ============================================================================
-- 1. Rename defect_status 'accepted' → 'task_created'
-- 2. Remove maintenance_priority 'high' (migrate existing rows to 'medium')
--
-- PostgreSQL 10+ supports ALTER TYPE ... RENAME VALUE for (1).
-- For (2), PG has no DROP VALUE — must recreate the enum type.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- PART 1: Rename defect_status 'accepted' → 'task_created'
-- ────────────────────────────────────────────────────────────────────────────

ALTER TYPE defect_status RENAME VALUE 'accepted' TO 'task_created';

-- Rebuild all functions/triggers that reference the old value.

-- 1a. resolve_linked_defects() — auto-resolve trigger
CREATE OR REPLACE FUNCTION resolve_linked_defects()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        UPDATE defect_reports
        SET status = 'resolved',
            resolved_at = NOW()
        WHERE maintenance_record_id = NEW.id
          AND status = 'task_created';
    END IF;
    IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
        UPDATE defect_reports
        SET status = 'dismissed',
            dismissed_at = NOW(),
            dismissed_reason = 'Linked maintenance task was cancelled'
        WHERE maintenance_record_id = NEW.id
          AND status = 'task_created';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1b. accept_defect_report() — now sets status to 'task_created'
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
  v_caller_role := auth_user_role();
  IF v_caller_role NOT IN ('mechanic', 'manager', 'superuser') THEN
    RAISE EXCEPTION 'Insufficient role to accept defect reports';
  END IF;

  SELECT * INTO v_defect FROM defect_reports WHERE id = p_defect_report_id;

  IF v_defect IS NULL THEN
    RAISE EXCEPTION 'Defect report not found';
  END IF;

  IF v_defect.status != 'reported' THEN
    RAISE EXCEPTION 'Cannot accept: status is %', v_defect.status;
  END IF;

  IF v_caller_role = 'mechanic' AND v_defect.reported_by = auth.uid() THEN
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
    COALESCE(p_maintenance_input->>'priority', 'medium'),
    'scheduled',
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

-- 1c. get_defect_report_stats() — update count label
CREATE OR REPLACE FUNCTION get_defect_report_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'reported', COUNT(*) FILTER (WHERE status = 'reported'),
    'task_created', COUNT(*) FILTER (WHERE status = 'task_created'),
    'resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
    'dismissed', COUNT(*) FILTER (WHERE status = 'dismissed')
  ) FROM defect_reports;
$$;

-- 1d. get_asset_scan_context() — update IN clauses
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
        'id', id, 'title', title, 'description', description, 'status', status, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM defect_reports
      WHERE asset_id = p_asset_id AND status IN ('reported', 'task_created')
    ),
    'active_tasks', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM maintenance_records
      WHERE asset_id = p_asset_id AND status = 'scheduled'
    )
  ) INTO result;
  RETURN result;
END;
$$;

-- 1e. maybe_revert_asset_to_serviced() — update IN clause
CREATE OR REPLACE FUNCTION maybe_revert_asset_to_serviced(p_asset_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE assets
  SET status = 'serviced'
  WHERE id = p_asset_id
    AND status = 'maintenance'
    AND NOT EXISTS (
      SELECT 1 FROM defect_reports
      WHERE asset_id = p_asset_id
        AND status IN ('reported', 'task_created')
    )
    AND NOT EXISTS (
      SELECT 1 FROM maintenance_records
      WHERE asset_id = p_asset_id
        AND status = 'scheduled'
    );
END;
$$;

-- 1f. Rebuild partial index with new status value
DROP INDEX IF EXISTS idx_defect_reports_asset_open;
CREATE INDEX idx_defect_reports_asset_open
  ON defect_reports (asset_id) WHERE status IN ('reported', 'task_created');


-- ────────────────────────────────────────────────────────────────────────────
-- PART 2: Remove maintenance_priority 'high' → migrate to 'medium'
-- ────────────────────────────────────────────────────────────────────────────

-- Step 1: Migrate existing 'high' rows to 'medium'
UPDATE maintenance_records SET priority = 'medium' WHERE priority = 'high';

-- Step 2: Drop the index that depends on the priority column type
DROP INDEX IF EXISTS idx_maintenance_status_priority_created;

-- Step 3: Drop default, swap column to text, recreate enum, swap back, restore default
ALTER TABLE maintenance_records ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE maintenance_records ALTER COLUMN priority TYPE text;
DROP TYPE maintenance_priority;
CREATE TYPE maintenance_priority AS ENUM ('low', 'medium', 'critical');
ALTER TABLE maintenance_records
  ALTER COLUMN priority TYPE maintenance_priority USING priority::maintenance_priority;
ALTER TABLE maintenance_records ALTER COLUMN priority SET DEFAULT 'medium'::maintenance_priority;

-- Step 4: Rebuild the composite index
CREATE INDEX idx_maintenance_status_priority_created
  ON maintenance_records (status, priority, created_at DESC);
