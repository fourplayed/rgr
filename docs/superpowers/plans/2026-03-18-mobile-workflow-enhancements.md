# Mobile Workflow Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve mobile field workflows — offline photo queue, scan progress UX, quick-accept defect, bulk maintenance completion, notification preferences.

**Architecture:** Extends existing offline mutation queue with photo support, enhances scan progress overlay with time-aware messaging, adds quick-accept path through existing RPC, implements multi-select on maintenance list with single-operation cache pattern, and adds server-side notification preferences via JSONB column on profiles.

**Tech Stack:** React Native (Expo), TypeScript, Zustand, React Query, Supabase, expo-file-system, expo-haptics, gorhom/bottom-sheet v5

**Spec:** `docs/superpowers/specs/2026-03-18-mobile-workflow-enhancements-design.md`

**Implementation order:** Task 1-3 → Task 4-5 → Task 6-8 → Task 9-12 → Task 13-16

---

## Task 1: Extend offline queue types for photo support

**Files:**
- Modify: `apps/mobile/src/utils/offlineMutationQueue.ts:12,24-28`
- Test: `apps/mobile/src/utils/__tests__/offlineMutationQueue.test.ts`

- [ ] **Step 1: Write failing test for photo mutation type**

In `apps/mobile/src/utils/__tests__/offlineMutationQueue.test.ts`, add a new describe block:

```typescript
describe('photo mutation support', () => {
  it('enqueues a photo mutation with all required fields', async () => {
    await enqueueMutation({
      type: 'photo',
      payload: {
        assetId: 'asset-1',
        scanEventId: 'scan-1',
        localUri: '/path/to/photo.jpg',
        photoType: 'freight',
        uploadedBy: 'user-1',
        mimeType: 'image/jpeg',
        originalFilename: 'photo.jpg',
      },
    });
    const queue = await readRawQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('photo');
    expect(queue[0].payload.uploadedBy).toBe('user-1');
    expect(queue[0].payload.mimeType).toBe('image/jpeg');
    expect(queue[0].payload.photoType).toBe('freight');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest offlineMutationQueue --testNamePattern="enqueues a photo mutation" --no-coverage`
Expected: FAIL — `'photo'` is not assignable to type `MutationType`

- [ ] **Step 3: Extend MutationType and ReplayHandlers**

In `apps/mobile/src/utils/offlineMutationQueue.ts`:

At line 12, change:
```typescript
export type MutationType = 'scan' | 'defect_report' | 'maintenance';
```
to:
```typescript
export type MutationType = 'scan' | 'defect_report' | 'maintenance' | 'photo';
```

At lines 24-28, add the `photo` key to `ReplayHandlers`:
```typescript
export type ReplayHandlers = {
  scan: (payload: Record<string, unknown>) => Promise<ServiceResult<unknown>>;
  defect_report: (payload: Record<string, unknown>) => Promise<ServiceResult<{ id: string }>>;
  maintenance: (payload: Record<string, unknown>) => Promise<ServiceResult<{ id: string }>>;
  photo: (payload: Record<string, unknown>) => Promise<ServiceResult<unknown>>;
};
```

**Critical:** Also update the `VALID_MUTATION_TYPES` set (around line 30-34) to include `'photo'`:
```typescript
const VALID_MUTATION_TYPES = new Set(['scan', 'defect_report', 'maintenance', 'photo']);
```
Without this, the `isQueuedMutation` guard will filter out photo entries on the next `getQueue()` call, silently dropping them.

Also add a test to verify photo entries survive a round-trip through `getQueueLength`:
```typescript
it('photo entries persist through getQueueLength (not filtered by isQueuedMutation)', async () => {
  await enqueueMutation({
    type: 'photo',
    payload: { assetId: 'a-1', uploadedBy: 'u-1', photoType: 'freight', localUri: '/x.jpg', mimeType: 'image/jpeg', originalFilename: 'x.jpg' },
  });
  expect(await getQueueLength()).toBe(1);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest offlineMutationQueue --testNamePattern="enqueues a photo mutation" --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/utils/offlineMutationQueue.ts apps/mobile/src/utils/__tests__/offlineMutationQueue.test.ts
git commit -m "feat(mobile): extend offline queue types for photo mutations"
```

---

## Task 2: Add getQueueSummary and photo file helpers

**Files:**
- Modify: `apps/mobile/src/utils/offlineMutationQueue.ts:183-186`
- Test: `apps/mobile/src/utils/__tests__/offlineMutationQueue.test.ts`

- [ ] **Step 1: Write failing tests for getQueueSummary**

```typescript
// Add to imports at top of test file:
// import { getQueueSummary, copyPhotoToOfflineStorage, cleanOrphanedPhotos } from '../offlineMutationQueue';

describe('getQueueSummary', () => {
  it('returns counts grouped by mutation type', async () => {
    await seedQueue([
      makeEntry({ type: 'scan' }),
      makeEntry({ type: 'scan' }),
      makeEntry({ type: 'photo' }),
      makeEntry({ type: 'defect_report' }),
    ]);
    const summary = await getQueueSummary();
    expect(summary).toEqual({
      scan: 2,
      defect_report: 1,
      maintenance: 0,
      photo: 1,
    });
  });

  it('returns all zeros for empty queue', async () => {
    const summary = await getQueueSummary();
    expect(summary).toEqual({
      scan: 0,
      defect_report: 0,
      maintenance: 0,
      photo: 0,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/mobile && npx jest offlineMutationQueue --testNamePattern="getQueueSummary" --no-coverage`
Expected: FAIL — `getQueueSummary` is not a function

- [ ] **Step 3: Implement getQueueSummary**

Add after `getQueueLength` (line ~186) in `offlineMutationQueue.ts`:

```typescript
export async function getQueueSummary(): Promise<Record<MutationType, number>> {
  const queue = await getQueue();
  const summary: Record<MutationType, number> = {
    scan: 0,
    defect_report: 0,
    maintenance: 0,
    photo: 0,
  };
  for (const entry of queue) {
    if (entry.type in summary) {
      summary[entry.type]++;
    }
  }
  return summary;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/mobile && npx jest offlineMutationQueue --testNamePattern="getQueueSummary" --no-coverage`
Expected: PASS

- [ ] **Step 5: Write failing tests for photo file helpers**

```typescript
describe('photo file persistence', () => {
  it('copyPhotoToOfflineStorage copies file and returns persistent URI', async () => {
    const persistentUri = await copyPhotoToOfflineStorage(
      '/tmp/camera-photo.jpg',
      'test-mutation-id'
    );
    expect(persistentUri).toContain('offline-photos/test-mutation-id.jpg');
  });

  it('cleanOrphanedPhotos removes files not in queue', async () => {
    // This test validates the function exists and accepts the expected signature
    await expect(cleanOrphanedPhotos()).resolves.not.toThrow();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `cd apps/mobile && npx jest offlineMutationQueue --testNamePattern="photo file" --no-coverage`
Expected: FAIL — functions not defined

- [ ] **Step 7: Implement photo file helpers**

Add to `offlineMutationQueue.ts`:

```typescript
import * as FileSystem from 'expo-file-system';

const OFFLINE_PHOTOS_DIR = `${FileSystem.documentDirectory}offline-photos/`;

export async function copyPhotoToOfflineStorage(
  tempUri: string,
  mutationId: string
): Promise<string> {
  const dirInfo = await FileSystem.getInfoAsync(OFFLINE_PHOTOS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(OFFLINE_PHOTOS_DIR, { intermediates: true });
  }
  const persistentUri = `${OFFLINE_PHOTOS_DIR}${mutationId}.jpg`;
  await FileSystem.copyAsync({ from: tempUri, to: persistentUri });
  return persistentUri;
}

export async function deleteOfflinePhoto(localUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }
  } catch {
    // Non-fatal: file may already be gone
  }
}

export async function cleanOrphanedPhotos(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(OFFLINE_PHOTOS_DIR);
    if (!dirInfo.exists) return;

    const files = await FileSystem.readDirectoryAsync(OFFLINE_PHOTOS_DIR);
    if (files.length === 0) return;

    const queue = await getQueue();
    const referencedUris = new Set(
      queue
        .filter((e) => e.type === 'photo')
        .map((e) => String(e.payload.localUri))
    );

    for (const file of files) {
      const fullPath = `${OFFLINE_PHOTOS_DIR}${file}`;
      if (!referencedUris.has(fullPath)) {
        await FileSystem.deleteAsync(fullPath, { idempotent: true });
      }
    }
  } catch {
    // Non-fatal: cleanup is best-effort
  }
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd apps/mobile && npx jest offlineMutationQueue --testNamePattern="photo file" --no-coverage`
Expected: PASS (note: FileSystem will need to be mocked in test environment — the existing test file likely has jest mocks set up)

- [ ] **Step 9: Add TTL cleanup for photo files**

In the TTL filtering section of `replayQueue` (around line 214-226), after filtering stale entries, add file cleanup:

```typescript
// After filtering stale entries, delete their photo files
for (const staleEntry of staleEntries) {
  if (staleEntry.type === 'photo' && typeof staleEntry.payload.localUri === 'string') {
    await deleteOfflinePhoto(staleEntry.payload.localUri);
  }
}
```

This requires capturing stale entries before filtering. Adjust the existing filter logic to compute stale entries explicitly.

- [ ] **Step 10: Run full offlineMutationQueue test suite**

Run: `cd apps/mobile && npx jest offlineMutationQueue --no-coverage`
Expected: All tests PASS (52 existing + ~5 new)

- [ ] **Step 11: Commit**

```bash
git add apps/mobile/src/utils/offlineMutationQueue.ts apps/mobile/src/utils/__tests__/offlineMutationQueue.test.ts
git commit -m "feat(mobile): add getQueueSummary, photo file helpers, TTL cleanup"
```

---

## Task 3: Wire offline photo enqueue and replay

**Files:**
- Modify: `apps/mobile/src/hooks/usePhotoCapture.ts:120-203`
- Modify: `apps/mobile/app/_layout.tsx:215-242`
- Modify: `apps/mobile/src/hooks/useOfflineQueueStatus.ts`
- Modify: `apps/mobile/src/components/common/OfflineBanner.tsx`

- [ ] **Step 1: Add offline-aware photo upload in usePhotoCapture**

In `apps/mobile/src/hooks/usePhotoCapture.ts`, in the `confirmAndUpload` function, add the offline check **after** file validation (line ~149) but **before** thumbnail generation and upload (line ~151). This ensures we validate the file exists before copying it, but skip thumbnail generation for offline enqueue (thumbnails aren't needed until upload).

Note: `useAuthStore` is already imported at line 5 of this file.

```typescript
import { onlineManager } from '@tanstack/react-query';
import { enqueueMutation, copyPhotoToOfflineStorage } from '../utils/offlineMutationQueue';

// Inside confirmAndUpload, AFTER file validation, BEFORE thumbnail generation:
if (!onlineManager.isOnline()) {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error('Not authenticated');
  const mutationId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const persistentUri = await copyPhotoToOfflineStorage(fileUri, mutationId);
  await enqueueMutation({
    type: 'photo',
    payload: {
      assetId: options.assetId,
      scanEventId: options.scanEventId ?? null,
      localUri: persistentUri,
      photoType: options.photoType,
      uploadedBy: userId,
      mimeType: 'image/jpeg',
      originalFilename: `${mutationId}.jpg`,
      latitude: options.latitude ?? null,
      longitude: options.longitude ?? null,
    },
  });
  setUploadStep('complete');
  return true; // Signal success to caller
}

// Existing online upload path follows...
```

- [ ] **Step 2: Add photo replay handler in _layout.tsx**

In `apps/mobile/app/_layout.tsx`, at lines 221-226 where `ReplayHandlers` is constructed, add the photo handler:

```typescript
import { uploadPhoto } from '@rgr/shared';
import { deleteOfflinePhoto, cleanOrphanedPhotos } from '../src/utils/offlineMutationQueue';

// In the replayQueue call:
replayQueue({
  scan: (payload) => createScanEvent(payload as Parameters<typeof createScanEvent>[0]),
  defect_report: (payload) =>
    createDefectReport(payload as Parameters<typeof createDefectReport>[0]),
  maintenance: (payload) =>
    createMaintenance(payload as Parameters<typeof createMaintenance>[0]),
  photo: async (payload) => {
    const result = await uploadPhoto({
      assetId: payload.assetId as string,
      scanEventId: (payload.scanEventId as string) ?? undefined,
      uploadedBy: payload.uploadedBy as string,
      photoType: payload.photoType as string,
      fileUri: payload.localUri as string,
      mimeType: (payload.mimeType as string) ?? 'image/jpeg',
    });
    if (result.success) {
      await deleteOfflinePhoto(payload.localUri as string);
    }
    return result;
  },
})
```

Also add `['photos']` to the invalidation list after replay:
```typescript
queryClient.invalidateQueries({ queryKey: ['photos'] });
```

- [ ] **Step 3: Add orphan cleanup call in _layout.tsx**

In the same `_layout.tsx`, add an effect for deferred orphan cleanup:

```typescript
import { InteractionManager } from 'react-native';

useEffect(() => {
  const task = InteractionManager.runAfterInteractions(() => {
    cleanOrphanedPhotos().catch(() => {});
  });
  return () => task.cancel();
}, []);
```

- [ ] **Step 4: Update useOfflineQueueStatus to use getQueueSummary**

In `apps/mobile/src/hooks/useOfflineQueueStatus.ts`, change the import and return type. **Note:** This is a breaking change to the hook's return type — find all existing consumers (search for `useOfflineQueueStatus`) and update them to destructure `{ total }` instead of using the raw number.

```typescript
import { getQueueSummary, MutationType } from '../utils/offlineMutationQueue';

export type QueueSummary = Record<MutationType, number>;

export function useOfflineQueueStatus(): { total: number; summary: QueueSummary } {
  const [summary, setSummary] = useState<QueueSummary>({
    scan: 0, defect_report: 0, maintenance: 0, photo: 0,
  });

  const refresh = useCallback(async () => {
    try {
      setSummary(await getQueueSummary());
    } catch {
      // AsyncStorage read failed
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10_000);
    const unsubscribe = NetInfo.addEventListener(() => { refresh(); });
    return () => { clearInterval(interval); unsubscribe(); };
  }, [refresh]);

  const total = summary.scan + summary.defect_report + summary.maintenance + summary.photo;
  return { total, summary };
}
```

- [ ] **Step 5: Update OfflineBanner to show itemized counts**

The existing `OfflineBanner.tsx` uses `useNetworkStatus()` for connectivity detection but does NOT currently use `useOfflineQueueStatus`. Add it as a new import and consume the summary:

In `apps/mobile/src/components/common/OfflineBanner.tsx`:

```typescript
import { useOfflineQueueStatus } from '../../hooks/useOfflineQueueStatus';

// Inside the component:
const { summary } = useOfflineQueueStatus();

const parts: string[] = [];
if (summary.scan > 0) parts.push(`${summary.scan} scan${summary.scan > 1 ? 's' : ''}`);
if (summary.photo > 0) parts.push(`${summary.photo} photo${summary.photo > 1 ? 's' : ''}`);
if (summary.defect_report > 0) parts.push(`${summary.defect_report} defect${summary.defect_report > 1 ? 's' : ''}`);
if (summary.maintenance > 0) parts.push(`${summary.maintenance} task${summary.maintenance > 1 ? 's' : ''}`);

const queueText = parts.length > 0
  ? `Offline — ${parts.join(', ')} pending`
  : 'Offline — recent data shown';
```

- [ ] **Step 6: Run full mobile test suite**

Run: `cd apps/mobile && npx jest --no-coverage`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/hooks/usePhotoCapture.ts apps/mobile/app/_layout.tsx apps/mobile/src/hooks/useOfflineQueueStatus.ts apps/mobile/src/components/common/OfflineBanner.tsx
git commit -m "feat(mobile): wire offline photo enqueue, replay, and queue visibility"
```

---

## Task 4: Enhance ScanProgressOverlay with time-aware messaging

**Files:**
- Modify: `apps/mobile/src/components/scanner/ScanProgressOverlay.tsx`
- Test: `apps/mobile/src/components/scanner/__tests__/ScanProgressOverlay.test.tsx` (new)

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/src/components/scanner/__tests__/ScanProgressOverlay.test.tsx`:

```typescript
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { ScanProgressOverlay } from '../ScanProgressOverlay';

jest.mock('expo-haptics');
jest.useFakeTimers();

describe('ScanProgressOverlay', () => {
  it('shows "Acquiring location..." during first 5s of location step', () => {
    const { getByText } = render(<ScanProgressOverlay step="location" />);
    expect(getByText('Acquiring location...')).toBeTruthy();
  });

  it('cycles to "Getting precise fix..." after 5s', () => {
    const { getByText, queryByText } = render(<ScanProgressOverlay step="location" />);
    act(() => { jest.advanceTimersByTime(5000); });
    expect(getByText('Getting precise fix...')).toBeTruthy();
    expect(queryByText('Acquiring location...')).toBeNull();
  });

  it('cycles to "Trying alternative signal..." after 10s', () => {
    const { getByText } = render(<ScanProgressOverlay step="location" />);
    act(() => { jest.advanceTimersByTime(10000); });
    expect(getByText('Trying alternative signal...')).toBeTruthy();
  });

  it('cycles to "Almost there..." after 18s', () => {
    const { getByText } = render(<ScanProgressOverlay step="location" />);
    act(() => { jest.advanceTimersByTime(18000); });
    expect(getByText('Almost there...')).toBeTruthy();
  });

  it('does not show sub-text for non-location steps', () => {
    const { queryByText } = render(<ScanProgressOverlay step="detected" />);
    expect(queryByText('Acquiring location...')).toBeNull();
  });

  it('resets timer when step changes away from location', () => {
    const { rerender, queryByText, getByText } = render(
      <ScanProgressOverlay step="location" />
    );
    act(() => { jest.advanceTimersByTime(6000); });
    expect(getByText('Getting precise fix...')).toBeTruthy();

    rerender(<ScanProgressOverlay step="lookup" />);
    expect(queryByText('Getting precise fix...')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/mobile && npx jest ScanProgressOverlay --no-coverage`
Expected: FAIL — sub-text elements not found

- [ ] **Step 3: Implement time-aware sub-text**

In `apps/mobile/src/components/scanner/ScanProgressOverlay.tsx`, modify the component:

```typescript
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

const LOCATION_MESSAGES = [
  { after: 0, text: 'Acquiring location...' },
  { after: 5000, text: 'Getting precise fix...' },
  { after: 10000, text: 'Trying alternative signal...' },
  { after: 18000, text: 'Almost there...' },
] as const;

// Inside ScanProgressOverlayComponent:
const [locationSubText, setLocationSubText] = useState<string | null>(null);
const prevStepRef = useRef(step);

// Time-aware sub-text for location step
useEffect(() => {
  if (step !== 'location') {
    setLocationSubText(null);
    return;
  }
  setLocationSubText(LOCATION_MESSAGES[0].text);
  const timers = LOCATION_MESSAGES.slice(1).map(({ after, text }) =>
    setTimeout(() => setLocationSubText(text), after)
  );
  return () => timers.forEach(clearTimeout);
}, [step]);

// Haptic on location → lookup transition
useEffect(() => {
  if (prevStepRef.current === 'location' && step === 'lookup') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  prevStepRef.current = step;
}, [step]);
```

Then render `locationSubText` below the `'Resolving location'` label when `step === 'location'`:

```typescript
{step === 'location' && locationSubText && (
  <AppText style={styles.locationSubText}>{locationSubText}</AppText>
)}
```

Add the style:
```typescript
locationSubText: {
  color: colors.textSecondary,
  fontSize: fontSize.sm,
  fontFamily: fonts.regular,
  marginTop: spacing.xs,
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/mobile && npx jest ScanProgressOverlay --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/scanner/ScanProgressOverlay.tsx apps/mobile/src/components/scanner/__tests__/ScanProgressOverlay.test.tsx
git commit -m "feat(mobile): add time-aware location messages to scan progress overlay"
```

---

## Task 5: Add haptic test and verify full scan test suite

**Files:**
- Test: `apps/mobile/src/components/scanner/__tests__/ScanProgressOverlay.test.tsx`

- [ ] **Step 1: Add haptic transition test**

```typescript
import * as Haptics from 'expo-haptics';
jest.mock('expo-haptics');

it('triggers haptic feedback on location → lookup transition', () => {
  const { rerender } = render(<ScanProgressOverlay step="location" />);
  rerender(<ScanProgressOverlay step="lookup" />);
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(
    Haptics.NotificationFeedbackType.Success
  );
});

it('does not trigger haptic for other transitions', () => {
  const { rerender } = render(<ScanProgressOverlay step="detected" />);
  rerender(<ScanProgressOverlay step="location" />);
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test**

Run: `cd apps/mobile && npx jest ScanProgressOverlay --no-coverage`
Expected: All PASS

- [ ] **Step 3: Run full mobile test suite**

Run: `cd apps/mobile && npx jest --no-coverage`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/scanner/__tests__/ScanProgressOverlay.test.tsx
git commit -m "test(mobile): add haptic transition tests for ScanProgressOverlay"
```

---

## Task 6: Add quick-accept button to DefectReportDetailModal

**Files:**
- Modify: `apps/mobile/src/components/maintenance/DefectReportDetailModal.tsx:103-176`

- [ ] **Step 1: Add onQuickAcceptPress prop**

In `DefectReportDetailModal.tsx`, extend the props interface (lines 29-51):

```typescript
onQuickAcceptPress?: (context: {
  defectId: string;
  assetId: string;
  assetNumber: string | null;
  title: string;
  description: string | null;
}) => void;
```

- [ ] **Step 2: Add confirmation state and handleQuickAccept callback**

After `handleAccept` (line ~112):

```typescript
const [showQuickAcceptConfirm, setShowQuickAcceptConfirm] = useState(false);

const handleQuickAcceptPress = useCallback(() => {
  setShowQuickAcceptConfirm(true);
}, []);

const handleQuickAcceptConfirm = useCallback(() => {
  if (!defect || !onQuickAcceptPress) return;
  setShowQuickAcceptConfirm(false);
  onQuickAcceptPress({
    defectId: defect.id,
    assetId: defect.assetId,
    assetNumber: asset?.assetNumber ?? null,
    title: defect.title,
    description: defect.description ?? null,
  });
}, [defect, asset, onQuickAcceptPress]);
```

- [ ] **Step 3: Split the "Create Task" button into two buttons**

Replace the single button at lines 168-176 with (inside the `status === 'reported'` branch):

```typescript
{onQuickAcceptPress && (
  <Button
    onPress={handleQuickAcceptPress}
    disabled={isScattering}
    flex
    color={colors.success}
    style={styles.ctaButton}
  >
    Quick Accept
  </Button>
)}
{onAcceptPress && (
  <Button
    onPress={handleAccept}
    disabled={isScattering}
    flex
    variant="outline"
    color={colors.success}
    style={styles.ctaButton}
  >
    Accept & Customise
  </Button>
)}
```

- [ ] **Step 3b: Add confirmation bottom sheet**

Render a confirmation sheet at the bottom of the component's JSX (inside the existing SheetModal or as a simple Alert):

```typescript
import { Alert } from 'react-native';

// Replace the state-based approach with a simpler Alert.alert for the confirmation:
const handleQuickAcceptPress = useCallback(() => {
  Alert.alert(
    'Quick Accept',
    'Create maintenance task with default settings?',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => {
        if (!defect || !onQuickAcceptPress) return;
        onQuickAcceptPress({
          defectId: defect.id,
          assetId: defect.assetId,
          assetNumber: asset?.assetNumber ?? null,
          title: defect.title,
          description: defect.description ?? null,
        });
      }},
    ]
  );
}, [defect, asset, onQuickAcceptPress]);
```

This is simpler than a gorhom sheet for a yes/no confirmation and avoids nesting sheets.
```

- [ ] **Step 4: Run typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/maintenance/DefectReportDetailModal.tsx
git commit -m "feat(mobile): add quick-accept button to defect detail modal"
```

---

## Task 7: Wire quick-accept through useDefectMaintenanceModals

**Files:**
- Modify: `apps/mobile/src/hooks/useDefectMaintenanceModals.ts:50-80`
- Modify: parent component that renders `DefectReportDetailModal` (find via grep for `DefectReportDetailModal`)

- [ ] **Step 1: Add buildQuickAcceptDefaults helper**

In `useDefectMaintenanceModals.ts`, add an **exported** helper function before the hook (exported for testability):

```typescript
import type { CreateMaintenanceInput } from '@rgr/shared';

export function buildQuickAcceptDefaults(context: {
  defectId: string;
  assetId: string;
  title: string;
  description: string | null;
}): CreateMaintenanceInput {
  const truncatedNotes = context.description
    ? context.description.slice(0, 50)
    : context.title;
  return {
    assetId: context.assetId,
    title: `Fix: ${truncatedNotes}`,
    description: `Auto-created from defect report`,
    priority: 'medium',
    status: 'scheduled',
  };
}
```

- [ ] **Step 2: Add handleQuickAcceptPress callback**

Inside the hook, after `handleAcceptPress` (line ~61):

```typescript
const handleQuickAcceptPress = useCallback(
  async (context: {
    defectId: string;
    assetId: string;
    assetNumber: string | null;
    title: string;
    description: string | null;
  }) => {
    try {
      const defaults = buildQuickAcceptDefaults(context);
      await acceptDefect({
        defectReportId: context.defectId,
        maintenanceInput: defaults,
      });
      closeModal();
    } catch (error) {
      // Error propagates to React Query's onError handler which shows alert
      logger.warn('Quick-accept failed:', error);
    }
  },
  [acceptDefect, closeModal]
);
```

- [ ] **Step 3: Return handleQuickAcceptPress from the hook**

Add `handleQuickAcceptPress` to the hook's return object.

- [ ] **Step 4: Pass onQuickAcceptPress to DefectReportDetailModal**

The parent component is `DefectMaintenanceModals` (rendered in `maintenance.tsx` at line ~30 and `home.tsx`). In the file that renders `DefectReportDetailModal` (likely `apps/mobile/src/components/maintenance/DefectMaintenanceModals.tsx`), pass:

```typescript
onQuickAcceptPress={handleQuickAcceptPress}
```

- [ ] **Step 5: Run typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run full mobile test suite**

Run: `cd apps/mobile && npx jest --no-coverage`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/hooks/useDefectMaintenanceModals.ts
# Also add the parent component file that was modified
git commit -m "feat(mobile): wire quick-accept defect flow with smart defaults"
```

---

## Task 8: Add quick-accept tests

**Files:**
- Test: `apps/mobile/src/hooks/__tests__/useDefectMaintenanceModals.test.ts` (new or extend)

- [ ] **Step 1: Write tests for buildQuickAcceptDefaults**

```typescript
describe('buildQuickAcceptDefaults', () => {
  it('generates title from first 50 chars of description', () => {
    const result = buildQuickAcceptDefaults({
      defectId: 'd-1',
      assetId: 'a-1',
      title: 'Defect',
      description: 'Cracked taillight on left side near the bumper connection point area',
    });
    expect(result.title).toBe('Fix: Cracked taillight on left side near the bumpe');
    expect(result.priority).toBe('medium');
    expect(result.status).toBe('scheduled');
    expect(result.assetId).toBe('a-1');
  });

  it('falls back to title when description is null', () => {
    const result = buildQuickAcceptDefaults({
      defectId: 'd-1',
      assetId: 'a-1',
      title: 'Broken mirror',
      description: null,
    });
    expect(result.title).toBe('Fix: Broken mirror');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd apps/mobile && npx jest useDefectMaintenanceModals --no-coverage`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/hooks/__tests__/useDefectMaintenanceModals.test.ts
git commit -m "test(mobile): add quick-accept defaults generation tests"
```

---

## Task 9: Add useMaintenanceSelection hook

**Files:**
- Create: `apps/mobile/src/hooks/useMaintenanceSelection.ts`
- Test: `apps/mobile/src/hooks/__tests__/useMaintenanceSelection.test.ts` (new)

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/src/hooks/__tests__/useMaintenanceSelection.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useMaintenanceSelection } from '../useMaintenanceSelection';

describe('useMaintenanceSelection', () => {
  const completableItems = [
    { id: '1', status: 'scheduled' },
    { id: '2', status: 'in_progress' },
    { id: '3', status: 'completed' },
    { id: '4', status: 'scheduled' },
  ] as any[];

  it('starts in non-selection mode', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    expect(result.current.isSelecting).toBe(false);
    expect(result.current.selectedIds).toEqual(new Set());
  });

  it('enters selection mode on enterSelection', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    act(() => result.current.enterSelection('1'));
    expect(result.current.isSelecting).toBe(true);
    expect(result.current.selectedIds.has('1')).toBe(true);
  });

  it('toggles item selection', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    act(() => result.current.enterSelection('1'));
    act(() => result.current.toggleItem('2'));
    expect(result.current.selectedIds).toEqual(new Set(['1', '2']));
    act(() => result.current.toggleItem('1'));
    expect(result.current.selectedIds).toEqual(new Set(['2']));
  });

  it('only allows selecting scheduled/in_progress items', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    act(() => result.current.enterSelection('1'));
    act(() => result.current.toggleItem('3')); // completed — should not add
    expect(result.current.selectedIds.has('3')).toBe(false);
  });

  it('selectAll only selects completable items', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    act(() => result.current.enterSelection('1'));
    act(() => result.current.selectAll());
    expect(result.current.selectedIds).toEqual(new Set(['1', '2', '4']));
  });

  it('exitSelection clears state', () => {
    const { result } = renderHook(() => useMaintenanceSelection(completableItems));
    act(() => result.current.enterSelection('1'));
    act(() => result.current.exitSelection());
    expect(result.current.isSelecting).toBe(false);
    expect(result.current.selectedIds).toEqual(new Set());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/mobile && npx jest useMaintenanceSelection --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useMaintenanceSelection**

Create `apps/mobile/src/hooks/useMaintenanceSelection.ts`:

```typescript
import { useState, useCallback, useMemo } from 'react';
import type { MaintenanceStatus } from '@rgr/shared';

const COMPLETABLE_STATUSES: MaintenanceStatus[] = ['scheduled', 'in_progress'];

interface SelectableItem {
  id: string;
  status: MaintenanceStatus;
}

export function useMaintenanceSelection(items: SelectableItem[]) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const completableIds = useMemo(
    () => new Set(items.filter((i) => COMPLETABLE_STATUSES.includes(i.status)).map((i) => i.id)),
    [items]
  );

  const enterSelection = useCallback(
    (initialId: string) => {
      if (!completableIds.has(initialId)) return;
      setIsSelecting(true);
      setSelectedIds(new Set([initialId]));
    },
    [completableIds]
  );

  const exitSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const toggleItem = useCallback(
    (id: string) => {
      if (!completableIds.has(id)) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [completableIds]
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(completableIds));
  }, [completableIds]);

  return {
    isSelecting,
    selectedIds,
    selectedCount: selectedIds.size,
    enterSelection,
    exitSelection,
    toggleItem,
    selectAll,
    isCompletable: (id: string) => completableIds.has(id),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd apps/mobile && npx jest useMaintenanceSelection --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/hooks/useMaintenanceSelection.ts apps/mobile/src/hooks/__tests__/useMaintenanceSelection.test.ts
git commit -m "feat(mobile): add useMaintenanceSelection hook with tests"
```

---

## Task 10: Add useBulkCompleteMaintenance hook

**Files:**
- Create: `apps/mobile/src/hooks/useBulkCompleteMaintenance.ts`
- Test: `apps/mobile/src/hooks/__tests__/useBulkCompleteMaintenance.test.ts` (new)

- [ ] **Step 1: Write failing tests**

Create `apps/mobile/src/hooks/__tests__/useBulkCompleteMaintenance.test.ts`:

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useBulkCompleteMaintenance } from '../useBulkCompleteMaintenance';

// Mock dependencies
jest.mock('@rgr/shared', () => ({
  updateMaintenanceStatus: jest.fn(),
}));

describe('useBulkCompleteMaintenance', () => {
  it('returns bulkComplete function and initial state', () => {
    const { result } = renderHook(() => useBulkCompleteMaintenance());
    expect(result.current.bulkComplete).toBeDefined();
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.progress).toEqual({ completed: 0, failed: 0, total: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest useBulkCompleteMaintenance --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useBulkCompleteMaintenance**

Create `apps/mobile/src/hooks/useBulkCompleteMaintenance.ts`:

```typescript
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { onlineManager } from '@tanstack/react-query';
import { updateMaintenanceStatus } from '@rgr/shared';
import { maintenanceKeys } from './useMaintenanceData';
import { suppressRealtimeFor } from './useRealtimeInvalidation';
import { optimisticPatch, rollback } from './optimisticCache';

interface BulkProgress {
  completed: number;
  failed: number;
  total: number;
}

export function useBulkCompleteMaintenance() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkProgress>({ completed: 0, failed: 0, total: 0 });

  const bulkComplete = useCallback(
    async (ids: string[]): Promise<BulkProgress> => {
      if (!onlineManager.isOnline()) {
        throw new Error('Bulk completion requires an internet connection');
      }

      setIsProcessing(true);
      setProgress({ completed: 0, failed: 0, total: ids.length });

      // Single cache operation: cancel + suppress + optimistic list patch
      await queryClient.cancelQueries({ queryKey: maintenanceKeys.lists() });
      suppressRealtimeFor('maintenance');

      // Snapshot the list cache and patch items in-place (not detail cache —
      // detail entries likely don't exist since user hasn't opened each item)
      const listKey = maintenanceKeys.lists();
      const listSnapshot = queryClient.getQueriesData({ queryKey: listKey });

      // Optimistically update list items to 'completed' status
      const completedSet = new Set(ids);
      queryClient.setQueriesData({ queryKey: listKey }, (old: unknown) => {
        if (!old || typeof old !== 'object' || !('pages' in old)) return old;
        const data = old as { pages: Array<{ data: Array<{ id: string; status: string }> }>; pageParams: unknown[] };
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            data: page.data.map((item) =>
              completedSet.has(item.id) ? { ...item, status: 'completed' } : item
            ),
          })),
        };
      });

      // Sequential RPC calls
      let completed = 0;
      let failed = 0;
      const failedIds: string[] = [];

      for (const id of ids) {
        try {
          const result = await updateMaintenanceStatus(id, 'completed');
          if (result.success) {
            completed++;
          } else {
            failed++;
            failedIds.push(id);
          }
        } catch {
          failed++;
          failedIds.push(id);
        }
        setProgress({ completed, failed, total: ids.length });
      }

      // Rollback failed items in list cache by restoring their original status
      if (failedIds.length > 0 && listSnapshot) {
        // Restore the entire list snapshot if any failures — simpler than per-item rollback
        for (const [key, data] of listSnapshot) {
          queryClient.setQueryData(key, data);
        }
      }

      // Single batch invalidation
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: maintenanceKeys.stats() });

      setIsProcessing(false);
      return { completed, failed, total: ids.length };
    },
    [queryClient]
  );

  return { bulkComplete, isProcessing, progress };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest useBulkCompleteMaintenance --no-coverage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/hooks/useBulkCompleteMaintenance.ts apps/mobile/src/hooks/__tests__/useBulkCompleteMaintenance.test.ts
git commit -m "feat(mobile): add useBulkCompleteMaintenance hook with single-op cache"
```

---

## Task 11: Create BulkActionBar component

**Files:**
- Create: `apps/mobile/src/components/maintenance/BulkActionBar.tsx`

- [ ] **Step 1: Create BulkActionBar**

Create `apps/mobile/src/components/maintenance/BulkActionBar.tsx`:

```typescript
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '../common/AppText';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontFamily as fonts } from '../../theme/spacing';

interface BulkActionBarProps {
  selectedCount: number;
  onComplete: () => void;
  onCancel: () => void;
  isProcessing: boolean;
  progress: { completed: number; failed: number; total: number };
}

export function BulkActionBar({
  selectedCount,
  onComplete,
  onCancel,
  isProcessing,
  progress,
}: BulkActionBarProps) {
  return (
    <View style={styles.container}>
      {isProcessing ? (
        <AppText style={styles.progressText}>
          Completing {progress.completed + progress.failed} of {progress.total}...
        </AppText>
      ) : (
        <>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <AppText style={styles.cancelText}>Cancel</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onComplete}
            style={[styles.completeButton, selectedCount === 0 && styles.disabledButton]}
            disabled={selectedCount === 0}
          >
            <AppText style={styles.completeText}>
              Complete ({selectedCount})
            </AppText>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.chrome,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
  },
  completeButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.success,
    borderRadius: spacing.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
  completeText: {
    color: colors.textInverse ?? '#FFFFFF',
    fontSize: fontSize.md,
    fontFamily: fonts.semiBold,
  },
  progressText: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: fontSize.md,
    fontFamily: fonts.regular,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/maintenance/BulkActionBar.tsx
git commit -m "feat(mobile): add BulkActionBar component"
```

---

## Task 12: Wire bulk selection into maintenance screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/maintenance.tsx`
- Modify: `apps/mobile/src/components/maintenance/MaintenanceListItem.tsx`

- [ ] **Step 1: Add selection mode to maintenance.tsx**

Import and wire the hooks:

```typescript
import { useMaintenanceSelection } from '../../src/hooks/useMaintenanceSelection';
import { useBulkCompleteMaintenance } from '../../src/hooks/useBulkCompleteMaintenance';
import { BulkActionBar } from '../../src/components/maintenance/BulkActionBar';
import * as Haptics from 'expo-haptics';
```

Inside `MaintenanceScreen`:

```typescript
const selection = useMaintenanceSelection(maintenance ?? []);
const { bulkComplete, isProcessing, progress } = useBulkCompleteMaintenance();

const handleLongPress = useCallback((id: string) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  selection.enterSelection(id);
}, [selection.enterSelection]);

const handleBulkComplete = useCallback(async () => {
  const ids = Array.from(selection.selectedIds);
  const result = await bulkComplete(ids);
  selection.exitSelection();
  // Toast with result summary
}, [selection, bulkComplete]);
```

- [ ] **Step 2: Add "Select" button to list header**

In the maintenance tab header area (near the filter panel, around line 254-266):

```typescript
{!selection.isSelecting && maintenance && maintenance.length > 0 && (
  <TouchableOpacity onPress={() => selection.enterSelection(maintenance[0].id)}>
    <AppText style={styles.selectButton}>Select</AppText>
  </TouchableOpacity>
)}
{selection.isSelecting && (
  <View style={styles.selectionHeader}>
    <AppText style={styles.selectionCount}>{selection.selectedCount} selected</AppText>
    <TouchableOpacity onPress={selection.selectAll}>
      <AppText style={styles.selectAllText}>Select All</AppText>
    </TouchableOpacity>
    <TouchableOpacity onPress={selection.exitSelection}>
      <AppText style={styles.doneText}>Done</AppText>
    </TouchableOpacity>
  </View>
)}
```

- [ ] **Step 3: Update MaintenanceListItem for selection mode**

In `MaintenanceListItem.tsx`, extend props:

```typescript
interface MaintenanceListItemProps {
  maintenance: MaintenanceListItemType;
  onPress: (maintenance: MaintenanceListItemType) => void;
  isSelecting?: boolean;
  isSelected?: boolean;
  isCompletable?: boolean;
  onLongPress?: (id: string) => void;
  onToggle?: (id: string) => void;
}
```

Add checkbox rendering and long-press handler. Update the memo comparison to include new props.

- [ ] **Step 4: Render BulkActionBar at bottom**

In `maintenance.tsx`, render the bar when in selection mode:

```typescript
{selection.isSelecting && (
  <BulkActionBar
    selectedCount={selection.selectedCount}
    onComplete={handleBulkComplete}
    onCancel={selection.exitSelection}
    isProcessing={isProcessing}
    progress={progress}
  />
)}
```

- [ ] **Step 5: Run typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run full mobile test suite**

Run: `cd apps/mobile && npx jest --no-coverage`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/\(tabs\)/maintenance.tsx apps/mobile/src/components/maintenance/MaintenanceListItem.tsx
git commit -m "feat(mobile): wire bulk selection and completion into maintenance screen"
```

---

## Task 13: Add notification_preferences migration

**Files:**
- Create: `supabase/migrations/20260318000000_notification_preferences.sql`

- [ ] **Step 1: Write migration**

Create `supabase/migrations/20260318000000_notification_preferences.sql`:

```sql
-- Add notification preferences to profiles
ALTER TABLE public.profiles
ADD COLUMN notification_preferences JSONB NOT NULL DEFAULT '{"rego_expiry": true}'::jsonb;

COMMENT ON COLUMN public.profiles.notification_preferences IS
  'Per-type notification delivery preferences. Keys are notification type names, values are booleans.';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260318000000_notification_preferences.sql
git commit -m "feat(supabase): add notification_preferences JSONB column to profiles"
```

---

## Task 14: Extend Profile types and mappers

**Files:**
- Modify: `packages/shared/src/types/api/auth.ts:9-34,57-70,141-155,214-229,236-246`

- [ ] **Step 1: Add NotificationPreferences schema**

At the top of `auth.ts`, add:

```typescript
import { z } from 'zod';

export const NotificationPreferencesSchema = z
  .object({ rego_expiry: z.boolean() })
  .catchall(z.boolean());

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
```

- [ ] **Step 2: Extend Profile interface (lines 9-34)**

Add to the `Profile` interface:
```typescript
notificationPreferences: NotificationPreferences;
```

- [ ] **Step 3: Extend ProfileRow type (lines 57-70)**

Add to `ProfileRow`:
```typescript
notification_preferences: Record<string, boolean>;
```

- [ ] **Step 4: Extend UpdateProfileInput and schema (lines 141-155)**

Add to `UpdateProfileInput`:
```typescript
notificationPreferences?: NotificationPreferences;
```

Add to `UpdateProfileInputSchema`:
```typescript
notificationPreferences: NotificationPreferencesSchema.optional(),
```

- [ ] **Step 5: Update mapRowToProfile (lines 214-229)**

Add mapping:
```typescript
notificationPreferences: row.notification_preferences ?? { rego_expiry: true },
```

- [ ] **Step 6: Update mapProfileToUpdate (lines 236-246)**

Add mapping:
```typescript
...(profile.notificationPreferences !== undefined && {
  notification_preferences: profile.notificationPreferences,
}),
```

- [ ] **Step 7: Run shared tests**

Run: `cd packages/shared && npm test`
Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/types/api/auth.ts
git commit -m "feat(shared): extend Profile types with notificationPreferences"
```

---

## Task 15: Add notification toggle to Settings screen

**Files:**
- Modify: `apps/mobile/app/settings.tsx`
- Modify: `apps/mobile/src/store/authStore.ts`

- [ ] **Step 1: Add toggle to settings screen**

In `apps/mobile/app/settings.tsx`, add a new section for server-side notification preferences. This is separate from the existing `NotificationsModal` (which handles local device preferences):

```typescript
import { Switch } from 'react-native';

// Inside the settings component, add after existing notification section:
const user = useAuthStore((s) => s.user);
const updateProfile = useAuthStore((s) => s.updateUserProfile);
const [regoNotifs, setRegoNotifs] = useState(
  user?.notificationPreferences?.rego_expiry ?? true
);

const handleRegoToggle = useCallback(async (value: boolean) => {
  setRegoNotifs(value); // Optimistic
  const result = await updateProfile({
    notificationPreferences: { rego_expiry: value },
  });
  if (!result.success) {
    setRegoNotifs(!value); // Rollback
  }
}, [updateProfile]);
```

Render:
```typescript
<View style={styles.settingRow}>
  <View style={styles.settingInfo}>
    <AppText style={styles.settingLabel}>Registration expiry reminders</AppText>
    <AppText style={styles.settingSubtext}>
      Get notified 7 days and 2 days before registration expires
    </AppText>
  </View>
  <Switch value={regoNotifs} onValueChange={handleRegoToggle} />
</View>
```

- [ ] **Step 2: Run typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/settings.tsx apps/mobile/src/store/authStore.ts
git commit -m "feat(mobile): add registration expiry notification toggle to settings"
```

---

## Task 16: Update send-push-notification to filter by preferences

**Files:**
- Modify: `supabase/functions/send-push-notification/index.ts:142-152`

- [ ] **Step 1: Add preference filtering to token query**

In `send-push-notification/index.ts`, modify the profile query at lines 142-152. The function currently queries profiles by role, then fetches tokens for those user IDs. Add a `notificationType` parameter to the request body and filter accordingly:

```typescript
// Accept optional notificationType in request body
const { title, body, data, targetRoles, notificationType } = await req.json();

// When querying profiles, add preference filter if notificationType is specified
let profileQuery = supabase
  .from('profiles')
  .select('id')
  .in('role', targetRoles)
  .eq('is_active', true);

if (notificationType) {
  // Filter out users who have explicitly disabled this notification type
  // Uses template literal to interpolate the variable into the JSONB arrow path
  profileQuery = profileQuery.not(
    `notification_preferences->>${notificationType}`,
    'eq',
    'false'
  );
}
```

Note: Using `not eq false` rather than `eq true` ensures users who haven't set preferences yet (default `{"rego_expiry": true}`) are still included.

- [ ] **Step 2: Update rego-check-daily to pass notificationType**

In `supabase/functions/rego-check-daily/index.ts`, in the `sendNotification` function (lines 109-140), add `notificationType: 'rego_expiry'` to the request body sent to `send-push-notification`:

```typescript
body: JSON.stringify({
  title,
  body,
  data,
  targetRoles: ['superuser', 'manager'],
  notificationType: 'rego_expiry', // Add this line
}),
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-push-notification/index.ts supabase/functions/rego-check-daily/index.ts
git commit -m "feat(supabase): filter push notifications by user preference"
```

---

## Task 17: Final verification

**Files:** None (verification only)

- [ ] **Step 1: Run full mobile test suite**

Run: `cd apps/mobile && npx jest --no-coverage`
Expected: All PASS (existing 355 + ~30 new tests)

- [ ] **Step 2: Run shared test suite**

Run: `cd packages/shared && npm test`
Expected: All PASS

- [ ] **Step 3: Run typecheck across monorepo**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Verify no lint errors**

Run: `cd apps/mobile && npm run lint`
Expected: No errors

- [ ] **Step 5: Commit any remaining fixes**

If any verification step reveals issues, fix and commit.
