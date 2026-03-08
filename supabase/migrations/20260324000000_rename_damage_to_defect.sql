-- Rename photo_type enum value 'damage' → 'defect'.
-- ALTER TYPE ... RENAME VALUE is supported in Postgres 10+.

-- Step 1: Migrate existing rows
UPDATE photos SET photo_type = 'defect'::photo_type WHERE photo_type = 'damage';

-- Step 2: Rename the enum value (keeps ordinal position, no temp type needed)
ALTER TYPE photo_type RENAME VALUE 'damage' TO 'defect';
