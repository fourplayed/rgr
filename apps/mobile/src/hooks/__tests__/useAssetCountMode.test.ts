// Mock logger before any imports
jest.mock('../../utils/logger', () => ({
  logger: {
    scan: jest.fn(),
    assetCount: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock AsyncStorage as default export
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock crypto.randomUUID for deterministic test IDs
let uuidCounter = 0;
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => {
      uuidCounter++;
      return `combo-uuid-${uuidCounter}`;
    },
  },
});

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAssetCountMode } from '../useAssetCountMode';
import type { StandaloneScan, AssetCountState, AssetCategory } from '@rgr/shared';
import { STORAGE_KEY, DEBOUNCE_MS } from '../assetCountModeReducer';

// Type the mocked module
const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

// Valid UUIDs for tests that need Zod validation (restore/persistence)
const UUID1 = '00000000-0000-4000-8000-000000000001';
const UUID2 = '00000000-0000-4000-8000-000000000002';
const UUID3 = '00000000-0000-4000-8000-000000000003';
const DEPOT_UUID = '00000000-0000-4000-8000-0000000000d1';
const COMBO_UUID = '00000000-0000-4000-8000-00000000c001';

function makeScan(assetNumber: string, assetId?: string, category?: AssetCategory): StandaloneScan {
  return {
    type: 'standalone',
    assetId: assetId ?? `asset-${assetNumber}`,
    assetNumber,
    timestamp: Date.now(),
    ...(category && { category }),
  };
}

/** Flush microtasks so async useEffect callbacks complete */
async function flushMicrotasks() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  uuidCounter = 0;
  // Re-establish mock implementations after clearAllMocks
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
});

describe('useAssetCountMode', () => {
  // ── Computed Values ──

  describe('computed values accuracy', () => {
    it('scanCount equals scans.length after multiple confirms', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks(); // let restore effect settle

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1')));
      act(() => result.current.confirmScan());
      act(() => result.current.addScan(makeScan('TL002', 'a2')));
      act(() => result.current.confirmScan());
      act(() => result.current.addScan(makeScan('TL003', 'a3')));
      act(() => result.current.confirmScan());

      expect(result.current.scanCount).toBe(3);
      expect(result.current.scans).toHaveLength(3);
    });

    it('standaloneCount counts only type=standalone scans', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1')));
      act(() => result.current.confirmScan());
      act(() => result.current.addScan(makeScan('TL002', 'a2')));
      act(() => result.current.confirmScan());

      expect(result.current.standaloneCount).toBe(2);
    });

    it('combinationCount counts Object.keys(combinations).length', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1', 'trailer')));
      act(() => result.current.confirmScan());
      act(() => result.current.addScan(makeScan('DL001', 'a2', 'dolly')));
      act(() => result.current.confirmScan());

      act(() => { result.current.linkToPrevious(); });

      expect(result.current.combinationCount).toBe(1);
    });

    it('after linking 2 scans: standaloneCount decreases by 2, combinationCount increases by 1', async () => {
      // Use RESTORE to set up correct combo state (the reducer's linking logic
      // is tested separately; here we verify computed values from proper state).
      const restoredState: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: DEPOT_UUID,
        depotName: 'Depot',
        scans: [
          { type: 'combination', assetId: UUID1, assetNumber: 'TL001', timestamp: 1, combinationId: COMBO_UUID, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: UUID2, assetNumber: 'DL001', timestamp: 2, combinationId: COMBO_UUID, combinationPosition: 2, category: 'dolly' },
        ],
        currentScan: null,
        combinations: {
          [COMBO_UUID]: {
            combinationId: COMBO_UUID,
            assetIds: [UUID1, UUID2],
            assetNumbers: ['TL001', 'DL001'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly'],
          },
        },
        lastUnlinkedScanIndex: 1,
      };
      mockGetItem.mockResolvedValue(JSON.stringify(restoredState));

      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      expect(result.current.standaloneCount).toBe(0);
      expect(result.current.combinationCount).toBe(1);
      expect(result.current.scanCount).toBe(2);
    });

    it('after extending combo (3rd asset): standaloneCount decreases by 1, combinationCount stays same', async () => {
      // Use RESTORE with 2-asset combo + 1 standalone, then link 3rd to extend
      const restoredState: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: DEPOT_UUID,
        depotName: 'Depot',
        scans: [
          { type: 'combination', assetId: UUID1, assetNumber: 'TL001', timestamp: 1, combinationId: COMBO_UUID, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: UUID2, assetNumber: 'DL001', timestamp: 2, combinationId: COMBO_UUID, combinationPosition: 2, category: 'dolly' },
          { type: 'standalone', assetId: UUID3, assetNumber: 'TL002', timestamp: 3, category: 'trailer' },
        ],
        currentScan: null,
        combinations: {
          [COMBO_UUID]: {
            combinationId: COMBO_UUID,
            assetIds: [UUID1, UUID2],
            assetNumbers: ['TL001', 'DL001'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly'],
          },
        },
        // Points to DL001 (in the combo) — enables "extend" path
        lastUnlinkedScanIndex: 1,
      };
      mockGetItem.mockResolvedValue(JSON.stringify(restoredState));

      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      expect(result.current.standaloneCount).toBe(1);
      expect(result.current.combinationCount).toBe(1);

      // Link TL002 to the existing combo (extending it)
      act(() => { result.current.linkToPrevious(); });

      expect(result.current.standaloneCount).toBe(0);
      expect(result.current.combinationCount).toBe(1); // same combo extended
      expect(result.current.scanCount).toBe(3);
    });

    it('after undo on 2-asset combo: combo dissolves, counts revert correctly', async () => {
      // Use RESTORE with a proper 2-asset combo
      const restoredState: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: DEPOT_UUID,
        depotName: 'Depot',
        scans: [
          { type: 'combination', assetId: UUID1, assetNumber: 'TL001', timestamp: 1, combinationId: COMBO_UUID, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: UUID2, assetNumber: 'DL001', timestamp: 2, combinationId: COMBO_UUID, combinationPosition: 2, category: 'dolly' },
        ],
        currentScan: null,
        combinations: {
          [COMBO_UUID]: {
            combinationId: COMBO_UUID,
            assetIds: [UUID1, UUID2],
            assetNumbers: ['TL001', 'DL001'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly'],
          },
        },
        lastUnlinkedScanIndex: 1,
      };
      mockGetItem.mockResolvedValue(JSON.stringify(restoredState));

      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      expect(result.current.combinationCount).toBe(1);
      expect(result.current.standaloneCount).toBe(0);

      act(() => result.current.undoLastScan());

      // Combo dissolved: one standalone scan remaining
      expect(result.current.scanCount).toBe(1);
      expect(result.current.standaloneCount).toBe(1);
      expect(result.current.combinationCount).toBe(0);
    });
  });

  // ── canLinkToPrevious / previousScanForLink ──

  describe('canLinkToPrevious / previousScanForLink', () => {
    it('true when ≥2 scans with alternating categories', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1', 'trailer')));
      act(() => result.current.confirmScan());
      act(() => result.current.addScan(makeScan('DL001', 'a2', 'dolly')));
      act(() => result.current.confirmScan());

      expect(result.current.canLinkToPrevious).toBe(true);
    });

    it('false when both scans are same category', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1', 'trailer')));
      act(() => result.current.confirmScan());
      act(() => result.current.addScan(makeScan('TL002', 'a2', 'trailer')));
      act(() => result.current.confirmScan());

      expect(result.current.canLinkToPrevious).toBe(false);
    });

    it('false when category is undefined (backward compat)', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1')));
      act(() => result.current.confirmScan());
      act(() => result.current.addScan(makeScan('TL002', 'a2')));
      act(() => result.current.confirmScan());

      expect(result.current.canLinkToPrevious).toBe(false);
    });

    it('false with only 1 scan', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1', 'trailer')));
      act(() => result.current.confirmScan());

      expect(result.current.canLinkToPrevious).toBe(false);
    });

    it('false before any scans', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));

      expect(result.current.canLinkToPrevious).toBe(false);
    });

    it('previousScanForLink returns the correct scan object', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1', 'trailer')));
      act(() => result.current.confirmScan());
      act(() => result.current.addScan(makeScan('DL001', 'a2', 'dolly')));
      act(() => result.current.confirmScan());

      // After confirming DL001, lastUnlinkedScanIndex = 0 (TL001, preserved from first confirm)
      expect(result.current.previousScanForLink).not.toBeNull();
      expect(result.current.previousScanForLink!.assetNumber).toBe('TL001');
    });

    it('previousScanForLink is null when canLinkToPrevious is false', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1', 'trailer')));
      act(() => result.current.confirmScan());

      expect(result.current.previousScanForLink).toBeNull();
    });

    it('false when combo is at max size (5)', async () => {
      const restoredState: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: DEPOT_UUID,
        depotName: 'Depot',
        scans: [
          { type: 'combination', assetId: UUID1, assetNumber: 'TL001', timestamp: 1, combinationId: COMBO_UUID, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: UUID2, assetNumber: 'DL001', timestamp: 2, combinationId: COMBO_UUID, combinationPosition: 2, category: 'dolly' },
          { type: 'combination', assetId: UUID3, assetNumber: 'TL002', timestamp: 3, combinationId: COMBO_UUID, combinationPosition: 3, category: 'trailer' },
          { type: 'combination', assetId: '00000000-0000-4000-8000-000000000004', assetNumber: 'DL002', timestamp: 4, combinationId: COMBO_UUID, combinationPosition: 4, category: 'dolly' },
          { type: 'combination', assetId: '00000000-0000-4000-8000-000000000005', assetNumber: 'TL003', timestamp: 5, combinationId: COMBO_UUID, combinationPosition: 5, category: 'trailer' },
          { type: 'standalone', assetId: '00000000-0000-4000-8000-000000000006', assetNumber: 'DL003', timestamp: 6, category: 'dolly' },
        ],
        currentScan: null,
        combinations: {
          [COMBO_UUID]: {
            combinationId: COMBO_UUID,
            assetIds: [UUID1, UUID2, UUID3, '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005'],
            assetNumbers: ['TL001', 'DL001', 'TL002', 'DL002', 'TL003'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly', 'trailer', 'dolly', 'trailer'],
          },
        },
        lastUnlinkedScanIndex: 4,
      };
      mockGetItem.mockResolvedValue(JSON.stringify(restoredState));

      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      expect(result.current.canLinkToPrevious).toBe(false);
    });
  });

  // ── linkToPrevious return value ──

  describe('linkToPrevious return value', () => {
    it('returns new UUID when linking two standalone scans', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1', 'trailer')));
      act(() => result.current.confirmScan());
      act(() => result.current.addScan(makeScan('DL001', 'a2', 'dolly')));
      act(() => result.current.confirmScan());

      let comboId: string | null = null;
      act(() => { comboId = result.current.linkToPrevious(); });

      expect(comboId).toBe('combo-uuid-1');
    });

    it('returns existing combinationId when previous scan is already in a combo (extend path)', async () => {
      // The "extend combo" path requires lastUnlinkedScanIndex to point to a scan
      // that's already in a combination. This is naturally tested at the reducer level.
      // Here we verify the hook delegates correctly by using RESTORE to set up
      // the needed state (lastUnlinkedScanIndex pointing into an existing combo).
      // Must use valid UUIDs because RESTORE validates via Zod schema.
      const restoredState: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: DEPOT_UUID,
        depotName: 'Depot',
        scans: [
          { type: 'combination', assetId: UUID1, assetNumber: 'TL001', timestamp: 1, combinationId: COMBO_UUID, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: UUID2, assetNumber: 'DL001', timestamp: 2, combinationId: COMBO_UUID, combinationPosition: 2, category: 'dolly' },
          { type: 'standalone', assetId: UUID3, assetNumber: 'TL002', timestamp: 3, category: 'trailer' },
        ],
        currentScan: null,
        combinations: {
          [COMBO_UUID]: {
            combinationId: COMBO_UUID,
            assetIds: [UUID1, UUID2],
            assetNumbers: ['TL001', 'DL001'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly'],
          },
        },
        // Points to DL001 (in the combo) — the "extend" scenario
        lastUnlinkedScanIndex: 1,
      };
      mockGetItem.mockResolvedValue(JSON.stringify(restoredState));

      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      expect(result.current.isActive).toBe(true);
      expect(result.current.scanCount).toBe(3);

      let returnedId: string | null = null;
      act(() => { returnedId = result.current.linkToPrevious(); });

      // Should return the existing combo ID, not a new UUID
      expect(returnedId).toBe(COMBO_UUID);
      expect(result.current.combinationCount).toBe(1);
    });

    it('returns null when no previous scan available', async () => {
      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      act(() => result.current.startCount('d1', 'Depot'));
      act(() => result.current.addScan(makeScan('TL001', 'a1', 'trailer')));
      act(() => result.current.confirmScan());

      let comboId: string | null = 'not-null';
      act(() => { comboId = result.current.linkToPrevious(); });

      expect(comboId).toBeNull();
    });
  });

  // ── Persistence (AsyncStorage) ──

  describe('persistence (AsyncStorage)', () => {
    it('saves state after startCount (debounced)', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useAssetCountMode());
      // Flush the restore effect (getItem resolves to null → no-op)
      await act(async () => { jest.runAllTimers(); });

      mockSetItem.mockClear();

      act(() => result.current.startCount('d1', 'Depot'));

      // Not saved yet (debounced)
      expect(mockSetItem).not.toHaveBeenCalled();

      // Advance past debounce and flush the async callback
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS + 50);
      });

      expect(mockSetItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.any(String)
      );

      // Verify saved state is valid JSON with isActive=true
      const savedJson = mockSetItem.mock.calls[0][1];
      const saved = JSON.parse(savedJson);
      expect(saved.isActive).toBe(true);
      expect(saved.depotId).toBe('d1');

      jest.useRealTimers();
    });

    it('removes state after endCount (debounced)', async () => {
      jest.useFakeTimers();

      const { result } = renderHook(() => useAssetCountMode());
      await act(async () => { jest.runAllTimers(); });

      act(() => result.current.startCount('d1', 'Depot'));
      await act(async () => { jest.advanceTimersByTime(DEBOUNCE_MS + 50); });
      mockSetItem.mockClear();
      mockRemoveItem.mockClear();

      act(() => result.current.endCount());
      await act(async () => { jest.advanceTimersByTime(DEBOUNCE_MS + 50); });

      expect(mockRemoveItem).toHaveBeenCalledWith(STORAGE_KEY);

      jest.useRealTimers();
    });

    it('restores valid session on mount', async () => {
      const savedState: AssetCountState = {
        isActive: true,
        sessionId: UUID1,
        depotId: DEPOT_UUID,
        depotName: 'Perth',
        scans: [{
          type: 'standalone',
          assetId: UUID2,
          assetNumber: 'TL001',
          timestamp: Date.now(),
        }],
        currentScan: null,
        combinations: {},
        lastUnlinkedScanIndex: 0,
      };
      mockGetItem.mockResolvedValue(JSON.stringify(savedState));

      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      expect(result.current.isActive).toBe(true);
      expect(result.current.depotId).toBe(DEPOT_UUID);
      expect(result.current.depotName).toBe('Perth');
      expect(result.current.scanCount).toBe(1);
    });

    it('clears invalid/corrupted data from storage', async () => {
      mockGetItem.mockResolvedValue('not valid json{{{');

      renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      // Should attempt to clear corrupted data
      expect(mockRemoveItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('ignores inactive sessions in storage', async () => {
      const inactiveState: AssetCountState = {
        isActive: false,
        sessionId: null,
        depotId: null,
        depotName: null,
        scans: [],
        currentScan: null,
        combinations: {},
        lastUnlinkedScanIndex: null,
      };
      mockGetItem.mockResolvedValue(JSON.stringify(inactiveState));

      const { result } = renderHook(() => useAssetCountMode());
      await flushMicrotasks();

      // Should not restore — session wasn't active
      expect(result.current.isActive).toBe(false);
      // Should clear invalid data (inactive counts as invalid for restore)
      expect(mockRemoveItem).toHaveBeenCalledWith(STORAGE_KEY);
    });
  });
});
