-- ============================================================================
-- Cleanup: remove migrated defect rows from maintenance_records
-- Migration: 20260310000000_cleanup_defect_from_maintenance.sql
--
-- DEFERRED MIGRATION — run after confirming the new defect_reports table
-- is fully operational in production.
--
-- This removes legacy defect rows from maintenance_records and the
-- transitional filter can then be removed from the service layer.
-- ============================================================================

DELETE FROM maintenance_records
WHERE maintenance_type = 'defect_report'
   OR title LIKE 'Defect reported -%';
