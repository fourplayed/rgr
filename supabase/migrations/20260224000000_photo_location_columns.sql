-- Add location description column to photos table
ALTER TABLE photos
ADD COLUMN IF NOT EXISTS location_description VARCHAR(255);

COMMENT ON COLUMN photos.location_description IS 'Depot/location name where the photo was taken';
