-- Fix rego_lookup_log: allow NULL asset_id for lookups without an asset context.
-- Previously the nil UUID fallback would violate the FK constraint.
ALTER TABLE rego_lookup_log ALTER COLUMN asset_id DROP NOT NULL;
