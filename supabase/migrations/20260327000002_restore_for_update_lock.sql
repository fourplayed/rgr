-- H-1: Restore FOR UPDATE lock on maybe_revert_asset_to_serviced()
-- Without the lock, two concurrent trigger executions can both see
-- "no open defects" and race to update the asset status.
-- The explicit SELECT ... FOR UPDATE serializes concurrent calls.
CREATE OR REPLACE FUNCTION maybe_revert_asset_to_serviced(p_asset_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Lock the asset row to prevent TOCTOU race
  SELECT status INTO v_status FROM assets WHERE id = p_asset_id FOR UPDATE;

  -- Only revert if currently in maintenance
  IF v_status IS DISTINCT FROM 'maintenance' THEN
    RETURN;
  END IF;

  -- Revert to serviced only if no open defects or scheduled maintenance remain
  UPDATE assets
  SET status = 'serviced', updated_at = now()
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
