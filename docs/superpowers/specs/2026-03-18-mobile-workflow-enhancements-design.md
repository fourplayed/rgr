# Mobile Workflow Enhancements Design

**Date:** 2026-03-18
**Scope:** Mobile app workflow polish — scan UX, maintenance efficiency, notification controls
**Approach:** Offline-first, then UX (Approach A)

## Priority Order

1. Offline Photo Queue
2. Scan Location Progress Indicator
3. Quick-Accept Defect to Maintenance
4. Bulk Maintenance Completion
5. Notification Preference Toggle

## Context

Field users operate frequently in low/no connectivity areas (remote depots, rural sites). The current offline queue handles scan events, defect reports, and maintenance records but not photos — causing data loss. The scan flow has a 22s location wait with no progress feedback. Maintenance workflows have high-frequency friction points (full form for routine defect acceptance, one-at-a-time task completion).

---

## Feature 1: Offline Photo Queue

### Problem

Photo uploads fail silently when offline. The photo is lost with no retry mechanism. The existing `offlineMutationQueue.ts` handles 3 mutation types but not photos.

### Design

**Extend `QueuedMutation` type** to support `'photo'` as a mutation type. Copy the captured photo from the volatile camera temp URI to a persistent app directory so it survives app restarts.

**Type extension:**

```typescript
// offlineMutationQueue.ts
type MutationType = 'scan' | 'defect_report' | 'maintenance' | 'photo';

// Photo payload shape:
{
  assetId: string;
  scanEventId?: string;
  localUri: string;           // persistent copy in documentDirectory/offline-photos/
  category: PhotoCategory;
  originalFilename: string;
}
```

### Enqueue Flow

1. `useUploadPhoto` mutation detects network failure via `onlineManager.isOnline()`
2. Copies photo from temp URI to `FileSystem.documentDirectory/offline-photos/{id}.jpg`
3. Calls `enqueueMutation({ type: 'photo', payload, photoUris: [persistentUri] })`
4. User sees toast: "Photo saved — will upload when back online"

### Replay Flow

1. Existing `replayQueue()` in `_layout.tsx` already runs on reconnect
2. New `'photo'` handler:
   - Reads the file from persistent storage
   - Calls `uploadPhoto()` from shared service
   - On success: deletes the local file copy
   - On failure: increments `retryCount`, keeps in queue
3. After replay: invalidates `['photos']` query keys

### Queue Status Visibility

Extend the existing offline banner on home screen to itemize by type: "2 scans, 1 photo pending".

### Cleanup

- Existing 48h TTL applies — stale photo entries cleaned on next replay
- On TTL expiry: delete local file copy too (prevent storage bloat)

### File Changes

- `offlineMutationQueue.ts` — add `'photo'` type, file-copy helper, cleanup on TTL
- `usePhotos.ts` — wrap upload in offline-aware try/catch
- `_layout.tsx` — add photo handler to `replayQueue()` call
- Home screen offline banner — itemize by type

---

## Feature 2: Scan Location Progress Indicator

### Problem

22s GPS wait during scan with no visual feedback. Users don't know if the app is working, frozen, or failed.

### Design

**Progress overlay during `scanning` phase.** When the state machine enters `scanning` (QR detected, resolving location + asset lookup), show an overlay on the camera view.

### Overlay Content

1. **Pulsing location icon** — animated pin icon indicating GPS acquisition
2. **Status text** — cycles through contextual messages:
   - "Acquiring location..." (0-5s)
   - "Getting precise fix..." (5-10s, high accuracy attempt)
   - "Trying alternative signal..." (10-18s, balanced accuracy fallback)
   - "Almost there..." (18-22s)
3. **Asset lookup step** — briefly shows "Finding asset..." during query cache check

### Implementation

- New component: `ScanProgressOverlay` (~60 LOC)
- Rendered inside `scan.tsx` when `phase === 'scanning'`
- Reads existing `scanStep` field (`'resolving_location' | 'looking_up_asset' | 'creating_scan'`)
- `useEffect` timer cycles status text based on elapsed time
- Camera view dims to ~40% opacity so overlay text is readable
- Haptic pulse when location resolves (success feedback)

### Boundaries

No changes to location logic — the 22s timeout, high-accuracy-then-balanced fallback, and retry behavior stay as-is. Purely presentation layer over existing `scanStep`.

### File Changes

- New: `components/scan/ScanProgressOverlay.tsx`
- `scan.tsx` — render overlay conditionally on phase

---

## Feature 3: Quick-Accept Defect to Maintenance

### Problem

Accepting a defect report requires filling a full maintenance form even for routine cases. Most acceptances use predictable defaults.

### Design

**One-tap quick-accept with smart defaults.** Add a "Quick Accept" button alongside the existing accept flow.

### Smart Defaults

```
title:       "Fix: {first 50 chars of defect notes}"
priority:    "medium"
status:      "scheduled"
assignee:    null (unassigned — mechanic picks it up)
notes:       "Auto-created from defect #{defect.id}"
asset_id:    defect.asset_id
depot_id:    asset's current depot
```

### Flow

1. Defect detail modal shows two buttons: **"Quick Accept"** and **"Accept & Customise"**
2. **Quick Accept:** Confirmation bottom sheet — "Create maintenance task with default settings?" Yes/No
3. On confirm: calls existing `accept_defect_report` RPC (unchanged)
4. Optimistic update fires (existing dual-snapshot pattern in `useAcceptDefect`)
5. Success toast: "Task created — assigned to {depot name}"
6. **Accept & Customise:** Opens existing full form (current behavior, renamed)

### Boundaries

The `accept_defect_report` RPC does not change. Quick-accept builds the default input client-side and passes it through the existing mutation path.

### File Changes

- Defect detail modal — add Quick Accept button, confirmation sheet
- `useAcceptDefect.ts` — add `quickAccept(defectId)` wrapper that builds default input
- No RPC or service layer changes

---

## Feature 4: Bulk Maintenance Completion

### Problem

Mechanics finish 5-10 tasks at a depot and must open each individually to mark complete. Repetitive and slow.

### Design

**Multi-select mode on maintenance list with bulk "Mark Complete" action.**

### Entering Selection Mode

- Long-press any maintenance item enters selection mode (haptic feedback)
- Header shows: selection count, "Select All (at this depot)", and "Done"
- Items show checkboxes with tap-to-toggle

### Selection Constraints

- Only `scheduled` and `in_progress` items are selectable
- Already-completed and cancelled items are greyed out
- Existing status filter chips remain functional

### Bulk Action

- Bottom action bar: **"Complete ({n})"** button
- Confirmation sheet: "Mark {n} tasks as completed?"
- Sequential calls to existing `update_maintenance_status` RPC (no new bulk RPC — 5-10 items takes <2s)
- Progress indicator: "Completing 3 of 7..."
- Each success fires optimistic patch on that item's cache entry
- On partial failure: continues remaining items, summary toast: "5 completed, 2 failed"

### Offline Handling

- If offline: enqueue each as individual `maintenance` mutations in existing offline queue
- Toast: "5 tasks queued — will complete when back online"

### Why Not a Bulk RPC?

`bulk_cancel_maintenance_tasks` exists for cancellation, but completion has side effects (`completed_at`, status transition validation). Sequential calls keep validation in one place. For 5-10 items the latency is acceptable.

### File Changes

- `maintenance.tsx` — selection state, long-press handler, selection UI
- New: `components/maintenance/BulkActionBar.tsx` (~80 LOC)
- `useMaintenanceData.ts` — add `useBulkCompleteMaintenance` hook

---

## Feature 5: Notification Preference Toggle

### Problem

Push notifications are all-or-nothing. Only rego expiry reminders exist currently.

### Design

**Simple on/off toggle in Settings, backed by a JSONB preference column.**

### UI

- Settings screen gets a "Notifications" section
- Single toggle: "Registration expiry reminders" — on/off
- Subtitle: "Get notified 7 days and 2 days before registration expires"

### Storage

- New column on `profiles`: `notification_preferences JSONB DEFAULT '{"rego_expiry": true}'`
- Zod schema: `z.record(z.string(), z.boolean())`
- Future notification types add keys — no migration needed

### Enforcement

- `rego-check-daily` edge function filters by `profiles.notification_preferences->>'rego_expiry'` before sending
- Users with `rego_expiry: false` are skipped
- Push tokens stay registered (for future notification types)

### Mobile Flow

- Toggle calls `updateUserProfile({ notification_preferences: { rego_expiry: boolean } })`
- Uses existing `useAuthStore.updateUserProfile()`
- Optimistic toggle (flip immediately, rollback on error)

### File Changes

- Migration: add `notification_preferences` JSONB column to profiles
- Settings screen — add notifications section with toggle
- `rego-check-daily/index.ts` — filter by preference before sending
- Profile type — add `notificationPreferences` field

---

## Testing Strategy

Each feature gets unit tests covering:

1. **Offline Photo Queue:** Enqueue/replay/TTL cleanup/file persistence (extend existing offlineMutationQueue test suite)
2. **Scan Progress Overlay:** Timer-based text cycling, phase gating, cleanup on unmount
3. **Quick-Accept:** Default generation, RPC call with defaults, optimistic update
4. **Bulk Completion:** Selection state management, sequential RPC calls, partial failure handling, offline enqueue
5. **Notification Toggle:** Preference persistence, optimistic toggle, edge function filtering

## Dependencies

- Features 1-4 are independent and can be built in sequence without blocking each other
- Feature 5 requires a DB migration (profiles column) — should be applied before the edge function change
- Feature 1 (offline photos) uses `expo-file-system` which is already in the project dependencies
