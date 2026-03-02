-- ============================================================================
-- DB Review: Remove scan_events from realtime + cache is_user_active()
--
-- 1. Remove scan_events from supabase_realtime publication.
--    No mobile code uses realtime subscriptions (zero .channel()/.subscribe()
--    calls), so every INSERT triggers N RLS evaluations for zero benefit.
--
-- 2. Cache is_user_active() alongside auth_user_role().
--    Both functions query `profiles` per transaction. When auth_user_role()
--    populates its cache, we know the user is active (the query filters
--    WHERE is_active = TRUE). is_user_active() can check that cache first,
--    avoiding a redundant profiles lookup.
--
-- Cache contract:
--   - app.cached_user_role: set by auth_user_role() on cache miss.
--     A non-empty value means the user was found in profiles with
--     is_active = TRUE, so is_user_active() can return TRUE immediately.
--   - app.cached_user_active: set by is_user_active() on cache miss,
--     so auth_user_role() can also skip re-querying when called second.
-- ============================================================================

BEGIN;

-- ── 1. Drop scan_events from realtime ──────────────────────────────────────

ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS scan_events;


-- ── 2. Cache is_user_active() ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_user_active()
RETURNS BOOLEAN AS $$
DECLARE
    v_cached_role TEXT;
    v_cached_active TEXT;
    v_active BOOLEAN;
BEGIN
    -- Fast path: if auth_user_role() already ran this transaction and found
    -- an active user (non-empty cached role), we know they're active.
    v_cached_role := current_setting('app.cached_user_role', true);
    IF v_cached_role IS NOT NULL AND v_cached_role <> '' THEN
        RETURN TRUE;
    END IF;

    -- Check our own cache
    v_cached_active := current_setting('app.cached_user_active', true);
    IF v_cached_active IS NOT NULL AND v_cached_active <> '' THEN
        RETURN v_cached_active::BOOLEAN;
    END IF;

    -- Cache miss — query profiles
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND is_active = TRUE
    ) INTO v_active;

    -- Store result in transaction-local setting
    PERFORM set_config('app.cached_user_active', v_active::TEXT, true);

    -- If active, also warm auth_user_role cache to avoid a second lookup
    IF v_active THEN
        DECLARE
            v_role user_role;
        BEGIN
            SELECT role INTO v_role
            FROM profiles
            WHERE id = auth.uid()
              AND is_active = TRUE;

            IF v_role IS NOT NULL THEN
                PERFORM set_config('app.cached_user_role', v_role::TEXT, true);
            END IF;
        END;
    END IF;

    RETURN v_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ── 3. Update auth_user_role() to also set cached_user_active ──────────────

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

    -- Also set cached_user_active since we already know the answer:
    -- if we found a real role, the user is active; otherwise not.
    PERFORM set_config('app.cached_user_active', 'true', true);

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;
