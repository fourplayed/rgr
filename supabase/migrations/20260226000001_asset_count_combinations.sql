-- ============================================================================
-- Asset Count Combination Tables
-- Migration: 20260226000001_asset_count_combinations.sql
--
-- Adds support for linking assets as combinations (e.g., trailer + dolly)
-- during depot inventory counts. Each combination can have its own photo
-- and notes.
-- ============================================================================

-- ============================================================================
-- ASSET COUNT COMBINATION METADATA TABLE
-- ============================================================================
-- Stores notes for each combination group (one row per combo, not per item).
-- Avoids data duplication across linked items.

CREATE TABLE asset_count_combination_metadata (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES asset_count_sessions(id) ON DELETE CASCADE,
    combination_id      UUID NOT NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(session_id, combination_id)
);

COMMENT ON TABLE asset_count_combination_metadata IS 'Notes for asset combinations in count sessions';
COMMENT ON COLUMN asset_count_combination_metadata.combination_id IS 'UUID matching combination_id in asset_count_items';
COMMENT ON COLUMN asset_count_combination_metadata.notes IS 'User-provided description of the combination';

-- ============================================================================
-- ASSET COUNT COMBINATION PHOTOS TABLE
-- ============================================================================
-- Links photos to combinations. Each combination gets one photo per session.

CREATE TABLE asset_count_combination_photos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES asset_count_sessions(id) ON DELETE CASCADE,
    combination_id      UUID NOT NULL,
    photo_id            UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(session_id, combination_id),  -- One photo per combo per session
    UNIQUE(photo_id)                      -- Each photo only linked once
);

COMMENT ON TABLE asset_count_combination_photos IS 'Photos for asset combinations in count sessions';
COMMENT ON COLUMN asset_count_combination_photos.combination_id IS 'UUID matching combination_id in asset_count_items';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Combination metadata indexes
CREATE INDEX idx_combination_metadata_session
    ON asset_count_combination_metadata(session_id);

CREATE INDEX idx_combination_metadata_combination
    ON asset_count_combination_metadata(session_id, combination_id);

-- Combination photos indexes
CREATE INDEX idx_combination_photos_session
    ON asset_count_combination_photos(session_id);

CREATE INDEX idx_combination_photos_combination
    ON asset_count_combination_photos(combination_id);

-- Better composite index for items (supplements single-column index)
-- This index is more efficient when querying items with combination_id within a session
CREATE INDEX idx_count_items_session_combination
    ON asset_count_items(session_id, combination_id)
    WHERE combination_id IS NOT NULL;

-- ============================================================================
-- VALIDATION TRIGGER
-- ============================================================================
-- Prevents orphan photos by ensuring the combination exists in asset_count_items

CREATE OR REPLACE FUNCTION validate_combination_exists()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM asset_count_items
        WHERE session_id = NEW.session_id
        AND combination_id = NEW.combination_id
    ) THEN
        RAISE EXCEPTION 'combination_id does not exist in session';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_combination_photo_insert
    BEFORE INSERT ON asset_count_combination_photos
    FOR EACH ROW EXECUTE FUNCTION validate_combination_exists();

CREATE TRIGGER validate_combination_metadata_insert
    BEFORE INSERT ON asset_count_combination_metadata
    FOR EACH ROW EXECUTE FUNCTION validate_combination_exists();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE asset_count_combination_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_count_combination_photos ENABLE ROW LEVEL SECURITY;

-- ── Combination Metadata Policies ──

-- Managers+ can read all combination metadata
CREATE POLICY "combination_metadata_select_manager"
    ON asset_count_combination_metadata FOR SELECT
    TO authenticated
    USING (is_manager_or_above());

-- Session owner can insert combination metadata
CREATE POLICY "combination_metadata_insert_owner"
    ON asset_count_combination_metadata FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM asset_count_sessions
            WHERE id = session_id
            AND counted_by = auth.uid()
            AND status = 'in_progress'
        )
    );

-- Session owner can update their own combination metadata
CREATE POLICY "combination_metadata_update_owner"
    ON asset_count_combination_metadata FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM asset_count_sessions
            WHERE id = session_id
            AND counted_by = auth.uid()
            AND status = 'in_progress'
        )
    );

-- Session owner can delete their own combination metadata
CREATE POLICY "combination_metadata_delete_owner"
    ON asset_count_combination_metadata FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM asset_count_sessions
            WHERE id = session_id
            AND counted_by = auth.uid()
            AND status = 'in_progress'
        )
    );

-- ── Combination Photos Policies ──

-- Managers+ can read all combination photos
CREATE POLICY "combination_photos_select_manager"
    ON asset_count_combination_photos FOR SELECT
    TO authenticated
    USING (is_manager_or_above());

-- Session owner can insert combination photos
CREATE POLICY "combination_photos_insert_owner"
    ON asset_count_combination_photos FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM asset_count_sessions
            WHERE id = session_id
            AND counted_by = auth.uid()
            AND status = 'in_progress'
        )
    );

-- Session owner can delete their own combination photos
CREATE POLICY "combination_photos_delete_owner"
    ON asset_count_combination_photos FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM asset_count_sessions
            WHERE id = session_id
            AND counted_by = auth.uid()
            AND status = 'in_progress'
        )
    );
