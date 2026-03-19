-- Fix assign_asset_depot() — remove non-existent column references
--
-- The original RPC (20260327000007) referenced:
--   - organisation_id on assets/depots (column doesn't exist)
--   - deleted_at on depots (depots use is_active boolean, not soft-delete)
--
-- This replacement validates asset existence (via deleted_at which assets DO have)
-- and depot existence (via is_active which depots use).

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
  -- Validate asset exists and is not soft-deleted
  IF NOT EXISTS (
    SELECT 1 FROM assets WHERE id = p_asset_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Asset not found or deleted: %', p_asset_id;
  END IF;

  -- Validate depot exists and is active (depots use is_active, not deleted_at)
  IF NOT EXISTS (
    SELECT 1 FROM depots WHERE id = p_depot_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Depot not found or inactive: %', p_depot_id;
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
