-- ============================================================================
-- Disable on_count_item_insert trigger within submit_asset_count_items RPC
--
-- Problem: The trigger fires FOR EACH ROW on insert, executing COUNT(*)
-- for every row. The RPC bulk-inserts items then overwrites the count
-- anyway — N redundant count queries for N items (quadratic overhead).
--
-- Fix: Disable the trigger within the RPC body since the RPC already
-- computes the correct count after insertion. The trigger remains active
-- for any direct inserts outside the RPC (e.g., RLS-based inserts).
-- ============================================================================

CREATE OR REPLACE FUNCTION submit_asset_count_items(
  p_session_id UUID,
  p_items JSONB
)
RETURNS INT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  inserted_count INT;
BEGIN
  -- Validate session state
  IF NOT EXISTS (
    SELECT 1 FROM asset_count_sessions
    WHERE id = p_session_id AND status = 'in_progress'
  ) THEN
    RAISE EXCEPTION 'Session not found or not in progress';
  END IF;

  -- Disable per-row trigger to avoid N redundant COUNT(*) queries
  ALTER TABLE asset_count_items DISABLE TRIGGER on_count_item_insert;

  -- Bulk insert with duplicate handling
  WITH inserted AS (
    INSERT INTO asset_count_items (session_id, asset_id, combination_id, combination_position)
    SELECT
      p_session_id,
      (item->>'asset_id')::UUID,
      NULLIF(item->>'combination_id', '')::UUID,
      (item->>'combination_position')::INT
    FROM jsonb_array_elements(p_items) AS item
    ON CONFLICT (session_id, asset_id) DO NOTHING
    RETURNING id
  )
  SELECT COUNT(*) INTO inserted_count FROM inserted;

  -- Re-enable trigger for non-RPC inserts
  ALTER TABLE asset_count_items ENABLE TRIGGER on_count_item_insert;

  -- Update count directly (single query, not N queries)
  UPDATE asset_count_sessions
  SET total_assets_counted = (
    SELECT COUNT(*) FROM asset_count_items WHERE session_id = p_session_id
  )
  WHERE id = p_session_id;

  RETURN inserted_count;
END;
$$;
