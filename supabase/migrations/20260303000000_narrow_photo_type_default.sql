-- Narrow photo_type usage to 'freight' and 'damage' only.
-- The Postgres enum retains all 4 values for backwards compatibility,
-- but the application layer (Zod schema) now only accepts 'freight' | 'damage'.
-- Any legacy 'inspection' or 'general' rows are migrated to 'freight'.

-- 1. Migrate existing rows with unused photo types
UPDATE photos SET photo_type = 'freight' WHERE photo_type IN ('inspection', 'general');

-- 2. Change column default from 'general' to 'freight'
ALTER TABLE photos ALTER COLUMN photo_type SET DEFAULT 'freight';
