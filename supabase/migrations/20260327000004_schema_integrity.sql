-- L-5: Add NOT NULL to defect_reports.reported_by
-- RLS INSERT policy already requires reported_by = auth.uid(),
-- so all existing rows should have a value. This makes the constraint explicit.
ALTER TABLE defect_reports
  ALTER COLUMN reported_by SET NOT NULL;

-- L-2: Drop duplicate registration_expiry index if both exist
-- Migration 20260215000000 and 20260325000000 both create indexes on this column.
-- Keep only the partial index (more useful for overdue queries).
DO $$
BEGIN
  -- Drop the non-partial index if it exists alongside the partial one
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assets_registration_expiry')
     AND EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_assets_rego_expiry') THEN
    DROP INDEX idx_assets_registration_expiry;
  END IF;
END $$;
