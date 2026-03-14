# Integration Findings Fix — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 18 integration findings from the mobile + shared package analysis, grouped by domain.

**Architecture:** Six domain groups (auth, realtime, push, offline, network, type safety) each producing independent commits. The offline queue generalization (Group 4) is the largest unit; all others are focused edits to 1-3 files.

**Tech Stack:** TypeScript, React Native (Expo), Supabase (auth, realtime, edge functions), React Query, Zustand, Zod, AsyncStorage

**Spec:** `docs/superpowers/specs/2026-03-14-integration-findings-fix-design.md`

---

## File Structure

### Files to modify:
| File | Changes |
|------|---------|
| `apps/mobile/src/store/authStore.ts` | F3: widen buffer, F11: delete push token on logout |
| `apps/mobile/app/_layout.tsx` | F4: persist refreshed tokens, F1: retry jitter, F7: clear debounce on logout |
| `packages/shared/src/services/supabase/auth.ts` | F18: strip unknown fields, F13: document raw fetch |
| `apps/mobile/src/hooks/useRealtimeInvalidation.ts` | F5: (publication only), F6: remove double cleanup, F7: reconnect debounce |
| `apps/mobile/src/hooks/usePushNotifications.ts` | F12: extensible tap handler |
| `apps/mobile/src/utils/offlineScanQueue.ts` | F8: rename + generalize to offlineMutationQueue.ts |
| `apps/mobile/src/hooks/scan/useScanProcessing.ts` | F8: use generalized queue, F9: use extractAssetInfo |
| `apps/mobile/src/hooks/scan/useScanFlow.ts` (or parent of DefectReportSheet) | F8: offline enqueue for defect reports |
| `apps/mobile/app/(tabs)/home.tsx` | F10: offline queue banner |
| `packages/shared/src/utils/qrCode.ts` | F9: add rgr://a/ prefix |
| `apps/mobile/src/utils/regoLookup.ts` | F14: add AbortController timeout |
| `packages/shared/src/utils/index.ts` | F2/F17: add validateQueryResult, delete assertQueryResult |
| `packages/shared/src/services/supabase/assets.ts` | F16: replace as any cast |
| `packages/shared/src/services/supabase/maintenance.ts` | F16: replace as any cast |
| `packages/shared/src/services/supabase/admin.ts` | F16: replace as any cast |
| `supabase/functions/rego-lookup/index.ts` | F15: CORS fallback |
| `supabase/functions/send-push-notification/index.ts` | F15: CORS fallback |
| `supabase/functions/secure-auth/index.ts` | F15: CORS fallback (same bug) |
| `supabase/functions/admin-create-user/index.ts` | F15: CORS fallback (same bug) |

### Files to create:
| File | Purpose |
|------|---------|
| `apps/mobile/src/hooks/useOfflineQueueStatus.ts` | F10: poll queue length for UI banner |
| `apps/mobile/src/utils/__tests__/offlineMutationQueue.test.ts` | F8: unit tests for generalized queue |
| `packages/shared/src/types/entities/responseSchemas.ts` | F2/F17: Zod schemas for join query results |

### Migration:
| Action | Target |
|--------|--------|
| Supabase MCP `apply_migration` | F5: `ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_records` |

---

## Chunk 1: Groups 1-3 (Auth, Realtime, Push)

### Task 1: F3 — Widen auto-login buffer constant

**Files:**
- Modify: `apps/mobile/src/store/authStore.ts:218`

- [ ] **Step 1: Change buffer from 60s to 5 minutes**

In `apps/mobile/src/store/authStore.ts`, change line 218:
```typescript
// Old:
const bufferMs = 60 * 1000; // 1 minute buffer to account for clock skew
// New:
const bufferMs = 5 * 60 * 1000; // 5 minute buffer — ensures near-expiry tokens are rejected
```

- [ ] **Step 2: Run existing tests**

Run: `npm run test:mobile -- --run`
Expected: All 213 tests pass (no tests directly exercise this path, but ensure no regressions)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/store/authStore.ts
git commit -m "fix(mobile): widen auto-login token expiry buffer from 60s to 5min (F3)"
```

---

### Task 2: F4 — Persist refreshed tokens to SecureStore

**Files:**
- Modify: `apps/mobile/app/_layout.tsx:157-167`

- [ ] **Step 1: Add TOKEN_REFRESHED + valid session branch**

In `apps/mobile/app/_layout.tsx`, replace the `onAuthStateChange` effect (lines 157-167):

```typescript
// Old:
useEffect(() => {
  const unsubscribe = onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
      const { isAuthenticated, handleSessionExpired } = useAuthStore.getState();
      if (isAuthenticated) {
        handleSessionExpired();
      }
    }
  });
  return unsubscribe;
}, []);

// New:
useEffect(() => {
  const unsubscribe = onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
      const { isAuthenticated, handleSessionExpired } = useAuthStore.getState();
      if (isAuthenticated) {
        handleSessionExpired();
      }
    } else if (event === 'TOKEN_REFRESHED' && session) {
      // Persist refreshed tokens so auto-login uses fresh credentials after app restart
      if (session.access_token && session.refresh_token) {
        saveSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
        }).catch((err) => {
          console.warn('[Auth] Failed to persist refreshed session', err);
        });
      }
    }
  });
  return unsubscribe;
}, []);
```

Note: `saveSession` lives in `apps/mobile/src/utils/secureStorage.ts` and accepts a `StoredSession` shape (`{ access_token, refresh_token, expires_at? }`), NOT a full Supabase `Session` object. You must destructure the relevant fields as shown above.

- [ ] **Step 2: Add saveSession import**

At the top of `_layout.tsx`, add:
```typescript
import { saveSession } from '../src/utils/secureStorage';
```
Verify this file exports `saveSession`. It should already be exported since `authStore.ts` uses it.

- [ ] **Step 3: Run tests**

Run: `npm run test:mobile -- --run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/_layout.tsx apps/mobile/src/store/authStore.ts
git commit -m "fix(mobile): persist refreshed tokens to SecureStore on TOKEN_REFRESHED (F4)"
```

---

### Task 3: F18 — Replace .passthrough() with .strip() on auth schema

**Files:**
- Modify: `packages/shared/src/services/supabase/auth.ts:8-28`

- [ ] **Step 1: Replace .passthrough() with .strip()**

In `packages/shared/src/services/supabase/auth.ts`, replace lines 7-28:

```typescript
// Old:
const SecureAuthResponseSchema = z.object({
  user: z
    .object({
      id: z.string(),
      email: z.string(),
      aud: z.string().optional(),
      role: z.string().optional(),
      email_confirmed_at: z.string().nullable().optional(),
      created_at: z.string().optional(),
      updated_at: z.string().optional(),
    })
    .passthrough(),
  session: z
    .object({
      access_token: z.string(),
      refresh_token: z.string(),
      expires_in: z.number().optional(),
      token_type: z.string().optional(),
      expires_at: z.number().optional(),
    })
    .passthrough(),
});

// New:
const SecureAuthResponseSchema = z.object({
  user: z
    .object({
      id: z.string(),
      email: z.string(),
      aud: z.string().optional(),
      role: z.string().optional(),
      email_confirmed_at: z.string().nullable().optional(),
      created_at: z.string().optional(),
      updated_at: z.string().optional(),
    })
    .strip(),
  session: z
    .object({
      access_token: z.string(),
      refresh_token: z.string(),
      expires_in: z.number().optional(),
      token_type: z.string().optional(),
      expires_at: z.number().optional(),
    })
    .strip(),
});
```

- [ ] **Step 2: Run shared tests**

Run: `npm run test:shared -- --run`
Expected: All 46 tests pass

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/services/supabase/auth.ts
git commit -m "fix(shared): replace .passthrough() with .strip() on SecureAuthResponseSchema (F18)"
```

---

### Task 4: F5 — Add maintenance_records to realtime publication

**Files:**
- Migration via Supabase MCP

- [ ] **Step 1: Apply migration**

Use Supabase MCP `apply_migration` tool:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_records;
```
Migration name: `add_maintenance_records_to_realtime_publication`

- [ ] **Step 2: Verify**

Use Supabase MCP `execute_sql`:
```sql
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;
```
Expected: `maintenance_records` appears in the list alongside `assets`, `defect_reports`, `hazard_alerts`, `scan_events`.

---

### Task 5: F6 + F7 — Fix realtime cleanup and add reconnect debounce

**Files:**
- Modify: `apps/mobile/src/hooks/useRealtimeInvalidation.ts`
- Modify: `apps/mobile/app/_layout.tsx:226`

- [ ] **Step 1: Add per-channel debounce map and export clear function**

At the top of `useRealtimeInvalidation.ts` (module scope, outside the hook), add:

```typescript
const RECONNECT_DEBOUNCE_MS = 5000;
const _lastInvalidatedAt = new Map<string, number>();

/** Reset reconnect debounce timestamps — call on logout */
export function clearRealtimeDebounce(): void {
  _lastInvalidatedAt.clear();
}

function shouldDebounceReconnect(channelName: string): boolean {
  const last = _lastInvalidatedAt.get(channelName);
  const now = Date.now();
  if (last && now - last < RECONNECT_DEBOUNCE_MS) return true;
  _lastInvalidatedAt.set(channelName, now);
  return false;
}
```

- [ ] **Step 2: Wrap all SUBSCRIBED callbacks with debounce check**

In each `.subscribe((status) => { ... })` callback (4 channels), wrap with debounce:

```typescript
// Example for scan channel:
.subscribe((status) => {
  if (status === 'SUBSCRIBED' && !shouldDebounceReconnect('scan')) {
    invalidateIfNotSuppressed('scans', ['scans']);
    invalidateIfNotSuppressed('assets', ['assets']);
  }
})
```

Apply the same pattern for `asset`, `defect`, and `maintenance` channels using their respective short names (`'asset'`, `'defect'`, `'maintenance'`). These are arbitrary debounce keys — they don't need to match the gorhom channel names (`'mobile-scan-updates'` etc.).

- [ ] **Step 3: Fix cleanup — remove unsubscribe() calls**

Replace the cleanup (lines 139-148):

```typescript
// Old:
return () => {
  scanChannel.unsubscribe();
  assetChannel.unsubscribe();
  defectChannel.unsubscribe();
  maintenanceChannel.unsubscribe();
  supabase.removeChannel(scanChannel);
  supabase.removeChannel(assetChannel);
  supabase.removeChannel(defectChannel);
  supabase.removeChannel(maintenanceChannel);
};

// New:
return () => {
  supabase.removeChannel(scanChannel);
  supabase.removeChannel(assetChannel);
  supabase.removeChannel(defectChannel);
  supabase.removeChannel(maintenanceChannel);
};
```

- [ ] **Step 4: Call clearRealtimeDebounce on logout**

In `apps/mobile/app/_layout.tsx`, import `clearRealtimeDebounce` and add it to the logout cleanup effect (line 226):

```typescript
// Old:
if (wasAuthenticated.current && !isAuthenticated) {
  queryClient.clear();
  clearQueue().catch(() => {});
  clearRealtimeSuppressions();
}

// New:
if (wasAuthenticated.current && !isAuthenticated) {
  queryClient.clear();
  clearQueue().catch(() => {});
  clearRealtimeSuppressions();
  clearRealtimeDebounce();
}
```

- [ ] **Step 5: Run tests**

Run: `npm run test:mobile -- --run`
Expected: All tests pass (including useRealtimeInvalidation tests)

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/hooks/useRealtimeInvalidation.ts apps/mobile/app/_layout.tsx
git commit -m "fix(mobile): remove double cleanup, add per-channel reconnect debounce (F6, F7)"
```

---

### Task 6: F11 — Delete push token on logout

**Files:**
- Modify: `apps/mobile/src/store/authStore.ts:116-137`

- [ ] **Step 1: Import deletePushToken**

At the top of `authStore.ts`, add:
```typescript
import { deletePushToken } from '@rgr/shared';
import { Platform } from 'react-native';
```

Note: `expo-application` must be lazy-imported (via `await import('expo-application')`) to handle Expo Go environments where the native module may not be available. The existing `usePushNotifications.ts` uses this same pattern. Do NOT use a static `import * as Application`.

- [ ] **Step 2: Add push token cleanup to logout**

Replace the logout function:

```typescript
logout: async () => {
  // Capture user ID before clearing state (set() below nullifies get().user)
  const userId = get().user?.id;

  // Reset state BEFORE signOut() to prevent the onAuthStateChange listener
  // from firing handleSessionExpired() and showing "Session Expired" modal
  set({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    authError: null,
    autoLoginAttempted: false,
  });

  await clearSession();
  eventBus.emit(AppEvents.USER_LOGOUT);

  // Best-effort push token cleanup — don't block logout on failure
  if (userId) {
    try {
      const Application = await import('expo-application');
      const deviceId = Platform.OS === 'android'
        ? Application.getAndroidId()
        : (await Application.getIosIdForVendorAsync()) ?? 'unknown';
      await deletePushToken(userId, deviceId);
    } catch (err: unknown) {
      // Swallow — expo-application may not be available in Expo Go,
      // or the network call may fail. Local state is already cleared.
      console.warn('[Auth] Failed to delete push token during logout', err);
    }
  }

  try {
    await signOut();
  } catch (error: unknown) {
    // Best-effort: local auth state is already cleared
    logger.warn('signOut failed during logout', error);
  }
},
```

Note: `deletePushToken` returns `Promise<ServiceResult<void>>`, not bare `Promise<void>`. The try-catch handles both network errors and unsuccessful ServiceResult.

- [ ] **Step 3: Run tests**

Run: `npm run test:mobile -- --run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/store/authStore.ts
git commit -m "fix(mobile): delete push token from DB on logout (F11)"
```

---

### Task 7: F12 — Extensible notification tap handler

**Files:**
- Modify: `apps/mobile/src/hooks/usePushNotifications.ts:173-180`

- [ ] **Step 1: Replace tap handler with route map**

```typescript
// Old:
const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  if (__DEV__) console.log('[Push] Tapped:', data);
  if (data?.['assetId']) {
    router.push(`/(tabs)/assets/${data['assetId']}`);
  }
});

// New:
const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  if (__DEV__) console.log('[Push] Tapped:', data);
  if (data?.['assetId']) {
    router.push(`/(tabs)/assets/${data['assetId']}`);
  } else if (data?.['maintenanceId']) {
    router.push('/(tabs)/maintenance');
  } else if (data?.['defectId']) {
    router.push('/(tabs)/maintenance');
  } else if (__DEV__) {
    console.warn('[Push] Unrecognized notification payload:', data);
  }
});
```

- [ ] **Step 2: Run tests**

Run: `npm run test:mobile -- --run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/hooks/usePushNotifications.ts
git commit -m "fix(mobile): extend notification tap handler with route map (F12)"
```

---

## Chunk 2: Group 4 (Offline Resilience)

### Task 8: F9 — Add rgr://a/ prefix to extractAssetInfo

**Files:**
- Modify: `packages/shared/src/utils/qrCode.ts:98-127`

- [ ] **Step 1: Check for QR_CODE_SHORT_PREFIX constant**

In `packages/shared/src/utils/constants.ts`, add:
```typescript
export const QR_CODE_SHORT_PREFIX = 'rgr://a/';
```

- [ ] **Step 2: Update extractAssetInfo to handle short prefix**

In `packages/shared/src/utils/qrCode.ts`, import the new constant and add the check:

```typescript
// Old (lines 106-113):
  // Try QR code format first
  if (trimmed.startsWith(QR_CODE_PREFIX)) {
    const uuidPart = trimmed.slice(QR_CODE_PREFIX.length);
    if (UUID_REGEX.test(uuidPart)) {
      return { assetId: uuidPart.toLowerCase() };
    }
    return null;
  }

// New:
  // Try QR code format first (full and short prefixes)
  if (trimmed.startsWith(QR_CODE_PREFIX)) {
    const uuidPart = trimmed.slice(QR_CODE_PREFIX.length);
    if (UUID_REGEX.test(uuidPart)) {
      return { assetId: uuidPart.toLowerCase() };
    }
    return null;
  }
  if (trimmed.startsWith(QR_CODE_SHORT_PREFIX)) {
    const uuidPart = trimmed.slice(QR_CODE_SHORT_PREFIX.length);
    if (UUID_REGEX.test(uuidPart)) {
      return { assetId: uuidPart.toLowerCase() };
    }
    return null;
  }
```

- [ ] **Step 3: Run shared tests**

Run: `npm run test:shared -- --run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/utils/qrCode.ts packages/shared/src/utils/constants.ts
git commit -m "fix(shared): add rgr://a/ short prefix to extractAssetInfo (F9)"
```

---

### Task 9: F8 — Generalize offline queue to offlineMutationQueue

**Files:**
- Rename: `apps/mobile/src/utils/offlineScanQueue.ts` -> `apps/mobile/src/utils/offlineMutationQueue.ts`
- Create: `apps/mobile/src/utils/__tests__/offlineMutationQueue.test.ts`

- [ ] **Step 1: Write failing tests for the generalized queue**

Create `apps/mobile/src/utils/__tests__/offlineMutationQueue.test.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tests will import from the renamed module
// import { enqueueMutation, replayQueue, getQueueLength, clearQueue } from '../offlineMutationQueue';

describe('offlineMutationQueue', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('enqueueMutation', () => {
    it('should enqueue a scan mutation', async () => {
      const { enqueueMutation, getQueueLength } = require('../offlineMutationQueue');
      await enqueueMutation({
        type: 'scan',
        payload: { assetId: 'test-id', scannedBy: 'user-1', scanType: 'qr_scan' },
      });
      expect(await getQueueLength()).toBe(1);
    });

    it('should enqueue a defect_report mutation', async () => {
      const { enqueueMutation, getQueueLength } = require('../offlineMutationQueue');
      await enqueueMutation({
        type: 'defect_report',
        payload: { assetId: 'test-id', reportedBy: 'user-1', severity: 'medium', description: 'test' },
      });
      expect(await getQueueLength()).toBe(1);
    });

    it('should enqueue a maintenance mutation', async () => {
      const { enqueueMutation, getQueueLength } = require('../offlineMutationQueue');
      await enqueueMutation({
        type: 'maintenance',
        payload: { assetId: 'test-id', performedBy: 'user-1', type: 'service' },
      });
      expect(await getQueueLength()).toBe(1);
    });

    it('should cap queue at 500 entries', async () => {
      const { enqueueMutation, getQueueLength } = require('../offlineMutationQueue');
      for (let i = 0; i < 501; i++) {
        await enqueueMutation({
          type: 'scan',
          payload: { assetId: `id-${i}`, scannedBy: 'user-1', scanType: 'qr_scan' },
        });
      }
      expect(await getQueueLength()).toBe(500);
    });
  });

  describe('TTL', () => {
    it('should skip entries older than 48 hours during replay', async () => {
      const { getQueueLength } = require('../offlineMutationQueue');
      // Manually insert an expired entry
      const expired = {
        id: 'expired-1',
        type: 'scan',
        payload: { assetId: 'old', scannedBy: 'user-1', scanType: 'qr_scan' },
        queuedAt: new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString(),
        photoStatus: 'pending',
      };
      await AsyncStorage.setItem('offline_mutation_queue', JSON.stringify([expired]));
      expect(await getQueueLength()).toBe(1); // Still in queue
      // TTL is enforced during replay, not during getQueueLength
    });
  });

  describe('photoStatus', () => {
    it('should initialize with photoStatus pending', async () => {
      const { enqueueMutation } = require('../offlineMutationQueue');
      await enqueueMutation({
        type: 'defect_report',
        payload: { assetId: 'test-id', reportedBy: 'user-1', severity: 'high', description: 'broken' },
        photoUris: ['/path/to/photo.jpg'],
      });
      const raw = await AsyncStorage.getItem('offline_mutation_queue');
      const queue = JSON.parse(raw!);
      expect(queue[0].photoStatus).toBe('pending');
      expect(queue[0].photoUris).toEqual(['/path/to/photo.jpg']);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:mobile -- --run --testPathPattern offlineMutationQueue`
Expected: FAIL (module not found)

- [ ] **Step 3: Rename and generalize the queue**

Rename `offlineScanQueue.ts` to `offlineMutationQueue.ts`. Rewrite to support multiple mutation types:

Key changes:
- Storage key: `rgr:offline-scan-queue` -> `rgr:offline-mutation-queue`
  - **Important:** Add a one-time migration in `getQueue()` that reads the old key, converts entries to the new `QueuedMutation` shape (adding `type: 'scan'`, `photoStatus: 'pending'`), writes to the new key, and deletes the old key. This prevents silently losing queued scans from before the upgrade.
- Entry type: `QueuedScan` -> `QueuedMutation` with `type`, `payload`, `photoStatus`, `photoUris` fields
- `enqueueScan()` -> `enqueueMutation()` accepting `{ type, payload, photoUris? }`
- `replayQueue()` dispatches to type-specific handlers
- Export a backward-compatible `enqueueScan()` wrapper:
  ```typescript
  /** Backward-compatible wrapper — enqueues a scan mutation */
  export async function enqueueScan(input: CreateScanEventInput): Promise<void> {
    await enqueueMutation({ type: 'scan', payload: input });
  }
  ```
- Circuit breaker: only parent mutation failures count, not photo failures
- `getQueueLength()` and `clearQueue()` unchanged in API

The `replayQueue()` function should accept a handler map:
```typescript
type ReplayHandlers = {
  scan: (payload: CreateScanEventInput) => Promise<ServiceResult<ScanEvent>>;
  defect_report: (payload: CreateDefectReportInput) => Promise<ServiceResult<DefectReport>>;
  maintenance: (payload: CreateMaintenanceInput) => Promise<ServiceResult<MaintenanceRecord>>;
};
```

Note: All handlers return `Promise<ServiceResult<T>>`. The parent record ID is at `result.data.id` after checking `result.success === true`. The type names are `CreateMaintenanceInput` and `createMaintenance` (NOT `CreateMaintenanceRecordInput` / `createMaintenanceRecord`).

Photo replay: after parent record creation succeeds (`result.success && result.data`), extract `result.data.id`, then iterate `photoUris` and upload each referencing that ID. Mark `photoStatus: 'uploaded'` or `'failed'`. Entries with `photoStatus: 'failed'` are kept in queue for photo-only retry.

**Existing test migration:** The file `apps/mobile/src/utils/__tests__/offlineScanQueue.test.ts` (82 lines, 5 tests) must be renamed to `offlineMutationQueue.test.ts` and its imports updated. Merge the existing tests into the new test file or delete and replace.

- [ ] **Step 4: Run tests**

Run: `npm run test:mobile -- --run --testPathPattern offlineMutationQueue`
Expected: All tests pass

- [ ] **Step 5: Update all imports of offlineScanQueue**

Search for all imports of `offlineScanQueue` across the codebase and update to `offlineMutationQueue`. Key files:
- `apps/mobile/src/hooks/scan/useScanProcessing.ts`
- `apps/mobile/app/_layout.tsx`

- [ ] **Step 6: Run full test suite**

Run: `npm run test:mobile -- --run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(mobile): generalize offline queue to support scans, defects, and maintenance (F8)"
```

---

### Task 10: F8 cont'd — Wire offline enqueue into defect and maintenance flows

**Files:**
- Modify: `apps/mobile/src/hooks/scan/useScanProcessing.ts:170-207`
- Modify: `apps/mobile/src/components/scanner/DefectReportSheet.tsx`
- Modify: `apps/mobile/app/_layout.tsx` (post-replay invalidation)

- [ ] **Step 1: Update useScanProcessing offline path to use extractAssetInfo**

In `useScanProcessing.ts`, replace the hand-rolled QR parsing (lines 176-178):

```typescript
// Old:
const qrAssetId = qrData.startsWith('rgr://asset/')
  ? qrData.slice('rgr://asset/'.length)
  : null;

// New:
import { extractAssetInfo } from '@rgr/shared';
// ...
const assetInfo = extractAssetInfo(qrData);
const qrAssetId = assetInfo?.assetId ?? null;
```

If `qrAssetId` is null, update the error message:
```typescript
if (!qrAssetId) {
  setAlertSheet({
    visible: true,
    type: 'error',
    title: 'Cannot Queue Offline',
    message: 'This QR format cannot be queued offline. Try again when connected.',
  });
}
```

- [ ] **Step 2: Add offline enqueue to defect report flow**

Note: `DefectReportSheet.tsx` is a **presentation component** — it delegates mutations via an `onSubmit` callback. The offline enqueue logic goes in the **parent** that calls the defect creation mutation (the scan flow / `useScanFlow.ts` or the screen that handles `onSubmit`). In the mutation's error handler (or before calling the mutation), check `!onlineManager.isOnline()` and call `enqueueMutation({ type: 'defect_report', payload: { ... }, photoUris })` instead. Show "Defect report queued — will submit when online."

- [ ] **Step 3: Add offline enqueue to maintenance creation**

In the maintenance creation hook (the parent that calls `createMaintenance`), add the same pattern: if offline, enqueue with `type: 'maintenance'`.

- [ ] **Step 4: Extend post-replay invalidation in _layout.tsx**

In `_layout.tsx`, update the NetInfo reconnect handler to also invalidate defect and maintenance queries after replay:

```typescript
// After replayQueue completes:
queryClient.invalidateQueries({ queryKey: ['scans'] });
queryClient.invalidateQueries({ queryKey: ['assets'] });
queryClient.invalidateQueries({ queryKey: ['defects'] });
queryClient.invalidateQueries({ queryKey: ['maintenance'] });
```

- [ ] **Step 5: Run tests**

Run: `npm run test:mobile -- --run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(mobile): wire offline enqueue into defect and maintenance flows (F8, F9)"
```

---

### Task 11: F10 — Offline queue status banner on home screen

**Files:**
- Create: `apps/mobile/src/hooks/useOfflineQueueStatus.ts`
- Modify: `apps/mobile/app/(tabs)/home.tsx`

- [ ] **Step 1: Create useOfflineQueueStatus hook**

Create `apps/mobile/src/hooks/useOfflineQueueStatus.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getQueueLength } from '../utils/offlineMutationQueue';

/** Polls the offline mutation queue length every 10s and on NetInfo changes. */
export function useOfflineQueueStatus(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(await getQueueLength());
    } catch {
      // AsyncStorage read failed — leave count as-is
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    const unsubscribe = NetInfo.addEventListener(() => {
      refresh();
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refresh]);

  return count;
}
```

- [ ] **Step 2: Add banner to home screen**

In `apps/mobile/app/(tabs)/home.tsx`, import the hook and render a banner above the FlatList when count > 0:

```typescript
import { useOfflineQueueStatus } from '../../src/hooks/useOfflineQueueStatus';

// Inside the component:
const offlineQueueCount = useOfflineQueueStatus();

// In JSX, above the FlatList:
{offlineQueueCount > 0 && (
  <View style={styles.offlineBanner}>
    <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
    <AppText style={styles.offlineBannerText}>
      {offlineQueueCount} action{offlineQueueCount !== 1 ? 's' : ''} queued — will sync when online
    </AppText>
  </View>
)}
```

Add styles:
```typescript
offlineBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.warning + '1A',
  borderRadius: spacing.sm,
  marginHorizontal: spacing.md,
  marginBottom: spacing.sm,
},
offlineBannerText: {
  fontSize: 13,
  color: colors.warning,
},
```

- [ ] **Step 3: Run tests**

Run: `npm run test:mobile -- --run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/hooks/useOfflineQueueStatus.ts apps/mobile/app/(tabs)/home.tsx
git commit -m "feat(mobile): add offline queue status banner on home screen (F10)"
```

---

## Chunk 3: Groups 5-6 (Network, Type Safety)

### Task 12: F1 — Add jitter to retry delays

**Files:**
- Modify: `apps/mobile/app/_layout.tsx:98,107`

- [ ] **Step 1: Add jitter to both retryDelay functions**

```typescript
// Old (line 98):
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

// New:
retryDelay: (attemptIndex) => {
  const base = Math.min(1000 * 2 ** attemptIndex, 30000);
  return base * (0.5 + Math.random() * 0.5);
},

// Old (line 107):
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

// New:
retryDelay: (attemptIndex) => {
  const base = Math.min(1000 * 2 ** attemptIndex, 10000);
  return base * (0.5 + Math.random() * 0.5);
},
```

- [ ] **Step 2: Run tests**

Run: `npm run test:mobile -- --run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "fix(mobile): add jitter to React Query retry delays to prevent thundering herd (F1)"
```

---

### Task 13: F14 — Add AbortController timeout to triggerRegoLookup

**Files:**
- Modify: `apps/mobile/src/utils/regoLookup.ts`

- [ ] **Step 1: Add AbortController with 15s timeout**

```typescript
// New full file:
import { getSupabaseClient } from '@rgr/shared';

/**
 * Trigger a registration lookup via the rego-lookup edge function.
 * Fire-and-forget — errors are logged but not thrown.
 */
export async function triggerRegoLookup(assetId: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const supabase = getSupabaseClient();

    // Get the asset's registration number
    const { data: asset } = await supabase
      .from('assets')
      .select('registration_number')
      .eq('id', assetId)
      .single();

    if (!asset?.registration_number) {
      clearTimeout(timeout);
      return;
    }

    const { error } = await supabase.functions.invoke('rego-lookup', {
      body: { registrationNumber: asset.registration_number, assetId },
    });

    if (error && __DEV__) {
      console.warn(`[RegoLookup] Edge function error: ${error.message}`);
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (__DEV__) console.warn('[RegoLookup] Request timed out after 15s');
    } else {
      console.warn('[RegoLookup] Fire-and-forget failed:', err);
    }
  } finally {
    clearTimeout(timeout);
  }
}
```

**Important:** The Supabase JS SDK v2 `functions.invoke()` does NOT accept an AbortSignal option. The AbortController pattern above creates the controller but cannot wire it into the SDK call. Two options for the implementer:
1. **Preferred:** Replace `supabase.functions.invoke()` with a raw `fetch()` call (matching `signInWithEmailSecure`'s pattern) and pass `signal: controller.signal`. This gives real abort capability.
2. **Fallback:** Keep the SDK call and use `setTimeout` as a best-effort — the abort won't cancel the in-flight request, but the `finally` block ensures the timeout is cleaned up and the function returns promptly.

Choose option 1 if the edge function URL is easily constructable (it is — `${config.url}/functions/v1/rego-lookup`).

- [ ] **Step 2: Run tests**

Run: `npm run test:mobile -- --run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/utils/regoLookup.ts
git commit -m "fix(mobile): add 15s AbortController timeout to triggerRegoLookup (F14)"
```

---

### Task 14: F15 — Fix CORS fallback in edge functions

**Files:**
- Modify: `supabase/functions/rego-lookup/index.ts:19`
- Modify: `supabase/functions/send-push-notification/index.ts:19`

- [ ] **Step 1: Change CORS fallbacks in all affected edge functions**

The same bug exists in **four** edge functions. Change line 19 in each:
```typescript
// Old:
"Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "",

// New:
"Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
```

Files:
- `supabase/functions/rego-lookup/index.ts`
- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/secure-auth/index.ts`
- `supabase/functions/admin-create-user/index.ts`

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/rego-lookup/index.ts supabase/functions/send-push-notification/index.ts supabase/functions/secure-auth/index.ts supabase/functions/admin-create-user/index.ts
git commit -m "fix(edge): default CORS origin to * when ALLOWED_ORIGIN unset (F15)"
```

---

### Task 15: F13 — Document raw fetch in signInWithEmailSecure

**Files:**
- Modify: `packages/shared/src/services/supabase/auth.ts:136-137`

- [ ] **Step 1: Add explanatory comment**

Before the `fetch()` call (around line 136):
```typescript
    // Uses raw fetch instead of supabase.functions.invoke() because
    // the user has no session token at login time — the SDK method
    // would attach an empty/invalid Authorization header.
    const response = await fetch(functionUrl, {
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/services/supabase/auth.ts
git commit -m "docs(shared): document why signInWithEmailSecure uses raw fetch (F13)"
```

---

### Task 16: F16 — Replace as any casts with targeted types

**Files:**
- Modify: `packages/shared/src/services/supabase/assets.ts:526`
- Modify: `packages/shared/src/services/supabase/maintenance.ts:395`
- Modify: `packages/shared/src/services/supabase/admin.ts:768`

- [ ] **Step 1: Fix assets.ts cast**

```typescript
// Old:
.insert(dbData as any)

// New:
import type { Database } from '../../types/database.types';
type ScanEventInsert = Database['public']['Tables']['scan_events']['Insert'];
// ...
.insert(dbData as ScanEventInsert)
```

- [ ] **Step 2: Fix maintenance.ts cast**

```typescript
// Old:
.update(dbData as any)

// New:
type MaintenanceUpdate = Database['public']['Tables']['maintenance_records']['Update'];
// ...
.update(dbData as MaintenanceUpdate)
```

- [ ] **Step 3: Fix admin.ts cast**

```typescript
// Old:
query = query.ilike('asset.asset_number' as any, `%${safeSearch}%`);

// New:
// PostgREST embedded filter — SDK doesn't type nested column references
query = query.ilike('asset.asset_number' as string, `%${safeSearch}%`);
```

- [ ] **Step 4: Run type check and tests**

Run: `npm run typecheck && npm run test:shared -- --run`
Expected: Both pass

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/services/supabase/assets.ts packages/shared/src/services/supabase/maintenance.ts packages/shared/src/services/supabase/admin.ts
git commit -m "fix(shared): replace as any casts with targeted DB types (F16)"
```

---

### Task 17: F2/F17 — Add validateQueryResult and Zod response schemas

**Files:**
- Modify: `packages/shared/src/utils/index.ts`
- Create: `packages/shared/src/types/entities/responseSchemas.ts`
- Modify: All shared service files using `assertQueryResult`

- [ ] **Step 1: Create validateQueryResult helper**

In `packages/shared/src/utils/index.ts`, add:

```typescript
import { ZodType, ZodError } from 'zod';

/**
 * Validates a Supabase query result against a Zod schema at runtime.
 * Replaces assertQueryResult which was a pure type assertion.
 */
export function validateQueryResult<T>(data: unknown, schema: ZodType<T>): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Query result validation failed: ${details}`);
    }
    throw err;
  }
}
```

- [ ] **Step 2: Create response schemas file**

Create `packages/shared/src/types/entities/responseSchemas.ts` with Zod schemas for each join query shape. Each schema should match the `select()` string used in the corresponding service function. Example:

```typescript
import { z } from 'zod';

// Schema for asset detail with depot join (assets.ts getAssetById)
export const AssetWithDepotSchema = z.object({
  id: z.string().uuid(),
  asset_number: z.string(),
  // ... all selected columns
  depot: z.object({
    id: z.string().uuid(),
    name: z.string(),
    // ... joined depot columns
  }).nullable(),
}).strip();

// Add one schema per unique join query shape
```

The exact fields per schema must match the `select()` strings in each service function. Read each service's select query to build the matching schema.

- [ ] **Step 3: Replace assertQueryResult callsites one service at a time**

For each service file:
1. Import the relevant response schema from `responseSchemas.ts`
2. Replace `assertQueryResult<Type>(data)` with `validateQueryResult(data, Schema)` (for join queries) or a simple typed cast (for already-validated data like auth)
3. Run the service's tests after each file

Work through: `assets.ts`, `maintenance.ts`, `defectReports.ts`, `photos.ts`, `admin.ts`, `pushTokens.ts`, `auth.ts`

- [ ] **Step 4: Delete assertQueryResult**

Remove the function from `packages/shared/src/utils/index.ts` and verify no imports remain.

- [ ] **Step 5: Run full test suite**

Run: `npm run test:shared -- --run && npm run test:mobile -- --run`
Expected: All tests pass

- [ ] **Step 6: Run type check**

Run: `npm run typecheck`
Expected: Pass

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(shared): replace assertQueryResult with Zod-validated validateQueryResult (F2, F17)"
```

---

## Final Verification

- [ ] **Run full CI locally**

```bash
npm run lint && npm run typecheck && npm run test:mobile -- --run && npm run test:shared -- --run
```
Expected: All pass

- [ ] **Format**

```bash
npx prettier --write .
```

- [ ] **Final commit if formatting changed**

```bash
git add -A
git commit -m "style: format after integration findings fixes"
```
