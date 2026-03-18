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
DECLARE
  v_asset_org UUID;
  v_depot_org UUID;
BEGIN
  -- Resolve asset org
  SELECT organisation_id INTO v_asset_org
  FROM assets
  WHERE id = p_asset_id AND deleted_at IS NULL;

  IF v_asset_org IS NULL THEN
    RAISE EXCEPTION 'Asset not found or deleted: %', p_asset_id;
  END IF;

  -- Resolve depot org and verify same organisation
  SELECT organisation_id INTO v_depot_org
  FROM depots
  WHERE id = p_depot_id AND deleted_at IS NULL;

  IF v_depot_org IS NULL THEN
    RAISE EXCEPTION 'Depot not found or deleted: %', p_depot_id;
  END IF;

  IF v_asset_org <> v_depot_org THEN
    RAISE EXCEPTION 'Cross-organisation assignment not allowed';
  END IF;

  UPDATE assets
  SET
    assigned_depot_id = p_depot_id,
    updated_at = NOW()
  WHERE id = p_asset_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION assign_asset_depot(UUID, UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION assign_asset_depot(UUID, UUID) TO authenticated;
