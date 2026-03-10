-- ============================================================================
-- GIN trigram indexes for admin ILIKE search
--
-- Accelerates %search% patterns used by getAdminMaintenanceTasks() and
-- getAdminDefectReports() in packages/shared/src/services/supabase/admin.ts
--
-- pg_trgm extension already enabled in 20260219000003.
--
-- Supabase CLI pipeline mode does not support CONCURRENTLY, so these run as
-- regular CREATE INDEX. For the small table sizes involved this is fine —
-- the brief lock is negligible.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_maintenance_title_trgm
  ON maintenance_records USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_defect_reports_title_trgm
  ON defect_reports USING gin (title gin_trgm_ops);
