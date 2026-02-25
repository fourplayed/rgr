-- Add GPS location columns to photos table
-- Uses DOUBLE PRECISION for consistency with scan_events, assets, depots
-- No index initially - add spatial index later if query patterns require it

ALTER TABLE photos
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

COMMENT ON COLUMN photos.latitude IS 'GPS latitude where photo was captured (WGS84)';
COMMENT ON COLUMN photos.longitude IS 'GPS longitude where photo was captured (WGS84)';

-- Add constraints for valid coordinate ranges
ALTER TABLE photos
ADD CONSTRAINT photos_latitude_range
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
ADD CONSTRAINT photos_longitude_range
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
