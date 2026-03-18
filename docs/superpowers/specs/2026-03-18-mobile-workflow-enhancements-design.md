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

// Photo payload shape (mirrors UploadPhotoOptions minus fileUri):
{
  assetId: string;
  scanEventId?: string;
  localUri: string;           // persistent copy in documentDirectory/offline-photos/
  photoType: PhotoType;       // matches UploadPhotoOptions field name
  uploadedBy: string;         // user ID, stored at enqueue time from useAuthStore
  originalFilename: string;
  latitude?: number;
  longitude?: number;
}

// ReplayHandlers extension:
type ReplayHandlers = {
  scan: (payload: Record<string, unknown>) => Promise<void>;
  defect_report: (payload: Record<string, unknown>) => Promise<void>;
  maintenance: (payload: Record<string, unknown>) => Promise<void>;
  photo: (payload: Record<string, unknown>) => Promise<void>;
};
```

The `uploadedBy` field is captured from `useAuthStore.getState().user.id` at enqueue time and stored in the payload, so it is available during replay without needing auth context.

### Enqueue Flow

1. PhotoReviewSheet's submit handler (the call site) detects offline via `onlineManager.isOnline()` — matching the pattern used by `handleDefectSubmit` in `useScanFlow.ts`. The `useUploadPhoto` mutation itself stays unchanged.
2. Copies photo from temp URI to `FileSystem.documentDirectory/offline-photos/{id}.jpg`
3. Calls `enqueueMutation({ type: 'photo', payload: { ...opts, localUri: persistentUri, uploadedBy: userId } })`
4. User sees toast: "Photo saved — will upload when back online"

### Replay Flow

1. Existing `replayQueue()` in `_layout.tsx` already runs on reconnect
2. New `'photo'` handler in `ReplayHandlers`:
   - Reads the file from persistent storage via `expo-file-system`
   - Reconstructs `UploadPhotoOptions` from payload (maps `localUri` → `fileUri`, uses stored `uploadedBy`)
   - Calls `uploadPhoto()` from shared service
   - On success: deletes the local file copy via `FileSystem.deleteAsync()`
   - On failure: increments `retryCount`, keeps in queue
3. After replay: invalidates `['photos']` query keys

### Queue Status Visibility

Export a new `getQueueSummary()` function from `offlineMutationQueue.ts` (currently only `getQueueLength()` is exported). Returns `Record<MutationType, number>` so the offline banner can show: "2 scans, 1 photo pending".

### Cleanup

- Existing 48h TTL applies — stale photo entries cleaned on next replay
- On TTL expiry: delete local file copy too (prevent storage bloat)
- Startup sweep: on app launch, scan `documentDirectory/offline-photos/` for files not referenced by any queue entry and delete them (handles crash between file copy and enqueue)

### File Changes

- `offlineMutationQueue.ts` — add `'photo'` to `MutationType`, extend `ReplayHandlers`, add `getQueueSummary()`, file-copy helper, orphan cleanup on startup, TTL file deletion
- `PhotoReviewSheet` (call site) — wrap submit in offline-aware try/catch (not inside `useUploadPhoto`)
- `_layout.tsx` — add photo handler to `replayQueue()` call, call orphan cleanup on mount
- Home screen offline banner — use `getQueueSummary()` to itemize by type

---

## Feature 2: Enhance Scan Location Progress Indicator

### Problem

22s GPS wait during scan with limited visual feedback. The existing `ScanProgressOverlay` component (at `components/scanner/ScanProgressOverlay.tsx`) shows step-based progress with static labels (`'detected' | 'location' | 'lookup' | 'invalid'`), but lacks time-aware messaging that explains the wait during long GPS acquisition.

### Design

**Enhance the existing `ScanProgressOverlay`** with elapsed-time context messages during the `'location'` step. The component already handles step transitions and is rendered via `CameraOverlay` — no new component needed.

### Enhancements

1. **Time-aware sub-text during `'location'` step** — cycles based on elapsed time since entering the step:
   - "Acquiring location..." (0-5s)
   - "Getting precise fix..." (5-10s, high accuracy attempt)
   - "Trying alternative signal..." (10-18s, balanced accuracy fallback)
   - "Almost there..." (18-22s)
2. **Haptic pulse** when location resolves (transition from `'location'` to `'lookup'` step) — success feedback before confirmation card
3. **Existing overlay background** already dims the camera (`rgba(0,0,0,0.75)`) — no additional dimming needed

### Implementation

- Enhance existing `ScanProgressOverlay.tsx` — add `useEffect` timer that tracks elapsed time during `'location'` step and cycles sub-text
- Add haptic trigger on step transition (`'location'` → `'lookup'`)
- Uses actual `ScanStep` type values: `'detected' | 'location' | 'lookup' | 'invalid'`

### Boundaries

No changes to location logic — the 22s timeout, high-accuracy-then-balanced fallback, and retry behavior stay as-is. Enhancement is purely to the existing presentation component.

### File Changes

- `components/scanner/ScanProgressOverlay.tsx` — add elapsed-time sub-text cycling, haptic on step transition
- No new files needed

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

1. `DefectReportDetailModal` (which already has full defect data in scope) shows two buttons: **"Quick Accept"** and **"Accept & Customise"**
2. **Quick Accept:** Confirmation bottom sheet — "Create maintenance task with default settings?" Yes/No
3. On confirm: calls `handleAcceptSubmit` in `useDefectMaintenanceModals.ts` with pre-built defaults (the modal already has defect.notes, defect.asset_id, etc. — no additional query needed)
4. Optimistic update fires (existing dual-snapshot pattern in `useAcceptDefect`)
5. Success toast: "Task created — assigned to {depot name}"
6. **Accept & Customise:** Opens existing full form (current behavior, renamed)

### Boundaries

The `accept_defect_report` RPC does not change. Quick-accept builds the default input in `DefectReportDetailModal` using the defect data already in scope, then passes it through `handleAcceptSubmit` → `useAcceptDefect` mutation (existing path).

### File Changes

- `DefectReportDetailModal` — add Quick Accept button, confirmation sheet, default builder using in-scope defect data
- `useDefectMaintenanceModals.ts` — expose `handleAcceptSubmit` for direct invocation with pre-built defaults (may already be accessible)
- `useAcceptDefect.ts` — no changes (mutation hook stays as-is)
- No RPC or service layer changes

---

## Feature 4: Bulk Maintenance Completion

### Problem

Mechanics finish 5-10 tasks at a depot and must open each individually to mark complete. Repetitive and slow.

### Design

**Multi-select mode on maintenance list with bulk "Mark Complete" action.**

### Entering Selection Mode

- Long-press any maintenance item enters selection mode (haptic feedback)
- Alternative: "Select" button in list header (avoids scroll gesture conflict on Android)
- Header shows: selection count, "Select All", and "Done"
- Items show checkboxes with tap-to-toggle

### Selection Constraints

- Only `scheduled` and `in_progress` items are selectable
- Already-completed and cancelled items are greyed out
- Existing status filter chips remain functional

### Bulk Action

- Bottom action bar: **"Complete ({n})"** button
- Confirmation sheet: "Mark {n} tasks as completed?"
- `useBulkCompleteMaintenance` hook handles the batch operation:
  1. Cancel queries once upfront (`cancelQueries({ queryKey: maintenanceKeys.lists() })`)
  2. Suppress realtime once (`suppressRealtimeFor('maintenance', 3000)`)
  3. Apply all optimistic patches in a single loop before starting RPCs
  4. Sequential calls to `updateMaintenanceStatus` service function directly (not the mutation hook — avoids per-item cache thrashing)
  5. Batch-invalidate once after all calls complete
- Progress indicator: "Completing 3 of 7..."
- On partial failure: continues remaining items, summary toast: "5 completed, 2 failed", rollback only failed items

### Offline Handling

Bulk completion requires connectivity. If offline, show toast: "Bulk completion requires an internet connection." Rationale: status transitions have server-side validation (`completed_at` timestamp, transition rules). Adding a `'maintenance_status_update'` mutation type to the offline queue would require duplicating that validation client-side — not worth the complexity for a batch operation that mechanics typically perform at the depot (where connectivity is available).

### Entering Selection Mode — Alternative Entry

Long-press on a scrollable FlatList can conflict with scroll gestures on Android. Provide a secondary entry point: a "Select" button in the maintenance list header, always visible when the list has completable items.

### Why Not a Bulk RPC?

`bulk_cancel_maintenance_tasks` exists for cancellation, but completion has side effects (`completed_at`, status transition validation). Sequential calls keep validation in one place. For 5-10 items the latency is acceptable.

### File Changes

- `maintenance.tsx` — selection state, long-press handler, "Select" header button, selection UI
- New: `components/maintenance/BulkActionBar.tsx` (~80 LOC)
- `useMaintenanceData.ts` — add `useBulkCompleteMaintenance` hook (uses service function directly, single cache operation pattern)

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
- Zod schema: `z.object({ rego_expiry: z.boolean() }).catchall(z.boolean())` — enforces known keys while allowing future additions
- Future notification types add keys — no migration needed

**Existing local settings:** `settingsStore.ts` has local notification toggles (pushEnabled, emailEnabled, etc.) stored via Zustand + AsyncStorage. These are local UI preferences and will remain as-is. The new server-side `notification_preferences` column is specifically for per-type delivery control enforced server-side. No conflict — local toggles control whether the device accepts any notifications at all, server-side preferences control which types are sent.

### Enforcement

- `rego-check-daily` currently sends notifications via `send-push-notification` with `targetRoles: ['superuser', 'manager']` — it never queries `profiles` directly
- Enhancement: `send-push-notification` edge function will join `push_tokens` to `profiles` and filter by `notification_preferences->>'rego_expiry' != 'false'` before building the recipient list
- This keeps the filtering logic in one place (the send function) rather than in each cron orchestrator
- Users with `rego_expiry: false` are skipped
- Push tokens stay registered (for future notification types)

### Mobile Flow

- Toggle calls `updateUserProfile({ notificationPreferences: { rego_expiry: boolean } })`
- Uses existing `useAuthStore.updateUserProfile()`
- Optimistic toggle (flip immediately, rollback on error)

### File Changes

- Migration: add `notification_preferences` JSONB column to profiles
- `packages/shared/src/types/api/auth.ts` — add `notificationPreferences` to `UpdateProfileInput`, `UpdateProfileInputSchema`, `Profile` interface, `ProfileRow`, `mapProfileToUpdate`, `mapRowToProfile`
- `apps/mobile/src/stores/authStore.ts` — handle `notificationPreferences` in `updateUserProfile`
- Settings screen — add notifications section with toggle (separate from existing local `settingsStore` toggles)
- `supabase/functions/send-push-notification/index.ts` — join `push_tokens` to `profiles`, filter by `notification_preferences` before sending
- `supabase/functions/rego-check-daily/index.ts` — pass notification type context to send function (no direct filtering here)

---

## Testing Strategy

Each feature gets unit tests covering:

1. **Offline Photo Queue:** Enqueue/replay/TTL cleanup/file persistence/orphan cleanup/`getQueueSummary()` (extend existing offlineMutationQueue test suite, ~15 new tests)
2. **Scan Progress Overlay:** Elapsed-time text cycling during `'location'` step, haptic on step transition, cleanup on unmount
3. **Quick-Accept:** Default generation from defect data, `handleAcceptSubmit` with pre-built defaults, optimistic update
4. **Bulk Completion:** Selection state management, single-operation cache pattern, sequential RPC calls, partial failure handling with per-item rollback, connectivity gate
5. **Notification Toggle:** Preference persistence via `updateUserProfile`, optimistic toggle, `send-push-notification` preference filtering

## Dependencies

- Features 1 and 4 both touch `offlineMutationQueue.ts` — implement Feature 1 first to avoid merge conflicts (Feature 4 only adds the connectivity check, not a new mutation type)
- Features 3 and 5 both touch profile/settings infrastructure — if Feature 5's migration changes the Profile type, Feature 3's default builder should account for the updated type. Implement Feature 3 first (no type changes), then Feature 5.
- Feature 5 requires a DB migration (profiles column) — should be applied before the edge function change
- Feature 1 (offline photos) uses `expo-file-system` which is already in the project dependencies
- Recommended implementation order: 1 → 2 → 3 → 4 → 5
