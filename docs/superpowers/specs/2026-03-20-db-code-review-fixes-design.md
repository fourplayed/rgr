# Database & Code Review Fixes — Design Spec

**Date:** 2026-03-20
**Scope:** All P0 + P1 findings from combined database and code review
**Revision:** 2 (post spec-review — 9 corrections applied)

---

## P0 — Critical Fixes

### P0-1: `accept_defect_report` RPC uses `SELECT *`

**Problem:** Migration `20260326000005` recreated the function with `SELECT * INTO v_defect`, reverting the column-pinned optimization from `20260319000000`. The latest version in `20260326000007` also has `SELECT *`. This fetches all columns (including future ones) through a SECURITY INVOKER function, risking data exposure.

**Fix:** New migration that recreates the function with explicit column list. The function body only uses `status` and `reported_by` — pin to exactly those two fields (not `asset_id`, which was in the `20260319000000` version but removed when `reported_by` was sourced from `p_maintenance_input` instead).

**Files:** New migration `20260328000004_fix_accept_defect_select_star.sql`

---

### P0-2: Fleet analysis edge function loads all scan rows to count users

**Problem:** `fleet-analysis-daily/index.ts:167-173` fetches every `scanned_by` value from the last 7 days into memory, then deduplicates client-side with `new Set()`. At scale this is unbounded memory. Additionally, the edge function makes 15+ sequential `count: 'exact', head: true` PostgREST queries (addresses P1-5 simultaneously).

**Fix:**
- Add a `get_fleet_analysis_input()` RPC that returns all stats in one call: fleet counts by status/category + `COUNT(DISTINCT scanned_by)` for active users. This consolidates all 15+ sequential queries into a single round-trip.
- **Note:** The existing `get_fleet_statistics()` RPC already returns total/serviced/maintenance/out_of_service/trailer/dolly counts. The new RPC extends this with active-user count and any additional breakdown needed by the edge function, avoiding duplication.
- Update edge function to call the single RPC

**Files:**
- New migration with `get_fleet_analysis_input()` RPC
- `supabase/functions/fleet-analysis-daily/index.ts` — replace sequential queries with single RPC call

---

### P0-3: Offline queue replay can create duplicate scans

**Problem:** In `offlineMutationQueue.ts:342-388`, if the network drops mid-response (server processes the request but client never receives the 200), the queue item is not removed. On next replay, the same scan is re-submitted, creating a duplicate `scan_events` row.

**Fix:** Add an idempotency key (`idempotency_key` UUID) to each queued mutation at enqueue time. The scan creation service checks for an existing row with the same key before inserting. This is a server-side dedup — the simplest reliable approach.

**Design:**
1. `QueuedMutation` type gains `idempotencyKey?: string` (UUID, **optional** — generated at enqueue time). Must be optional so pre-upgrade queue entries that lack the field still pass the `isQueuedMutation` type guard (lines 40-59) and are not silently dropped.
2. `createScanEvent` in shared adds optional `idempotencyKey` param
3. New unique partial index on `scan_events(idempotency_key)` WHERE `idempotency_key IS NOT NULL`
4. Service does `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`. When `DO NOTHING` fires, no row is returned — the service must then run a follow-up `SELECT ... WHERE idempotency_key = $1` to retrieve the existing row. **Both paths return `success: true` with the row** — the queue must not interpret a dedup as failure, or it will retry forever.
5. When `idempotencyKey` is absent (legacy queue entries), fall back to standard non-idempotent insert.
6. Queue handlers pass idempotency key through to service calls

**Files:**
- `packages/shared/src/types/entities/scanEvent.ts` — add optional `idempotencyKey` to `CreateScanEventInput`
- `packages/shared/src/services/supabase/assets.ts` — `createScanEvent` uses ON CONFLICT + fallback SELECT
- New migration adding `idempotency_key` column + unique partial index to `scan_events`
- `apps/mobile/src/utils/offlineMutationQueue.ts` — generate UUID at enqueue, pass to handler

---

### P0-4: `clearSession()` crashes on keychain error

**Problem:** `secureStorage.ts:67-70` calls `SecureStore.deleteItemAsync` without try/catch. If the keychain is locked or corrupted, this throws and crashes the app during logout. Note: `getSession()` and `isAutoLoginEnabled()` were wrapped in try/catch in a prior fix cycle, but `clearSession()` was missed.

**Fix:** Wrap both calls in try/catch, log warning, and continue.

**Files:** `apps/mobile/src/utils/secureStorage.ts`

---

## P1 — Important Fixes

### ~~P1-1: `profiles.depot` has no referential integrity~~ — DEFERRED

Requires coordinated mobile/web/shared changes and data migration. The `depot_id` FK was previously dropped in migration `20260222000000_remove_profiles_depot_id.sql`. Re-adding it requires understanding why it was removed and coordinating schema + app changes. Tracked separately.

---

### P1-2: `getAssetScans`/`getAssetMaintenance` use offset pagination

**Problem:** Both functions in `assets.ts:478,677` use `count: 'exact'` + `.range(from, to)` offset pagination. Postgres must scan all preceding rows for each page — O(N) per request on growing tables.

**Fix:** Convert both to keyset pagination matching the pattern already used by `listAssets`:
- Accept `cursor` (created_at timestamp) + `cursorId` (UUID) params
- **Composite cursor filter:** `(created_at < cursor) OR (created_at = cursor AND id < cursorId)` — this is the correct keyset expression. Using simple `.lt()` on both fields independently would silently drop rows at page boundaries where multiple rows share the same `created_at` timestamp.
- In PostgREST, implement via `.or('created_at.lt.{cursor},and(created_at.eq.{cursor},id.lt.{cursorId})')`
- Fetch `pageSize + 1` to detect `hasMore`
- Remove `count: 'exact'`

**Files:**
- `packages/shared/src/services/supabase/assets.ts` — `getAssetScans`, `getAssetMaintenance`
- Mobile hooks that consume these (update to pass cursor instead of page number)

---

### ~~P1-3: Asset search ILIKE on 5 columns without trigram indexes~~ — ALREADY RESOLVED

Migration `20260302000001_db_review_search_indexes.sql` already enables `pg_trgm` (enabled even earlier in `20260219000003`) and adds GIN trigram indexes on `asset_number`, `make`, `model`, and `registration_number` with `WHERE deleted_at IS NULL` partial predicates. No action needed.

---

### P1-4: `get_user_action_summary` SECURITY DEFINER is overprivileged

**Problem:** The RPC in migration `20260327000006:25` is SECURITY DEFINER but its primary use case is manager/admin auditing of other users' activity.

**Fix:** ~~Convert to SECURITY INVOKER~~ — **REVISED**: Converting to INVOKER would break the feature. `scan_events` RLS gates on `scanned_by = auth.uid()`, so a manager calling `get_user_action_summary(other_user_id)` would silently get zeros for all counts. Instead, keep SECURITY DEFINER but add an explicit role check:

```sql
-- At the top of the function body:
IF NOT (auth.uid() = p_user_id
        OR get_user_role(auth.uid()) IN ('manager', 'superuser')) THEN
  RAISE EXCEPTION 'Unauthorized';
END IF;
```

This preserves the admin auditing use case while preventing unprivileged users from querying other users' data.

**Files:** New migration

---

### P1-5: Fleet analysis edge function makes 15+ sequential queries

**Problem:** Addressed by P0-2 — the new `get_fleet_analysis_input()` RPC returns all stats in a single call.

---

### P1-6: Cleanup cron DELETEs are unbounded

**Problem:** Cron jobs that clean up `audit_log`, `rego_lookup_log`, and `notification_log` use unbounded `DELETE FROM ... WHERE created_at < ...`. On tables with millions of rows, this locks the table for the entire transaction.

**Fix:** Convert to batched deletes using a `batch_cleanup(p_table_name, p_retention_interval, p_batch_size)` PL/pgSQL function.

**Security:** Since the function uses `EXECUTE format(...)` with a dynamic table name and runs with elevated privileges (pg_cron context), `p_table_name` MUST be validated against an explicit allowlist before use:

```sql
IF p_table_name NOT IN ('audit_log', 'notification_log', 'rego_lookup_log') THEN
  RAISE EXCEPTION 'Invalid table name: %', p_table_name;
END IF;
```

The function loops: `DELETE FROM {table} WHERE id IN (SELECT id FROM {table} WHERE created_at < now() - p_retention_interval LIMIT p_batch_size)` until 0 rows affected or iteration cap reached.

**Files:** New migration with `batch_cleanup` function + updated cron job SQL

---

### ~~P1-7: `scan_events` has no retention strategy~~ — DEFERRED

Not urgent until table exceeds ~500K rows. Tracked separately.

---

### P1-8: `useScanProcessing` captures stale `user` closure

**Problem:** `useScanProcessing.ts` uses `user` from hook render scope in both the online path (line 107 guard, line 132 `scannedBy: user.id`) AND the offline path (line 183 guard, line 195 `scannedBy: user.id`). Both paths use the stale closure — neither reads from `useAuthStore.getState()`.

**Fix:** Read `user` from `useAuthStore.getState()` at the point of use for both guards and submission, replacing all closure references to `user` within the `processScan` callback.

**Files:** `apps/mobile/src/hooks/scan/useScanProcessing.ts`

---

### P1-9: Offline queue 1.5s delay blocks replay

**Problem:** `offlineMutationQueue.ts:371` has a fixed 1.5s `setTimeout` delay on every failure before continuing the queue. With 3 failures hitting the circuit breaker, that's 4.5s of blocking.

**Fix:** Replace with exponential backoff: 500ms, 1000ms, 2000ms for the 3 attempts before circuit break. This is faster for transient single failures and still backs off for persistent issues.

**Files:** `apps/mobile/src/utils/offlineMutationQueue.ts`

---

### P1-10: `fleet.ts` fallback fetches all assets unbounded

**Problem:** `fleet.ts:121-146` has a fallback path that does `.select('status, category')` with no LIMIT if the RPC fails. On a large fleet this loads the entire assets table client-side.

**Fix:** Remove the fallback entirely — if the RPC fails, return the error rather than silently degrading to an unbounded client-side query. The RPC (`get_fleet_statistics`) exists and is reliable; the fallback was a bootstrap-era safety net that is no longer needed.

**Files:** `packages/shared/src/services/supabase/fleet.ts`

---

## P2 — Nice to Have (not in implementation plan, tracked for reference)

| # | Finding | Recommendation |
|---|---------|----------------|
| P2-1 | `getOutstandingAssets`/`getAssetLocations` unbounded | Add LIMIT 1000 safety cap |
| P2-2 | `scan_events` INSERT allows arbitrary `scanned_by` | Add RLS check `scanned_by = auth.uid()` |
| P2-3 | No orphan storage cleanup for photos | Add periodic cleanup edge function |
| P2-4 | Admin edge function cached token may expire | Refresh token before edge function call |
| P2-5 | `getPhotoById` selects nonexistent `acknowledge_required` | Remove from select string |

---

## Out of Scope

- **P1-1** (profiles.depot FK) deferred — requires coordinated mobile/web/shared changes. Prior migration `20260222000000` dropped the FK; re-adding needs investigation. Tracked separately.
- **P1-3** (trigram indexes) — already resolved by migration `20260302000001`. No action needed.
- **P1-7** (scan_events retention) deferred — not urgent until table exceeds ~500K rows. Tracked separately.
- Full `database.types.ts` regeneration — requires local Docker/Supabase (existing known TODO).

---

## Testing Strategy

- **Migrations:** Test on Supabase branch database before merging
- **Idempotency (P0-3):** Unit test: enqueue same mutation twice, verify single row created; verify `success: true` returned for both original and dedup
- **Offline queue (P0-3, P1-9):** Existing 52-test suite extended with idempotency + backoff tests; verify pre-upgrade queue entries without `idempotencyKey` still replay correctly
- **Keyset pagination (P1-2):** Extend existing useAssetData/useMaintenanceData tests; verify no rows dropped at page boundaries with duplicate timestamps
- **Service changes:** Existing shared test patterns (mocked Supabase client)
- **P1-4 role check:** Test manager can query other user; driver cannot query other user; user can query self
