-- ============================================================================
-- bulk_cancel_maintenance_tasks() — batch delete maintenance + linked defects
--
-- Replaces N × cancel_maintenance_task() RPC calls from admin.ts
-- bulkCancelMaintenanceTasks() with a single atomic transaction.
--
-- Returns the IDs that were actually deleted (callers compare against input
-- to detect which IDs were not found / filtered by RLS).
--
-- Uses SECURITY INVOKER to respect existing RLS policies:
--   - maintenance_delete_manager (managers+ can delete)
--   - defect_reports_delete_manager (managers+ can delete)
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_cancel_maintenance_tasks(p_ids UUID[])
RETURNS TABLE(cancelled_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- No-op for empty input
  IF COALESCE(array_length(p_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;

  -- Guard against unreasonable batch sizes
  IF array_length(p_ids, 1) > 100 THEN
    RAISE EXCEPTION 'Batch size exceeds maximum of 100';
  END IF;

  -- Delete linked defect reports first (before FK ON DELETE SET NULL clears the link).
  -- This fires trg_revert_asset_status_on_defect_delete per row.
  DELETE FROM defect_reports
  WHERE maintenance_record_id = ANY(p_ids);

  -- Delete the maintenance records themselves.
  -- This fires trg_revert_asset_status_on_maintenance_delete per row.
  RETURN QUERY
    DELETE FROM maintenance_records
    WHERE id = ANY(p_ids)
    RETURNING id;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_cancel_maintenance_tasks(UUID[])
  TO authenticated;

-- ============================================================================
-- Also fix existing cancel_maintenance_task to use SECURITY INVOKER
-- (audit finding: SECURITY DEFINER bypasses RLS without ownership check
-- for managers/superusers — INVOKER delegates to the existing RLS policies)
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_maintenance_task(p_maintenance_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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
