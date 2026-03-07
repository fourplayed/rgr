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

jest.mock('@rgr/shared', () => ({
  createScanEvent: jest.fn().mockResolvedValue({ success: true, data: { id: 'test-id' } }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const mockAsyncStorage = require('@react-native-async-storage/async-storage').default;
import { enqueueScan, getQueueLength, clearQueue } from '../offlineScanQueue';

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

describe('offlineScanQueue', () => {
  beforeEach(async () => {
    await mockAsyncStorage.clear();
  });

  it('starts with an empty queue', async () => {
    expect(await getQueueLength()).toBe(0);
  });

  it('enqueues a scan and increments queue length', async () => {
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

  it('returns a QueuedScan with id and timestamp', async () => {
    const queued = await enqueueScan(mockInput);
    expect(queued.id).toBeTruthy();
    expect(queued.queuedAt).toBeTruthy();
    expect(queued.input).toEqual(mockInput);
  });
});
