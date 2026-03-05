-- ============================================================================
-- Auto-dismiss defect reports when linked maintenance is cancelled
-- Migration: 20260315000000_defect_auto_dismiss_on_cancel.sql
--
-- Extends resolve_linked_defects() to also dismiss defects when their
-- linked maintenance task is cancelled, not just resolve on completion.
-- ============================================================================

CREATE OR REPLACE FUNCTION resolve_linked_defects()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-resolve on completion (existing behavior)
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        UPDATE defect_reports
        SET status = 'resolved',
            resolved_at = NOW()
        WHERE maintenance_record_id = NEW.id
          AND status = 'accepted';
    END IF;

    -- Auto-dismiss on cancellation (new)
    IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') THEN
        UPDATE defect_reports
        SET status = 'dismissed',
            dismissed_at = NOW(),
            dismissed_reason = 'Linked maintenance task was cancelled'
        WHERE maintenance_record_id = NEW.id
          AND status = 'accepted';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
