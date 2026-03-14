-- H-4: Replace COUNT(*) with increment in update_session_asset_count()
-- The trigger fires on every INSERT into asset_count_items.
-- COUNT(*) is O(N) per insert; incrementing is O(1).
CREATE OR REPLACE FUNCTION update_session_asset_count()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.skip_count_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  UPDATE asset_count_sessions
  SET total_assets_counted = total_assets_counted + 1,
      updated_at = now()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- M-3: Drop redundant index (covered by composite idx_combination_metadata_combination)
-- The single-column (session_id) index is a leftmost prefix of (session_id, combination_id)
DROP INDEX IF EXISTS idx_combination_metadata_session;
