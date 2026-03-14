-- C-1: Add length constraints to unbounded TEXT columns
-- Prevents arbitrarily large payloads via PostgREST or RPCs

-- Assets
ALTER TABLE assets
  ADD CONSTRAINT chk_assets_description_length
    CHECK (description IS NULL OR char_length(description) <= 2000);

-- Maintenance records
ALTER TABLE maintenance_records
  ADD CONSTRAINT chk_maintenance_title_length
    CHECK (title IS NULL OR char_length(title) <= 200);

ALTER TABLE maintenance_records
  ADD CONSTRAINT chk_maintenance_description_length
    CHECK (description IS NULL OR char_length(description) <= 2000);

ALTER TABLE maintenance_records
  ADD CONSTRAINT chk_maintenance_notes_length
    CHECK (notes IS NULL OR char_length(notes) <= 2000);

-- Defect reports
ALTER TABLE defect_reports
  ADD CONSTRAINT chk_defect_title_length
    CHECK (title IS NULL OR char_length(title) <= 200);

ALTER TABLE defect_reports
  ADD CONSTRAINT chk_defect_description_length
    CHECK (description IS NULL OR char_length(description) <= 2000);
