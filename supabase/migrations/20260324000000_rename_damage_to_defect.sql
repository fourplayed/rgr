-- Rename photo_type enum value 'damage' → 'defect'.
-- ALTER TYPE ... RENAME VALUE is supported in Postgres 10+.
-- RENAME VALUE changes the label in-place; all existing rows with the old
-- value automatically read as the new name — no UPDATE needed.

ALTER TYPE photo_type RENAME VALUE 'damage' TO 'defect';
