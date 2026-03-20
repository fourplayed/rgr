-- supabase/migrations/20260328000000_notifications_table.sql

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null check (type in ('hazard', 'scan_overdue', 'health_score', 'maintenance')),
  title       text not null,
  body        text not null,
  resource_id uuid,
  resource_type text check (resource_type in ('asset', 'depot', 'hazard_alert', 'fleet')),
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Managers only see their own notifications
alter table public.notifications enable row level security;

create policy "users_see_own_notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users_update_own_notifications"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.notifications;

-- Performance index
create index notifications_user_unread_idx
  on public.notifications (user_id, read, created_at desc)
  where read = false;

-- General index for fetching all notifications newest-first (inbox view)
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- Deduplication index — prevent duplicate unread notifications for same resource
create unique index notifications_dedup_idx
  on public.notifications (user_id, type, resource_id)
  where read = false and resource_id is not null;
