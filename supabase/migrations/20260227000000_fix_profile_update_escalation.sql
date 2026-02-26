-- ============================================================================
-- Fix profile UPDATE privilege escalation
--
-- Problem: profiles_update_own allows any authenticated user to update ANY
-- column on their own row, including `role` and `is_active`. Combined with
-- the publicly-visible anon key, a malicious user can escalate to superuser
-- or reactivate a deactivated account via a direct PostgREST call.
--
-- Additionally, auth_user_role() does not check is_active, so deactivated
-- users retain full RLS privileges for their former role.
--
-- Three fixes:
--   1. BEFORE UPDATE trigger blocks self-modification of role/is_active
--   2. auth_user_role() demotes inactive users to 'driver'
--   3. is_user_active() helper applied to critical write policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. BEFORE UPDATE trigger: block role/is_active self-modification
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_self_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- service_role bypasses RLS entirely, but if it somehow reaches here, allow it
    IF current_setting('role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Only restrict when user is updating their own row
    IF NEW.id = auth.uid() THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Users cannot change their own role'
                USING ERRCODE = '42501'; -- insufficient_privilege
        END IF;

        IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
            RAISE EXCEPTION 'Users cannot change their own active status'
                USING ERRCODE = '42501'; -- insufficient_privilege
        END IF;
    END IF;

    -- Superusers updating OTHER users' rows pass through
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prevent_self_role_change
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_role_change();


-- ============================================================================
-- 2. Update auth_user_role() to check is_active
--
-- Inactive users are demoted to 'driver' for all role-based checks.
-- This propagates to is_manager_or_above(), is_mechanic_or_above(),
-- and all policies that use them.
-- ============================================================================

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
DECLARE
    v_role user_role;
    v_cached TEXT;
BEGIN
    -- Try cached value first (transaction-local)
    v_cached := current_setting('app.cached_user_role', true);
    IF v_cached IS NOT NULL AND v_cached <> '' THEN
        RETURN v_cached::user_role;
    END IF;

    -- Cache miss — look up from profiles (only active users get their real role)
    SELECT role INTO v_role
    FROM profiles
    WHERE id = auth.uid()
      AND is_active = TRUE;

    v_role := COALESCE(v_role, 'driver'::user_role);

    -- Store in transaction-local setting
    PERFORM set_config('app.cached_user_role', v_role::TEXT, true);

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================================
-- 3. is_user_active() helper + apply to critical write policies
-- ============================================================================

CREATE OR REPLACE FUNCTION is_user_active()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- 3a. profiles_update_own — block deactivated users from updating profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() AND is_user_active())
    WITH CHECK (id = auth.uid());


-- 3b. scan_events_insert_own — block deactivated users from creating scans
DROP POLICY IF EXISTS "scan_events_insert_own" ON scan_events;

CREATE POLICY "scan_events_insert_own"
    ON scan_events FOR INSERT
    TO authenticated
    WITH CHECK (
        (scanned_by IS NULL OR scanned_by = auth.uid())
        AND is_user_active()
    );


-- 3c. photos_insert_authenticated — block deactivated users from uploading
DROP POLICY IF EXISTS "photos_insert_authenticated" ON photos;

CREATE POLICY "photos_insert_authenticated"
    ON photos FOR INSERT
    TO authenticated
    WITH CHECK (
        uploaded_by = auth.uid()
        AND is_user_active()
    );

COMMIT;
