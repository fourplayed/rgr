import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import type { CreateScanEventInput } from '@rgr/shared';
import { createScanEvent } from '@rgr/shared';
import { logger } from './logger';

const QUEUE_KEY = 'rgr:offline-scan-queue';
const MAX_QUEUE_SIZE = 500;
const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const MAX_RETRIES = 5;

export interface QueuedScan {
  id: string;
  input: CreateScanEventInput;
  queuedAt: string;
  retryCount?: number;
}

/**
 * Read all queued scans from AsyncStorage.
 */
async function getQueue(): Promise<QueuedScan[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedScan[];
  } catch {
    return [];
  }
}

/**
 * Persist the queue to AsyncStorage.
 */
async function saveQueue(queue: QueuedScan[]): Promise<void> {
  if (queue.length === 0) {
    await AsyncStorage.removeItem(QUEUE_KEY);
  } else {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

/**
 * Enqueue a scan to be replayed when the device comes back online.
 */
export async function enqueueScan(input: CreateScanEventInput): Promise<QueuedScan> {
  const entry: QueuedScan = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    input,
    queuedAt: new Date().toISOString(),
  };
  let queue = await getQueue();
  queue.push(entry);
  // Drop oldest entries if queue exceeds size cap
  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
  }
  await saveQueue(queue);
  logger.info(`Scan queued for offline replay (${queue.length} in queue)`);
  return entry;
}

/**
 * Get the current queue length (for UI display).
 */
export async function getQueueLength(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

// Concurrency guard: prevents duplicate submissions when NetInfo fires
// rapid reconnect events (e.g., flaky cellular).
let _isReplaying = false;
// Abort flag: set by clearQueue() to stop an in-progress replay
let _abortReplay = false;

/**
 * Replay all queued scans in order. Returns the count of successfully replayed scans.
 *
 * Persists progress incrementally after each scan to prevent duplicates if the
 * app is killed mid-replay. Failed scans move to the back of the queue to avoid
 * head-of-line blocking, and are discarded after MAX_RETRIES attempts.
 */
export async function replayQueue(): Promise<{ replayed: number; failed: number }> {
  if (_isReplaying) return { replayed: 0, failed: 0 };
  _isReplaying = true;
  _abortReplay = false;
  try {
    let queue = await getQueue();

    // Filter out stale entries older than TTL
    const now = Date.now();
    const before = queue.length;
    queue = queue.filter((entry) => now - new Date(entry.queuedAt).getTime() < TTL_MS);
    if (queue.length < before) {
      logger.info(`Dropped ${before - queue.length} stale queued scan(s) (>48h old)`);
      await saveQueue(queue);
    }

    if (queue.length === 0) return { replayed: 0, failed: 0 };

    logger.info(`Replaying ${queue.length} queued scan(s)...`);
    let replayed = 0;
    let failed = 0;

    while (queue.length > 0) {
      if (_abortReplay || !onlineManager.isOnline()) {
        if (_abortReplay) {
          logger.info('Replay aborted (logout or clearQueue)');
        } else {
          logger.info(`Back offline — ${queue.length} scan(s) remain in queue`);
        }
        break;
      }

      const entry = queue[0]!;
      const result = await createScanEvent(entry.input);

      if (result.success) {
        replayed++;
        logger.info(`Replayed queued scan ${entry.id}`);
        queue = queue.slice(1);
        await saveQueue(queue);
      } else {
        failed++;
        const retries = (entry.retryCount ?? 0) + 1;
        if (retries >= MAX_RETRIES) {
          logger.warn(
            `Discarding scan ${entry.id} after ${MAX_RETRIES} failed attempts: ${result.error}`
          );
          queue = queue.slice(1);
        } else {
          logger.warn(
            `Failed to replay scan ${entry.id} (attempt ${retries}/${MAX_RETRIES}): ${result.error}`
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
  }
}

/**
 * Clear the queue entirely (e.g., on logout).
 * Sets abort flag to stop any in-progress replay cleanly.
 */
export async function clearQueue(): Promise<void> {
  _abortReplay = true;
  await AsyncStorage.removeItem(QUEUE_KEY);
}
