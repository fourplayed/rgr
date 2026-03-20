-- supabase/migrations/20260329000000_notify_daily_checks.sql
--
-- Creates the notify_daily_checks() stored procedure and registers it as a
-- nightly pg_cron job (2 AM UTC).
--
-- The function scans for two conditions and inserts notifications for all
-- managers and superusers:
--
--   1. SCAN OVERDUE — assets whose last_location_updated_at is null or older
--      than 30 days. The notification resource_id is the asset id.
--
--   2. MAINTENANCE OVERDUE — maintenance_records with status = 'scheduled'
--      and due_date < today. The notification resource_id is the
--      maintenance_records id.
--
-- Deduplication is enforced by:
--   a) An explicit EXISTS check (avoids wasted work).
--   b) ON CONFLICT DO NOTHING — the unique index
--      notifications_dedup_idx (user_id, type, resource_id) WHERE read = false
--      guarantees idempotency even if the job runs multiple times.
--
-- Schema notes (verified against migrations):
--   * Table is maintenance_records (not maintenance).
--   * Status enum values: scheduled | in_progress | completed | cancelled.
--   * Overdue column is due_date DATE (nullable).
--   * Human-readable label uses maintenance_records.title (not service_type —
--     there is no service_type column; maintenance_type is a free-text
--     category string like "scheduled" / "reactive").
--   * Depots have no manager_id column. Managers are identified only by
--     profiles.role. Because there is no structured depot-to-manager ownership,
--     all active managers/superusers are notified for every qualifying asset
--     (same pattern used by fleet-wide statistics RPCs in this project).
--   * pg_cron is already enabled (migration 20260325000001_enable_pg_cron.sql).

create or replace function public.notify_daily_checks()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r             record;
  v_today       date := current_date;
  v_cutoff_date date := current_date - 30;
begin

  -- ============================================================
  -- 1. SCAN OVERDUE NOTIFICATIONS
  -- For every active manager/superuser, emit one notification per
  -- asset that has not been scanned in 30+ days.
  -- ============================================================
  for r in
    select
      p.id          as manager_id,
      a.id          as asset_id,
      a.asset_number
    from profiles p
    cross join assets a
    where p.role in ('manager', 'superuser')
      and p.is_active = true
      and a.deleted_at is null
      and (
        a.last_location_updated_at is null
        or a.last_location_updated_at < v_cutoff_date
      )
  loop
    -- Skip if an unread scan_overdue notification already exists for this
    -- asset + manager today (pre-flight check avoids unnecessary write).
    if not exists (
      select 1
      from public.notifications
      where user_id     = r.manager_id
        and type        = 'scan_overdue'
        and resource_id = r.asset_id
        and read        = false
        and created_at::date = v_today
    ) then
      insert into public.notifications
        (id, user_id, type, title, body, resource_id, resource_type, read, created_at)
      values (
        gen_random_uuid(),
        r.manager_id,
        'scan_overdue',
        'Asset Scan Overdue',
        format('Asset %s has not been scanned in over 30 days', r.asset_number),
        r.asset_id,
        'asset',
        false,
        now()
      )
      on conflict do nothing;
    end if;
  end loop;

  -- ============================================================
  -- 2. MAINTENANCE OVERDUE NOTIFICATIONS
  -- For every active manager/superuser, emit one notification per
  -- maintenance record that is still 'scheduled' but past its due_date.
  -- ============================================================
  for r in
    select
      p.id          as manager_id,
      mr.id         as maintenance_id,
      mr.asset_id,
      a.asset_number,
      mr.due_date,
      mr.title      as maintenance_title
    from profiles p
    cross join maintenance_records mr
    join assets a on a.id = mr.asset_id
    where p.role in ('manager', 'superuser')
      and p.is_active = true
      and a.deleted_at is null
      and mr.status   = 'scheduled'
      and mr.due_date is not null
      and mr.due_date < v_today
  loop
    -- Skip if an unread maintenance notification already exists for this
    -- maintenance record + manager today.
    if not exists (
      select 1
      from public.notifications
      where user_id     = r.manager_id
        and type        = 'maintenance'
        and resource_id = r.asset_id
        and read        = false
        and created_at::date = v_today
    ) then
      insert into public.notifications
        (id, user_id, type, title, body, resource_id, resource_type, read, created_at)
      values (
        gen_random_uuid(),
        r.manager_id,
        'maintenance',
        'Maintenance Overdue',
        format(
          'Maintenance "%s" for asset %s was due on %s',
          r.maintenance_title,
          r.asset_number,
          r.due_date
        ),
        r.asset_id,
        'asset',
        false,
        now()
      )
      on conflict do nothing;
    end if;
  end loop;

end;
$$;

-- ============================================================
-- Register the nightly cron job (2 AM UTC every day).
-- Uses the inline-SQL $$ pattern consistent with retention_cron_jobs.sql.
-- ============================================================

-- Idempotent: remove existing job if present (handles db reset in dev)
do $$
begin
  perform cron.unschedule('notify-daily-checks');
exception when others then null;
end;
$$;

SELECT cron.schedule(
  'notify-daily-checks',
  '0 2 * * *',
  $$select public.notify_daily_checks();$$
);
