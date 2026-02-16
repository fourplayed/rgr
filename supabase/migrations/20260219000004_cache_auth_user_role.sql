-- ============================================================================
-- M6: Cache auth_user_role() result per transaction
--
-- RLS policies call auth_user_role() on every row evaluation. This version
-- caches the result in a transaction-local GUC setting so the profiles
-- lookup only happens once per statement/transaction.
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

    -- Cache miss — look up from profiles
    SELECT role INTO v_role
    FROM profiles
    WHERE id = auth.uid();

    v_role := COALESCE(v_role, 'driver'::user_role);

    -- Store in transaction-local setting
    PERFORM set_config('app.cached_user_role', v_role::TEXT, true);

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
