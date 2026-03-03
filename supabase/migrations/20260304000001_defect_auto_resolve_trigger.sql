-- ============================================================================
-- Defect auto-resolve trigger + defect stats RPC
-- Migration: 20260304000001_defect_auto_resolve_trigger.sql
--
-- 1. When a maintenance task is completed, auto-resolve any linked defects.
-- 2. Update get_maintenance_stats() to exclude defect_report rows.
-- 3. New get_defect_report_stats() RPC for defect dashboard.
-- ============================================================================

-- ── Auto-resolve trigger ──
-- When a maintenance_record transitions to 'completed', update any linked
-- defect_reports to 'resolved' with a resolved_at timestamp.

CREATE OR REPLACE FUNCTION resolve_linked_defects()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
        UPDATE defect_reports
        SET status = 'resolved',
            resolved_at = NOW()
        WHERE maintenance_record_id = NEW.id
          AND status = 'accepted';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_resolve_linked_defects
    AFTER UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION resolve_linked_defects();

-- ── Update get_maintenance_stats to exclude defect_report rows ──

CREATE OR REPLACE FUNCTION get_maintenance_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'scheduled', COUNT(*) FILTER (WHERE status = 'scheduled'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'overdue', COUNT(*) FILTER (WHERE status = 'scheduled' AND due_date < CURRENT_DATE)
  ) FROM maintenance_records
  WHERE maintenance_type IS DISTINCT FROM 'defect_report';
$$;

-- ── New defect report stats RPC ──

CREATE OR REPLACE FUNCTION get_defect_report_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'reported', COUNT(*) FILTER (WHERE status = 'reported'),
    'accepted', COUNT(*) FILTER (WHERE status = 'accepted'),
    'resolved', COUNT(*) FILTER (WHERE status = 'resolved'),
    'dismissed', COUNT(*) FILTER (WHERE status = 'dismissed')
  ) FROM defect_reports;
$$;

GRANT EXECUTE ON FUNCTION get_defect_report_stats() TO authenticated;
