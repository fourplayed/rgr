-- ============================================================================
-- Re-add 'in_progress' to maintenance_status enum
--
-- Restores the 4-status maintenance workflow:
--   scheduled → [in_progress, completed, cancelled]
--   in_progress → [completed, cancelled]
--
-- PostgreSQL cannot add individual enum values inside a transaction, so we:
--   1. Create a new enum type with in_progress
--   2. Drop dependent indexes + trigger
--   3. Swap column type, drop old enum, rename new
--   4. Recreate indexes (partial indexes include in_progress as active)
--   5. Recreate get_maintenance_stats() with in_progress count
--   6. Recreate get_asset_scan_context() counting in_progress as active
--   7. Recreate resolve_linked_defects() handling in_progress transitions
-- ============================================================================

-- ── 1. Create new enum type with in_progress ─────────────────────────────────
CREATE TYPE maintenance_status_new AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- ── 2. Drop dependent indexes + trigger ──────────────────────────────────────
DROP INDEX IF EXISTS idx_maintenance_asset_active;
DROP INDEX IF EXISTS idx_maintenance_assigned;

DROP TRIGGER IF EXISTS trg_resolve_linked_defects ON maintenance_records;
DROP FUNCTION IF EXISTS resolve_linked_defects();

DROP INDEX IF EXISTS idx_maintenance_status_priority_created;
DROP INDEX IF EXISTS idx_maintenance_status_only;
DROP INDEX IF EXISTS idx_maintenance_overdue;

-- ── 3. Swap column type ──────────────────────────────────────────────────────
ALTER TABLE maintenance_records
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE maintenance_records
  ALTER COLUMN status TYPE maintenance_status_new
  USING status::text::maintenance_status_new;

ALTER TABLE maintenance_records
  ALTER COLUMN status SET DEFAULT 'scheduled';

DROP TYPE maintenance_status;
ALTER TYPE maintenance_status_new RENAME TO maintenance_status;

-- ── 4. Recreate indexes (in_progress included as active) ─────────────────────
CREATE INDEX idx_maintenance_asset_active
  ON maintenance_records(asset_id, scheduled_date)
  WHERE status IN ('scheduled', 'in_progress');

CREATE INDEX idx_maintenance_assigned
  ON maintenance_records(assigned_to, status)
  WHERE assigned_to IS NOT NULL AND status IN ('scheduled', 'in_progress');

CREATE INDEX idx_maintenance_status_priority_created
  ON maintenance_records (status, priority, created_at DESC);

CREATE INDEX idx_maintenance_status_only
  ON maintenance_records (status);

CREATE INDEX idx_maintenance_overdue
  ON maintenance_records(due_date)
  WHERE status IN ('scheduled', 'in_progress') AND due_date IS NOT NULL;

-- ── 5. Recreate get_maintenance_stats() with in_progress count ───────────────
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
    'overdue', COUNT(*) FILTER (WHERE status IN ('scheduled', 'in_progress') AND due_date < CURRENT_DATE)
  ) FROM maintenance_records
  WHERE maintenance_type IS DISTINCT FROM 'defect_report';
$$;

-- ── 6. Recreate get_asset_scan_context() counting in_progress as active ──────
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
      WHERE asset_id = p_asset_id AND status IN ('scheduled', 'in_progress')
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
            WHERE asset_id = p_asset_id AND status IN ('scheduled', 'in_progress')
            ORDER BY created_at DESC
            LIMIT 3) m
    )
  );
END;
$$;

-- ── 7. Recreate resolve_linked_defects() handling in_progress transitions ────
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
