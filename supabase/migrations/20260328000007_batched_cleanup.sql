-- Batched cleanup function for cron DELETE operations
--
-- Replaces unbounded DELETE statements with batched loops to avoid
-- long-running transactions and table bloat on large tables.

CREATE OR REPLACE FUNCTION batch_cleanup(
  p_table_name        TEXT,
  p_timestamp_column  TEXT,
  p_retention_interval INTERVAL,
  p_batch_size        INT DEFAULT 10000
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted   BIGINT;
  _total     BIGINT := 0;
  _iteration INT := 0;
  _max_iterations CONSTANT INT := 100;
BEGIN
  -- Allowlist validation
  IF p_table_name NOT IN ('audit_log', 'notification_log', 'rego_lookup_log') THEN
    RAISE EXCEPTION 'batch_cleanup: table "%" is not in the allowlist', p_table_name;
  END IF;

  IF p_timestamp_column NOT IN ('created_at', 'sent_at') THEN
    RAISE EXCEPTION 'batch_cleanup: column "%" is not in the allowlist', p_timestamp_column;
  END IF;

  LOOP
    _iteration := _iteration + 1;

    EXECUTE format(
      'DELETE FROM %I WHERE id IN (SELECT id FROM %I WHERE %I < now() - $1 LIMIT $2)',
      p_table_name, p_table_name, p_timestamp_column
    ) USING p_retention_interval, p_batch_size;

    GET DIAGNOSTICS _deleted = ROW_COUNT;
    _total := _total + _deleted;

    EXIT WHEN _deleted = 0;
    EXIT WHEN _iteration >= _max_iterations;
  END LOOP;

  RETURN _total;
END;
$$;

-- Revoke public access; only service_role / cron should call this
REVOKE ALL ON FUNCTION batch_cleanup(TEXT, TEXT, INTERVAL, INT) FROM PUBLIC;

-- ─── Replace unbounded DELETE cron jobs with batched calls ───────────────

-- 1. Unschedule existing jobs (safe: no-op if job doesn't exist on fresh DB)
DO $$ BEGIN PERFORM cron.unschedule('audit-log-cleanup'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('notification-log-cleanup'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('rego-lookup-log-cleanup'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 2. Reschedule with batch_cleanup

-- Audit log: retain 1 year, runs 1st of month at 03:00 UTC
SELECT cron.schedule(
  'audit-log-cleanup',
  '0 3 1 * *',
  $$SELECT batch_cleanup('audit_log', 'created_at', interval '1 year')$$
);

-- Notification log: retain 6 months, runs 15th of month at 03:00 UTC
SELECT cron.schedule(
  'notification-log-cleanup',
  '0 3 15 * *',
  $$SELECT batch_cleanup('notification_log', 'sent_at', interval '6 months')$$
);

-- Rego lookup log: retain 6 months, runs 15th of month at 03:00 UTC
SELECT cron.schedule(
  'rego-lookup-log-cleanup',
  '0 3 15 * *',
  $$SELECT batch_cleanup('rego_lookup_log', 'created_at', interval '6 months')$$
);
