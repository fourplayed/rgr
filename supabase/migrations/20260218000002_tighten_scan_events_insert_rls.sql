-- ============================================================================
-- Tighten scan_events INSERT policy
-- Previously allowed any authenticated user to insert with any scanned_by.
-- Now enforces that scanned_by must be NULL or match the current user.
-- ============================================================================

DROP POLICY IF EXISTS "scan_events_insert_all" ON scan_events;

CREATE POLICY "scan_events_insert_own"
    ON scan_events FOR INSERT
    TO authenticated
    WITH CHECK (
        scanned_by IS NULL
        OR scanned_by = auth.uid()
    );
