# Integration Findings Fix — Design Spec

**Date:** 2026-03-14
**Scope:** All 18 findings from integration-specialist analysis of mobile + shared packages
**Approach:** Domain-grouped (6 groups), all findings addressed

---

## Group 1: Auth & Session (Findings #3, #4, #18)

### F3 — Near-expiry tokens during auto-login

**Problem:** `authStore.ts` `attemptAutoLogin` rejects tokens within the 60s buffer, but a token expiring in 61-300 seconds passes the check. Supabase's `setSession()` triggers a server-side refresh, and the new tokens are persisted. However, the 60-second buffer is tight — network latency or clock skew could allow a near-expiry token through that expires before the SDK's auto-refresh timer fires.

**Fix:** Widen the buffer constant from 60 seconds to 5 minutes (300 seconds). This ensures tokens close to expiry are rejected and the user re-authenticates cleanly, rather than bolting on a second refresh after `setSession()` already handles it. The `setSession()` + persist flow remains unchanged.

**File:** `apps/mobile/src/store/authStore.ts` (lines 216-219)

### F4 — Token refresh doesn't persist to SecureStore

**Problem:** The `onAuthStateChange` listener in `_layout.tsx` only acts on `SIGNED_OUT` or `TOKEN_REFRESHED && !session`. When a refresh succeeds with a valid session, the new tokens are not saved to SecureStore. If the app is killed, auto-login uses stale tokens.

**Fix:** Add a branch for `TOKEN_REFRESHED && session` that calls `storeSession()` with the new session data.

**File:** `apps/mobile/app/_layout.tsx` (lines 157-167)

### F18 — `SecureAuthResponseSchema` uses `.passthrough()`

**Problem:** The Zod schema for the login Edge Function response accepts extra fields without validation via `.passthrough()` on `user` and `session` sub-objects.

**Fix:** Replace `.passthrough()` with `.strip()` on the `user` and `session` sub-objects. This drops unknown fields without failing validation (avoids brittleness of `.strict()`).

**File:** `packages/shared/src/services/supabase/auth.ts` (lines 8-28)

---

## Group 2: Realtime & Subscriptions (Findings #5, #6, #7)

### F5 — `maintenance_records` missing from realtime publication

**Problem:** `useRealtimeInvalidation.ts` subscribes to `maintenance_records` changes, but the table was never added to the `supabase_realtime` publication. The subscription connects successfully but never receives events.

**Note:** This is a day-1 bug from when `maintenance_records` was introduced — no data was lost, events were simply never received. No regression risk, only improvement.

**Fix:** Apply migration via Supabase MCP:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_records;
```

### F6 — Double cleanup (unsubscribe + removeChannel)

**Problem:** Cleanup function calls both `unsubscribe()` and `removeChannel()`. The latter already handles unsubscription; calling both produces console warnings.

**Fix:** Remove `unsubscribe()` calls, keep only `removeChannel()`.

**File:** `apps/mobile/src/hooks/useRealtimeInvalidation.ts` (lines 139-148)

### F7 — No debounce on reconnection invalidation

**Problem:** When the realtime connection flaps, each SUBSCRIBED event triggers full query invalidation. Rapid reconnects cause repeated refetches.

**Fix:** Track `lastInvalidatedAt` per-channel using a `Map<string, number>` keyed by channel name. Skip invalidation if the previous one for that specific channel was less than 5 seconds ago. Per-channel tracking prevents one channel's reconnect from suppressing another channel's legitimate invalidation.

**File:** `apps/mobile/src/hooks/useRealtimeInvalidation.ts`

---

## Group 3: Push Notifications (Findings #11, #12)

### F11 — Push tokens not deleted on logout

**Problem:** Logout flow in `authStore.ts` clears the session and calls `signOut()` but never removes the push token from the database. Stale tokens can route notifications to the wrong user on shared devices.

**Fix:** Capture `userId` from `get().user?.id` at the top of the `logout` function, *before* the `set()` call that clears state to null. Then call `deletePushToken(userId, deviceId)` using the captured ID and the same device identifier from `expo-application` used during registration. Wrap in try-catch so a failed delete doesn't block logout.

**Files:** `apps/mobile/src/store/authStore.ts` (lines 116-137)

### F12 — Notification tap handler only routes to asset detail

**Problem:** The tap handler checks `data?.assetId` and ignores all other payload shapes. No extensibility for future notification types.

**Fix:** Extend with a route map:
- `data.assetId` -> `/(tabs)/assets/{assetId}`
- `data.maintenanceId` -> `/(tabs)/maintenance` (tab-level, no deep link yet)
- `data.defectId` -> `/(tabs)/maintenance` (tab-level, no deep link yet)
- Unrecognized -> `__DEV__` console warning, no-op in prod

**File:** `apps/mobile/src/hooks/usePushNotifications.ts` (lines 174-179)

---

## Group 4: Offline Resilience (Findings #8, #9, #10)

### F8 — Full offline queue for defect reports and maintenance

**Problem:** Only scan events are queued offline. Defect reports and maintenance mutations fail silently when offline — problematic for field use.

**Fix:** Generalize `offlineScanQueue.ts` into `offlineMutationQueue.ts`. Queue entry schema:

```typescript
type QueuedMutation = {
  id: string;
  type: 'scan' | 'defect_report' | 'maintenance';
  payload: CreateScanEventInput | CreateDefectReportInput | CreateMaintenanceRecordInput;
  queuedAt: number;
  photoUris?: string[]; // local file paths, uploaded during replay
};
```

Each type has a replay handler calling the corresponding shared service function. Existing guards carry over:
- Circuit breaker: 3 consecutive failures stops replay
- Cap: 500 entries, oldest-first eviction
- TTL: 48 hours
- Concurrency: `_isReplaying` guard
- Abort: `_abortReplay` for clean logout

Photo handling: photos reference their parent record via FK, so they must be uploaded *after* the parent mutation succeeds. Replay order per entry:
1. Create the defect/maintenance record, receive the new record ID
2. Upload photos referencing the new record's ID
3. If photo upload fails, mark the entry's `photoStatus: 'failed'` but do NOT discard the text record (it's already persisted server-side)

Queue entry gains a `photoStatus: 'pending' | 'uploaded' | 'failed'` field. Entries with `photoStatus: 'failed'` can be retried for photo upload only (the parent record already exists). Photo failures do NOT count toward the circuit breaker — only parent mutation failures do.

Post-replay invalidation in `_layout.tsx` extended to also invalidate defect and maintenance queries.

**Files:**
- `apps/mobile/src/utils/offlineScanQueue.ts` -> rename to `offlineMutationQueue.ts`
- `apps/mobile/src/hooks/scan/useScanProcessing.ts`
- `apps/mobile/src/components/scanner/DefectReportSheet.tsx`
- `apps/mobile/app/_layout.tsx`
- Maintenance creation hook (for offline enqueue on network failure)

### F9 — QR code offline fallback only parses `rgr://asset/` prefix

**Problem:** The offline enqueue path in `useScanProcessing.ts` only recognizes `rgr://asset/` prefix. Other QR formats supported by the `lookup_asset_by_qr` RPC are silently dropped.

**Fix:** The shared function already exists — `extractAssetInfo()` in `packages/shared/src/utils/qrCode.ts` handles `rgr://asset/`, `rgr://a/`, raw UUIDs, and asset numbers. The offline fallback path in `useScanProcessing.ts` uses a hand-rolled `qrData.startsWith('rgr://asset/')` instead of calling this function.

Replace the hand-rolled prefix check with `extractAssetInfo(qrData)` from `@rgr/shared`. If it returns null, show the user "This QR format can't be queued offline - try again when connected" instead of silently dropping.

**Files:** `apps/mobile/src/hooks/scan/useScanProcessing.ts` (import and use existing `extractAssetInfo`)

### F10 — No UI indicator for pending offline queue

**Problem:** `getQueueLength()` is exported but never called from any UI component. Users have no visibility into queued actions.

**Fix:** Create `useOfflineQueueStatus()` hook that polls queue length on a 10-second interval and on NetInfo change events. Display a banner on the home screen when queue is non-empty: "N actions queued - will sync when online". Auto-dismiss when queue empties after replay.

**Files:** New `apps/mobile/src/hooks/useOfflineQueueStatus.ts`, `apps/mobile/app/(tabs)/home.tsx`

---

## Group 5: Network & Retry (Findings #1, #14)

### F1 — No jitter on retry delays

**Problem:** `retryDelay` in `_layout.tsx` uses pure exponential backoff without jitter. Mass reconnect causes thundering herd on Supabase.

**Fix:** Add random jitter factor (50-100% of base delay):
```typescript
retryDelay: (attempt) => {
  const base = Math.min(1000 * 2 ** attempt, 30000);
  return base * (0.5 + Math.random() * 0.5);
}
```
Apply to both query and mutation defaults.

**File:** `apps/mobile/app/_layout.tsx` (lines 94-108)

### F14 — `triggerRegoLookup` has no timeout

**Problem:** `supabase.functions.invoke()` has no AbortController. A hanging DOT website holds a connection open for up to 30 seconds.

**Fix:** Add AbortController with 15-second timeout. Swallow abort error in the existing catch block.

**File:** `apps/mobile/src/utils/regoLookup.ts`

---

## Group 6: Type Safety (Findings #2, #13, #15, #16, #17)

### F2 & F17 — `assertQueryResult` without Zod validation on joins

**Problem:** 18 usages of `assertQueryResult<T>` perform pure type assertion (`return data as T`) without runtime validation. Join query results are unchecked — a column rename or FK change produces silent corruption.

**Fix:**
1. Create `validateQueryResult<T>(data: unknown, schema: ZodType<T>): T` that calls `schema.parse(data)` and throws `ServiceError` on failure.
2. For the ~10-12 join query callsites (in `assets.ts`, `maintenance.ts`, `defectReports.ts`, `admin.ts`, `photos.ts`), create response schemas (e.g., `AssetDetailResponseSchema`, `MaintenanceWithPhotosSchema`). Schemas live in `packages/shared/src/types/entities/`.
3. For simple single-row callsites (`pushTokens.ts`, `auth.ts`), use existing entity schemas or the already-validated upstream data (e.g., `auth.ts` callsites are already validated by `SecureAuthResponseSchema` — just cast the validated result).
4. Replace all `assertQueryResult` callsites with `validateQueryResult` or typed casts as appropriate.
5. Delete `assertQueryResult`.

**Files:** All shared service files, entity schema files, `packages/shared/src/utils/index.ts`

### F13 — Inconsistent edge function invocation (document only)

**Problem:** `signInWithEmailSecure` uses raw `fetch()` while `triggerRegoLookup` uses `supabase.functions.invoke()`.

**Fix:** Add explanatory comment to `signInWithEmailSecure`:
```
// Uses raw fetch instead of supabase.functions.invoke() because
// the user has no session token at login time — the SDK method
// would attach an empty/invalid Authorization header.
```

No code change beyond the comment.

**File:** `packages/shared/src/services/supabase/auth.ts`

### F15 — CORS origin empty string when env var unset

**Problem:** Edge functions fall back to `""` for CORS origin if `ALLOWED_ORIGIN` isn't set. Blocks web app; doesn't affect mobile.

**Fix:** Change fallback to `"*"`:
```typescript
Deno.env.get("ALLOWED_ORIGIN") || "*"
```
Safe because edge functions are already protected by Supabase API key requirement.

**Files:** `supabase/functions/rego-lookup/index.ts`, `supabase/functions/send-push-notification/index.ts`

### F16 — Three `as any` casts at Supabase SDK boundary

**Problem:** `assets.ts:526`, `maintenance.ts:395`, `admin.ts:768` use `as any` to bypass SDK type mismatches.

**Fix:**
- `assets.ts:526` and `maintenance.ts:395`: Replace with targeted casts to generated DB types (e.g., `as Database['public']['Tables']['scan_events']['Insert']`).
- `admin.ts:768`: Replace `as any` with `as string` and add comment explaining the Supabase SDK limitation for nested column ilike filters.

**Files:** `packages/shared/src/services/supabase/assets.ts`, `maintenance.ts`, `admin.ts`

---

## Testing Strategy

- **Group 1:** Manually test login with near-expiry token (within 5 min buffer), verify SecureStore persistence after token refresh
- **Group 2:** Verify realtime events arrive for maintenance_records after migration; test reconnect debounce with rapid subscribe/unsubscribe
- **Group 3:** Verify push token deleted from DB after logout; test notification tap with various payloads
- **Group 4:** Unit tests for the generalized mutation queue:
  - Replay ordering (parent record created before photo upload)
  - Circuit breaker interaction (photo failures don't trigger breaker, parent failures do)
  - Photo failure isolation (`photoStatus: 'failed'` doesn't discard text record)
  - TTL/eviction behavior with mixed mutation types
  - QR fallback with multiple formats via `extractAssetInfo`
  - Home screen banner shows/hides correctly
- **Group 5:** Verify jitter in retry timing; test rego lookup with simulated timeout
- **Group 6:** Unit tests for each new join response schema against known Supabase response fixtures. Run existing test suites to verify no regressions. Verify `as any` replacements compile cleanly.

## Implementation Order

Groups 1-6 in order. Each group is one commit (or split into sub-commits if large). Group 4 (Offline Resilience) is the largest and may warrant 2-3 commits.
