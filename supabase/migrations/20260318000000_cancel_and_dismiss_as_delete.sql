-- Migration: cancel_and_dismiss_as_delete
-- Adds an RPC to atomically delete a maintenance task and any linked defects.
-- Existing DELETE triggers handle asset status reversion automatically.

CREATE OR REPLACE FUNCTION cancel_maintenance_task(p_maintenance_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Delete linked defects first (before FK SET NULL clears the link)
  DELETE FROM defect_reports WHERE maintenance_record_id = p_maintenance_id;
  -- Delete the maintenance record (triggers handle asset status reversion)
  DELETE FROM maintenance_records WHERE id = p_maintenance_id;
END;
$$;
