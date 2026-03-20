-- Allow authenticated users to insert notifications only for themselves.
-- Used by client-side health score drop detection (Feature 3).
-- Edge functions and cron jobs use service_role which bypasses RLS.
create policy "users_insert_own_notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);
