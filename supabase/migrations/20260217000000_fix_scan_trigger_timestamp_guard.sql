-- ============================================================================
-- Fix: scan trigger now guards against out-of-order inserts
--
-- Previously, inserting an older scan event AFTER a newer one would overwrite
-- the asset's location with the stale position. This adds a timestamp check
-- so only the most recent scan updates the asset's denormalized location.
-- ============================================================================

CREATE OR REPLACE FUNCTION update_asset_location_from_scan()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the scan has location data
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        UPDATE assets
        SET
            last_latitude = NEW.latitude,
            last_longitude = NEW.longitude,
            last_location_accuracy = NEW.accuracy,
            last_location_updated_at = NEW.created_at,
            last_scanned_by = NEW.scanned_by,
            updated_at = NOW()
        WHERE id = NEW.asset_id
          AND (last_location_updated_at IS NULL
               OR last_location_updated_at < NEW.created_at);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
