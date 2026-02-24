-- ============================================================================
-- Allow mechanics to create maintenance records
-- Migration: 20260225000000_mechanic_maintenance_rls.sql
--
-- Currently only managers+ can create maintenance records. This migration
-- updates the RLS policy to allow mechanics (and above) to create records
-- when flagging assets for maintenance during scans.
-- ============================================================================

-- Helper function to check if user is mechanic or above
CREATE OR REPLACE FUNCTION is_mechanic_or_above()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth_user_role() IN ('mechanic', 'manager', 'superuser');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop the existing manager-only insert policy
DROP POLICY IF EXISTS "maintenance_insert_manager" ON maintenance_records;

-- Create new policy allowing mechanics and above to insert
CREATE POLICY "maintenance_insert_mechanic_or_above"
    ON maintenance_records FOR INSERT
    TO authenticated
    WITH CHECK (is_mechanic_or_above());
