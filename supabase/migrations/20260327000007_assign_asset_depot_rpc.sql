-- ============================================================================
-- assign_asset_depot() — narrow RPC for depot assignment during scan flow
--
-- Drivers and mechanics scan assets but lack UPDATE RLS on assets
-- (assets_update_manager requires manager+). This function uses
-- SECURITY DEFINER (like update_asset_location_from_scan trigger) to
-- update only assigned_depot_id on behalf of any authenticated user.
--
-- Fixes: "Cannot coerce the result to a single JSON object" error when
-- useScanProcessing calls updateAsset({ assignedDepotId }) as a driver.
-- ============================================================================

CREATE OR REPLACE FUNCTION assign_asset_depot(
  p_asset_id UUID,
  p_depot_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE assets
  SET
    assigned_depot_id = p_depot_id,
    updated_at = NOW()
  WHERE id = p_asset_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asset not found or deleted: %', p_asset_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_asset_depot(UUID, UUID)
  TO authenticated;
