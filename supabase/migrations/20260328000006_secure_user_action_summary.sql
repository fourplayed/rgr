-- ============================================================================
-- Secure get_user_action_summary: add role-based access check
--
-- Previously the function used a WHERE auth.uid() = p_user_id guard which
-- silently returned NULL for other callers. This rewrites it as PL/pgSQL so
-- we can raise a hard error for unauthorized access, while still allowing
-- managers and superusers to query any user's summary.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_action_summary(p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_caller_role user_role;
    v_result JSON;
BEGIN
    -- Role check: caller must be the target user, or a manager/superuser
    v_caller_role := auth_user_role();
    IF auth.uid() <> p_user_id AND v_caller_role NOT IN ('manager', 'superuser') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT json_build_object(
        'scans_performed',
            (SELECT COUNT(*) FROM scan_events
             WHERE scanned_by = p_user_id AND created_at > now() - interval '24 hours'),
        'defects_reported',
            (SELECT COUNT(*) FROM defect_reports
             WHERE reported_by = p_user_id AND created_at > now() - interval '24 hours'),
        'maintenance_reported',
            (SELECT COUNT(*) FROM maintenance_records
             WHERE reported_by = p_user_id AND created_at > now() - interval '24 hours'),
        'maintenance_completed',
            (SELECT COUNT(*) FROM maintenance_records
             WHERE completed_by = p_user_id AND status = 'completed'
             AND completed_at > now() - interval '24 hours')
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_action_summary(UUID) TO authenticated;
