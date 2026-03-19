# Database & Code Review Fixes — Design Spec

**Date:** 2026-03-20
**Scope:** All P0 + P1 findings from combined database and code review

---

## P0 — Critical Fixes

### P0-1: `accept_defect_report` RPC uses `SELECT *`

**Problem:** Migration `20260326000005` recreated the function with `SELECT * INTO v_defect`, reverting the column-pinned optimization from `20260319000000`. This fetches all columns (including future ones) through a SECURITY INVOKER function, risking data exposure.

**Fix:** New migration that recreates the function with explicit column list matching the fields actually used in the function body.

**Files:** New migration `20260328000004_fix_accept_defect_select_star.sql`

---

### P0-2: Fleet analysis edge function loads all scan rows to count users

**Problem:** `fleet-analysis-daily/index.ts:167-173` fetches every `scanned_by` value from the last 7 days into memory, then deduplicates client-side with `new Set()`. At scale this is unbounded memory.

**Fix:**
- Add a `count_active_users(interval)` RPC that returns `COUNT(DISTINCT scanned_by)`
- Also consolidate the 15+ sequential `count: 'exact', head: true` queries into a single `get_fleet_stats` RPC call (addresses P1-5 simultaneously)
- Update edge function to call the single RPC

**Files:**
- New migration with `count_active_users` + `get_fleet_counts` RPCs
- `supabase/functions/fleet-analysis-daily/index.ts` — replace sequential queries with RPC calls

---

### P0-3: Offline queue replay can create duplicate scans

**Problem:** In `offlineMutationQueue.ts:342-388`, if the network drops mid-response (server processes the request but client never receives the 200), the queue item is not removed. On next replay, the same scan is re-submitted, creating a duplicate `scan_events` row.

**Fix:** Add an idempotency key (`idempotency_key` UUID) to each queued mutation at enqueue time. The scan creation service checks for an existing row with the same key before inserting. This is a server-side dedup — the simplest reliable approach.

**Design:**
1. `QueuedMutation` type gains `idempotencyKey: string` (UUID, generated at enqueue time)
2. `createScanEvent` in shared adds optional `idempotencyKey` param
3. New unique partial index on `scan_events(idempotency_key)` WHERE `idempotency_key IS NOT NULL`
4. Service does `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`, then falls back to SELECT if no row returned (meaning it was a dupe)
5. Queue handlers pass idempotency key through to service calls

**Files:**
- `packages/shared/src/types/entities/scanEvent.ts` — add `idempotencyKey` to `CreateScanEventInput`
- `packages/shared/src/services/supabase/assets.ts` — `createScanEvent` uses ON CONFLICT
- New migration adding `idempotency_key` column + unique partial index to `scan_events`
- `apps/mobile/src/utils/offlineMutationQueue.ts` — generate UUID at enqueue, pass to handler

---

### P0-4: `clearSession()` crashes on keychain error

**Problem:** `secureStorage.ts:67-70` calls `SecureStore.deleteItemAsync` without try/catch. If the keychain is locked or corrupted, this throws and crashes the app during logout.

**Fix:** Wrap both calls in try/catch, log warning, and continue. The `getSession()` and `isAutoLoginEnabled()` functions already follow this pattern — `clearSession` is the only one missing it.

**Files:** `apps/mobile/src/utils/secureStorage.ts`

---

## P1 — Important Fixes

### P1-1: `profiles.depot` has no referential integrity

**Problem:** The `depot_id` FK was dropped in a prior migration, leaving `profiles.depot` as a free-text string with no constraint linking it to the `depots` table. A typo or deleted depot leaves orphaned references.

**Fix:** Add a `depot_id UUID REFERENCES depots(id) ON DELETE SET NULL` column to profiles. Populate from existing `depot` text field by matching on depot name. Keep `depot` text field temporarily for backwards compatibility, mark deprecated. A follow-up migration removes the text field after mobile/web are updated.

**Files:**
- New migration adding `depot_id` FK + data backfill
- `packages/shared/src/types/api/auth.ts` — add `depotId` to Profile
- `packages/shared/src/services/supabase/auth.ts` — include `depot_id` in profile queries
- Mobile/web updates to use `depotId` instead of `depot` string

**Note:** This is a larger change. Can be deferred if scope is a concern — the text field works, just lacks integrity.

---

### P1-2: `getAssetScans`/`getAssetMaintenance` use offset pagination

**Problem:** Both functions in `assets.ts:478,677` use `count: 'exact'` + `.range(from, to)` offset pagination. Postgres must scan all preceding rows for each page — O(N) per request on growing tables.

**Fix:** Convert both to keyset pagination matching the pattern already used by `listAssets`:
- Accept `cursor` (created_at timestamp) + `cursorId` (UUID) params
- Use `.lt('created_at', cursor)` + `.lt('id', cursorId)` for tie-breaking
- Fetch `pageSize + 1` to detect `hasMore`
- Remove `count: 'exact'`

**Files:**
- `packages/shared/src/services/supabase/assets.ts` — `getAssetScans`, `getAssetMaintenance`
- Mobile hooks that consume these (update to pass cursor instead of page number)

---

### P1-3: Asset search ILIKE on 5 columns without trigram indexes

**Problem:** `assets.ts:163` does `.or('asset_number.ilike.%...%,make.ilike.%...%,...')` across 5 columns. Without trigram indexes, each ILIKE does a sequential scan.

**Fix:** New migration enabling `pg_trgm` extension and adding GIN trigram indexes on the two most-searched columns: `asset_number` and `registration_number`. The other 3 columns (make, model, description) are lower-cardinality and benefit less.

**Files:** New migration

---

### P1-4: `get_user_action_summary` is SECURITY DEFINER unnecessarily

**Problem:** The RPC in migration `20260327000006:25` is SECURITY DEFINER but only queries where `auth.uid() = p_user_id`. It doesn't need elevated privileges — all referenced tables already have SELECT RLS for authenticated users on their own rows.

**Fix:** New migration: `ALTER FUNCTION get_user_action_summary(UUID) SECURITY INVOKER;`

**Files:** New migration

---

### P1-5: Fleet analysis edge function makes 15+ sequential queries

**Problem:** `fleet-analysis-daily/index.ts` fires 15+ sequential PostgREST count queries (one per status, one per category, etc.) to build fleet stats.

**Fix:** Addressed by P0-2 — the new `get_fleet_counts` RPC returns all stats in a single call.

---

### P1-6: Cleanup cron DELETEs are unbounded

**Problem:** Cron jobs that clean up `audit_log`, `rego_lookup_log`, and `notification_log` use unbounded `DELETE FROM ... WHERE created_at < ...`. On tables with millions of rows, this locks the table for the entire transaction.

**Fix:** Convert to batched deletes with a `LIMIT` clause in a loop, or use `DELETE ... WHERE id IN (SELECT id FROM ... LIMIT 10000)` pattern. Add this as a reusable `batch_cleanup(table_name, retention_interval, batch_size)` PL/pgSQL function.

**Files:** New migration with `batch_cleanup` function + updated cron job SQL

---

### P1-7: `scan_events` has no retention strategy

**Problem:** `scan_events` is the highest-growth table (hundreds of inserts/day, millions over time) with no archival, partitioning, or retention policy.

**Fix:** Add a `scan_events_archive` table with identical schema. Create a monthly cron job that moves rows older than 12 months into the archive table. This keeps the hot table small while preserving history. Partitioning is an alternative but more complex for Supabase-hosted Postgres.

**Note:** This is a longer-term concern. Can be deferred to a separate spec if the fleet is still small. Recommend implementing when `scan_events` exceeds ~500K rows.

**Files:** New migration with archive table + cron job (if proceeding now)

---

### P1-8: `useScanProcessing` captures stale `user` closure

**Problem:** `useScanProcessing.ts:107,183` uses `user` from hook render scope. If the profile updates between render and scan submission, the `scannedBy` field could reference stale data. The offline queue path at line 183 already correctly reads from `useAuthStore.getState()` — but line 132 uses the closure `user.id`.

**Fix:** Read `user` from `useAuthStore.getState()` at the point of use (line 107 guard + line 132 submission), not from the render closure.

**Files:** `apps/mobile/src/hooks/scan/useScanProcessing.ts`

---

### P1-9: Offline queue 1.5s delay blocks replay

**Problem:** `offlineMutationQueue.ts:371` has a fixed 1.5s `setTimeout` delay on every failure before continuing the queue. With 3 failures hitting the circuit breaker, that's 4.5s of blocking.

**Fix:** Replace with exponential backoff: 500ms, 1000ms, 2000ms for the 3 attempts before circuit break. This is faster for transient single failures and still backs off for persistent issues.

**Files:** `apps/mobile/src/utils/offlineMutationQueue.ts`

---

### P1-10: `fleet.ts` fallback fetches all assets unbounded

**Problem:** `fleet.ts:121-146` has a fallback path that does `.select('status, category')` with no LIMIT if the RPC fails. On a large fleet this loads the entire assets table client-side.

**Fix:** Add `.limit(10000)` as a safety cap and log a warning when the fallback is used. Better yet: remove the fallback entirely now that the RPC exists — if the RPC fails, return the error rather than silently degrading to an unbounded query.

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

- P1-1 (profiles.depot FK) deferred — requires coordinated mobile/web/shared changes and data migration. Tracked separately.
- P1-7 (scan_events retention) deferred — not urgent until table exceeds ~500K rows. Tracked separately.
- Full `database.types.ts` regeneration — requires local Docker/Supabase (existing known TODO).

---

## Testing Strategy

- **Migrations:** Test on Supabase branch database before merging
- **Idempotency (P0-3):** Unit test: enqueue same mutation twice, verify single row created
- **Offline queue (P0-3, P1-9):** Existing 52-test suite extended with idempotency + backoff tests
- **Keyset pagination (P1-2):** Extend existing useAssetData/useMaintenanceData tests
- **Service changes:** Existing shared test patterns (mocked Supabase client)
