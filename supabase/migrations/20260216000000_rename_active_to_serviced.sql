-- ============================================================================
-- Migration: Rename asset_status 'active' → 'serviced', remove 'decommissioned'
--
-- PostgreSQL doesn't support ALTER TYPE ... DROP VALUE, so we recreate the enum.
-- This migration is safe for production — it wraps everything in a transaction.
-- ============================================================================

BEGIN;

-- Step 1: Update any rows currently using 'decommissioned' to 'out_of_service'
UPDATE assets SET status = 'active' WHERE status = 'decommissioned';

-- Step 2: Drop indexes that reference the old enum values
DROP INDEX IF EXISTS idx_assets_outstanding;

-- Step 3: Change column to text temporarily (to detach from enum)
ALTER TABLE assets ALTER COLUMN status TYPE text;

-- Step 4: Drop the old enum
DROP TYPE asset_status;

-- Step 5: Create the new enum without 'decommissioned', with 'serviced' replacing 'active'
CREATE TYPE asset_status AS ENUM ('serviced', 'maintenance', 'out_of_service');

-- Step 6: Rename 'active' values to 'serviced' in the data
UPDATE assets SET status = 'serviced' WHERE status = 'active';

-- Step 7: Convert column back to the new enum
ALTER TABLE assets
  ALTER COLUMN status TYPE asset_status USING status::asset_status,
  ALTER COLUMN status SET DEFAULT 'serviced';

-- Step 8: Recreate the partial index with the new enum value
CREATE INDEX idx_assets_outstanding ON assets(last_location_updated_at)
    WHERE deleted_at IS NULL AND status IN ('serviced', 'maintenance');

COMMIT;
