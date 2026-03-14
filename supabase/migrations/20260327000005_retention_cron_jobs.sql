-- H-3, L-3, L-6: Add retention/cleanup cron jobs for append-only tables
-- pg_cron is already enabled (migration 20260325000001)

-- Audit log: retain 1 year
SELECT cron.schedule(
  'audit-log-cleanup',
  '0 3 1 * *',
  $$DELETE FROM audit_log WHERE created_at < now() - interval '1 year'$$
);

-- Rate limits: clean up expired entries daily
SELECT cron.schedule(
  'rate-limits-cleanup',
  '0 4 * * *',
  $$DELETE FROM rate_limits WHERE last_attempt_at < now() - interval '24 hours'$$
);

-- Notification log: retain 6 months
SELECT cron.schedule(
  'notification-log-cleanup',
  '0 3 15 * *',
  $$DELETE FROM notification_log WHERE sent_at < now() - interval '6 months'$$
);

-- Rego lookup log: retain 6 months
SELECT cron.schedule(
  'rego-lookup-log-cleanup',
  '0 3 15 * *',
  $$DELETE FROM rego_lookup_log WHERE looked_up_at < now() - interval '6 months'$$
);
