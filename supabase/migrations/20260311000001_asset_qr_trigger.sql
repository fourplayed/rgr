-- Auto-generate QR code data on asset creation.
-- Eliminates the second round-trip (createAsset → updateAsset) by
-- populating qr_code_data in the BEFORE INSERT trigger.

CREATE OR REPLACE FUNCTION generate_asset_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code_data IS NULL THEN
    NEW.qr_code_data := 'rgr://asset/' || NEW.id;
    NEW.qr_generated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create the trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_asset_qr_code'
  ) THEN
    CREATE TRIGGER trg_asset_qr_code
      BEFORE INSERT ON assets
      FOR EACH ROW EXECUTE FUNCTION generate_asset_qr_code();
  END IF;
END;
$$;
