-- Fix retention cron jobs — correct column names
--
-- rate_limits.last_attempt_at does not exist → should be first_failure_at
-- rego_lookup_log.looked_up_at does not exist → should be created_at

-- Unschedule broken jobs
SELECT cron.unschedule('rate-limits-cleanup');
SELECT cron.unschedule('rego-lookup-log-cleanup');

-- Re-create with correct column names
SELECT cron.schedule(
  'rate-limits-cleanup',
  '0 4 * * *',
  $$DELETE FROM rate_limits WHERE first_failure_at < now() - interval '24 hours'$$
);

SELECT cron.schedule(
  'rego-lookup-log-cleanup',
  '0 3 15 * *',
  $$DELETE FROM rego_lookup_log WHERE created_at < now() - interval '6 months'$$
);
