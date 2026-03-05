-- ============================================================================
-- Remove 'in_progress' from maintenance_status enum
--
-- Simplifies the maintenance workflow from 4 statuses to 3:
--   scheduled → completed | cancelled
-- PostgreSQL cannot drop individual enum values, so we:
--   1. Migrate existing in_progress rows to scheduled
--   2. Create a new enum type without in_progress
--   3. Drop partial indexes whose WHERE clause references in_progress
--   4. Swap the column type
--   5. Drop the old enum and rename
--   6-8. Recreate dependent indexes and RPCs
-- ============================================================================

-- ── 1. Migrate existing in_progress rows to scheduled ──────────────────────
UPDATE maintenance_records
   SET status = 'scheduled'
 WHERE status = 'in_progress';

-- ── 2. Create new enum type without in_progress ────────────────────────────
CREATE TYPE maintenance_status_new AS ENUM ('scheduled', 'completed', 'cancelled');

-- ── 3. Drop partial indexes whose WHERE clause references in_progress ──────
--    Must happen BEFORE ALTER COLUMN ... TYPE or PG will fail rebuilding them.
DROP INDEX IF EXISTS idx_maintenance_asset_active;
DROP INDEX IF EXISTS idx_maintenance_assigned;

-- ── 3b. Drop trigger + function that reference OLD.status / NEW.status ───
DROP TRIGGER IF EXISTS trg_resolve_linked_defects ON maintenance_records;
DROP FUNCTION IF EXISTS resolve_linked_defects();

-- ── 3c. Drop remaining indexes on the status column ─────────────────────
DROP INDEX IF EXISTS idx_maintenance_status_priority_created;
DROP INDEX IF EXISTS idx_maintenance_status_only;
DROP INDEX IF EXISTS idx_maintenance_overdue;

-- ── 4. Swap column type ────────────────────────────────────────────────────
ALTER TABLE maintenance_records
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE maintenance_records
  ALTER COLUMN status TYPE maintenance_status_new
  USING status::text::maintenance_status_new;

ALTER TABLE maintenance_records
  ALTER COLUMN status SET DEFAULT 'scheduled';

-- ── 5. Drop old type and rename new one ────────────────────────────────────
DROP TYPE maintenance_status;
ALTER TYPE maintenance_status_new RENAME TO maintenance_status;

-- ── 6. Recreate partial indexes without in_progress ────────────────────────
CREATE INDEX idx_maintenance_asset_active
  ON maintenance_records(asset_id, scheduled_date)
  WHERE status = 'scheduled';

CREATE INDEX idx_maintenance_assigned
  ON maintenance_records(assigned_to, status)
  WHERE assigned_to IS NOT NULL AND status = 'scheduled';

-- ── 6b. Recreate remaining indexes ──────────────────────────────────────
CREATE INDEX idx_maintenance_status_priority_created
  ON maintenance_records (status, priority, created_at DESC);

CREATE INDEX idx_maintenance_status_only
  ON maintenance_records (status);

CREATE INDEX idx_maintenance_overdue
  ON maintenance_records(due_date)
  WHERE status = 'scheduled' AND due_date IS NOT NULL;

-- ── 7. Recreate get_maintenance_stats() without in_progress ────────────────
CREATE OR REPLACE FUNCTION get_maintenance_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'scheduled', COUNT(*) FILTER (WHERE status = 'scheduled'),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'overdue', COUNT(*) FILTER (WHERE status = 'scheduled' AND due_date < CURRENT_DATE)
  ) FROM maintenance_records
  WHERE maintenance_type IS DISTINCT FROM 'defect_report';
$$;

-- ── 8. Recreate get_asset_scan_context() — replace IN (...) with = ─────────
CREATE OR REPLACE FUNCTION get_asset_scan_context(p_asset_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
BEGIN
  RETURN jsonb_build_object(
    'open_defect_count', (
      SELECT count(*) FROM defect_reports
      WHERE asset_id = p_asset_id AND status IN ('reported', 'accepted')
    ),
    'active_task_count', (
      SELECT count(*) FROM maintenance_records
      WHERE asset_id = p_asset_id AND status = 'scheduled'
    ),
    'open_defects', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT id, title, status, created_at FROM defect_reports
            WHERE asset_id = p_asset_id AND status IN ('reported', 'accepted')
            ORDER BY created_at DESC
            LIMIT 3) d
    ),
    'active_tasks', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', id, 'title', title, 'status', status, 'priority', priority, 'created_at', created_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT id, title, status, priority, created_at FROM maintenance_records
            WHERE asset_id = p_asset_id AND status = 'scheduled'
            ORDER BY created_at DESC
            LIMIT 3) m
    )
  );
END;
$$;

-- ── 9. Recreate trigger function and trigger ────────────────────────────
--    Uses the expanded version that handles both
--    completed → resolve and cancelled → dismiss, since 'in_progress'
--    no longer exists as a possible OLD.status value.
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

CREATE TRIGGER trg_resolve_linked_defects
    AFTER UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION resolve_linked_defects();
