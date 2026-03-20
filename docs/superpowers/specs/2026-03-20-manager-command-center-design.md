# Manager Command Center — Design Spec

**Date:** 2026-03-20
**Project:** RGR Fleet Manager (Web Dashboard)
**Author:** Claude Code + user collaboration
**Status:** Approved

---

## Overview

The Manager Command Center is a set of six features designed to address the primary pain point of fleet managers: **visibility** — knowing what is happening across the fleet at a glance without having to hunt for information.

Features are built in dependency order so each one makes the next more valuable.

| # | Feature | Route | Priority |
|---|---------|-------|----------|
| 1 | Real Analytics | `/reports` | High |
| 2 | Fleet Health Score | Dashboard widget | High |
| 3 | Notification Center | Global (top nav) | High |
| 4 | Maintenance Scheduling | `/maintenance` | Medium |
| 5 | Settings | `/settings` | Medium |
| 6 | Admin Panel | `/admin` | Low |

---

## Feature 1 — Reports / Analytics Page

**Route:** `/reports` (currently a stub)

### Purpose
Give managers a historical view of fleet activity through charts and tables, answering "what has been happening?"

### Charts

| Chart | Type | Description | Time Ranges |
|-------|------|-------------|-------------|
| Scan Frequency | Bar | Scans per day/week across the fleet | 7d, 30d, 90d |
| Asset Utilization | Donut | % of assets by status (Active/Idle/Maintenance/Retired) | Current snapshot |
| Hazard Trends | Line | Hazard alerts over time, split by severity | 30d, 90d, 1y |
| Time Between Scans | Histogram | How long assets go unscanned | 30d, 90d |
| Outstanding Assets | Table | Assets not scanned in 30+ days, sortable by last scan | Live |

### Layout
- Time range picker at top (7d / 30d / 90d / 1y) applies globally to all charts
- Two-column grid of chart cards using Recharts + Vision UI glassmorphism
- Outstanding Assets table at the bottom — same style as the Assets page table
- CSV export button on the Outstanding Assets table

### Data Sources
- All via new Supabase queries wired into existing `analyticsService.ts` types
- No new edge functions required
- React Query cache: 5-minute stale time (analytics don't need live updates)

### Out of Scope
- PDF export
- Per-driver breakdowns
- Custom date range picker

---

## Feature 2 — Fleet Health Score

**Location:** Dashboard page — prominent widget alongside existing stat cards

### Purpose
Give managers a single at-a-glance indicator of overall fleet health, answering "how is my fleet right now?"

### Score Calculation

| Component | Weight | Formula |
|-----------|--------|---------|
| Scan compliance | 40% | % of assets scanned within last 30 days |
| Hazard clearance | 40% | % of hazard alerts reviewed/resolved |
| Maintenance currency | 20% | % of assets with no overdue maintenance |

**Thresholds:**
- 90–100% → Healthy (green)
- 70–89% → Attention needed (amber)
- 0–69% → At risk (red)

### UI

**Fleet-wide view (default):**
- Large `RadialBarChart` (Recharts) showing the overall score
- Three component scores displayed below the gauge
- Score colour matches threshold

**Per-depot breakdown (toggle):**
- "By Depot" toggle within the same card
- List of depot rows beneath the gauge: depot name, score, mini colour-coded bar
- Clicking a depot row filters the main dashboard map to that depot

**Navigation:**
- Clicking the widget navigates to `/reports`
- Tooltip on hover shows the three component scores

### Data Sources
- **Scan compliance:** `useOutstandingAssets()` — provides assets not scanned in 30+ days; total asset count from `useFleetStatistics()`
- **Hazard clearance:** existing `getHazardReviewStats()` — provides reviewed vs total alert counts
- **Maintenance currency:** existing `getMaintenanceStats()` — provides `overdue` count vs total; note `useFleetStatistics()` does NOT include maintenance data and must not be used for this component
- **Per-depot breakdown:** one new Supabase query — same three metrics grouped by `depot_id`, joined with `listDepots()`
- React Query cache: 2-minute stale time (matches existing fleet stats)

### Out of Scope
- Per-asset score
- Score history/trending (covered by Reports page)

---

## Feature 3 — Notification Center

**Location:** Global — bell icon in `VisionTopNav` (placeholder slot already exists)

### Purpose
Surface critical events to managers without them having to hunt, answering "what needs my attention right now?"

### Notification Triggers

| Event | Severity | Source | `type` | `resource_type` |
|-------|----------|--------|--------|-----------------|
| New critical/high hazard alert detected | High | `hazard_alerts` realtime subscription | `'hazard'` | `'hazard_alert'` |
| Asset not scanned in 30+ days | Medium | Scheduled cron (see Detection Architecture below) | `'scan_overdue'` | `'asset'` |
| Fleet Health Score drops below 70% | High | Score computation on dashboard load | `'health_score'` | `'fleet'` |
| Depot health drops below 70% | Medium | Score computation on dashboard load | `'health_score'` | `'depot'` |
| Maintenance record overdue | Medium | Scheduled cron (see Detection Architecture below) | `'maintenance'` | `'asset'` |

Note: fleet-wide vs depot health score notifications are distinguished by `resource_type` (`'fleet'` vs `'depot'`), not by `type`.

### UI

**Bell icon in nav:**
- Unread count badge (red dot with number)
- Clicking opens a slide-out panel from the right (same pattern as `AssetDetailSlideout`)

**Notification panel:**
- Notifications listed newest first
- Each row: severity icon, title, description, timestamp, mark-read action
- Clicking a notification navigates to the relevant page/asset
- "Mark all read" button at top
- Grouped: Today / This week / Older

### Data Model
New `notifications` table in Supabase:

```sql
notifications (
  id uuid primary key,
  user_id uuid references profiles(id),
  type text,          -- 'hazard' | 'scan_overdue' | 'health_score' | 'maintenance'
  title text,
  body text,
  resource_id uuid,   -- asset_id, depot_id, etc.
  resource_type text, -- 'asset' | 'depot' | 'hazard_alert' | 'fleet'
  read boolean default false,
  created_at timestamptz default now()
)
```

- Realtime subscription on `notifications` for live badge updates

### Detection Architecture
Notification events require a detection layer that writes to the `notifications` table. Each trigger has a different mechanism:

| Trigger | Detection mechanism |
|---------|-------------------|
| New hazard alert | Supabase realtime subscription on `hazard_alerts` (already exists for cache invalidation) — extend to also insert a `notifications` row for critical/high severity alerts |
| Asset scan overdue | **New scheduled edge function** (`notify-daily-checks`) runs nightly via Supabase cron. Queries assets where last scan > 30 days and inserts notifications for affected managers. Deduplication: skip insert if a notification of the same `type` + `resource_id` already exists with `read = false`. Also handles overdue maintenance check below. |
| Maintenance overdue | Same `notify-daily-checks` edge function — queries `maintenance` where `due_date < today AND status = 'scheduled'`. Same deduplication rule: skip if matching unread notification already exists. |
| Health score drop | Computed client-side on dashboard load — if score crosses below 70%, inserts a notification row (deduped by checking if a same-day notification already exists) |

The existing `send-push-notification` edge function remains a generic push sender; it is called by the above mechanisms after inserting the notification row, not modified to be event-aware itself.

**Note:** The "No New Edge Functions Required" statement in Architecture Notes is incorrect for Feature 3. One new lightweight cron edge function (`notify-daily-checks`) is required.

### Settings Integration
Notification type preferences (which events to receive) managed in Settings page (Feature 5).

### Out of Scope
- Email notifications
- Notification history beyond 90 days
- Bulk delete

---

## Feature 4 — Maintenance Page

**Route:** `/maintenance` (currently a stub)

### Purpose
Give managers a fleet-wide view of maintenance status — overdue, upcoming, and completed.

### Layout

**Summary bar (top):**
- Count cards: Overdue / Due this week / Due this month / Completed this month
- Matches style of existing Asset stat bar

**Maintenance schedule table (main):**

| Column | Detail |
|--------|--------|
| Asset | Name + ID, links to asset detail slideout |
| Type | Service type (Oil change, Tyre rotation, Inspection, etc.) |
| Due date | Red if overdue, amber if within 7 days |
| Status | Overdue / Scheduled / In Progress / Completed / Cancelled |
| Last completed | Date of most recent completion |
| Actions | Mark complete, Reschedule |

- Filterable by: status, depot, due date range. Note: "Overdue" in the UI filter is a derived display state computed as `due_date < today AND status = 'scheduled'` — it is NOT a stored enum value. The `MaintenanceStatus` enum in the database is `scheduled | in_progress | completed | cancelled`. The filter query should translate "Overdue" to the appropriate date + status condition rather than writing `status = 'overdue'`.
- Sortable by: due date, asset name, status
- Paginated — same pattern as Assets table

**Calendar view (toggle):**
- Month calendar showing maintenance events by due date
- Click a day to see what's due
- Toggle between Table and Calendar via button (same pattern as Assets page map/table toggle)

### Data Sources
- **Per-asset data:** existing `getAssetMaintenance()` (used in Asset detail slideout)
- **Fleet-wide list:** existing `listMaintenance()` in `@rgr/shared` — already accepts `status`, `priority`, `assetId`, `limit`, `cursor`, `staleCutoffDays` filters. Gap: does not yet support `depot_id` filtering. Add `depotId` parameter to `listMaintenance()` to support the depot filter on this page.
- **Completing a record:** existing `updateMaintenanceStatus()` — call with `status: 'completed'`
- **Rescheduling:** existing `updateMaintenance()` — update `dueDate`/`scheduledDate` fields
- **Summary counts:** existing `getMaintenanceStats()` — provides overdue, due-soon, completed counts

### Out of Scope
- Creating maintenance records from this page (done via Asset detail slideout — already exists)
- Recurring schedule automation
- Mechanic assignment

---

## Feature 5 — Settings Page

**Route:** `/settings` (currently a stub)
**Who:** All authenticated users

### Sections

| Section | Contents |
|---------|----------|
| Profile | Name, email (read-only), avatar upload, change password |
| Notifications | Toggle per notification type from Feature 3 |
| Appearance | Theme (dark/light), default map view (map vs table), default reports time range |

### Data Model
- **Notification preferences** (which event types to receive): stored in the existing `notification_preferences` JSONB column on `profiles` — this column already exists. Extend it with keys for each notification type from Feature 3 (`hazard`, `scan_overdue`, `health_score`, `maintenance`).
- **Appearance preferences** (theme, default map view, default time range): stored in a new `user_preferences` JSONB column on `profiles`. This is separate from `notification_preferences` to avoid merging unrelated concerns.
- Notification Center reads `notification_preferences` to filter which event types to surface per user.

---

## Feature 6 — Admin Panel

**Route:** `/admin` (currently a stub, role gate already exists in `App.tsx`)
**Who:** Superuser only

### Tabs

| Tab | Contents |
|-----|----------|
| Users | All users — name, email, role, status, last login. Actions: change role, deactivate/reactivate |
| Depots | All depots — name, location, asset count. Actions: create, edit, deactivate |
| Assets | Bulk actions only: CSV import, export all assets |
| System | Deployment status, edge function health, last cron run times (read-only) |

### Data Sources
- Users tab: role changes via direct update to the `role` column on the `profiles` table (requires service-role key, done server-side). The `admin-create-user` edge function handles new user creation only — it does not handle role mutation. Deactivation/reactivation is done via the `is_active` column on `profiles`.
- Depots tab: existing `listDepots()` + new create/edit mutations
- System tab: existing `DeploymentStatus` and `SecurityStatus` components (already built)

### Out of Scope
- Audit log UI
- Billing/subscription management
- Bulk user import

---

## Architecture Notes

### Patterns to Follow
- Container/Presenter pattern for all new pages (matches existing `Login.tsx`, `Dashboard.tsx`, `Assets.tsx`)
- Logic extracted into custom hooks (`useMaintenance.ts`, `useNotifications.ts`, etc.)
- URL-based state for filters/sort/pagination on Maintenance page (matches Assets page)
- React Query for all server state with appropriate stale times
- Realtime subscriptions via Supabase channels (matches existing pattern)
- Vision UI glassmorphism for all new components

### New Database Objects Required
- `notifications` table (Feature 3)
- `user_preferences` JSONB column on `profiles` (Feature 5 — appearance prefs only; notification prefs use existing `notification_preferences` column)
- `depotId` filter parameter added to existing `listMaintenance()` (Feature 4)
- Per-depot health score query (Feature 2)
- Analytics queries implementing `analyticsService.ts` types (Feature 1)

### New Edge Functions Required
- `notify-daily-checks` — lightweight nightly cron that checks scan-overdue and maintenance-overdue conditions and inserts rows into the `notifications` table (Feature 3)

---

## Build Order & Dependencies

```
Feature 1 (Analytics) ──────────────────────────────────┐
Feature 2 (Health Score) ── depends on analytics data ──┤
Feature 3 (Notifications) ─ depends on health score ────┤── Feature 5 (Settings)
Feature 4 (Maintenance) ─── independent ────────────────┘
Feature 6 (Admin) ─────────── independent (build last)
```

Features 1, 2, 3 form the core visibility loop and should be built together first.
Features 4, 5, 6 can be built in parallel after the core loop is complete.
