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
  onlineManager: { isOnline: () => true },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const mockAsyncStorage = require('@react-native-async-storage/async-storage').default;
import {
  enqueueScan,
  enqueueMutation,
  getQueueLength,
  clearQueue,
  _resetMigrationFlag,
} from '../offlineMutationQueue';

const mockInput = {
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

describe('offlineMutationQueue', () => {
  beforeEach(async () => {
    await mockAsyncStorage.clear();
    _resetMigrationFlag();
  });

  it('starts with an empty queue', async () => {
    expect(await getQueueLength()).toBe(0);
  });

  it('enqueues a scan via backward-compatible enqueueScan and increments queue length', async () => {
    await enqueueScan(mockInput);
    expect(await getQueueLength()).toBe(1);
  });

  it('enqueues multiple scans', async () => {
    await enqueueScan(mockInput);
    await enqueueScan({ ...mockInput, assetId: 'asset-789' });
    expect(await getQueueLength()).toBe(2);
  });

  it('clears the queue', async () => {
    await enqueueScan(mockInput);
    await enqueueScan(mockInput);
    await clearQueue();
    expect(await getQueueLength()).toBe(0);
  });

  it('enqueueMutation stores defect_report type with pending photoStatus', async () => {
    const defectPayload = {
      assetId: 'asset-123',
      reportedBy: 'user-456',
      description: 'Cracked frame',
      severity: 'major',
    };
    await enqueueMutation({ type: 'defect_report', payload: defectPayload });
    expect(await getQueueLength()).toBe(1);

    // Verify shape in storage
    const raw = await mockAsyncStorage.getItem('rgr:offline-mutation-queue');
    const entries = JSON.parse(raw);
    expect(entries[0].type).toBe('defect_report');
    expect(entries[0].payload).toEqual(defectPayload);
    expect(entries[0].photoStatus).toBe('pending');
  });

  it('enqueueMutation stores maintenance type', async () => {
    const maintenancePayload = {
      assetId: 'asset-123',
      scheduledBy: 'user-456',
      maintenanceType: 'service',
    };
    await enqueueMutation({ type: 'maintenance', payload: maintenancePayload });
    expect(await getQueueLength()).toBe(1);

    const raw = await mockAsyncStorage.getItem('rgr:offline-mutation-queue');
    const entries = JSON.parse(raw);
    expect(entries[0].type).toBe('maintenance');
    expect(entries[0].payload).toEqual(maintenancePayload);
  });

  it('enqueueScan sets photoStatus to pending', async () => {
    await enqueueScan(mockInput);
    const raw = await mockAsyncStorage.getItem('rgr:offline-mutation-queue');
    const entries = JSON.parse(raw);
    expect(entries[0].photoStatus).toBe('pending');
    expect(entries[0].type).toBe('scan');
  });

  it('migrates old scan queue entries to new format', async () => {
    // Simulate old-format entries in the legacy key
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
    await mockAsyncStorage.setItem('rgr:offline-scan-queue', JSON.stringify(oldEntries));

    // Reading the queue should trigger migration
    const length = await getQueueLength();
    expect(length).toBe(2);

    // Old key should be removed
    const oldRaw = await mockAsyncStorage.getItem('rgr:offline-scan-queue');
    expect(oldRaw).toBeNull();

    // New key should have migrated entries with correct shape
    const raw = await mockAsyncStorage.getItem('rgr:offline-mutation-queue');
    const entries = JSON.parse(raw) as Array<Record<string, unknown>>;
    expect(entries).toHaveLength(2);
    expect(entries[0]!['type']).toBe('scan');
    expect(entries[0]!['payload']).toEqual(oldEntries[0]!.input);
    expect(entries[0]!['photoStatus']).toBe('pending');
    expect(entries[1]!['type']).toBe('scan');
    expect(entries[1]!['payload']).toEqual(oldEntries[1]!.input);
  });

  it('migration only runs once per session', async () => {
    const oldEntries = [
      {
        id: 'old-1',
        input: { assetId: 'a1', scannedBy: 'u1', scanType: 'qr_scan' },
        queuedAt: new Date().toISOString(),
      },
    ];
    await mockAsyncStorage.setItem('rgr:offline-scan-queue', JSON.stringify(oldEntries));

    // First call triggers migration
    await getQueueLength();

    // Put old entries back (simulating something weird)
    await mockAsyncStorage.setItem('rgr:offline-scan-queue', JSON.stringify(oldEntries));

    // Second call should NOT re-migrate (flag is set)
    const length = await getQueueLength();
    // Should still be 1 (from first migration), not 2
    expect(length).toBe(1);
  });

  it('handles mixed mutation types in the queue', async () => {
    await enqueueScan(mockInput);
    await enqueueMutation({ type: 'defect_report', payload: { description: 'broken' } });
    await enqueueMutation({ type: 'maintenance', payload: { maintenanceType: 'service' } });
    expect(await getQueueLength()).toBe(3);
  });
});
