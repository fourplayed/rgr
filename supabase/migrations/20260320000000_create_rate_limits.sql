-- Persistent rate limiting for Edge Functions
-- Replaces in-memory Maps that reset on isolate recycle

create table if not exists rate_limits (
  key text primary key,
  failures integer not null default 0,
  first_failure_at timestamptz not null default now(),
  lockout_until timestamptz,
  lockout_seconds integer not null default 30
);

-- Index for efficient cleanup of expired entries
create index idx_rate_limits_first_failure on rate_limits (first_failure_at);

-- Enable RLS but only allow service_role access (Edge Functions use service key)
alter table rate_limits enable row level security;

-- No RLS policies = only service_role can access
comment on table rate_limits is 'Persistent rate limiting state for Edge Functions. Only accessible via service_role key.';
