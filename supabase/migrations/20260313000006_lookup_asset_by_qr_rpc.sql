-- ============================================================================
-- Single-roundtrip QR code asset lookup RPC
--
-- Replaces the 2-sequential-query pattern in getAssetByQRCode():
--   1. Try exact qr_code_data match
--   2. Parse and try id/asset_number match
--
-- This does both in a single database call.
-- ============================================================================

CREATE OR REPLACE FUNCTION lookup_asset_by_qr(p_qr_data TEXT)
RETURNS SETOF assets
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  v_result assets%ROWTYPE;
  v_parsed TEXT;
  v_uuid_re TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
BEGIN
  -- 1. Try exact qr_code_data match
  SELECT * INTO v_result
  FROM assets
  WHERE qr_code_data = p_qr_data
    AND deleted_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    RETURN NEXT v_result;
    RETURN;
  END IF;

  -- 2. Parse QR URI format: "rgr://asset/{id}" or "rgr://a/{id}"
  v_parsed := NULL;
  IF p_qr_data LIKE 'rgr://asset/%' THEN
    v_parsed := substring(p_qr_data FROM 'rgr://asset/(.+)$');
  ELSIF p_qr_data LIKE 'rgr://a/%' THEN
    v_parsed := substring(p_qr_data FROM 'rgr://a/(.+)$');
  ELSE
    -- Treat raw input as potential UUID or asset number
    v_parsed := p_qr_data;
  END IF;

  IF v_parsed IS NOT NULL THEN
    IF v_parsed ~* v_uuid_re THEN
      -- Looks like a UUID — match by id
      SELECT * INTO v_result
      FROM assets
      WHERE id = v_parsed::UUID
        AND deleted_at IS NULL
      LIMIT 1;
    ELSE
      -- Not a UUID — match by asset_number
      SELECT * INTO v_result
      FROM assets
      WHERE asset_number = v_parsed
        AND deleted_at IS NULL
      LIMIT 1;
    END IF;

    IF FOUND THEN
      RETURN NEXT v_result;
      RETURN;
    END IF;
  END IF;

  -- No match found — return empty set
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION lookup_asset_by_qr(TEXT) TO authenticated;
