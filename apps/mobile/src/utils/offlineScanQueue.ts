import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import type { CreateScanEventInput } from '@rgr/shared';
import { createScanEvent } from '@rgr/shared';
import { logger } from './logger';

const QUEUE_KEY = 'rgr:offline-scan-queue';
const MAX_QUEUE_SIZE = 500;
const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export interface QueuedScan {
  id: string;
  input: CreateScanEventInput;
  queuedAt: string;
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

/**
 * Replay all queued scans in order. Returns the count of successfully replayed scans.
 * Failed scans remain in the queue for the next attempt.
 */
export async function replayQueue(): Promise<{ replayed: number; failed: number }> {
  const rawQueue = await getQueue();
  // Filter out stale entries older than TTL
  const now = Date.now();
  const queue = rawQueue.filter((entry) => now - new Date(entry.queuedAt).getTime() < TTL_MS);
  if (queue.length < rawQueue.length) {
    logger.info(`Dropped ${rawQueue.length - queue.length} stale queued scan(s) (>48h old)`);
  }
  if (queue.length === 0) {
    await saveQueue([]);
    return { replayed: 0, failed: 0 };
  }

  logger.info(`Replaying ${queue.length} queued scan(s)...`);

  const remaining: QueuedScan[] = [];
  let replayed = 0;

  for (const entry of queue) {
    if (!onlineManager.isOnline()) {
      // Back offline — keep remaining items
      remaining.push(entry);
      continue;
    }

    const result = await createScanEvent(entry.input);
    if (result.success) {
      replayed++;
      logger.info(`Replayed queued scan ${entry.id}`);
    } else {
      logger.warn(`Failed to replay scan ${entry.id}: ${result.error}`);
      remaining.push(entry);
    }
  }

  await saveQueue(remaining);
  return { replayed, failed: remaining.length };
}

/**
 * Clear the queue entirely (e.g., on logout).
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
