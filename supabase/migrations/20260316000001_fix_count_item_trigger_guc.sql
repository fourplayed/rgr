-- ============================================================================
-- Fix submit_asset_count_items: replace ALTER TABLE with GUC flag
--
-- The previous version used ALTER TABLE DISABLE/ENABLE TRIGGER, which
-- requires superuser privileges. SECURITY INVOKER runs as 'authenticated'
-- which cannot ALTER TABLE, causing every RPC call to fail at runtime.
--
-- Fix: Use a session-local GUC flag (app.skip_count_trigger) checked by
-- the trigger function. This avoids needing elevated privileges.
-- ============================================================================

-- Step 1: Update the trigger function to check the GUC flag
CREATE OR REPLACE FUNCTION update_session_asset_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip when called from submit_asset_count_items RPC (avoids N redundant COUNT queries)
    IF current_setting('app.skip_count_trigger', true) = 'true' THEN
        RETURN NEW;
    END IF;

    UPDATE asset_count_sessions
    SET total_assets_counted = (
        SELECT COUNT(*) FROM asset_count_items WHERE session_id = NEW.session_id
    ),
    updated_at = now()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Replace the RPC to use GUC flag instead of ALTER TABLE
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

  -- Set session-local GUC flag to skip per-row trigger
  PERFORM set_config('app.skip_count_trigger', 'true', true);

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

  -- Reset GUC flag (transaction-local, but explicit for clarity)
  PERFORM set_config('app.skip_count_trigger', 'false', true);

  -- Update count directly (single query, not N queries)
  UPDATE asset_count_sessions
  SET total_assets_counted = (
    SELECT COUNT(*) FROM asset_count_items WHERE session_id = p_session_id
  )
  WHERE id = p_session_id;

  RETURN inserted_count;
END;
$$;
