-- ============================================================================
-- Data migration: move defects from maintenance_records → defect_reports
-- Migration: 20260304000002_migrate_defects_to_new_table.sql
--
-- Identifies defect rows by maintenance_type = 'defect_report' OR legacy
-- title pattern 'Defect reported -%'. Maps maintenance statuses to defect
-- statuses. Keeps old rows during transition period.
-- ============================================================================

INSERT INTO defect_reports (
    asset_id,
    reported_by,
    scan_event_id,
    title,
    description,
    status,
    notes,
    created_at,
    updated_at
)
SELECT
    m.asset_id,
    m.reported_by,
    m.scan_event_id,
    m.title,
    m.description,
    CASE m.status
        WHEN 'scheduled'   THEN 'reported'::defect_status
        WHEN 'in_progress' THEN 'accepted'::defect_status
        WHEN 'completed'   THEN 'resolved'::defect_status
        WHEN 'cancelled'   THEN 'dismissed'::defect_status
        ELSE 'reported'::defect_status
    END,
    m.notes,
    m.created_at,
    m.updated_at
FROM maintenance_records m
WHERE m.maintenance_type = 'defect_report'
   OR m.title LIKE 'Defect reported -%';

-- Set resolved_at for migrated defects that were completed
UPDATE defect_reports d
SET resolved_at = m.completed_at
FROM maintenance_records m
WHERE d.created_at = m.created_at
  AND d.asset_id = m.asset_id
  AND d.title = m.title
  AND m.status = 'completed'
  AND m.completed_at IS NOT NULL
  AND d.status = 'resolved';
