-- Add notification preferences to profiles
ALTER TABLE public.profiles
ADD COLUMN notification_preferences JSONB NOT NULL DEFAULT '{"rego_expiry": true}'::jsonb;

COMMENT ON COLUMN public.profiles.notification_preferences IS
  'Per-type notification delivery preferences. Keys are notification type names, values are booleans.';
