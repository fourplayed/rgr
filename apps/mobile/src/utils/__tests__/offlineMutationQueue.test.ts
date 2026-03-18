/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve();
      }),
    },
  };
});

jest.mock('@tanstack/react-query', () => ({
  onlineManager: { isOnline: jest.fn(() => true) },
}));

jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    scan: jest.fn(),
  },
}));

// ── Imports (after mocks are hoisted) ──────────────────────────────────────────

const mockAsyncStorage = require('@react-native-async-storage/async-storage').default;
const { logger } = require('../logger');
const { onlineManager } = require('@tanstack/react-query');
const mockIsOnline = onlineManager.isOnline as jest.Mock;

import {
  enqueueMutation,
  enqueueScan,
  getQueueLength,
  replayQueue,
  clearQueue,
  abortReplay,
  _resetMigrationFlag,
} from '../offlineMutationQueue';
import type { ReplayHandlers, QueuedMutation } from '../offlineMutationQueue';

// ── Helpers ────────────────────────────────────────────────────────────────────

const QUEUE_KEY = 'rgr:offline-mutation-queue';
const OLD_QUEUE_KEY = 'rgr:offline-scan-queue';

const mockScanInput = {
  assetId: 'asset-123',
  scannedBy: 'user-456',
  scanType: 'qr_scan' as const,
  latitude: -31.95,
  longitude: 115.86,
  accuracy: 10,
  altitude: null,
  heading: null,
  speed: null,
  locationDescription: 'Perth Depot',
};

/** Read the raw queue array from the mock store. */
async function readRawQueue(): Promise<QueuedMutation[]> {
  const raw = await mockAsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

const okResult = { success: true as const, data: { id: 'ok' }, error: null };
const failResult = { success: false as const, data: null, error: 'network error' };

/** Build handlers where every type succeeds. */
function makeHandlers(overrides?: Partial<ReplayHandlers>): ReplayHandlers {
  return {
    scan: jest.fn(() => Promise.resolve(okResult)),
    defect_report: jest.fn(() => Promise.resolve(okResult)),
    maintenance: jest.fn(() => Promise.resolve(okResult)),
    ...overrides,
  };
}

/** Build handlers where every type fails. */
function makeFailingHandlers(overrides?: Partial<ReplayHandlers>): ReplayHandlers {
  return {
    scan: jest.fn(() => Promise.resolve(failResult)),
    defect_report: jest.fn(() => Promise.resolve(failResult)),
    maintenance: jest.fn(() => Promise.resolve(failResult)),
    ...overrides,
  };
}

/** Seed the queue directly via AsyncStorage (bypasses enqueueMutation). */
async function seedQueue(entries: QueuedMutation[]): Promise<void> {
  await mockAsyncStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
}

/** Build a minimal QueuedMutation. */
function makeEntry(overrides?: Partial<QueuedMutation>): QueuedMutation {
  return {
    id: `entry-${Math.random().toString(36).slice(2, 8)}`,
    type: 'scan',
    payload: { assetId: 'a1' },
    queuedAt: new Date().toISOString(),
    photoStatus: 'pending',
    ...overrides,
  };
}

// ── Test suite ─────────────────────────────────────────────────────────────────

// replayQueue has a real 1500ms setTimeout on the failure path. Tests involving
// multiple failures need extra time with real timers.
jest.setTimeout(15_000);

describe('offlineMutationQueue', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await mockAsyncStorage.clear();
    _resetMigrationFlag();
    mockIsOnline.mockReturnValue(true);
  });

  // ── enqueueMutation ────────────────────────────────────────────────────────

  describe('enqueueMutation', () => {
    it('creates an entry with the correct shape', async () => {
      await enqueueMutation({
        type: 'defect_report',
        payload: { description: 'cracked' },
      });

      const entries = await readRawQueue();
      expect(entries).toHaveLength(1);
      const entry = entries[0]!;
      expect(entry.id).toEqual(expect.any(String));
      expect(entry.type).toBe('defect_report');
      expect(entry.payload).toEqual({ description: 'cracked' });
      expect(entry.photoStatus).toBe('pending');
      expect(entry.queuedAt).toEqual(expect.any(String));
      expect(Number.isNaN(new Date(entry.queuedAt).getTime())).toBe(false);
    });

    it('stores photoUris when provided', async () => {
      await enqueueMutation({
        type: 'defect_report',
        payload: { description: 'dent' },
        photoUris: ['file:///photo1.jpg', 'file:///photo2.jpg'],
      });

      const entries = await readRawQueue();
      expect(entries[0]!.photoUris).toEqual(['file:///photo1.jpg', 'file:///photo2.jpg']);
    });

    it('does not include photoUris key when none provided', async () => {
      await enqueueMutation({ type: 'scan', payload: { assetId: 'a1' } });
      const entries = await readRawQueue();
      expect(entries[0]!).not.toHaveProperty('photoUris');
    });

    it('respects MAX_QUEUE_SIZE (500) by dropping oldest entries', async () => {
      const full = Array.from({ length: 500 }, (_, i) => makeEntry({ id: `entry-${i}` }));
      await seedQueue(full);

      await enqueueMutation({ type: 'scan', payload: { assetId: 'overflow' } });

      const entries = await readRawQueue();
      expect(entries).toHaveLength(500);
      expect(entries.find((e) => e.id === 'entry-0')).toBeUndefined();
      expect(entries[entries.length - 1]!.payload).toEqual({ assetId: 'overflow' });
    });

    it('preserves entries when under MAX_QUEUE_SIZE', async () => {
      await enqueueMutation({ type: 'scan', payload: { a: 1 } });
      await enqueueMutation({ type: 'scan', payload: { a: 2 } });
      await enqueueMutation({ type: 'scan', payload: { a: 3 } });

      const entries = await readRawQueue();
      expect(entries).toHaveLength(3);
      expect(entries[0]!.payload).toEqual({ a: 1 });
      expect(entries[2]!.payload).toEqual({ a: 3 });
    });

    it('logs the enqueue action', async () => {
      await enqueueMutation({ type: 'maintenance', payload: { x: 1 } });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('maintenance mutation queued')
      );
    });
  });

  // ── enqueueScan ────────────────────────────────────────────────────────────

  describe('enqueueScan', () => {
    it('wraps enqueueMutation with type "scan"', async () => {
      await enqueueScan(mockScanInput);
      const entries = await readRawQueue();
      expect(entries).toHaveLength(1);
      expect(entries[0]!.type).toBe('scan');
      expect(entries[0]!.payload).toMatchObject({
        assetId: 'asset-123',
        scannedBy: 'user-456',
      });
    });

    it('sets photoStatus to pending', async () => {
      await enqueueScan(mockScanInput);
      const entries = await readRawQueue();
      expect(entries[0]!.photoStatus).toBe('pending');
    });
  });

  // ── getQueueLength ─────────────────────────────────────────────────────────

  describe('getQueueLength', () => {
    it('returns 0 for an empty queue', async () => {
      expect(await getQueueLength()).toBe(0);
    });

    it('reflects current queue size', async () => {
      await enqueueMutation({ type: 'scan', payload: { a: 1 } });
      await enqueueMutation({ type: 'scan', payload: { a: 2 } });
      expect(await getQueueLength()).toBe(2);
    });

    it('returns 0 after clearQueue', async () => {
      await enqueueScan(mockScanInput);
      await clearQueue();
      expect(await getQueueLength()).toBe(0);
    });
  });

  // ── replayQueue ────────────────────────────────────────────────────────────

  describe('replayQueue', () => {
    it('processes entries in FIFO order', async () => {
      const callOrder: string[] = [];
      const handlers = makeHandlers({
        scan: jest.fn((p: Record<string, unknown>) => {
          callOrder.push(p['assetId'] as string);
          return Promise.resolve(okResult);
        }),
      });

      await enqueueMutation({ type: 'scan', payload: { assetId: 'first' } });
      await enqueueMutation({ type: 'scan', payload: { assetId: 'second' } });
      await enqueueMutation({ type: 'scan', payload: { assetId: 'third' } });

      await replayQueue(handlers);
      expect(callOrder).toEqual(['first', 'second', 'third']);
    });

    it('returns replayed count on success', async () => {
      await enqueueScan(mockScanInput);
      await enqueueScan({ ...mockScanInput, assetId: 'a2' });
      const result = await replayQueue(makeHandlers());
      expect(result).toEqual({ replayed: 2, failed: 0 });
    });

    it('removes the queue from storage after all succeed', async () => {
      await enqueueScan(mockScanInput);
      await replayQueue(makeHandlers());
      const raw = await mockAsyncStorage.getItem(QUEUE_KEY);
      expect(raw).toBeNull();
    });

    it('persists progress after each successful entry', async () => {
      const handlers = makeHandlers();
      await enqueueScan(mockScanInput);
      await enqueueScan({ ...mockScanInput, assetId: 'a2' });

      mockAsyncStorage.setItem.mockClear();
      mockAsyncStorage.removeItem.mockClear();

      await replayQueue(handlers);

      const totalPersists =
        mockAsyncStorage.setItem.mock.calls.length + mockAsyncStorage.removeItem.mock.calls.length;
      expect(totalPersists).toBeGreaterThanOrEqual(2);
    });

    it('dispatches to the correct handler based on mutation type', async () => {
      const handlers = makeHandlers();
      await enqueueMutation({ type: 'scan', payload: { x: 1 } });
      await enqueueMutation({ type: 'defect_report', payload: { x: 2 } });
      await enqueueMutation({ type: 'maintenance', payload: { x: 3 } });

      await replayQueue(handlers);
      expect(handlers.scan).toHaveBeenCalledWith({ x: 1 });
      expect(handlers.defect_report).toHaveBeenCalledWith({ x: 2 });
      expect(handlers.maintenance).toHaveBeenCalledWith({ x: 3 });
    });

    it('increments retryCount on failure and moves entry to back', async () => {
      // fail-me always fails, ok always succeeds. After ok is consumed,
      // fail-me gets 3 consecutive failures and circuit breaker stops.
      await enqueueMutation({ type: 'scan', payload: { assetId: 'fail-me' } });
      await enqueueMutation({ type: 'scan', payload: { assetId: 'ok' } });

      const handlers = makeHandlers({
        scan: jest.fn((p: Record<string, unknown>) => {
          if (p['assetId'] === 'fail-me') {
            return Promise.resolve({ success: false as const, data: null, error: 'fail' });
          }
          return Promise.resolve(okResult);
        }),
      });

      await replayQueue(handlers);

      const entries = await readRawQueue();
      const failedEntry = entries.find((e) => e.payload['assetId'] === 'fail-me');
      expect(failedEntry).toBeDefined();
      expect(failedEntry!.retryCount).toBeGreaterThanOrEqual(1);
    });

    it('discards entries after MAX_RETRIES (5) failures', async () => {
      // retryCount=4 means next failure makes it 5 >= MAX_RETRIES -> discard.
      // Add a second fresh entry so the circuit breaker doesn't mask the result.
      const almostDead = makeEntry({ id: 'doomed', retryCount: 4 });
      const fresh = makeEntry({ id: 'survivor' });
      await seedQueue([almostDead, fresh]);

      const handlers = makeFailingHandlers();
      await replayQueue(handlers);

      const entries = await readRawQueue();
      expect(entries.find((e) => e.id === 'doomed')).toBeUndefined();
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Discarding'));
    });

    it('circuit breaker stops replay after 3 consecutive failures', async () => {
      await enqueueMutation({ type: 'scan', payload: { a: 1 } });
      await enqueueMutation({ type: 'scan', payload: { a: 2 } });
      await enqueueMutation({ type: 'scan', payload: { a: 3 } });
      await enqueueMutation({ type: 'scan', payload: { a: 4 } });

      const handlers = makeFailingHandlers();
      const result = await replayQueue(handlers);

      expect(result.failed).toBe(3);
      expect(handlers.scan).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Circuit breaker'));
    });

    it('circuit breaker resets when a success occurs between failures', async () => {
      // Without a success to reset the counter, 3 consecutive failures trip the
      // breaker immediately. Here we interleave a success to prove the counter
      // resets, allowing more than 3 total failures before the breaker fires.
      //
      // Queue: [bad-0, good-1, bad-2].
      // Round 1: bad-0 fail(consec=1), good-1 succeed(consec=0), bad-2 fail(consec=1)
      // Now queue: [bad-0(1), bad-2(1)] (good-1 removed)
      // Round 2: bad-0 fail(consec=2), bad-2 fail(consec=3) -> breaker fires
      // Total failures: 4 (more than 3, proving the counter was reset mid-run)
      const entries = [
        makeEntry({ id: 'bad-0', payload: { fail: true } }),
        makeEntry({ id: 'good-1', payload: { fail: false } }),
        makeEntry({ id: 'bad-2', payload: { fail: true } }),
      ];
      await seedQueue(entries);

      const handlers = makeHandlers({
        scan: jest.fn((p: Record<string, unknown>) => {
          if (p['fail']) {
            return Promise.resolve({ success: false as const, data: null, error: 'fail' });
          }
          return Promise.resolve(okResult);
        }),
      });

      const result = await replayQueue(handlers);
      expect(result.replayed).toBe(1);
      // More than 3 total failures proves the counter was reset after good-1
      expect(result.failed).toBeGreaterThan(3);
    });

    it('stops when device goes offline mid-replay', async () => {
      await enqueueMutation({ type: 'scan', payload: { a: 1 } });
      await enqueueMutation({ type: 'scan', payload: { a: 2 } });
      await enqueueMutation({ type: 'scan', payload: { a: 3 } });

      let callCount = 0;
      const handlers = makeHandlers({
        scan: jest.fn(() => {
          callCount++;
          if (callCount >= 2) mockIsOnline.mockReturnValue(false);
          return Promise.resolve(okResult);
        }),
      });

      const result = await replayQueue(handlers);
      expect(result.replayed).toBe(2);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Back offline'));
    });

    it('stops when abortReplay() is called', async () => {
      await enqueueMutation({ type: 'scan', payload: { a: 1 } });
      await enqueueMutation({ type: 'scan', payload: { a: 2 } });
      await enqueueMutation({ type: 'scan', payload: { a: 3 } });

      let callCount = 0;
      const handlers = makeHandlers({
        scan: jest.fn(() => {
          callCount++;
          if (callCount >= 1) abortReplay();
          return Promise.resolve(okResult);
        }),
      });

      const result = await replayQueue(handlers);
      expect(result.replayed).toBe(1);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Replay aborted'));
    });

    it('stops when clearQueue is called mid-replay', async () => {
      await enqueueMutation({ type: 'scan', payload: { a: 1 } });
      await enqueueMutation({ type: 'scan', payload: { a: 2 } });

      let callCount = 0;
      const handlers = makeHandlers({
        scan: jest.fn(async () => {
          callCount++;
          if (callCount >= 1) await clearQueue();
          return okResult;
        }),
      });

      const result = await replayQueue(handlers);
      expect(result.replayed).toBe(1);
    });

    it('drops entries older than 48h (TTL filter)', async () => {
      const now = Date.now();
      const staleDate = new Date(now - 49 * 60 * 60 * 1000).toISOString();
      const freshDate = new Date(now).toISOString();

      await seedQueue([
        makeEntry({ id: 'stale', queuedAt: staleDate }),
        makeEntry({ id: 'fresh', queuedAt: freshDate }),
      ]);

      const handlers = makeHandlers();
      const result = await replayQueue(handlers);

      expect(result.replayed).toBe(1);
      expect(handlers.scan).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Dropped 1 stale'));
    });

    it('drops entries with unparseable dates and logs warning', async () => {
      await seedQueue([
        makeEntry({ id: 'bad-date', queuedAt: 'not-a-date' }),
        makeEntry({ id: 'good', queuedAt: new Date().toISOString() }),
      ]);

      await replayQueue(makeHandlers());

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('unparseable date'));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('bad-date'));
    });

    it('concurrency guard prevents duplicate replays', async () => {
      await enqueueMutation({ type: 'scan', payload: { a: 1 } });

      let resolveHandler!: (v: typeof okResult) => void;
      const handlerPromise = new Promise<typeof okResult>((r) => {
        resolveHandler = r;
      });

      const handlers = makeHandlers({ scan: jest.fn(() => handlerPromise) });

      // Start first replay (will block on handler)
      const replay1 = replayQueue(handlers);
      // Second replay should return immediately (concurrency guard)
      const result2 = await replayQueue(handlers);
      expect(result2).toEqual({ replayed: 0, failed: 0 });

      // Unblock first replay
      resolveHandler(okResult);
      const result1 = await replay1;
      expect(result1).toEqual({ replayed: 1, failed: 0 });
    });

    it('returns { replayed: 0, failed: 0 } for an empty queue', async () => {
      const result = await replayQueue(makeHandlers());
      expect(result).toEqual({ replayed: 0, failed: 0 });
    });

    it('retryCount survives serialization round-trip', async () => {
      // Seed entry with retryCount=2. With one entry in the queue:
      // Fail 1: retryCount 2->3, move to back, consec=1
      // Fail 2: retryCount 3->4, move to back, consec=2
      // Fail 3: retryCount 4->5 >= MAX_RETRIES(5), discard, consec=3
      // The Discarding log proves retryCount was correctly incremented
      // through the JSON serialize/deserialize cycle.
      const entry = makeEntry({ id: 'retry-test', retryCount: 2 });
      await seedQueue([entry]);

      await replayQueue(makeFailingHandlers());

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Discarding'));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('5 failed attempts'));
    });

    it('clears _isReplaying flag even when replay throws', async () => {
      await enqueueMutation({ type: 'scan', payload: { a: 1 } });

      const handlers = makeHandlers({
        scan: jest.fn(() => {
          throw new Error('kaboom');
        }),
      });

      try {
        await replayQueue(handlers);
      } catch {
        // swallow -- we only care that the concurrency guard is cleared
      }

      // Should be able to replay again (not stuck in _isReplaying)
      await enqueueMutation({ type: 'scan', payload: { a: 2 } });
      const result = await replayQueue(makeHandlers());
      expect(result.replayed).toBeGreaterThanOrEqual(1);
    });
  });

  // ── clearQueue ─────────────────────────────────────────────────────────────

  describe('clearQueue', () => {
    it('removes all entries from AsyncStorage', async () => {
      await enqueueScan(mockScanInput);
      await enqueueScan(mockScanInput);
      await clearQueue();
      const raw = await mockAsyncStorage.getItem(QUEUE_KEY);
      expect(raw).toBeNull();
    });

    it('sets abort flag so in-progress replay stops', async () => {
      await enqueueMutation({ type: 'scan', payload: { a: 1 } });
      await enqueueMutation({ type: 'scan', payload: { a: 2 } });

      let callCount = 0;
      const handlers = makeHandlers({
        scan: jest.fn(async () => {
          callCount++;
          if (callCount === 1) await clearQueue();
          return okResult;
        }),
      });

      const result = await replayQueue(handlers);
      expect(result.replayed).toBe(1);
    });
  });

  // ── abortReplay ────────────────────────────────────────────────────────────

  describe('abortReplay', () => {
    it('sets abort flag that stops in-progress replay', async () => {
      await enqueueMutation({ type: 'scan', payload: { a: 1 } });
      await enqueueMutation({ type: 'scan', payload: { a: 2 } });
      await enqueueMutation({ type: 'scan', payload: { a: 3 } });

      let callCount = 0;
      const handlers = makeHandlers({
        scan: jest.fn(() => {
          callCount++;
          if (callCount === 2) abortReplay();
          return Promise.resolve(okResult);
        }),
      });

      const result = await replayQueue(handlers);
      expect(result.replayed).toBe(2);
    });
  });

  // ── migrateOldQueue ────────────────────────────────────────────────────────

  describe('migrateOldQueue', () => {
    it('migrates old-format entries to new format', async () => {
      const oldEntries = [
        {
          id: 'old-1',
          input: { assetId: 'a1', scannedBy: 'u1', scanType: 'qr_scan' },
          queuedAt: new Date().toISOString(),
        },
        {
          id: 'old-2',
          input: { assetId: 'a2', scannedBy: 'u2', scanType: 'qr_scan' },
          queuedAt: new Date().toISOString(),
        },
      ];
      await mockAsyncStorage.setItem(OLD_QUEUE_KEY, JSON.stringify(oldEntries));

      const length = await getQueueLength();
      expect(length).toBe(2);

      expect(await mockAsyncStorage.getItem(OLD_QUEUE_KEY)).toBeNull();

      const entries = await readRawQueue();
      expect(entries[0]!.type).toBe('scan');
      expect(entries[0]!.payload).toEqual(oldEntries[0]!.input);
      expect(entries[0]!.photoStatus).toBe('pending');
    });

    it('merges old entries with existing new-key entries', async () => {
      await seedQueue([makeEntry({ id: 'existing' })]);

      const oldEntries = [
        {
          id: 'old-1',
          input: { assetId: 'a1', scannedBy: 'u1', scanType: 'qr_scan' },
          queuedAt: new Date().toISOString(),
        },
      ];
      await mockAsyncStorage.setItem(OLD_QUEUE_KEY, JSON.stringify(oldEntries));

      const length = await getQueueLength();
      expect(length).toBe(2);

      const entries = await readRawQueue();
      expect(entries[0]!.id).toBe('existing');
      expect(entries[1]!.id).toBe('old-1');
    });

    it('runs only once per session (migration flag)', async () => {
      const oldEntries = [
        {
          id: 'old-1',
          input: { assetId: 'a1', scannedBy: 'u1', scanType: 'qr_scan' },
          queuedAt: new Date().toISOString(),
        },
      ];
      await mockAsyncStorage.setItem(OLD_QUEUE_KEY, JSON.stringify(oldEntries));
      await getQueueLength();
      await mockAsyncStorage.setItem(OLD_QUEUE_KEY, JSON.stringify(oldEntries));
      const length = await getQueueLength();
      expect(length).toBe(1);
    });

    it('skips migration when old key has no data', async () => {
      await getQueueLength();
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Migrated'));
    });

    it('skips non-array data in old key', async () => {
      await mockAsyncStorage.setItem(OLD_QUEUE_KEY, JSON.stringify({ not: 'an array' }));
      const length = await getQueueLength();
      expect(length).toBe(0);
      expect(await mockAsyncStorage.getItem(OLD_QUEUE_KEY)).toBeNull();
    });

    it('filters out malformed entries in old key', async () => {
      const oldEntries = [
        { id: 'valid', input: { assetId: 'a1' }, queuedAt: new Date().toISOString() },
        { id: 'no-input', queuedAt: new Date().toISOString() },
        { id: 'no-date', input: { assetId: 'a2' } },
        null,
        'not an object',
      ];
      await mockAsyncStorage.setItem(OLD_QUEUE_KEY, JSON.stringify(oldEntries));
      const length = await getQueueLength();
      expect(length).toBe(1);
    });

    it('_resetMigrationFlag allows re-migration', async () => {
      const oldEntries = [
        {
          id: 'old-1',
          input: { assetId: 'a1', scannedBy: 'u1', scanType: 'qr_scan' },
          queuedAt: new Date().toISOString(),
        },
      ];
      await mockAsyncStorage.setItem(OLD_QUEUE_KEY, JSON.stringify(oldEntries));
      await getQueueLength();
      _resetMigrationFlag();

      await mockAsyncStorage.setItem(
        OLD_QUEUE_KEY,
        JSON.stringify([
          {
            id: 'old-2',
            input: { assetId: 'a2', scannedBy: 'u2', scanType: 'qr_scan' },
            queuedAt: new Date().toISOString(),
          },
        ])
      );

      const length = await getQueueLength();
      expect(length).toBe(2);
    });

    it('retries migration on next session if JSON parse fails', async () => {
      await mockAsyncStorage.setItem(OLD_QUEUE_KEY, '{invalid json');
      await getQueueLength();
      _resetMigrationFlag();

      const validEntries = [
        {
          id: 'recovered',
          input: { assetId: 'a1', scannedBy: 'u1', scanType: 'qr_scan' },
          queuedAt: new Date().toISOString(),
        },
      ];
      await mockAsyncStorage.setItem(OLD_QUEUE_KEY, JSON.stringify(validEntries));
      const length = await getQueueLength();
      expect(length).toBe(1);
    });
  });

  // ── isQueuedMutation (validation via getQueue) ─────────────────────────────

  describe('isQueuedMutation (validation via getQueue)', () => {
    it('filters out entries with missing id', async () => {
      await mockAsyncStorage.setItem(
        QUEUE_KEY,
        JSON.stringify([
          { type: 'scan', payload: {}, queuedAt: '2026-01-01T00:00:00Z', photoStatus: 'pending' },
        ])
      );
      expect(await getQueueLength()).toBe(0);
    });

    it('filters out entries with missing type', async () => {
      await mockAsyncStorage.setItem(
        QUEUE_KEY,
        JSON.stringify([
          { id: 'x', payload: {}, queuedAt: '2026-01-01T00:00:00Z', photoStatus: 'pending' },
        ])
      );
      expect(await getQueueLength()).toBe(0);
    });

    it('filters out entries with invalid type', async () => {
      await mockAsyncStorage.setItem(
        QUEUE_KEY,
        JSON.stringify([
          {
            id: 'x',
            type: 'unknown_type',
            payload: {},
            queuedAt: '2026-01-01T00:00:00Z',
            photoStatus: 'pending',
          },
        ])
      );
      expect(await getQueueLength()).toBe(0);
    });

    it('filters out entries with null payload', async () => {
      await mockAsyncStorage.setItem(
        QUEUE_KEY,
        JSON.stringify([{ id: 'x', type: 'scan', payload: null, queuedAt: '2026-01-01T00:00:00Z' }])
      );
      expect(await getQueueLength()).toBe(0);
    });

    it('filters out entries with missing queuedAt', async () => {
      await mockAsyncStorage.setItem(
        QUEUE_KEY,
        JSON.stringify([{ id: 'x', type: 'scan', payload: {} }])
      );
      expect(await getQueueLength()).toBe(0);
    });

    it('filters out null and primitive values', async () => {
      await mockAsyncStorage.setItem(QUEUE_KEY, JSON.stringify([null, 42, 'string', true]));
      expect(await getQueueLength()).toBe(0);
    });

    it('returns empty array for non-array stored data', async () => {
      await mockAsyncStorage.setItem(QUEUE_KEY, JSON.stringify({ not: 'an array' }));
      expect(await getQueueLength()).toBe(0);
    });

    it('returns empty array for corrupt JSON', async () => {
      await mockAsyncStorage.setItem(QUEUE_KEY, '{corrupt json!!!');
      expect(await getQueueLength()).toBe(0);
    });

    it('accepts all valid mutation types', async () => {
      await mockAsyncStorage.setItem(
        QUEUE_KEY,
        JSON.stringify([
          {
            id: '1',
            type: 'scan',
            payload: { a: 1 },
            queuedAt: '2026-01-01T00:00:00Z',
            photoStatus: 'pending',
          },
          {
            id: '2',
            type: 'defect_report',
            payload: { a: 2 },
            queuedAt: '2026-01-01T00:00:00Z',
            photoStatus: 'pending',
          },
          {
            id: '3',
            type: 'maintenance',
            payload: { a: 3 },
            queuedAt: '2026-01-01T00:00:00Z',
            photoStatus: 'pending',
          },
        ])
      );
      expect(await getQueueLength()).toBe(3);
    });
  });

  // ── photo mutation support ─────────────────────────────────────────────────

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

    it('photo entries persist through getQueueLength (not filtered by isQueuedMutation)', async () => {
      await enqueueMutation({
        type: 'photo',
        payload: {
          assetId: 'a-1',
          uploadedBy: 'u-1',
          photoType: 'freight',
          localUri: '/x.jpg',
          mimeType: 'image/jpeg',
          originalFilename: 'x.jpg',
        },
      });
      expect(await getQueueLength()).toBe(1);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles mixed mutation types in the queue', async () => {
      await enqueueScan(mockScanInput);
      await enqueueMutation({ type: 'defect_report', payload: { description: 'broken' } });
      await enqueueMutation({ type: 'maintenance', payload: { maintenanceType: 'service' } });
      expect(await getQueueLength()).toBe(3);
    });

    it('replay with all stale entries returns { replayed: 0, failed: 0 }', async () => {
      const staleDate = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
      await seedQueue([makeEntry({ queuedAt: staleDate }), makeEntry({ queuedAt: staleDate })]);
      const result = await replayQueue(makeHandlers());
      expect(result).toEqual({ replayed: 0, failed: 0 });
    });

    it('entries within 48h are kept', async () => {
      // 47h old -- well within TTL
      const recentEnough = new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString();
      await seedQueue([makeEntry({ queuedAt: recentEnough })]);
      const result = await replayQueue(makeHandlers());
      expect(result.replayed).toBe(1);
    });
  });
});
