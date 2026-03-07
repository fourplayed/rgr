-- ROLLBACK:
-- DROP TRIGGER IF EXISTS trg_set_asset_maintenance_on_defect ON defect_reports;
-- DROP TRIGGER IF EXISTS trg_revert_asset_status_on_defect ON defect_reports;
-- DROP TRIGGER IF EXISTS trg_revert_asset_status_on_defect_delete ON defect_reports;
-- DROP TRIGGER IF EXISTS trg_revert_asset_status_on_maintenance ON maintenance_records;
-- DROP TRIGGER IF EXISTS trg_revert_asset_status_on_maintenance_delete ON maintenance_records;
-- DROP FUNCTION IF EXISTS set_asset_maintenance_on_defect();
-- DROP FUNCTION IF EXISTS revert_asset_status_on_defect();
-- DROP FUNCTION IF EXISTS revert_asset_status_on_defect_delete();
-- DROP FUNCTION IF EXISTS revert_asset_status_on_maintenance();
-- DROP FUNCTION IF EXISTS revert_asset_status_on_maintenance_delete();
-- DROP FUNCTION IF EXISTS maybe_revert_asset_to_serviced(UUID);


-- ============================================================
-- A. Set asset status to 'maintenance' when a defect is created
-- ============================================================

CREATE OR REPLACE FUNCTION set_asset_maintenance_on_defect()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE assets
  SET status = 'maintenance', updated_at = now()
  WHERE id = NEW.asset_id
    AND status = 'serviced';

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_asset_maintenance_on_defect
  AFTER INSERT ON defect_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_asset_maintenance_on_defect();


-- ============================================================
-- B. Shared helper: revert asset to 'serviced' if no open items
-- ============================================================

CREATE OR REPLACE FUNCTION maybe_revert_asset_to_serviced(p_asset_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Early-exit guard: only act on assets currently in 'maintenance'
  SELECT status INTO v_current_status
  FROM assets
  WHERE id = p_asset_id;

  IF v_current_status IS DISTINCT FROM 'maintenance' THEN
    RETURN;
  END IF;

  -- Atomic revert: only if no open defects AND no scheduled maintenance
  UPDATE assets
  SET status = 'serviced', updated_at = now()
  WHERE id = p_asset_id
    AND status = 'maintenance'
    AND NOT EXISTS (
      SELECT 1 FROM defect_reports
      WHERE asset_id = p_asset_id
        AND status IN ('reported', 'accepted')
    )
    AND NOT EXISTS (
      SELECT 1 FROM maintenance_records
      WHERE asset_id = p_asset_id
        AND status = 'scheduled'
    );
END;
$$;


-- ============================================================
-- C. Revert asset status when a defect is resolved/dismissed
-- ============================================================

CREATE OR REPLACE FUNCTION revert_asset_status_on_defect()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('resolved', 'dismissed') THEN
    PERFORM maybe_revert_asset_to_serviced(NEW.asset_id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_revert_asset_status_on_defect
  AFTER UPDATE ON defect_reports
  FOR EACH ROW
  EXECUTE FUNCTION revert_asset_status_on_defect();


-- ============================================================
-- D. Revert asset status when maintenance is completed/cancelled
-- ============================================================

CREATE OR REPLACE FUNCTION revert_asset_status_on_maintenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') THEN
    PERFORM maybe_revert_asset_to_serviced(NEW.asset_id);
  END IF;

  RETURN NEW;
END;
$$;

-- IMPORTANT: Named to sort AFTER trg_resolve_linked_defects (alphabetical firing order).
-- Do not rename without considering execution order.
CREATE TRIGGER trg_revert_asset_status_on_maintenance
  AFTER UPDATE ON maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION revert_asset_status_on_maintenance();


-- ============================================================
-- E. Revert asset status when a defect report is deleted
-- ============================================================

CREATE OR REPLACE FUNCTION revert_asset_status_on_defect_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM maybe_revert_asset_to_serviced(OLD.asset_id);
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_revert_asset_status_on_defect_delete
  AFTER DELETE ON defect_reports
  FOR EACH ROW
  EXECUTE FUNCTION revert_asset_status_on_defect_delete();


-- ============================================================
-- F. Revert asset status when a maintenance record is deleted
-- ============================================================

CREATE OR REPLACE FUNCTION revert_asset_status_on_maintenance_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM maybe_revert_asset_to_serviced(OLD.asset_id);
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_revert_asset_status_on_maintenance_delete
  AFTER DELETE ON maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION revert_asset_status_on_maintenance_delete();
