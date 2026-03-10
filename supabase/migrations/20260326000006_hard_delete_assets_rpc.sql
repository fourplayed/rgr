-- Migration: Hard Delete Assets RPC
-- Fixes asset_count_items FK, widens DELETE policy to manager+, adds hard_delete_assets RPC

-- 1a. Fix asset_count_items FK (add ON DELETE CASCADE)
-- This is the only child table without CASCADE, which blocks asset deletion
ALTER TABLE asset_count_items
  DROP CONSTRAINT asset_count_items_asset_id_fkey,
  ADD CONSTRAINT asset_count_items_asset_id_fkey
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;

-- 1b. Widen DELETE policy from superuser-only to manager+
DROP POLICY "assets_delete_superuser" ON assets;
CREATE POLICY "assets_delete_manager_or_above"
  ON assets FOR DELETE TO authenticated
  USING (is_manager_or_above());

-- 1c. Hard delete RPC with audit trail
CREATE OR REPLACE FUNCTION hard_delete_assets(p_ids UUID[])
RETURNS TABLE(deleted_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  p_ids := array_remove(p_ids, NULL);
  IF COALESCE(array_length(p_ids, 1), 0) = 0 THEN RETURN; END IF;
  IF array_length(p_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Batch size exceeds maximum of 50';
  END IF;

  -- Audit: capture asset details before deletion
  INSERT INTO audit_log (user_id, action, table_name, record_id, old_values)
  SELECT auth.uid(), 'asset.hard_delete', 'assets', a.id,
         jsonb_build_object(
           'asset_number', a.asset_number,
           'category', a.category,
           'status', a.status
         )
  FROM assets a WHERE a.id = ANY(p_ids);

  -- Delete assets — CASCADE handles all child tables.
  -- SET NULL preserves photos, freight_analysis, hazard_alerts.
  RETURN QUERY
    DELETE FROM assets WHERE id = ANY(p_ids)
    RETURNING id;
END;
$$;

GRANT EXECUTE ON FUNCTION hard_delete_assets(UUID[]) TO authenticated;
