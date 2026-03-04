-- ============================================================================
-- Fix auth_user_role() caching bug: deactivated users cached as active
--
-- Problem: auth_user_role() unconditionally sets app.cached_user_active to
-- 'true' (line 117 of 20260302000000). When the profile query returns no row
-- (deactivated or deleted user), v_role is NULL, COALESCE assigns 'driver',
-- and the user is cached as active for the rest of the transaction.
-- This lets is_user_active() return TRUE, bypassing RLS guards on
-- scan_events, photos, etc.
--
-- Fix: Only cache active=true when a real role was found (before COALESCE).
-- Also removes the redundant second query in is_user_active() by doing a
-- single lookup that fetches both is_active and role.
-- ============================================================================

BEGIN;

-- ── Fix auth_user_role() ─────────────────────────────────────────────────────

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

    IF v_role IS NOT NULL THEN
        -- Found an active user with a real role — cache both
        PERFORM set_config('app.cached_user_role', v_role::TEXT, true);
        PERFORM set_config('app.cached_user_active', 'true', true);
    ELSE
        -- No active profile found — cache as inactive, fall back to 'driver'
        PERFORM set_config('app.cached_user_active', 'false', true);
        v_role := 'driver'::user_role;
    END IF;

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ── Simplify is_user_active() — remove redundant second query ────────────────

CREATE OR REPLACE FUNCTION is_user_active()
RETURNS BOOLEAN AS $$
DECLARE
    v_cached_role TEXT;
    v_cached_active TEXT;
    v_active BOOLEAN;
    v_role user_role;
BEGIN
    -- Fast path: if auth_user_role() already ran and found an active user
    v_cached_role := current_setting('app.cached_user_role', true);
    IF v_cached_role IS NOT NULL AND v_cached_role <> '' THEN
        -- Check if active was also cached (it always is after the fix above)
        v_cached_active := current_setting('app.cached_user_active', true);
        IF v_cached_active IS NOT NULL AND v_cached_active <> '' THEN
            RETURN v_cached_active::BOOLEAN;
        END IF;
        -- Cached role exists but no active flag — user is active
        RETURN TRUE;
    END IF;

    -- Check our own cache
    v_cached_active := current_setting('app.cached_user_active', true);
    IF v_cached_active IS NOT NULL AND v_cached_active <> '' THEN
        RETURN v_cached_active::BOOLEAN;
    END IF;

    -- Cache miss — single query for both active status and role
    SELECT p.role INTO v_role
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = TRUE;

    v_active := v_role IS NOT NULL;

    -- Cache both results to avoid redundant lookups
    PERFORM set_config('app.cached_user_active', v_active::TEXT, true);

    IF v_active AND v_role IS NOT NULL THEN
        PERFORM set_config('app.cached_user_role', v_role::TEXT, true);
    END IF;

    RETURN v_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;
