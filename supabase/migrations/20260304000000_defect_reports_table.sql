-- ============================================================================
-- Defect Reports — Separate table for defect lifecycle
-- Migration: 20260304000000_defect_reports_table.sql
--
-- Defect reports are lightweight advisories created during scanning.
-- A mechanic reviews and "accepts" a defect by creating a linked
-- maintenance task. The defect resolves when the task completes.
--
-- Lifecycle: Reported → Accepted (task created) → Resolved / Dismissed
-- ============================================================================

-- ── Enum ──

CREATE TYPE defect_status AS ENUM ('reported', 'accepted', 'resolved', 'dismissed');

-- ── Table ──

CREATE TABLE defect_reports (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id                UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    reported_by             UUID REFERENCES profiles(id),
    scan_event_id           UUID REFERENCES scan_events(id),
    title                   VARCHAR(200) NOT NULL,
    description             TEXT,
    status                  defect_status NOT NULL DEFAULT 'reported',
    maintenance_record_id   UUID REFERENCES maintenance_records(id) ON DELETE SET NULL,
    accepted_at             TIMESTAMPTZ,
    resolved_at             TIMESTAMPTZ,
    dismissed_at            TIMESTAMPTZ,
    dismissed_reason        TEXT,
    notes                   TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──

CREATE INDEX idx_defect_reports_asset_created
    ON defect_reports (asset_id, created_at DESC);

CREATE INDEX idx_defect_reports_status_created
    ON defect_reports (status, created_at DESC);

CREATE INDEX idx_defect_reports_maintenance_record
    ON defect_reports (maintenance_record_id)
    WHERE maintenance_record_id IS NOT NULL;

CREATE INDEX idx_defect_reports_scan_event
    ON defect_reports (scan_event_id)
    WHERE scan_event_id IS NOT NULL;

-- ── Updated-at trigger (reuse existing function) ──

CREATE TRIGGER set_updated_at_defect_reports
    BEFORE UPDATE ON defect_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ──

ALTER TABLE defect_reports ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read defect reports
CREATE POLICY "defect_reports_select_all"
    ON defect_reports FOR SELECT
    TO authenticated
    USING (TRUE);

-- Mechanics and above can create defect reports
CREATE POLICY "defect_reports_insert_mechanic_or_above"
    ON defect_reports FOR INSERT
    TO authenticated
    WITH CHECK (is_mechanic_or_above());

-- The reporter or managers+ can update
CREATE POLICY "defect_reports_update_reporter_or_manager"
    ON defect_reports FOR UPDATE
    TO authenticated
    USING (
        reported_by = auth.uid()
        OR is_manager_or_above()
    );

-- Managers+ can delete
CREATE POLICY "defect_reports_delete_manager"
    ON defect_reports FOR DELETE
    TO authenticated
    USING (is_manager_or_above());

-- ── Realtime (optional, for future live updates) ──

ALTER PUBLICATION supabase_realtime ADD TABLE defect_reports;
