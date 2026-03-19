import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system';
import type { CreateScanEventInput, ServiceResult } from '@rgr/shared';
import { logger } from './logger';
import { eventBus } from './eventBus';
import { placeholderId } from '../hooks/optimisticCache';

const OLD_QUEUE_KEY = 'rgr:offline-scan-queue';
const QUEUE_KEY = 'rgr:offline-mutation-queue';
const MAX_QUEUE_SIZE = 500;
const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const MAX_RETRIES = 5;

export type MutationType = 'scan' | 'defect_report' | 'maintenance' | 'photo';

export type QueuedMutation = {
  id: string;
  type: MutationType;
  payload: Record<string, unknown>;
  queuedAt: string;
  photoUris?: string[];
  photoStatus: 'pending' | 'uploaded' | 'failed';
  retryCount?: number;
  /** UUID for server-side dedup — optional for backwards compat with pre-upgrade entries */
  idempotencyKey?: string;
};

export type ReplayHandlers = {
  scan: (payload: Record<string, unknown>) => Promise<ServiceResult<unknown>>;
  defect_report: (payload: Record<string, unknown>) => Promise<ServiceResult<{ id: string }>>;
  maintenance: (payload: Record<string, unknown>) => Promise<ServiceResult<{ id: string }>>;
  photo: (payload: Record<string, unknown>) => Promise<ServiceResult<unknown>>;
};

const VALID_MUTATION_TYPES: ReadonlySet<string> = new Set<MutationType>([
  'scan',
  'defect_report',
  'maintenance',
  'photo',
]);

function isQueuedMutation(item: unknown): item is QueuedMutation {
  if (typeof item !== 'object' || item === null) return false;
  const o = item as Record<string, unknown>;
  if (
    typeof o['id'] !== 'string' ||
    typeof o['queuedAt'] !== 'string' ||
    typeof o['type'] !== 'string' ||
    !VALID_MUTATION_TYPES.has(o['type'] as string) ||
    typeof o['payload'] !== 'object' ||
    o['payload'] === null
  ) {
    return false;
  }
  // photoStatus is required — reject entries missing it or with invalid values
  const VALID_PHOTO_STATUSES = new Set(['pending', 'uploaded', 'failed']);
  if (typeof o['photoStatus'] !== 'string' || !VALID_PHOTO_STATUSES.has(o['photoStatus'])) {
    return false;
  }
  return true;
}

/**
 * Migrate entries from the old `rgr:offline-scan-queue` key to the new
 * `rgr:offline-mutation-queue` key. Runs at most once per app session.
 */
let _migrationDone = false;

async function migrateOldQueue(): Promise<void> {
  if (_migrationDone) return;
  _migrationDone = true;

  const oldRaw = await AsyncStorage.getItem(OLD_QUEUE_KEY);
  if (!oldRaw) return;

  try {
    const parsed: unknown = JSON.parse(oldRaw);
    if (!Array.isArray(parsed)) {
      await AsyncStorage.removeItem(OLD_QUEUE_KEY);
      return;
    }

    const migrated: QueuedMutation[] = parsed
      .filter(
        (item: unknown) =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>)['id'] === 'string' &&
          typeof (item as Record<string, unknown>)['queuedAt'] === 'string' &&
          typeof (item as Record<string, unknown>)['input'] === 'object' &&
          (item as Record<string, unknown>)['input'] !== null
      )
      .map((item: Record<string, unknown>) => ({
        id: item['id'] as string,
        type: 'scan' as const,
        payload: item['input'] as Record<string, unknown>,
        queuedAt: item['queuedAt'] as string,
        photoStatus: 'pending' as const,
      }));

    if (migrated.length > 0) {
      // Merge with any entries already in the new key (defensive)
      const existingRaw = await AsyncStorage.getItem(QUEUE_KEY);
      let existing: QueuedMutation[] = [];
      if (existingRaw) {
        try {
          const ep: unknown = JSON.parse(existingRaw);
          if (Array.isArray(ep)) {
            existing = ep.filter(isQueuedMutation);
          }
        } catch {
          // ignore corrupt new-key data during migration
        }
      }
      const merged = [...existing, ...migrated];
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(merged));
      logger.info(`Migrated ${migrated.length} queued scan(s) to new offline mutation queue`);
    }

    await AsyncStorage.removeItem(OLD_QUEUE_KEY);
  } catch {
    // If migration fails, leave old key intact and try again next launch
    _migrationDone = false;
  }
}

/**
 * Read all queued mutations from AsyncStorage.
 */
async function getQueue(): Promise<QueuedMutation[]> {
  await migrateOldQueue();

  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueuedMutation);
  } catch {
    return [];
  }
}

/**
 * Persist the queue to AsyncStorage.
 */
async function saveQueue(queue: QueuedMutation[]): Promise<void> {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } else {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

/**
 * Enqueue a mutation to be replayed when the device comes back online.
 */
export async function enqueueMutation(opts: {
  type: MutationType;
  payload: Record<string, unknown>;
  photoUris?: string[];
}): Promise<void> {
  const entry: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: opts.type,
    payload: opts.payload,
    queuedAt: new Date().toISOString(),
    ...(opts.photoUris ? { photoUris: opts.photoUris } : {}),
    photoStatus: 'pending',
    idempotencyKey: placeholderId(),
  };
  let queue = await getQueue();
  queue.push(entry);
  // Drop oldest entries if queue exceeds size cap
  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
  }
  await saveQueue(queue);
  eventBus.emit('queue:changed');
  logger.info(`${opts.type} mutation queued for offline replay (${queue.length} in queue)`);
}

/**
 * Backward-compatible wrapper: enqueue a scan event for offline replay.
 */
export async function enqueueScan(input: CreateScanEventInput): Promise<void> {
  await enqueueMutation({
    type: 'scan',
    payload: input as unknown as Record<string, unknown>,
  });
}

/**
 * Get the current queue length (for UI display).
 */
export async function getQueueLength(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Get a count of queued mutations grouped by type.
 */
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

const OFFLINE_PHOTOS_DIR = `${FileSystem.documentDirectory}offline-photos/`;

/**
 * Copy a temporary camera photo to a persistent offline storage directory.
 * Returns the persistent URI that should be stored in the mutation payload.
 */
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

/**
 * Delete a single offline photo file. Non-fatal if the file is already gone.
 */
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

/**
 * Remove any photo files in the offline-photos directory that are no longer
 * referenced by a queued mutation. Runs as best-effort cleanup (errors are swallowed).
 */
export async function cleanOrphanedPhotos(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(OFFLINE_PHOTOS_DIR);
    if (!dirInfo.exists) return;

    const files = await FileSystem.readDirectoryAsync(OFFLINE_PHOTOS_DIR);
    if (files.length === 0) return;

    const queue = await getQueue();
    const referencedUris = new Set<string>();
    for (const e of queue) {
      if (typeof e.payload['localUri'] === 'string') referencedUris.add(e.payload['localUri']);
      for (const uri of e.photoUris ?? []) referencedUris.add(uri);
    }

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

// Concurrency guard: prevents duplicate submissions when NetInfo fires
// rapid reconnect events (e.g., flaky cellular).
let _isReplaying = false;
// Abort flag: set by clearQueue() to stop an in-progress replay
let _abortReplay = false;

/**
 * Replay all queued mutations in order using type-specific handlers.
 * Returns the count of successfully replayed mutations.
 *
 * Persists progress incrementally after each mutation to prevent duplicates if the
 * app is killed mid-replay. Failed mutations move to the back of the queue to avoid
 * head-of-line blocking, and are discarded after MAX_RETRIES attempts.
 */
export async function replayQueue(
  handlers: ReplayHandlers
): Promise<{ replayed: number; failed: number }> {
  if (_isReplaying) return { replayed: 0, failed: 0 };
  _isReplaying = true;
  _abortReplay = false;
  try {
    let queue = await getQueue();

    // Filter out stale entries older than TTL
    const now = Date.now();
    const staleEntries: QueuedMutation[] = [];
    const freshEntries: QueuedMutation[] = [];
    for (const entry of queue) {
      const queuedMs = new Date(entry.queuedAt).getTime();
      if (Number.isNaN(queuedMs)) {
        logger.warn(
          `Dropping queued mutation ${entry.id} with unparseable date: ${entry.queuedAt}`
        );
        staleEntries.push(entry);
      } else if (now - queuedMs >= TTL_MS) {
        staleEntries.push(entry);
      } else {
        freshEntries.push(entry);
      }
    }
    queue = freshEntries;
    if (staleEntries.length > 0) {
      // Delete photo files for stale mutations before discarding them
      for (const staleEntry of staleEntries) {
        if (typeof staleEntry.payload['localUri'] === 'string') {
          await deleteOfflinePhoto(staleEntry.payload['localUri']);
        }
        for (const uri of staleEntry.photoUris ?? []) {
          await deleteOfflinePhoto(uri);
        }
      }
      logger.info(`Dropped ${staleEntries.length} stale queued mutation(s) (>48h old)`);
      await saveQueue(queue);
    }

    if (queue.length === 0) return { replayed: 0, failed: 0 };

    logger.info(`Replaying ${queue.length} queued mutation(s)...`);
    let replayed = 0;
    let failed = 0;
    let consecutiveFailures = 0;

    while (queue.length > 0) {
      if (_abortReplay || !onlineManager.isOnline()) {
        if (_abortReplay) {
          logger.info('Replay aborted (logout or clearQueue)');
        } else {
          logger.info(`Back offline — ${queue.length} mutation(s) remain in queue`);
        }
        break;
      }

      if (consecutiveFailures >= 3) {
        logger.warn(
          `Circuit breaker: ${consecutiveFailures} consecutive failures — stopping replay with ${queue.length} mutation(s) remaining`
        );
        break;
      }

      const entry = queue[0]!;
      const handler = handlers[entry.type];
      // Inject idempotency key into payload for scan dedup only (other handlers don't use it)
      const payload =
        entry.idempotencyKey && entry.type === 'scan'
          ? { ...entry.payload, idempotencyKey: entry.idempotencyKey }
          : entry.payload;
      const result = await handler(payload);

      if (result.success) {
        replayed++;
        consecutiveFailures = 0;
        logger.info(`Replayed queued ${entry.type} mutation ${entry.id}`);
        queue = queue.slice(1);
        await saveQueue(queue);
      } else {
        // Exponential backoff: 500ms, 1000ms, 2000ms before circuit breaker
        const backoffMs = Math.min(500 * Math.pow(2, consecutiveFailures), 2000);
        await new Promise((r) => setTimeout(r, backoffMs));
        failed++;
        consecutiveFailures++;
        const retries = (entry.retryCount ?? 0) + 1;
        if (retries >= MAX_RETRIES) {
          logger.warn(
            `Discarding ${entry.type} mutation ${entry.id} after ${MAX_RETRIES} failed attempts: ${result.error}`
          );
          queue = queue.slice(1);
        } else {
          logger.warn(
            `Failed to replay ${entry.type} mutation ${entry.id} (attempt ${retries}/${MAX_RETRIES}): ${result.error}`
          );
          // Move to back of queue to avoid head-of-line blocking
          queue = [...queue.slice(1), { ...entry, retryCount: retries }];
        }
        await saveQueue(queue);
      }
    }

    return { replayed, failed };
  } finally {
    _isReplaying = false;
    eventBus.emit('queue:changed');
  }
}

/**
 * Clear the queue entirely (e.g., on logout).
 * Sets abort flag to stop any in-progress replay cleanly.
 */
export async function clearQueue(): Promise<void> {
  _abortReplay = true;
  await AsyncStorage.removeItem(QUEUE_KEY);
  eventBus.emit('queue:changed');
}

/**
 * Abort an in-progress replay (e.g., on logout).
 */
export function abortReplay(): void {
  _abortReplay = true;
}

/**
 * Reset migration flag (for testing only).
 * @internal
 */
export function _resetMigrationFlag(): void {
  _migrationDone = false;
}
