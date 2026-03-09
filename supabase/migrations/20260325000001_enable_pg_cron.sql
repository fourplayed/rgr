-- Enable pg_cron and pg_net for scheduled edge function invocation.
-- NOTE: For hosted Supabase, enable these extensions via Dashboard > Extensions first.
--
-- SECURITY NOTE: Do NOT store service_role_key via ALTER DATABASE SET.
-- Instead, use Supabase Vault (pgsodium) or pass the key via pg_net headers
-- from a Vault secret reference. See: https://supabase.com/docs/guides/database/vault
-- For local dev, set via .env and access through edge function env vars.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily rego check at 20:00 UTC = 4:00 AM AWST (UTC+8)
SELECT cron.schedule(
  'daily-rego-check',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/rego-check-daily',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
