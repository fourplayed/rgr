-- ============================================================================
-- Asset Count Session Tables
-- Migration: 20260225000001_asset_count_tables.sql
--
-- Enables managers to perform depot inventory counts by tracking which assets
-- are scanned during a count session. Sessions can span multiple days and
-- are persisted in the database for reporting.
-- ============================================================================

-- ============================================================================
-- ASSET COUNT SESSIONS TABLE
-- ============================================================================
-- Tracks a single inventory count session at a depot.
-- Created when a manager starts a count, completed when they finish.

CREATE TABLE asset_count_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    depot_id            UUID NOT NULL REFERENCES depots(id),
    counted_by          UUID NOT NULL REFERENCES profiles(id),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    total_assets_counted INTEGER NOT NULL DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE asset_count_sessions IS 'Depot inventory count sessions initiated by managers';
COMMENT ON COLUMN asset_count_sessions.status IS 'Session state: in_progress, completed, or cancelled';
COMMENT ON COLUMN asset_count_sessions.total_assets_counted IS 'Denormalized count of items for quick queries';

-- Indexes for asset_count_sessions
CREATE INDEX idx_count_sessions_depot ON asset_count_sessions(depot_id);
CREATE INDEX idx_count_sessions_user ON asset_count_sessions(counted_by);
CREATE INDEX idx_count_sessions_status ON asset_count_sessions(status)
    WHERE status = 'in_progress';
CREATE INDEX idx_count_sessions_date ON asset_count_sessions(started_at DESC);

-- ============================================================================
-- ASSET COUNT ITEMS TABLE
-- ============================================================================
-- Individual asset scans within a count session.
-- Tracks which assets were scanned and when.

CREATE TABLE asset_count_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES asset_count_sessions(id) ON DELETE CASCADE,
    asset_id            UUID NOT NULL REFERENCES assets(id),
    scanned_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    combination_id      UUID,           -- Groups linked assets (e.g., trailer + dolly)
    combination_position SMALLINT,       -- Order in chain (1, 2, 3...)
    UNIQUE(session_id, asset_id)        -- Each asset only counted once per session
);

COMMENT ON TABLE asset_count_items IS 'Individual assets scanned during a count session';
COMMENT ON COLUMN asset_count_items.combination_id IS 'UUID grouping linked assets scanned together';
COMMENT ON COLUMN asset_count_items.combination_position IS 'Position in combination chain (1=prime, 2=first trailer, etc.)';

-- Indexes for asset_count_items
CREATE INDEX idx_count_items_session ON asset_count_items(session_id);
CREATE INDEX idx_count_items_asset ON asset_count_items(asset_id);
CREATE INDEX idx_count_items_combination ON asset_count_items(combination_id)
    WHERE combination_id IS NOT NULL;

-- ============================================================================
-- TRIGGER: Update session count on item insert
-- ============================================================================

CREATE OR REPLACE FUNCTION update_session_asset_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE asset_count_sessions
    SET total_assets_counted = (
        SELECT COUNT(*) FROM asset_count_items WHERE session_id = NEW.session_id
    ),
    updated_at = now()
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_count_item_insert
    AFTER INSERT ON asset_count_items
    FOR EACH ROW EXECUTE FUNCTION update_session_asset_count();

-- ============================================================================
-- TRIGGER: updated_at timestamp
-- ============================================================================

CREATE TRIGGER set_updated_at_count_sessions
    BEFORE UPDATE ON asset_count_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE asset_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_count_items ENABLE ROW LEVEL SECURITY;

-- Managers+ can read all count sessions
CREATE POLICY "count_sessions_select_manager"
    ON asset_count_sessions FOR SELECT
    TO authenticated
    USING (is_manager_or_above());

-- Managers+ can create count sessions
CREATE POLICY "count_sessions_insert_manager"
    ON asset_count_sessions FOR INSERT
    TO authenticated
    WITH CHECK (is_manager_or_above() AND counted_by = auth.uid());

-- Managers+ can update their own sessions
CREATE POLICY "count_sessions_update_own"
    ON asset_count_sessions FOR UPDATE
    TO authenticated
    USING (is_manager_or_above() AND counted_by = auth.uid());

-- Superusers can delete count sessions
CREATE POLICY "count_sessions_delete_superuser"
    ON asset_count_sessions FOR DELETE
    TO authenticated
    USING (auth_user_role() = 'superuser');

-- Count items inherit from sessions (manager+ can read)
CREATE POLICY "count_items_select_manager"
    ON asset_count_items FOR SELECT
    TO authenticated
    USING (is_manager_or_above());

-- Count items can be inserted by session owner
CREATE POLICY "count_items_insert_owner"
    ON asset_count_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM asset_count_sessions
            WHERE id = session_id
            AND counted_by = auth.uid()
            AND status = 'in_progress'
        )
    );

-- Count items can be deleted by session owner (undo scan)
CREATE POLICY "count_items_delete_owner"
    ON asset_count_items FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM asset_count_sessions
            WHERE id = session_id
            AND counted_by = auth.uid()
            AND status = 'in_progress'
        )
    );
