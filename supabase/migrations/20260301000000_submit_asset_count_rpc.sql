-- RPC for atomic bulk insert of asset count items.
-- Validates session state, handles duplicates, and updates count directly.

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

  -- Update count directly (avoids N-squared FOR EACH ROW trigger overhead)
  UPDATE asset_count_sessions
  SET total_assets_counted = (
    SELECT COUNT(*) FROM asset_count_items WHERE session_id = p_session_id
  )
  WHERE id = p_session_id;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_asset_count_items(UUID, JSONB) TO authenticated;
