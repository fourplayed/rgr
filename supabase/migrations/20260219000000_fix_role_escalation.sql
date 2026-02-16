-- ============================================================================
-- C1: Fix role escalation — hardcode 'driver' in handle_new_user()
--
-- Previously trusted raw_user_meta_data.role from signup payload, allowing
-- any user to self-assign 'superuser' role. Now always defaults to 'driver'.
-- Admin promotion must be done via a separate privileged flow.
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        phone,
        employee_id,
        depot,
        is_active
    ) VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        'driver'::user_role,  -- Always driver; admin promotes via service_role
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'employee_id',
        NEW.raw_user_meta_data->>'depot',
        TRUE
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Profile already exists (idempotent)
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't block user creation
        RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
