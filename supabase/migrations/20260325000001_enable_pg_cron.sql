-- Enable pg_cron and pg_net for scheduled edge function invocation.
-- NOTE: For hosted Supabase, enable these extensions via Dashboard > Extensions first.
-- Database secrets must be set:
--   ALTER DATABASE postgres SET app.supabase_url = 'https://xxx.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = 'eyJ...';

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily rego check at 20:00 UTC = 4:00 AM AWST (UTC+8)
SELECT cron.schedule(
  'daily-rego-check',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/rego-check-daily',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
