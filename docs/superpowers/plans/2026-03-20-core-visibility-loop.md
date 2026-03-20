# Core Visibility Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the three high-priority features that form the manager's daily visibility loop — Real Analytics (`/reports`), Fleet Health Score (dashboard widget), and Notification Center (global nav bell).

**Architecture:** Each feature follows the existing Container/Presenter/Hook pattern. All server state uses React Query. All new components use Vision UI glassmorphism. The notification center requires one new Supabase migration, one new edge function (nightly cron), and a service layer for CRUD operations on the `notifications` table.

**Tech Stack:** React 18, TypeScript, Vite, Zustand, React Query (TanStack), Recharts, Supabase (PostgreSQL + realtime), Vitest + React Testing Library, Vision UI glassmorphism (TailwindCSS + Motion)

**Spec:** `docs/superpowers/specs/2026-03-20-manager-command-center-design.md` — Features 1, 2, 3 only.

---

## File Map

### New Files
```
supabase/migrations/20260328000000_notifications_table.sql
apps/web/src/services/notificationService.ts
apps/web/src/services/__tests__/notificationService.test.ts
packages/shared/src/services/supabase/analytics.ts
packages/shared/src/services/supabase/__tests__/analytics.test.ts
apps/web/src/hooks/useAnalytics.ts
apps/web/src/hooks/__tests__/useAnalytics.test.ts
apps/web/src/hooks/useHealthScore.ts
apps/web/src/hooks/__tests__/useHealthScore.test.ts
apps/web/src/hooks/useNotifications.ts
apps/web/src/hooks/__tests__/useNotifications.test.ts
apps/web/src/pages/reports/Reports.tsx
apps/web/src/pages/reports/ReportsPresenter.tsx
apps/web/src/pages/reports/useReportsLogic.ts
apps/web/src/pages/reports/types.ts
apps/web/src/components/reports/TimeRangePicker.tsx
apps/web/src/components/reports/ScanFrequencyChart.tsx
apps/web/src/components/reports/AssetUtilizationChart.tsx
apps/web/src/components/reports/HazardTrendsChart.tsx
apps/web/src/components/reports/TimeBetweenScansChart.tsx
apps/web/src/components/reports/OutstandingAssetsTable.tsx
apps/web/src/components/reports/__tests__/TimeRangePicker.test.tsx
apps/web/src/components/reports/__tests__/OutstandingAssetsTable.test.tsx
apps/web/src/components/dashboard/health/FleetHealthScore.tsx
apps/web/src/components/dashboard/health/__tests__/FleetHealthScore.test.tsx
apps/web/src/components/notifications/NotificationBell.tsx
apps/web/src/components/notifications/NotificationPanel.tsx
apps/web/src/components/notifications/NotificationRow.tsx
apps/web/src/components/notifications/__tests__/NotificationBell.test.tsx
apps/web/src/components/notifications/__tests__/NotificationPanel.test.tsx
supabase/migrations/20260328000003_notify_daily_checks_proc.sql
supabase/migrations/20260328000004_notify_daily_checks_cron.sql
```

### Modified Files
```
packages/shared/src/services/supabase/fleet.ts           — add getDepotHealthScores(), getHazardClearanceRate()
apps/web/src/App.tsx                                      — swap StubPage for Reports container
apps/web/src/pages/dashboard/useDashboardLogic.ts         — add health score + notification wiring
apps/web/src/pages/dashboard/DashboardPresenter.tsx       — add FleetHealthScore widget
apps/web/src/components/dashboard/navigation/VisionTopNav.tsx — add NotificationBell
apps/web/src/hooks/useFleetData.ts                        — extend hazard realtime callback
```

> **⚠️ ServiceResult pattern:** All existing service functions in `@rgr/shared` return `Promise<ServiceResult<T>>` where `ServiceResult = { success: boolean; data: T | null; error: string | null }`. Every `queryFn` that calls a shared service **must unwrap** this before returning:
> ```typescript
> queryFn: async () => {
>   const result = await getSomeService();
>   if (!result.success || !result.data) throw new Error(result.error ?? 'Failed');
>   return result.data;
> },
> ```
> New functions added in this plan (analytics RPCs, `getDepotHealthScores`, `getHazardClearanceRate`) return bare values directly — they do NOT use the ServiceResult wrapper.

---

## Task 1: Database Migration — notifications table

**Files:**
- Create: `supabase/migrations/20260328000000_notifications_table.sql`

- [ ] **Step 1: Write the migration**

```sql
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

-- Service role inserts (cron + edge functions run with service role)
create policy "service_insert_notifications"
  on public.notifications for insert
  with check (true);

-- Realtime
alter publication supabase_realtime add table public.notifications;

-- Performance index
create index notifications_user_unread_idx
  on public.notifications (user_id, read, created_at desc)
  where read = false;

-- Deduplication index — prevent duplicate unread notifications for same resource
create unique index notifications_dedup_idx
  on public.notifications (user_id, type, resource_id)
  where read = false and resource_id is not null;
```

- [ ] **Step 2: Apply migration via Supabase CLI**

```bash
cd supabase && npx supabase db push
```

Expected: Migration applied successfully. No errors.

- [ ] **Step 3: Verify table exists**

```bash
npx supabase db diff --schema public | grep notifications
```

Expected: Table and indexes appear in output.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260328000000_notifications_table.sql
git commit -m "feat(db): add notifications table with RLS and realtime"
```

---

## Task 2: Notification Service Layer

**Files:**
- Create: `apps/web/src/services/notificationService.ts`
- Create: `apps/web/src/services/__tests__/notificationService.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/services/__tests__/notificationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockData = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  insert: mockInsert.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  order: mockOrder.mockReturnThis(),
  limit: mockLimit.mockReturnThis(),
}));

vi.mock('@rgr/shared', () => ({
  getSupabaseClient: () => ({ from: mockFrom }),
}));

import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  insertNotification,
  getUnreadCount,
} from '../notificationService';

describe('notificationService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchNotifications selects from notifications ordered by created_at desc', async () => {
    mockEq.mockReturnValueOnce({ data: [], error: null });
    await fetchNotifications('user-1');
    expect(mockFrom).toHaveBeenCalledWith('notifications');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('markNotificationRead updates read=true for given id', async () => {
    mockEq.mockReturnValueOnce({ error: null });
    await markNotificationRead('notif-1');
    expect(mockFrom).toHaveBeenCalledWith('notifications');
    expect(mockUpdate).toHaveBeenCalledWith({ read: true });
  });

  it('markAllNotificationsRead updates all unread for user', async () => {
    mockEq.mockReturnValueOnce({ error: null });
    await markAllNotificationsRead('user-1');
    expect(mockUpdate).toHaveBeenCalledWith({ read: true });
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('insertNotification inserts a row', async () => {
    mockInsert.mockReturnValueOnce({ error: null });
    await insertNotification({
      userId: 'user-1',
      type: 'hazard',
      title: 'Critical hazard detected',
      body: 'Asset ABC-123 has a critical hazard',
      resourceId: 'asset-uuid',
      resourceType: 'hazard_alert',
    });
    expect(mockInsert).toHaveBeenCalled();
  });

  it('getUnreadCount returns count of unread notifications', async () => {
    mockEq.mockReturnValueOnce({ count: 3, error: null });
    const count = await getUnreadCount('user-1');
    expect(count).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run src/services/__tests__/notificationService.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

```typescript
// apps/web/src/services/notificationService.ts
import { getSupabaseClient } from '@rgr/shared';

export type NotificationType = 'hazard' | 'scan_overdue' | 'health_score' | 'maintenance';
export type NotificationResourceType = 'asset' | 'depot' | 'hazard_alert' | 'fleet';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  resourceId: string | null;
  resourceType: NotificationResourceType | null;
  read: boolean;
  createdAt: string;
}

export interface InsertNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  resourceId?: string;
  resourceType?: NotificationResourceType;
}

const supabase = () => getSupabaseClient();

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(row => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    resourceId: row.resource_id,
    resourceType: row.resource_type,
    read: row.read,
    createdAt: row.created_at,
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase()
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase()
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export async function insertNotification(input: InsertNotificationInput): Promise<void> {
  const { error } = await supabase()
    .from('notifications')
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      resource_id: input.resourceId ?? null,
      resource_type: input.resourceType ?? null,
    });
  // Ignore unique constraint violations (deduplication)
  if (error && error.code !== '23505') throw error;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run src/services/__tests__/notificationService.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/services/notificationService.ts apps/web/src/services/__tests__/notificationService.test.ts
git commit -m "feat(web): add notification service layer"
```

---

## Task 3: Retire local analyticsService.ts and create shared analytics queries

**Files:**
- Modify: `apps/web/src/services/analyticsService.ts` — remove stub, re-export from `@rgr/shared`
- Create: `packages/shared/src/services/supabase/analytics.ts`

> **Why retire the stub?** `apps/web/src/services/analyticsService.ts` already exports `AnalyticsTimeRange` (with an `'all'` variant that's never used). Moving the real implementation to `@rgr/shared` avoids a type collision. The local file becomes a thin re-export so existing consumers (`useFleetData.ts`, `AnalyticsCharts.tsx`) don't need import path changes — but TypeScript will use the shared type going forward. The `'all'` variant is dropped since there is no corresponding UI or query.

Note: Tests for the shared package live in `packages/shared/src/__tests__/` if that directory exists, or alongside the file. Check existing test conventions before creating the test file. Focus on the implementation since these functions will be integration-tested via the web hook tests.

- [ ] **Step 1: Implement analytics queries**

```typescript
// packages/shared/src/services/supabase/analytics.ts
import { getSupabaseClient } from './client';

export type AnalyticsTimeRange = '7d' | '30d' | '90d' | '1y';

export interface ScanFrequencyPoint {
  label: string;   // e.g. "2026-03-15"
  count: number;
}

export interface AssetUtilizationPoint {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface HazardTrendPoint {
  date: string;
  total: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface TimeBetweenScansPoint {
  range: string;   // e.g. "0-7 days"
  count: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#2bbb6e',
  idle: '#2a8a9e',
  maintenance: '#e8a020',
  retired: '#888888',
  out_of_service: '#d43050',
};

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function rangeToDays(range: AnalyticsTimeRange): number {
  return { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[range];
}

export async function getScanFrequency(range: AnalyticsTimeRange): Promise<ScanFrequencyPoint[]> {
  const supabase = getSupabaseClient();
  const since = daysAgo(rangeToDays(range));
  const { data, error } = await supabase.rpc('get_scan_frequency', { since_date: since });
  if (error) throw error;
  return (data ?? []) as ScanFrequencyPoint[];
}

export async function getAssetUtilization(): Promise<AssetUtilizationPoint[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('assets')
    .select('status')
    .is('deleted_at', null);
  if (error) throw error;
  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    total++;
  }
  return Object.entries(counts).map(([status, count]) => ({
    status,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    color: STATUS_COLORS[status] ?? '#888888',
  }));
}

export async function getHazardTrends(range: AnalyticsTimeRange): Promise<HazardTrendPoint[]> {
  const supabase = getSupabaseClient();
  const since = daysAgo(rangeToDays(range));
  const { data, error } = await supabase.rpc('get_hazard_trends', { since_date: since });
  if (error) throw error;
  return (data ?? []) as HazardTrendPoint[];
}

export async function getTimeBetweenScans(range: AnalyticsTimeRange): Promise<TimeBetweenScansPoint[]> {
  const supabase = getSupabaseClient();
  const since = daysAgo(rangeToDays(range));
  const { data, error } = await supabase.rpc('get_time_between_scans', { since_date: since });
  if (error) throw error;
  return (data ?? []) as TimeBetweenScansPoint[];
}
```

> **Note on RPCs:** `get_scan_frequency`, `get_hazard_trends`, and `get_time_between_scans` are new PostgreSQL functions that need companion migrations. Write these migrations immediately after this task (Task 3b).

- [ ] **Step 2: Write migrations for analytics RPCs**

Create `supabase/migrations/20260328000001_analytics_rpcs.sql`:

```sql
-- Scan frequency: count scans grouped by day
create or replace function get_scan_frequency(since_date timestamptz)
returns table(label text, count bigint)
language sql stable security definer
set search_path = public
as $$
  select
    to_char(scanned_at::date, 'YYYY-MM-DD') as label,
    count(*) as count
  from scan_events
  where scanned_at >= since_date
  group by scanned_at::date
  order by scanned_at::date;
$$;

-- Hazard trends: count hazard alerts grouped by day and severity
create or replace function get_hazard_trends(since_date timestamptz)
returns table(
  date text,
  total bigint,
  "criticalCount" bigint,
  "highCount" bigint,
  "mediumCount" bigint,
  "lowCount" bigint
)
language sql stable security definer
set search_path = public
as $$
  select
    to_char(detected_at::date, 'YYYY-MM-DD') as date,
    count(*) as total,
    count(*) filter (where severity = 'critical') as "criticalCount",
    count(*) filter (where severity = 'high') as "highCount",
    count(*) filter (where severity = 'medium') as "mediumCount",
    count(*) filter (where severity = 'low') as "lowCount"
  from hazard_alerts
  where detected_at >= since_date
  group by detected_at::date
  order by detected_at::date;
$$;

-- Time between scans: histogram of gap between consecutive scans per asset
create or replace function get_time_between_scans(since_date timestamptz)
returns table(range text, count bigint)
language sql stable security definer
set search_path = public
as $$
  with gaps as (
    select
      asset_id,
      extract(epoch from (scanned_at - lag(scanned_at) over (partition by asset_id order by scanned_at))) / 86400 as gap_days
    from scan_events
    where scanned_at >= since_date
  )
  select
    case
      when gap_days < 7 then '0-7 days'
      when gap_days < 14 then '7-14 days'
      when gap_days < 30 then '14-30 days'
      when gap_days < 60 then '30-60 days'
      else '60+ days'
    end as range,
    count(*) as count
  from gaps
  where gap_days is not null
  group by 1
  order by min(gap_days);
$$;

grant execute on function get_scan_frequency(timestamptz) to authenticated;
grant execute on function get_hazard_trends(timestamptz) to authenticated;
grant execute on function get_time_between_scans(timestamptz) to authenticated;
```

- [ ] **Step 3: Apply migrations**

```bash
cd supabase && npx supabase db push
```

Expected: Both migrations apply cleanly.

- [ ] **Step 4: Export analytics from shared package index**

Add to `packages/shared/src/index.ts`:

```typescript
export * from './services/supabase/analytics';
```

- [ ] **Step 5: Convert local analyticsService.ts to a re-export shim**

Replace `apps/web/src/services/analyticsService.ts` with a thin re-export so existing consumers don't need import path changes:

```typescript
// apps/web/src/services/analyticsService.ts
// Re-exports from shared package. Do not add new types here.
export type {
  AnalyticsTimeRange,
  ScanFrequencyPoint as ScanFrequencyData,
  AssetUtilizationPoint as AssetUtilizationData,
  HazardTrendPoint as HazardTrendData,
  TimeBetweenScansPoint as TimeBetweenScansData,
} from '@rgr/shared';
```

> **Note:** If `AnalyticsCharts.tsx` or `useFleetData.ts` use the old type names (`ScanFrequencyData`, etc.), the aliases above preserve backward compatibility. Check which names are in use before committing.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/services/supabase/analytics.ts supabase/migrations/20260328000001_analytics_rpcs.sql packages/shared/src/index.ts
git commit -m "feat(shared): add analytics service functions and RPCs"
```

---

## Task 4: Analytics React Query Hook

**Files:**
- Create: `apps/web/src/hooks/useAnalytics.ts`
- Create: `apps/web/src/hooks/__tests__/useAnalytics.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/hooks/__tests__/useAnalytics.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockGetScanFrequency = vi.fn();
const mockGetAssetUtilization = vi.fn();
const mockGetHazardTrends = vi.fn();
const mockGetTimeBetweenScans = vi.fn();
const mockGetOutstandingAssets = vi.fn();

vi.mock('@rgr/shared', () => ({
  getScanFrequency: (...args: unknown[]) => mockGetScanFrequency(...args),
  getAssetUtilization: () => mockGetAssetUtilization(),
  getHazardTrends: (...args: unknown[]) => mockGetHazardTrends(...args),
  getTimeBetweenScans: (...args: unknown[]) => mockGetTimeBetweenScans(...args),
  getOutstandingAssets: (...args: unknown[]) => mockGetOutstandingAssets(...args),
}));

import { useAnalytics } from '../useAnalytics';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // New bare-value analytics functions (no ServiceResult wrapper):
    mockGetScanFrequency.mockResolvedValue([{ label: '2026-03-01', count: 5 }]);
    mockGetAssetUtilization.mockResolvedValue([{ status: 'active', count: 10, percentage: 100, color: '#2bbb6e' }]);
    mockGetHazardTrends.mockResolvedValue([]);
    mockGetTimeBetweenScans.mockResolvedValue([]);
    // getOutstandingAssets returns ServiceResult<T>:
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
  });

  it('fetches scan frequency for the given time range', async () => {
    const { result } = renderHook(() => useAnalytics('30d'), { wrapper });
    await waitFor(() => expect(result.current.scanFrequency.data).toBeDefined());
    expect(mockGetScanFrequency).toHaveBeenCalledWith('30d');
  });

  it('fetches asset utilization regardless of time range', async () => {
    const { result } = renderHook(() => useAnalytics('7d'), { wrapper });
    await waitFor(() => expect(result.current.assetUtilization.data).toBeDefined());
    expect(mockGetAssetUtilization).toHaveBeenCalled();
  });

  it('exposes isLoading true while queries are pending', () => {
    mockGetScanFrequency.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAnalytics('30d'), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run src/hooks/__tests__/useAnalytics.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```typescript
// apps/web/src/hooks/useAnalytics.ts
import { useQuery } from '@tanstack/react-query';
import {
  getScanFrequency,
  getAssetUtilization,
  getHazardTrends,
  getTimeBetweenScans,
  getOutstandingAssets,
  type AnalyticsTimeRange,
} from '@rgr/shared';

const STALE = 5 * 60 * 1000; // 5 minutes

export function useAnalytics(range: AnalyticsTimeRange) {
  const scanFrequency = useQuery({
    queryKey: ['analytics', 'scanFrequency', range],
    queryFn: () => getScanFrequency(range),
    staleTime: STALE,
  });

  const assetUtilization = useQuery({
    queryKey: ['analytics', 'assetUtilization'],
    queryFn: () => getAssetUtilization(),
    staleTime: STALE,
  });

  const hazardTrends = useQuery({
    queryKey: ['analytics', 'hazardTrends', range],
    queryFn: () => getHazardTrends(range),
    staleTime: STALE,
  });

  const timeBetweenScans = useQuery({
    queryKey: ['analytics', 'timeBetweenScans', range],
    queryFn: () => getTimeBetweenScans(range),
    staleTime: STALE,
  });

  const outstandingAssets = useQuery({
    queryKey: ['analytics', 'outstandingAssets'],
    // getOutstandingAssets returns ServiceResult<T> — unwrap it
    queryFn: async () => {
      const result = await getOutstandingAssets(30);
      if (!result.success || result.data == null) throw new Error(result.error ?? 'Failed');
      return result.data;
    },
    staleTime: STALE,
  });

  const isLoading =
    scanFrequency.isLoading ||
    assetUtilization.isLoading ||
    hazardTrends.isLoading ||
    timeBetweenScans.isLoading ||
    outstandingAssets.isLoading;

  const error =
    scanFrequency.error ||
    assetUtilization.error ||
    hazardTrends.error ||
    timeBetweenScans.error ||
    outstandingAssets.error;

  return { scanFrequency, assetUtilization, hazardTrends, timeBetweenScans, outstandingAssets, isLoading, error };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run src/hooks/__tests__/useAnalytics.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useAnalytics.ts apps/web/src/hooks/__tests__/useAnalytics.test.ts
git commit -m "feat(web): add useAnalytics hook with React Query"
```

---

## Task 5: Reports Page — Chart Components

**Files:**
- Create: `apps/web/src/components/reports/TimeRangePicker.tsx`
- Create: `apps/web/src/components/reports/ScanFrequencyChart.tsx`
- Create: `apps/web/src/components/reports/AssetUtilizationChart.tsx`
- Create: `apps/web/src/components/reports/HazardTrendsChart.tsx`
- Create: `apps/web/src/components/reports/TimeBetweenScansChart.tsx`
- Create: `apps/web/src/components/reports/OutstandingAssetsTable.tsx`
- Create: `apps/web/src/components/reports/__tests__/TimeRangePicker.test.tsx`
- Create: `apps/web/src/components/reports/__tests__/OutstandingAssetsTable.test.tsx`

- [ ] **Step 1: Write tests for TimeRangePicker**

```typescript
// apps/web/src/components/reports/__tests__/TimeRangePicker.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TimeRangePicker } from '../TimeRangePicker';

describe('TimeRangePicker', () => {
  it('renders all four range options', () => {
    render(<TimeRangePicker value="30d" onChange={vi.fn()} isDark />);
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
    expect(screen.getByText('90d')).toBeInTheDocument();
    expect(screen.getByText('1y')).toBeInTheDocument();
  });

  it('calls onChange with the clicked range', () => {
    const onChange = vi.fn();
    render(<TimeRangePicker value="30d" onChange={onChange} isDark />);
    fireEvent.click(screen.getByText('7d'));
    expect(onChange).toHaveBeenCalledWith('7d');
  });

  it('marks the active range as selected', () => {
    render(<TimeRangePicker value="90d" onChange={vi.fn()} isDark />);
    const active = screen.getByText('90d').closest('button');
    expect(active?.getAttribute('aria-pressed')).toBe('true');
  });
});
```

- [ ] **Step 2: Write tests for OutstandingAssetsTable**

```typescript
// apps/web/src/components/reports/__tests__/OutstandingAssetsTable.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OutstandingAssetsTable } from '../OutstandingAssetsTable';

// OutstandingAsset fields from @rgr/shared: id, assetNumber, category, status, lastScanDate, daysSinceLastScan
const mockAssets = [
  { id: 'a1', assetNumber: 'TRK-001', category: 'trailer', status: 'active', lastScanDate: '2026-01-01T00:00:00Z', daysSinceLastScan: 78 },
  { id: 'a2', assetNumber: 'TRL-004', category: 'trailer', status: 'active', lastScanDate: null, daysSinceLastScan: null },
];

describe('OutstandingAssetsTable', () => {
  it('renders asset numbers', () => {
    render(<OutstandingAssetsTable assets={mockAssets} isDark />);
    expect(screen.getByText('TRK-001')).toBeInTheDocument();
    expect(screen.getByText('TRL-004')).toBeInTheDocument();
  });

  it('shows "Never" for assets with no scan', () => {
    render(<OutstandingAssetsTable assets={mockAssets} isDark />);
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('renders a CSV export button', () => {
    render(<OutstandingAssetsTable assets={mockAssets} isDark />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run src/components/reports/__tests__/
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Implement TimeRangePicker**

```typescript
// apps/web/src/components/reports/TimeRangePicker.tsx
import type { AnalyticsTimeRange } from '@rgr/shared';

const RANGES: AnalyticsTimeRange[] = ['7d', '30d', '90d', '1y'];

interface Props {
  value: AnalyticsTimeRange;
  onChange: (range: AnalyticsTimeRange) => void;
  isDark: boolean;
}

export function TimeRangePicker({ value, onChange, isDark }: Props) {
  return (
    <div className="flex gap-1 rounded-lg p-1 backdrop-blur-sm"
      style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
      {RANGES.map(range => (
        <button
          key={range}
          aria-pressed={value === range}
          onClick={() => onChange(range)}
          className={[
            'px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            value === range
              ? 'bg-blue-600 text-white shadow'
              : isDark
                ? 'text-gray-300 hover:text-white hover:bg-white/10'
                : 'text-gray-600 hover:text-gray-900 hover:bg-black/10',
          ].join(' ')}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Implement ScanFrequencyChart**

```typescript
// apps/web/src/components/reports/ScanFrequencyChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { ScanFrequencyPoint } from '@rgr/shared';

interface Props {
  data: ScanFrequencyPoint[];
  isDark: boolean;
}

export function ScanFrequencyChart({ data, isDark }: Props) {
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
        <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fill: textColor, fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: 8 }}
          labelStyle={{ color: textColor }}
        />
        <Bar dataKey="count" fill="#2460b8" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 6: Implement AssetUtilizationChart**

```typescript
// apps/web/src/components/reports/AssetUtilizationChart.tsx
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { AssetUtilizationPoint } from '@rgr/shared';

interface Props {
  data: AssetUtilizationPoint[];
  isDark: boolean;
}

export function AssetUtilizationChart({ data, isDark }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={85}>
          {data.map(entry => (
            <Cell key={entry.status} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: 8 }}
          formatter={(value: number, name: string) => [`${value} assets`, name]}
        />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 7: Implement HazardTrendsChart**

```typescript
// apps/web/src/components/reports/HazardTrendsChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { HazardTrendPoint } from '@rgr/shared';

interface Props {
  data: HazardTrendPoint[];
  isDark: boolean;
}

export function HazardTrendsChart({ data, isDark }: Props) {
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
        <XAxis dataKey="date" tick={{ fill: textColor, fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fill: textColor, fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: 8 }} />
        <Legend />
        <Line type="monotone" dataKey="criticalCount" stroke="#d43050" dot={false} name="Critical" />
        <Line type="monotone" dataKey="highCount" stroke="#e8a020" dot={false} name="High" />
        <Line type="monotone" dataKey="mediumCount" stroke="#2460b8" dot={false} name="Medium" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 8: Implement TimeBetweenScansChart**

```typescript
// apps/web/src/components/reports/TimeBetweenScansChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { TimeBetweenScansPoint } from '@rgr/shared';

interface Props {
  data: TimeBetweenScansPoint[];
  isDark: boolean;
}

export function TimeBetweenScansChart({ data, isDark }: Props) {
  const textColor = isDark ? '#9ca3af' : '#6b7280';
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} />
        <XAxis dataKey="range" tick={{ fill: textColor, fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fill: textColor, fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: 8 }} />
        <Bar dataKey="count" fill="#2a8a9e" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 9: Implement OutstandingAssetsTable**

```typescript
// apps/web/src/components/reports/OutstandingAssetsTable.tsx
import type { OutstandingAsset } from '@rgr/shared';
// OutstandingAsset fields: id, assetNumber, category, status, lastScanDate, daysSinceLastScan

interface Props {
  assets: OutstandingAsset[];
  isDark: boolean;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function exportCSV(assets: OutstandingAsset[]) {
  const header = 'Asset Number,Category,Status,Last Scanned,Days Since Scan';
  const rows = assets.map(a =>
    `"${a.assetNumber}","${a.category}","${a.status}","${formatDate(a.lastScanDate)}","${a.daysSinceLastScan ?? 'N/A'}"`
  );
  const csv = [header, ...rows].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const el = document.createElement('a');
  el.href = url;
  el.download = `outstanding-assets-${new Date().toISOString().slice(0, 10)}.csv`;
  el.click();
  URL.revokeObjectURL(url);
}

export function OutstandingAssetsTable({ assets, isDark }: Props) {
  const cellClass = isDark ? 'text-gray-200' : 'text-gray-800';
  const headerClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const borderClass = isDark ? 'border-white/10' : 'border-gray-200';

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className={`text-sm ${headerClass}`}>{assets.length} assets not scanned in 30+ days</span>
        <button
          onClick={() => exportCSV(assets)}
          className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b ${borderClass}`}>
              <th className={`text-left py-2 pr-4 font-medium ${headerClass}`}>Asset #</th>
              <th className={`text-left py-2 pr-4 font-medium ${headerClass}`}>Category</th>
              <th className={`text-left py-2 pr-4 font-medium ${headerClass}`}>Last Scanned</th>
              <th className={`text-left py-2 font-medium ${headerClass}`}>Days Ago</th>
            </tr>
          </thead>
          <tbody>
            {assets.map(asset => (
              <tr key={asset.id} className={`border-b ${borderClass} last:border-0`}>
                <td className={`py-2 pr-4 ${cellClass}`}>{asset.assetNumber}</td>
                <td className={`py-2 pr-4 ${cellClass}`}>{asset.category}</td>
                <td className={`py-2 pr-4 ${cellClass}`}>{formatDate(asset.lastScanDate)}</td>
                <td className={`py-2 ${cellClass}`}>{asset.daysSinceLastScan ?? '—'}</td>
              </tr>
            ))}
            {assets.length === 0 && (
              <tr>
                <td colSpan={4} className={`py-6 text-center ${headerClass}`}>All assets scanned within 30 days</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run src/components/reports/__tests__/
```

Expected: All 6 tests PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/components/reports/
git commit -m "feat(web): add analytics chart and table components"
```

---

## Task 6: Reports Page — Container / Presenter / Logic

**Files:**
- Create: `apps/web/src/pages/reports/types.ts`
- Create: `apps/web/src/pages/reports/useReportsLogic.ts`
- Create: `apps/web/src/pages/reports/ReportsPresenter.tsx`
- Create: `apps/web/src/pages/reports/Reports.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create types**

```typescript
// apps/web/src/pages/reports/types.ts
import type { AnalyticsTimeRange } from '@rgr/shared';
export type { AnalyticsTimeRange };
```

- [ ] **Step 2: Create useReportsLogic**

```typescript
// apps/web/src/pages/reports/useReportsLogic.ts
import { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useAnalytics } from '../../hooks/useAnalytics';
import type { AnalyticsTimeRange } from './types';

export function useReportsLogic() {
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const analytics = useAnalytics(timeRange);

  return {
    state: { isDark, timeRange, analytics },
    actions: { setTimeRange },
  };
}
```

- [ ] **Step 3: Create ReportsPresenter**

```typescript
// apps/web/src/pages/reports/ReportsPresenter.tsx
import { TimeRangePicker } from '../../components/reports/TimeRangePicker';
import { ScanFrequencyChart } from '../../components/reports/ScanFrequencyChart';
import { AssetUtilizationChart } from '../../components/reports/AssetUtilizationChart';
import { HazardTrendsChart } from '../../components/reports/HazardTrendsChart';
import { TimeBetweenScansChart } from '../../components/reports/TimeBetweenScansChart';
import { OutstandingAssetsTable } from '../../components/reports/OutstandingAssetsTable';
import type { AnalyticsTimeRange } from './types';
import type { useAnalytics } from '../../hooks/useAnalytics';

interface ReportsPresenterProps {
  isDark: boolean;
  timeRange: AnalyticsTimeRange;
  analytics: ReturnType<typeof useAnalytics>;
  onTimeRangeChange: (range: AnalyticsTimeRange) => void;
}

function ChartCard({ title, isDark, children }: { title: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px)',
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <h3 className={`text-sm font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{title}</h3>
      {children}
    </div>
  );
}

export function ReportsPresenter({ isDark, timeRange, analytics, onTimeRangeChange }: ReportsPresenterProps) {
  const bgClass = isDark ? 'bg-transparent text-white' : 'text-gray-900';

  return (
    <div className={`p-6 space-y-6 ${bgClass}`}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fleet Reports</h1>
        <TimeRangePicker value={timeRange} onChange={onTimeRangeChange} isDark={isDark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Scan Frequency" isDark={isDark}>
          {analytics.isLoading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-white/10" />
          ) : (
            <ScanFrequencyChart data={analytics.scanFrequency.data ?? []} isDark={isDark} />
          )}
        </ChartCard>

        <ChartCard title="Asset Utilization" isDark={isDark}>
          {analytics.isLoading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-white/10" />
          ) : (
            <AssetUtilizationChart data={analytics.assetUtilization.data ?? []} isDark={isDark} />
          )}
        </ChartCard>

        <ChartCard title="Hazard Trends" isDark={isDark}>
          {analytics.isLoading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-white/10" />
          ) : (
            <HazardTrendsChart data={analytics.hazardTrends.data ?? []} isDark={isDark} />
          )}
        </ChartCard>

        <ChartCard title="Time Between Scans" isDark={isDark}>
          {analytics.isLoading ? (
            <div className="h-[220px] animate-pulse rounded-lg bg-white/10" />
          ) : (
            <TimeBetweenScansChart data={analytics.timeBetweenScans.data ?? []} isDark={isDark} />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Outstanding Assets (30+ days since last scan)" isDark={isDark}>
        {analytics.isLoading ? (
          <div className="h-[200px] animate-pulse rounded-lg bg-white/10" />
        ) : (
          <OutstandingAssetsTable assets={analytics.outstandingAssets.data ?? []} isDark={isDark} />
        )}
      </ChartCard>
    </div>
  );
}
```

- [ ] **Step 4: Create Reports container**

```typescript
// apps/web/src/pages/reports/Reports.tsx
import { useReportsLogic } from './useReportsLogic';
import { ReportsPresenter } from './ReportsPresenter';

export default function Reports() {
  const { state, actions } = useReportsLogic();
  return (
    <ReportsPresenter
      isDark={state.isDark}
      timeRange={state.timeRange}
      analytics={state.analytics}
      onTimeRangeChange={actions.setTimeRange}
    />
  );
}
```

- [ ] **Step 5: Wire the route in App.tsx**

In `apps/web/src/App.tsx`, find the lazy imports section and add:

```typescript
const Reports = lazy(() => import('./pages/reports/Reports'));
```

Then replace the `/reports` route:
```typescript
// Before:
<Route path="/reports" element={<ProtectedRoute><StubPage title="Reports" /></ProtectedRoute>} />

// After:
<Route path="/reports" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Reports /></Suspense></ProtectedRoute>} />
```

- [ ] **Step 6: Smoke test in browser**

```bash
cd apps/web && npm run dev
```

Navigate to http://localhost:5173/reports. Expected: Reports page renders with charts (loading skeletons → charts).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/reports/ apps/web/src/App.tsx
git commit -m "feat(web): implement Reports analytics page"
```

---

## Task 7: Depot Health Score Query + Hazard Clearance Rate (Shared Package)

**Files:**
- Modify: `packages/shared/src/services/supabase/fleet.ts`
- Create: `supabase/migrations/20260328000002_depot_health_score_rpc.sql`

> **Why `getHazardClearanceRate`?** The existing `getHazardReviewStats()` returns `{ pendingReviews, aiAccuracy, falsePositiveRate, totalPhotosAnalyzed, severityBreakdown }` — it does NOT expose `totalAlerts` or `reviewedAlerts` counts needed to compute a clearance percentage. Add a lightweight new function that returns exactly what the health score needs.

- [ ] **Step 1: Write the migration for the depot health RPC**

```sql
-- supabase/migrations/20260328000002_depot_health_score_rpc.sql

create or replace function get_depot_health_scores()
returns table(
  depot_id uuid,
  scan_compliance_pct numeric,
  hazard_clearance_pct numeric,
  maintenance_currency_pct numeric
)
language sql stable security definer
set search_path = public
as $$
  with
  cutoff as (select now() - interval '30 days' as ts),

  asset_counts as (
    select
      depot_id,
      count(*) as total,
      count(*) filter (where last_scan_at >= (select ts from cutoff)) as scanned_recent
    from assets
    where deleted_at is null and depot_id is not null
    group by depot_id
  ),

  hazard_counts as (
    select
      a.depot_id,
      count(h.id) as total,
      count(h.id) filter (where h.status in ('confirmed','false_positive')) as reviewed
    from hazard_alerts h
    join assets a on a.id = h.asset_id
    where a.deleted_at is null and a.depot_id is not null
    group by a.depot_id
  ),

  maint_counts as (
    select
      a.depot_id,
      count(m.id) as total,
      count(m.id) filter (where not (m.due_date < now() and m.status = 'scheduled')) as current
    from maintenance m
    join assets a on a.id = m.asset_id
    where a.deleted_at is null and a.depot_id is not null
      and m.status not in ('completed','cancelled')
    group by a.depot_id
  )

  select
    ac.depot_id,
    case when ac.total = 0 then 100 else round(ac.scanned_recent * 100.0 / ac.total, 1) end as scan_compliance_pct,
    case when hc.total is null or hc.total = 0 then 100 else round(hc.reviewed * 100.0 / hc.total, 1) end as hazard_clearance_pct,
    case when mc.total is null or mc.total = 0 then 100 else round(mc.current * 100.0 / mc.total, 1) end as maintenance_currency_pct
  from asset_counts ac
  left join hazard_counts hc using (depot_id)
  left join maint_counts mc using (depot_id);
$$;

grant execute on function get_depot_health_scores() to authenticated;
```

- [ ] **Step 2: Apply migration**

```bash
cd supabase && npx supabase db push
```

- [ ] **Step 3: Add service functions to fleet.ts**

In `packages/shared/src/services/supabase/fleet.ts`, add:

```typescript
export interface DepotHealthScore {
  depotId: string;
  scanCompliancePct: number;
  hazardClearancePct: number;
  maintenanceCurrencyPct: number;
  score: number; // weighted composite: 0.4*scan + 0.4*hazard + 0.2*maintenance
}

export async function getDepotHealthScores(): Promise<DepotHealthScore[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_depot_health_scores');
  if (error) throw error;
  return (data ?? []).map((row: {
    depot_id: string;
    scan_compliance_pct: number;
    hazard_clearance_pct: number;
    maintenance_currency_pct: number;
  }) => ({
    depotId: row.depot_id,
    scanCompliancePct: row.scan_compliance_pct,
    hazardClearancePct: row.hazard_clearance_pct,
    maintenanceCurrencyPct: row.maintenance_currency_pct,
    score: Math.round(
      row.scan_compliance_pct * 0.4 +
      row.hazard_clearance_pct * 0.4 +
      row.maintenance_currency_pct * 0.2
    ),
  }));
}

/** Returns total and pending hazard alert counts for health score calculation.
 *  Does NOT use ServiceResult wrapper — throws on error directly. */
export async function getHazardClearanceRate(): Promise<{ total: number; pending: number }> {
  const supabase = getSupabaseClient();
  const [totalRes, pendingRes] = await Promise.all([
    supabase.from('hazard_alerts').select('*', { count: 'exact', head: true }),
    supabase.from('hazard_alerts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  if (totalRes.error) throw totalRes.error;
  if (pendingRes.error) throw pendingRes.error;
  return { total: totalRes.count ?? 0, pending: pendingRes.count ?? 0 };
}
```

- [ ] **Step 4: Export from shared index**

Add to `packages/shared/src/index.ts`:

```typescript
export type { DepotHealthScore } from './services/supabase/fleet';
export { getDepotHealthScores, getHazardClearanceRate } from './services/supabase/fleet';
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/services/supabase/fleet.ts packages/shared/src/index.ts supabase/migrations/20260328000002_depot_health_score_rpc.sql
git commit -m "feat(shared): add depot health score RPC and service function"
```

---

## Task 8: useHealthScore Hook

**Files:**
- Create: `apps/web/src/hooks/useHealthScore.ts`
- Create: `apps/web/src/hooks/__tests__/useHealthScore.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/hooks/__tests__/useHealthScore.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockGetFleetStatistics = vi.fn();
const mockGetOutstandingAssets = vi.fn();
const mockGetHazardClearanceRate = vi.fn();
const mockGetMaintenanceStats = vi.fn();
const mockGetDepotHealthScores = vi.fn();

vi.mock('@rgr/shared', () => ({
  getFleetStatistics: () => mockGetFleetStatistics(),
  getOutstandingAssets: (...a: unknown[]) => mockGetOutstandingAssets(...a),
  getHazardClearanceRate: () => mockGetHazardClearanceRate(),
  getMaintenanceStats: () => mockGetMaintenanceStats(),
  getDepotHealthScores: () => mockGetDepotHealthScores(),
}));

import { useHealthScore } from '../useHealthScore';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useHealthScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ServiceResult pattern for @rgr/shared functions that use it:
    mockGetFleetStatistics.mockResolvedValue({ success: true, data: { totalAssets: 100, activeAssets: 80 }, error: null });
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [{ id: 'a1' }, { id: 'a2' }], error: null }); // 2 of 100
    mockGetMaintenanceStats.mockResolvedValue({ success: true, data: { total: 20, overdue: 2 }, error: null });
    // New bare-value functions (no ServiceResult wrapper):
    mockGetHazardClearanceRate.mockResolvedValue({ total: 10, pending: 2 }); // 8/10 = 80%
    mockGetDepotHealthScores.mockResolvedValue([]);
  });

  it('computes fleet score from three weighted components', async () => {
    const { result } = renderHook(() => useHealthScore(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // scanCompliance = (100-2)/100 = 98%
    // hazardClearance = (10-2)/10 = 80%
    // maintenanceCurrency = (20-2)/20 = 90%
    // score = 0.4*98 + 0.4*80 + 0.2*90 = 39.2 + 32 + 18 = 89.2 → 89
    expect(result.current.fleetScore).toBe(89);
  });

  it('status is "healthy" when score >= 90', async () => {
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: [], error: null });
    mockGetHazardClearanceRate.mockResolvedValue({ total: 10, pending: 0 });
    mockGetMaintenanceStats.mockResolvedValue({ success: true, data: { total: 20, overdue: 0 }, error: null });
    const { result } = renderHook(() => useHealthScore(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status).toBe('healthy');
  });

  it('status is "attention" when score is 70-89', async () => {
    const { result } = renderHook(() => useHealthScore(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status).toBe('attention');
  });

  it('status is "at-risk" when score < 70', async () => {
    mockGetOutstandingAssets.mockResolvedValue({ success: true, data: Array(60).fill({ id: 'x' }), error: null });
    mockGetHazardClearanceRate.mockResolvedValue({ total: 10, pending: 7 }); // 30% cleared
    mockGetMaintenanceStats.mockResolvedValue({ success: true, data: { total: 20, overdue: 10 }, error: null });
    const { result } = renderHook(() => useHealthScore(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status).toBe('at-risk');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run src/hooks/__tests__/useHealthScore.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement useHealthScore**

```typescript
// apps/web/src/hooks/useHealthScore.ts
import { useQuery } from '@tanstack/react-query';
import {
  getFleetStatistics,
  getOutstandingAssets,
  getHazardClearanceRate,
  getMaintenanceStats,
  getDepotHealthScores,
  type DepotHealthScore,
} from '@rgr/shared';

const STALE = 2 * 60 * 1000;

export type HealthStatus = 'healthy' | 'attention' | 'at-risk';

function toStatus(score: number): HealthStatus {
  if (score >= 90) return 'healthy';
  if (score >= 70) return 'attention';
  return 'at-risk';
}

export interface FleetHealthComponents {
  scanCompliancePct: number;
  hazardClearancePct: number;
  maintenanceCurrencyPct: number;
}

// ServiceResult unwrappers for @rgr/shared service functions
async function unwrap<T>(fn: () => Promise<{ success: boolean; data: T | null; error: string | null }>): Promise<T> {
  const result = await fn();
  if (!result.success || result.data == null) throw new Error(result.error ?? 'Service call failed');
  return result.data;
}

export function useHealthScore() {
  const statistics = useQuery({
    queryKey: ['fleet', 'statistics'],
    queryFn: () => unwrap(getFleetStatistics),
    staleTime: STALE,
  });
  const outstanding = useQuery({
    queryKey: ['fleet', 'outstanding-assets', 30],
    queryFn: () => unwrap(() => getOutstandingAssets(30)),
    staleTime: STALE,
  });
  // getHazardClearanceRate is a new bare-value function — no ServiceResult wrapper
  const hazardClearance = useQuery({
    queryKey: ['hazard', 'clearance-rate'],
    queryFn: getHazardClearanceRate,
    staleTime: STALE,
  });
  const maintenanceStats = useQuery({
    queryKey: ['maintenance', 'stats'],
    queryFn: () => unwrap(getMaintenanceStats),
    staleTime: STALE,
  });
  // getDepotHealthScores is also a new bare-value function
  const depotScores = useQuery({
    queryKey: ['fleet', 'depot-health-scores'],
    queryFn: getDepotHealthScores,
    staleTime: STALE,
  });

  const isLoading =
    statistics.isLoading || outstanding.isLoading || hazardClearance.isLoading || maintenanceStats.isLoading;

  let fleetScore = 0;
  let components: FleetHealthComponents = { scanCompliancePct: 0, hazardClearancePct: 0, maintenanceCurrencyPct: 0 };

  if (!isLoading && statistics.data && outstanding.data != null && hazardClearance.data && maintenanceStats.data) {
    const total = statistics.data.totalAssets ?? 0;
    const notScanned = outstanding.data.length;
    const scanCompliancePct = total > 0 ? ((total - notScanned) / total) * 100 : 100;

    const { total: totalAlerts, pending } = hazardClearance.data;
    const hazardClearancePct = totalAlerts > 0 ? ((totalAlerts - pending) / totalAlerts) * 100 : 100;

    const totalMaint = maintenanceStats.data.total ?? 0;
    const overdue = maintenanceStats.data.overdue ?? 0;
    const maintenanceCurrencyPct = totalMaint > 0 ? ((totalMaint - overdue) / totalMaint) * 100 : 100;

    components = { scanCompliancePct, hazardClearancePct, maintenanceCurrencyPct };
    fleetScore = Math.round(scanCompliancePct * 0.4 + hazardClearancePct * 0.4 + maintenanceCurrencyPct * 0.2);
  }

  return {
    isLoading,
    fleetScore,
    status: toStatus(fleetScore),
    components,
    depotScores: depotScores.data ?? [] as DepotHealthScore[],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run src/hooks/__tests__/useHealthScore.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useHealthScore.ts apps/web/src/hooks/__tests__/useHealthScore.test.ts
git commit -m "feat(web): add useHealthScore hook with fleet and depot scoring"
```

---

## Task 9: FleetHealthScore Widget Component

**Files:**
- Create: `apps/web/src/components/dashboard/health/FleetHealthScore.tsx`
- Create: `apps/web/src/components/dashboard/health/__tests__/FleetHealthScore.test.tsx`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/components/dashboard/health/__tests__/FleetHealthScore.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FleetHealthScore } from '../FleetHealthScore';

const baseProps = {
  isDark: true,
  isLoading: false,
  fleetScore: 85,
  status: 'attention' as const,
  components: { scanCompliancePct: 90, hazardClearancePct: 80, maintenanceCurrencyPct: 85 },
  depotScores: [
    { depotId: 'd1', score: 92, scanCompliancePct: 95, hazardClearancePct: 90, maintenanceCurrencyPct: 90 },
    { depotId: 'd2', score: 65, scanCompliancePct: 60, hazardClearancePct: 70, maintenanceCurrencyPct: 65 },
  ],
  depots: [
    { id: 'd1', name: 'Perth Depot' },
    { id: 'd2', name: 'Fremantle Depot' },
  ],
  onDepotClick: vi.fn(),
  onNavigateToReports: vi.fn(),
};

describe('FleetHealthScore', () => {
  it('renders the fleet score', () => {
    render(<FleetHealthScore {...baseProps} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows depot scores when By Depot toggle is clicked', () => {
    render(<FleetHealthScore {...baseProps} />);
    fireEvent.click(screen.getByText('By Depot'));
    expect(screen.getByText('Perth Depot')).toBeInTheDocument();
    expect(screen.getByText('Fremantle Depot')).toBeInTheDocument();
  });

  it('calls onDepotClick when a depot row is clicked', () => {
    render(<FleetHealthScore {...baseProps} />);
    fireEvent.click(screen.getByText('By Depot'));
    fireEvent.click(screen.getByText('Perth Depot'));
    expect(baseProps.onDepotClick).toHaveBeenCalledWith('d1');
  });

  it('calls onNavigateToReports when widget is clicked', () => {
    render(<FleetHealthScore {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: /view reports/i }));
    expect(baseProps.onNavigateToReports).toHaveBeenCalled();
  });

  it('shows loading skeleton when isLoading is true', () => {
    render(<FleetHealthScore {...baseProps} isLoading />);
    expect(screen.queryByText('85%')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run src/components/dashboard/health/__tests__/FleetHealthScore.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement FleetHealthScore**

```typescript
// apps/web/src/components/dashboard/health/FleetHealthScore.tsx
import { useState } from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';
import type { HealthStatus, FleetHealthComponents } from '../../../hooks/useHealthScore';
import type { DepotHealthScore } from '@rgr/shared';

const STATUS_COLOR: Record<HealthStatus, string> = {
  healthy: '#2bbb6e',
  attention: '#e8a020',
  'at-risk': '#d43050',
};

interface Depot { id: string; name: string; }

interface Props {
  isDark: boolean;
  isLoading: boolean;
  fleetScore: number;
  status: HealthStatus;
  components: FleetHealthComponents;
  depotScores: DepotHealthScore[];
  depots: Depot[];
  onDepotClick: (depotId: string) => void;
  onNavigateToReports: () => void;
}

function scoreColor(score: number): string {
  if (score >= 90) return '#2bbb6e';
  if (score >= 70) return '#e8a020';
  return '#d43050';
}

export function FleetHealthScore({
  isDark, isLoading, fleetScore, status, components, depotScores, depots, onDepotClick, onNavigateToReports,
}: Props) {
  const [showDepots, setShowDepots] = useState(false);

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
    backdropFilter: 'blur(12px)',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
  };

  const textClass = isDark ? 'text-gray-200' : 'text-gray-800';
  const subClass = isDark ? 'text-gray-400' : 'text-gray-500';

  const depotMap = Object.fromEntries(depots.map(d => [d.id, d.name]));

  if (isLoading) {
    return (
      <div className="rounded-2xl p-5 animate-pulse" style={cardStyle}>
        <div className="h-6 w-32 rounded bg-white/10 mb-4" />
        <div className="h-[180px] rounded bg-white/10" />
      </div>
    );
  }

  const gaugeData = [{ value: fleetScore, fill: STATUS_COLOR[status] }];

  return (
    <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${textClass}`}>Fleet Health Score</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setShowDepots(false)}
            className={`text-xs px-2.5 py-1 rounded-md transition-all ${!showDepots ? 'bg-blue-600 text-white' : `${subClass} hover:text-white hover:bg-white/10`}`}
          >
            Fleet
          </button>
          <button
            onClick={() => setShowDepots(true)}
            className={`text-xs px-2.5 py-1 rounded-md transition-all ${showDepots ? 'bg-blue-600 text-white' : `${subClass} hover:text-white hover:bg-white/10`}`}
          >
            By Depot
          </button>
        </div>
      </div>

      {!showDepots ? (
        <div className="flex flex-col items-center">
          <div className="relative h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="65%"
                outerRadius="90%"
                data={gaugeData}
                startAngle={210}
                endAngle={-30}
              >
                <RadialBar dataKey="value" cornerRadius={8} background={{ fill: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                <Tooltip
                  contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: 'none', borderRadius: 8 }}
                  formatter={(val: number) => [`${val}%`, 'Score']}
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${textClass}`}>{fleetScore}%</span>
              <span className="text-xs" style={{ color: STATUS_COLOR[status] }}>
                {status === 'healthy' ? 'Healthy' : status === 'attention' ? 'Attention' : 'At Risk'}
              </span>
            </div>
          </div>

          <div className="w-full space-y-1.5 mt-1">
            {[
              { label: 'Scan Compliance', pct: components.scanCompliancePct },
              { label: 'Hazard Clearance', pct: components.hazardClearancePct },
              { label: 'Maintenance Currency', pct: components.maintenanceCurrencyPct },
            ].map(({ label, pct }) => (
              <div key={label} className="flex justify-between items-center">
                <span className={`text-xs ${subClass}`}>{label}</span>
                <span className="text-xs font-medium" style={{ color: scoreColor(pct) }}>{Math.round(pct)}%</span>
              </div>
            ))}
          </div>

          <button
            onClick={onNavigateToReports}
            aria-label="View reports"
            className={`mt-3 text-xs ${subClass} hover:text-blue-400 transition-colors`}
          >
            View Reports →
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {depotScores
            .sort((a, b) => a.score - b.score)
            .map(ds => (
              <button
                key={ds.depotId}
                onClick={() => onDepotClick(ds.depotId)}
                className="w-full flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <span className={`text-xs flex-1 ${textClass}`}>{depotMap[ds.depotId] ?? ds.depotId}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${ds.score}%`, background: scoreColor(ds.score) }}
                  />
                </div>
                <span className="text-xs font-medium w-8 text-right" style={{ color: scoreColor(ds.score) }}>
                  {ds.score}%
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run src/components/dashboard/health/__tests__/FleetHealthScore.test.tsx
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/health/
git commit -m "feat(web): add FleetHealthScore widget component"
```

---

## Task 10: Wire FleetHealthScore into Dashboard

**Files:**
- Modify: `apps/web/src/pages/dashboard/useDashboardLogic.ts`
- Modify: `apps/web/src/pages/dashboard/DashboardPresenter.tsx`

> **Pattern note:** The project uses Container/Presenter + Logic hook. All new state and hooks belong in `useDashboardLogic.ts`, not in the container `Dashboard.tsx`. The container only wires the logic hook output into the presenter.

- [ ] **Step 1: Add health score and depot data to useDashboardLogic**

In `apps/web/src/pages/dashboard/useDashboardLogic.ts`, add:

```typescript
import { useHealthScore } from '../../hooks/useHealthScore';
import { useDepots } from '../../hooks/useAssetData'; // already exists in the hook file
import { useNavigate } from 'react-router-dom';

// Inside useDashboardLogic():
const healthScore = useHealthScore();
const depots = useDepots();
const navigate = useNavigate();

// Add to returned state:
state: {
  ...existingState,
  healthScore,
  depots: depots.data ?? [],
},
actions: {
  ...existingActions,
  onDepotMapFilter: (depotId: string) => { /* set map filter state */ },
  onNavigateToReports: () => navigate('/reports'),
},
```

- [ ] **Step 2: Render FleetHealthScore in DashboardPresenter**

In `apps/web/src/pages/dashboard/DashboardPresenter.tsx`, find the right-side panel or below stat cards area. Add `FleetHealthScore`:

```typescript
import { FleetHealthScore } from '../../components/dashboard/health/FleetHealthScore';

<FleetHealthScore
  isDark={state.isDark}
  isLoading={state.healthScore.isLoading}
  fleetScore={state.healthScore.fleetScore}
  status={state.healthScore.status}
  components={state.healthScore.components}
  depotScores={state.healthScore.depotScores}
  depots={state.depots}
  onDepotClick={actions.onDepotMapFilter}
  onNavigateToReports={actions.onNavigateToReports}
/>
```

- [ ] **Step 3: Smoke test in browser**

Navigate to http://localhost:5173/dashboard. Expected: Fleet Health Score widget visible, radial gauge shows score, "By Depot" toggle works.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/dashboard/
git commit -m "feat(web): add FleetHealthScore widget to dashboard"
```

---

## Task 11: useNotifications Hook

**Files:**
- Create: `apps/web/src/hooks/useNotifications.ts`
- Create: `apps/web/src/hooks/__tests__/useNotifications.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// apps/web/src/hooks/__tests__/useNotifications.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockFetchNotifications = vi.fn();
const mockGetUnreadCount = vi.fn();
const mockMarkNotificationRead = vi.fn();
const mockMarkAllNotificationsRead = vi.fn();

vi.mock('../../services/notificationService', () => ({
  fetchNotifications: (...a: unknown[]) => mockFetchNotifications(...a),
  getUnreadCount: (...a: unknown[]) => mockGetUnreadCount(...a),
  markNotificationRead: (...a: unknown[]) => mockMarkNotificationRead(...a),
  markAllNotificationsRead: (...a: unknown[]) => mockMarkAllNotificationsRead(...a),
}));

vi.mock('@rgr/shared', () => ({
  getSupabaseClient: () => ({
    channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }), subscribe: vi.fn() }),
    removeChannel: vi.fn(),
  }),
}));

// useAuthStore lives in a local path, not @rgr/shared — mock the correct module
vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'user-1' } }),
}));

import { useNotifications } from '../useNotifications';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchNotifications.mockResolvedValue([
      { id: 'n1', type: 'hazard', title: 'Critical hazard', body: 'Test', read: false, createdAt: new Date().toISOString() },
    ]);
    mockGetUnreadCount.mockResolvedValue(1);
    mockMarkNotificationRead.mockResolvedValue(undefined);
    mockMarkAllNotificationsRead.mockResolvedValue(undefined);
  });

  it('returns notifications list', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.notifications).toHaveLength(1);
  });

  it('returns unread count', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.unreadCount).toBe(1);
  });

  it('markRead calls markNotificationRead', async () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await result.current.markRead('n1');
    expect(mockMarkNotificationRead).toHaveBeenCalledWith('n1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run src/hooks/__tests__/useNotifications.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement useNotifications**

```typescript
// apps/web/src/hooks/useNotifications.ts
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '@rgr/shared';
import { useAuthStore } from '../stores/authStore';
import {
  fetchNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationService';

const KEYS = {
  list: (userId: string) => ['notifications', userId],
  unread: (userId: string) => ['notifications', userId, 'unread-count'],
};

export function useNotifications() {
  const { user } = useAuthStore();
  const userId = user?.id ?? '';
  const qc = useQueryClient();

  const notifications = useQuery({
    queryKey: KEYS.list(userId),
    queryFn: () => fetchNotifications(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const unreadCountQuery = useQuery({
    queryKey: KEYS.unread(userId),
    queryFn: () => getUnreadCount(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });

  // Realtime: invalidate on new notifications for this user
  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: KEYS.list(userId) });
          qc.invalidateQueries({ queryKey: KEYS.unread(userId) });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);

  async function markRead(notificationId: string) {
    await markNotificationRead(notificationId);
    qc.invalidateQueries({ queryKey: KEYS.list(userId) });
    qc.invalidateQueries({ queryKey: KEYS.unread(userId) });
  }

  async function markAllRead() {
    await markAllNotificationsRead(userId);
    qc.invalidateQueries({ queryKey: KEYS.list(userId) });
    qc.invalidateQueries({ queryKey: KEYS.unread(userId) });
  }

  return {
    notifications: notifications.data ?? [],
    unreadCount: unreadCountQuery.data ?? 0,
    isLoading: notifications.isLoading,
    markRead,
    markAllRead,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run src/hooks/__tests__/useNotifications.test.ts
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useNotifications.ts apps/web/src/hooks/__tests__/useNotifications.test.ts
git commit -m "feat(web): add useNotifications hook with realtime subscription"
```

---

## Task 12: Notification Components

**Files:**
- Create: `apps/web/src/components/notifications/NotificationRow.tsx`
- Create: `apps/web/src/components/notifications/NotificationPanel.tsx`
- Create: `apps/web/src/components/notifications/NotificationBell.tsx`
- Create: `apps/web/src/components/notifications/__tests__/NotificationBell.test.tsx`
- Create: `apps/web/src/components/notifications/__tests__/NotificationPanel.test.tsx`

- [ ] **Step 1: Write tests for NotificationBell**

```typescript
// apps/web/src/components/notifications/__tests__/NotificationBell.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationBell } from '../NotificationBell';

describe('NotificationBell', () => {
  it('renders badge with unread count when > 0', () => {
    render(<NotificationBell unreadCount={5} onClick={vi.fn()} isDark />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render badge when unread count is 0', () => {
    render(<NotificationBell unreadCount={0} onClick={vi.fn()} isDark />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<NotificationBell unreadCount={2} onClick={onClick} isDark />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('caps badge display at 99+', () => {
    render(<NotificationBell unreadCount={150} onClick={vi.fn()} isDark />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write tests for NotificationPanel**

```typescript
// apps/web/src/components/notifications/__tests__/NotificationPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationPanel } from '../NotificationPanel';
import type { Notification } from '../../../services/notificationService';

const notifications: Notification[] = [
  { id: 'n1', userId: 'u1', type: 'hazard', title: 'Critical hazard', body: 'ABC-123 has issue', resourceId: 'a1', resourceType: 'hazard_alert', read: false, createdAt: new Date().toISOString() },
  { id: 'n2', userId: 'u1', type: 'scan_overdue', title: 'Asset overdue', body: '45 days since scan', resourceId: 'a2', resourceType: 'asset', read: true, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
];

describe('NotificationPanel', () => {
  it('renders notification titles', () => {
    render(<NotificationPanel notifications={notifications} isDark onMarkRead={vi.fn()} onMarkAllRead={vi.fn()} onClose={vi.fn()} onNotificationClick={vi.fn()} />);
    expect(screen.getByText('Critical hazard')).toBeInTheDocument();
    expect(screen.getByText('Asset overdue')).toBeInTheDocument();
  });

  it('calls onMarkAllRead when Mark all read is clicked', () => {
    const onMarkAllRead = vi.fn();
    render(<NotificationPanel notifications={notifications} isDark onMarkRead={vi.fn()} onMarkAllRead={onMarkAllRead} onClose={vi.fn()} onNotificationClick={vi.fn()} />);
    fireEvent.click(screen.getByText(/mark all read/i));
    expect(onMarkAllRead).toHaveBeenCalled();
  });

  it('groups notifications into Today and Older sections', () => {
    render(<NotificationPanel notifications={notifications} isDark onMarkRead={vi.fn()} onMarkAllRead={vi.fn()} onClose={vi.fn()} onNotificationClick={vi.fn()} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText(/older|this week/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run src/components/notifications/__tests__/
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Implement NotificationRow**

```typescript
// apps/web/src/components/notifications/NotificationRow.tsx
import type { Notification, NotificationType } from '../../services/notificationService';

const TYPE_ICON: Record<NotificationType, string> = {
  hazard: '⚠️',
  scan_overdue: '🔍',
  health_score: '📊',
  maintenance: '🔧',
};

const TYPE_COLOR: Record<NotificationType, string> = {
  hazard: '#d43050',
  scan_overdue: '#e8a020',
  health_score: '#d43050',
  maintenance: '#e8a020',
};

interface Props {
  notification: Notification;
  isDark: boolean;
  onMarkRead: (id: string) => void;
  onClick: (notification: Notification) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationRow({ notification, isDark, onMarkRead, onClick }: Props) {
  const textClass = isDark ? 'text-gray-200' : 'text-gray-800';
  const subClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const hoverClass = isDark ? 'hover:bg-white/10' : 'hover:bg-black/5';

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-colors ${hoverClass} ${!notification.read ? (isDark ? 'bg-white/5' : 'bg-blue-50') : ''}`}
      onClick={() => onClick(notification)}
    >
      <span className="text-lg shrink-0" aria-hidden>{TYPE_ICON[notification.type]}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${textClass}`}>{notification.title}</p>
        <p className={`text-xs mt-0.5 truncate ${subClass}`}>{notification.body}</p>
        <p className="text-xs mt-1" style={{ color: TYPE_COLOR[notification.type] }}>{timeAgo(notification.createdAt)}</p>
      </div>
      {!notification.read && (
        <button
          onClick={e => { e.stopPropagation(); onMarkRead(notification.id); }}
          className={`shrink-0 text-xs ${subClass} hover:text-blue-400`}
          aria-label="Mark as read"
        >
          ✓
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implement NotificationPanel**

```typescript
// apps/web/src/components/notifications/NotificationPanel.tsx
import { useMemo } from 'react';
import { motion } from 'motion/react';
import { NotificationRow } from './NotificationRow';
import type { Notification } from '../../services/notificationService';

interface Props {
  notifications: Notification[];
  isDark: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  return diff < 7 * 24 * 60 * 60 * 1000 && !isToday(iso);
}

export function NotificationPanel({ notifications, isDark, onMarkRead, onMarkAllRead, onClose, onNotificationClick }: Props) {
  const groups = useMemo(() => ({
    today: notifications.filter(n => isToday(n.createdAt)),
    thisWeek: notifications.filter(n => isThisWeek(n.createdAt)),
    older: notifications.filter(n => !isToday(n.createdAt) && !isThisWeek(n.createdAt)),
  }), [notifications]);

  const panelStyle: React.CSSProperties = {
    background: isDark ? 'rgba(10,10,40,0.95)' : 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(20px)',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
  };

  const textClass = isDark ? 'text-gray-200' : 'text-gray-800';
  const subClass = isDark ? 'text-gray-400' : 'text-gray-500';
  const groupHeadClass = `text-xs font-semibold uppercase tracking-wider ${subClass} py-2 px-3`;

  function Section({ label, items }: { label: string; items: Notification[] }) {
    if (items.length === 0) return null;
    return (
      <div>
        <p className={groupHeadClass}>{label}</p>
        {items.map(n => (
          <NotificationRow key={n.id} notification={n} isDark={isDark} onMarkRead={onMarkRead} onClick={onNotificationClick} />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-80 z-50 flex flex-col shadow-2xl"
      style={panelStyle}
    >
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <h2 className={`text-base font-semibold ${textClass}`}>Notifications</h2>
        <div className="flex gap-2">
          <button onClick={onMarkAllRead} className={`text-xs ${subClass} hover:text-blue-400 transition-colors`}>
            Mark all read
          </button>
          <button onClick={onClose} className={`text-lg leading-none ${subClass} hover:text-red-400 transition-colors`} aria-label="Close">×</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <Section label="Today" items={groups.today} />
        <Section label="This Week" items={groups.thisWeek} />
        <Section label="Older" items={groups.older} />
        {notifications.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-48 ${subClass}`}>
            <span className="text-3xl mb-2">🔔</span>
            <p className="text-sm">No notifications</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 6: Implement NotificationBell**

```typescript
// apps/web/src/components/notifications/NotificationBell.tsx
interface Props {
  unreadCount: number;
  onClick: () => void;
  isDark: boolean;
}

export function NotificationBell({ unreadCount, onClick, isDark }: Props) {
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <button
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? `, ${badgeLabel} unread` : ''}`}
      className={`relative p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/10 text-gray-600'}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
          {badgeLabel}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run src/components/notifications/__tests__/
```

Expected: All 7 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/notifications/
git commit -m "feat(web): add notification bell, panel, and row components"
```

---

## Task 13: Wire Notifications into VisionTopNav

**Files:**
- Modify: `apps/web/src/components/dashboard/navigation/VisionTopNav.tsx`

- [ ] **Step 1: Add notification state to VisionTopNav**

VisionTopNav currently takes no notification-related props. Add them:

```typescript
// Add to VisionTopNavProps interface:
unreadNotificationCount: number;
onNotificationBellClick: () => void;
```

- [ ] **Step 2: Render NotificationBell in VisionTopNav**

Find the right side of the nav (where ThemeToggle, UserInfoBadge, and sign-out button are rendered). Import and add `NotificationBell` immediately before the theme toggle:

```typescript
import { NotificationBell } from '../../../components/notifications/NotificationBell';

// In the JSX, before the theme toggle:
<NotificationBell
  unreadCount={props.unreadNotificationCount}
  onClick={props.onNotificationBellClick}
  isDark={isDark}
/>
```

- [ ] **Step 3: Wire up in Dashboard**

The Dashboard container needs to:
1. Call `useNotifications()` to get `unreadCount`, `notifications`, `markRead`, `markAllRead`
2. Manage `isPanelOpen` state
3. Pass `unreadCount` and `onNotificationBellClick` to VisionTopNav (via DashboardPresenter)
4. Render `<NotificationPanel>` conditionally (with `AnimatePresence`) when `isPanelOpen` is true

In `apps/web/src/pages/dashboard/Dashboard.tsx`:

```typescript
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationPanel } from '../../components/notifications/NotificationPanel';
import { useNavigate } from 'react-router-dom';

// Inside Dashboard component:
const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
const [notifPanelOpen, setNotifPanelOpen] = useState(false);
const navigate = useNavigate();

function handleNotificationClick(notification: Notification) {
  markRead(notification.id);
  if (notification.resourceType === 'hazard_alert') navigate('/dashboard'); // opens hazard review
  else if (notification.resourceType === 'asset') navigate('/assets');
  else if (notification.resourceType === 'depot') navigate('/dashboard');
  setNotifPanelOpen(false);
}

// In JSX, alongside the existing content:
<AnimatePresence>
  {notifPanelOpen && (
    <NotificationPanel
      notifications={notifications}
      isDark={isDark}
      onMarkRead={markRead}
      onMarkAllRead={markAllRead}
      onClose={() => setNotifPanelOpen(false)}
      onNotificationClick={handleNotificationClick}
    />
  )}
</AnimatePresence>
```

Pass `unreadNotificationCount={unreadCount}` and `onNotificationBellClick={() => setNotifPanelOpen(true)}` into the presenter props.

- [ ] **Step 4: Smoke test in browser**

Navigate to http://localhost:5173/dashboard. Expected: Bell icon visible in nav, clicking opens slide-out panel.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/navigation/VisionTopNav.tsx apps/web/src/pages/dashboard/
git commit -m "feat(web): wire notification center into dashboard nav"
```

---

## Task 14: Hazard Alert → Notification Trigger

**Files:**
- Modify: `apps/web/src/hooks/useFleetData.ts` (or `useHazardAlertRealtime.ts` if it exists)

When the existing realtime subscription detects a new `hazard_alerts` row with severity `critical` or `high`, insert a notification row for all manager-role users.

> **Important:** Client-side notification creation for hazard alerts has a limitation — it only fires when a browser session is open. A robust solution would use a database trigger. For now, insert from the client in the hazard alert realtime callback. This can be upgraded to a database trigger later.

- [ ] **Step 1: Find the hazard alert realtime subscription**

Look in `apps/web/src/hooks/useFleetData.ts` for the `useFleetRealtime` hook. It subscribes to `hazard_alerts` changes to invalidate the React Query cache.

- [ ] **Step 2: Extend the callback to insert a notification**

```typescript
// Inside the hazard_alerts channel callback in useFleetRealtime:
import { insertNotification } from '../services/notificationService';
import { useAuthStore } from '../stores/authStore';

// In the callback for hazard_alerts INSERT events:
.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hazard_alerts' }, async (payload) => {
  // Existing cache invalidation:
  queryClient.invalidateQueries({ queryKey: FLEET_QUERY_KEYS.statistics() });
  // New: insert notification for critical/high severity
  const severity = payload.new?.severity;
  if (severity === 'critical' || severity === 'high') {
    const { user } = useAuthStore.getState();
    if (user) {
      await insertNotification({
        userId: user.id,
        type: 'hazard',
        title: severity === 'critical' ? 'Critical hazard detected' : 'High-severity hazard detected',
        body: `Asset ${payload.new?.asset_id ?? 'unknown'} requires immediate attention`,
        resourceId: payload.new?.id,
        resourceType: 'hazard_alert',
      });
    }
  }
})
```

- [ ] **Step 3: Smoke test**

In another browser tab or via mobile app, trigger a hazard alert. Expected: Bell badge increments within a few seconds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useFleetData.ts
git commit -m "feat(web): trigger notification on critical/high hazard alert"
```

---

## Task 15: Health Score → Notification Trigger

**Files:**
- Modify: `apps/web/src/hooks/useHealthScore.ts`

When the computed fleet score drops below 70%, insert a notification (deduped by same-day check).

- [ ] **Step 1: Add notification insertion to useHealthScore**

After the score is computed, add a side-effect check:

```typescript
import { useEffect, useRef } from 'react';
import { insertNotification } from '../services/notificationService';
import { useAuthStore } from '../stores/authStore';

// Inside useHealthScore, after computing fleetScore:
const lastNotifiedScore = useRef<number | null>(null);

useEffect(() => {
  if (isLoading || !user?.id) return;
  if (fleetScore < 70 && lastNotifiedScore.current !== fleetScore) {
    lastNotifiedScore.current = fleetScore;
    insertNotification({
      userId: user.id,
      type: 'health_score',
      title: 'Fleet health score at risk',
      body: `Fleet score dropped to ${fleetScore}% — below the 70% threshold`,
      resourceType: 'fleet',
    }).catch(() => {/* deduplication error is expected, ignore */});
  }
}, [fleetScore, isLoading, user?.id]);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/useHealthScore.ts
git commit -m "feat(web): trigger notification when fleet health score drops below 70%"
```

---

## Task 16: notify-daily-checks Edge Function

**Files:**
- Create: `supabase/functions/notify-daily-checks/index.ts`
- Create: `supabase/migrations/20260328000003_notify_daily_checks_cron.sql`

This Deno edge function runs nightly via pg_cron. It:
1. Finds assets not scanned in 30+ days and inserts notifications for their depot managers
2. Finds overdue maintenance records and inserts notifications

- [ ] **Step 1: Write the SQL stored procedure for daily checks**

The existing project cron pattern (confirmed in `20260327000005_retention_cron_jobs.sql`) runs inline SQL — no HTTP calls. Move the notification logic into a PostgreSQL stored procedure so pg_cron can call it directly.

Create `supabase/migrations/20260328000003_notify_daily_checks_proc.sql`:

```sql
-- supabase/migrations/20260328000003_notify_daily_checks_proc.sql

create or replace function run_daily_notification_checks()
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  cutoff_date timestamptz := now() - interval '30 days';
  manager_ids uuid[];
  asset_rec record;
  maint_rec record;
  uid uuid;
begin
  -- Get all active manager/superuser IDs
  select array_agg(id) into manager_ids
  from profiles
  where role in ('manager', 'superuser') and is_active = true;

  if manager_ids is null or array_length(manager_ids, 1) = 0 then
    return;
  end if;

  -- Check scan-overdue assets
  for asset_rec in
    select id, asset_number
    from assets
    where deleted_at is null
      and (last_scan_at is null or last_scan_at < cutoff_date)
  loop
    foreach uid in array manager_ids loop
      insert into notifications (user_id, type, title, body, resource_id, resource_type)
      values (
        uid,
        'scan_overdue',
        'Asset not scanned in 30+ days',
        asset_rec.asset_number || ' has not been scanned recently',
        asset_rec.id,
        'asset'
      )
      on conflict (user_id, type, resource_id) where read = false do nothing;
    end loop;
  end loop;

  -- Check overdue maintenance
  for maint_rec in
    select m.id, m.maintenance_type, m.due_date, a.asset_number
    from maintenance m
    join assets a on a.id = m.asset_id
    where m.due_date < now()
      and m.status = 'scheduled'
      and a.deleted_at is null
  loop
    foreach uid in array manager_ids loop
      insert into notifications (user_id, type, title, body, resource_id, resource_type)
      values (
        uid,
        'maintenance',
        'Maintenance overdue',
        maint_rec.maintenance_type || ' for ' || maint_rec.asset_number ||
          ' was due ' || to_char(maint_rec.due_date, 'DD Mon YYYY'),
        maint_rec.id,
        'asset'
      )
      on conflict (user_id, type, resource_id) where read = false do nothing;
    end loop;
  end loop;
end;
$$;
```

- [ ] **Step 2: Register cron job via migration**

Create `supabase/migrations/20260328000004_notify_daily_checks_cron.sql`:

```sql
-- supabase/migrations/20260328000004_notify_daily_checks_cron.sql
-- Requires pg_cron (20260325000001_enable_pg_cron.sql)
-- Matches the pattern from 20260327000005_retention_cron_jobs.sql

select cron.schedule(
  'notify-daily-checks',
  '0 1 * * *',
  $$select run_daily_notification_checks()$$
);
```

> **Note:** The edge function file (`supabase/functions/notify-daily-checks/index.ts`) can still be created as a manual trigger endpoint for testing, but the scheduled execution runs via the stored procedure above — not via HTTP. This matches the project's established cron pattern.

- [ ] **Step 3: Apply migrations**

```bash
cd supabase && npx supabase db push
```

Expected: Both migrations apply cleanly. Function `run_daily_notification_checks` exists. Cron job `notify-daily-checks` is registered.

- [ ] **Step 4: Test the procedure manually**

```bash
npx supabase db execute --local "select run_daily_notification_checks();"
```

Then check the `notifications` table for inserted rows:

```bash
npx supabase db execute --local "select type, title, body from notifications limit 10;"
```

Expected: Rows appear for any assets with scans older than 30 days or overdue maintenance records.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260328000003_notify_daily_checks_proc.sql supabase/migrations/20260328000004_notify_daily_checks_cron.sql
git commit -m "feat(backend): add daily notification checks stored procedure and cron"
```

---

## Final Smoke Test

- [ ] **Run full test suite**

```bash
cd apps/web && npm run test
```

Expected: All tests pass. Zero failures.

- [ ] **Manual verification checklist**

- [ ] `/reports` page loads with 5 charts and Outstanding Assets table
- [ ] Time range picker changes data across all charts
- [ ] CSV export downloads a file
- [ ] Dashboard shows Fleet Health Score widget with gauge
- [ ] "By Depot" toggle shows per-depot scores
- [ ] Clicking the widget navigates to `/reports`
- [ ] Bell icon visible in top nav
- [ ] Bell badge shows unread count
- [ ] Clicking bell opens notification panel
- [ ] Notifications grouped by Today / This Week / Older
- [ ] Mark all read clears badge
- [ ] Clicking a notification navigates to the relevant page
