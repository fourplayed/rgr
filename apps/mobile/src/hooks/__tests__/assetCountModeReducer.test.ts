// Mock the logger since it depends on __DEV__ which doesn't exist in node
jest.mock('../../utils/logger', () => ({
  logger: {
    scan: jest.fn(),
    assetCount: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock crypto.randomUUID for deterministic test IDs
const mockUUID = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
let uuidCounter = 0;
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => `${mockUUID}-${uuidCounter++}` },
});

import { reducer, initialState, Action } from '../assetCountModeReducer';
import { StandaloneScan, AssetCountState, AssetCategory } from '@rgr/shared';

function makeScan(assetNumber: string, assetId?: string, category?: AssetCategory): StandaloneScan {
  return {
    type: 'standalone',
    assetId: assetId ?? `asset-${assetNumber}`,
    assetNumber,
    timestamp: Date.now(),
    ...(category && { category }),
  };
}

beforeEach(() => {
  uuidCounter = 0;
});

describe('assetCountModeReducer', () => {
  describe('START_COUNT', () => {
    it('activates the session with depot info', () => {
      const action: Action = { type: 'START_COUNT', depotId: 'depot-1', depotName: 'Perth' };
      const state = reducer(initialState, action);

      expect(state.isActive).toBe(true);
      expect(state.depotId).toBe('depot-1');
      expect(state.depotName).toBe('Perth');
      expect(state.scans).toEqual([]);
      expect(state.activeChainId).toBeNull();
    });

    it('resets previous state when starting new count', () => {
      const existing: AssetCountState = {
        ...initialState,
        isActive: true,
        scans: [makeScan('TL001')],
        depotId: 'old-depot',
        depotName: 'Old',
      };
      const action: Action = { type: 'START_COUNT', depotId: 'new-depot', depotName: 'New' };
      const state = reducer(existing, action);

      expect(state.scans).toEqual([]);
      expect(state.depotId).toBe('new-depot');
    });
  });

  describe('SET_SESSION_ID', () => {
    it('sets the session ID', () => {
      const active = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      const state = reducer(active, { type: 'SET_SESSION_ID', sessionId: 'sess-123' });

      expect(state.sessionId).toBe('sess-123');
    });
  });

  describe('ADD_SCAN', () => {
    it('sets the current scan as pending', () => {
      const active = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      const scan = makeScan('TL001');
      const state = reducer(active, { type: 'ADD_SCAN', scan });

      expect(state.currentScan).toEqual(scan);
      expect(state.scans).toEqual([]); // Not confirmed yet
    });
  });

  describe('CONFIRM_SCAN', () => {
    it('moves pending scan to scans array (standalone mode)', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      const scan = makeScan('TL001');
      state = reducer(state, { type: 'ADD_SCAN', scan });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      expect(state.scans).toHaveLength(1);
      expect(state.scans[0]).toEqual(scan);
      expect(state.currentScan).toBeNull();
      expect(state.lastUnlinkedScanIndex).toBe(0);
    });

    it('returns state unchanged if no pending scan', () => {
      const active = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      const state = reducer(active, { type: 'CONFIRM_SCAN' });

      expect(state).toBe(active);
    });

    it('adds first scan to active chain as combination', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      const scan = makeScan('TL001', 'a1', 'trailer');
      state = reducer(state, { type: 'ADD_SCAN', scan });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      expect(state.scans).toHaveLength(1);
      expect(state.scans[0]!.type).toBe('combination');
      expect(state.combinations[chainId]!.assetIds).toEqual(['a1']);
      expect(state.combinations[chainId]!.assetNumbers).toEqual(['TL001']);
      expect(state.activeChainId).toBe(chainId); // chain stays active
    });

    it('adds subsequent scans to chain with alternation validation', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      // Add trailer
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      // Add dolly (alternates correctly)
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('DL001', 'a2', 'dolly') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      expect(state.scans).toHaveLength(2);
      expect(state.scans[1]!.type).toBe('combination');
      expect(state.combinations[chainId]!.assetIds).toEqual(['a1', 'a2']);
      expect(state.combinations[chainId]!.assetCategories).toEqual(['trailer', 'dolly']);
    });

    it('adds scan as standalone when chain alternation fails', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      // Add trailer
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      // Try to add another trailer (same category — fails alternation)
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL002', 'a2', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      expect(state.scans).toHaveLength(2);
      expect(state.scans[1]!.type).toBe('standalone'); // fell through to standalone
      expect(state.combinations[chainId]!.assetIds).toEqual(['a1']); // chain unchanged
      expect(state.activeChainId).toBe(chainId); // chain still active
    });

    it('auto-ends chain at max size (5)', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      // Add 5 alternating assets
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('DL001', 'a2', 'dolly') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL002', 'a3', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('DL002', 'a4', 'dolly') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      expect(state.activeChainId).toBe(chainId); // still active at 4

      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL003', 'a5', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      expect(state.activeChainId).toBeNull(); // auto-ended at 5
      expect(state.combinations[chainId]!.assetIds).toHaveLength(5);
    });
  });

  describe('CANCEL_SCAN', () => {
    it('clears the pending scan', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001') });
      state = reducer(state, { type: 'CANCEL_SCAN' });

      expect(state.currentScan).toBeNull();
    });
  });

  describe('START_CHAIN', () => {
    it('creates an empty chain combination and sets activeChainId', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });

      expect(state.activeChainId).not.toBeNull();
      const chainId = state.activeChainId!;
      expect(state.combinations[chainId]).toBeDefined();
      expect(state.combinations[chainId]!.assetIds).toEqual([]);
      expect(state.combinations[chainId]!.assetNumbers).toEqual([]);
    });

    it('is idempotent when chain already active', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const firstChainId = state.activeChainId;

      const before = state;
      state = reducer(state, { type: 'START_CHAIN' });

      expect(state).toBe(before);
      expect(state.activeChainId).toBe(firstChainId);
    });
  });

  describe('END_CHAIN', () => {
    it('deletes empty chain (0 items)', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      state = reducer(state, { type: 'END_CHAIN' });

      expect(state.activeChainId).toBeNull();
      expect(state.combinations[chainId]).toBeUndefined();
    });

    it('reverts single-item chain to standalone (1 item)', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      state = reducer(state, { type: 'END_CHAIN' });

      expect(state.activeChainId).toBeNull();
      expect(state.combinations[chainId]).toBeUndefined();
      expect(state.scans).toHaveLength(1);
      expect(state.scans[0]!.type).toBe('standalone');
      expect(state.scans[0]!.assetNumber).toBe('TL001');
    });

    it('keeps combination for 2+ items', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('DL001', 'a2', 'dolly') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      state = reducer(state, { type: 'END_CHAIN' });

      expect(state.activeChainId).toBeNull();
      expect(state.combinations[chainId]).toBeDefined();
      expect(state.combinations[chainId]!.assetIds).toEqual(['a1', 'a2']);
    });

    it('returns state unchanged if no active chain', () => {
      const state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      const before = state;
      const after = reducer(state, { type: 'END_CHAIN' });

      expect(after).toBe(before);
    });
  });

  describe('SET_COMBINATION_NOTES', () => {
    it('sets notes on an existing combination', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('DL001', 'a2', 'dolly') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'END_CHAIN' });

      state = reducer(state, { type: 'SET_COMBINATION_NOTES', combinationId: chainId, notes: 'test notes' });

      expect(state.combinations[chainId]!.notes).toBe('test notes');
    });

    it('returns state unchanged for missing combination', () => {
      const active = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      const state = reducer(active, { type: 'SET_COMBINATION_NOTES', combinationId: 'nope', notes: 'x' });

      expect(state).toBe(active);
    });
  });

  describe('SET_COMBINATION_PHOTO', () => {
    it('sets photo on an existing combination', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('DL001', 'a2', 'dolly') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'END_CHAIN' });

      state = reducer(state, { type: 'SET_COMBINATION_PHOTO', combinationId: chainId, photoUri: 'file://photo.jpg', photoId: null });

      expect(state.combinations[chainId]!.photoUri).toBe('file://photo.jpg');
      expect(state.combinations[chainId]!.photoId).toBeNull();
    });

    it('returns state unchanged for missing combination', () => {
      const active = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      const state = reducer(active, { type: 'SET_COMBINATION_PHOTO', combinationId: 'nope', photoUri: 'x', photoId: null });

      expect(state).toBe(active);
    });
  });

  describe('END_COUNT', () => {
    it('resets state to initial', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'END_COUNT' });

      expect(state).toEqual(initialState);
    });
  });

  describe('UNDO_LAST_SCAN', () => {
    it('returns state unchanged if no scans to undo', () => {
      const active = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      const state = reducer(active, { type: 'UNDO_LAST_SCAN' });

      expect(state.scans).toEqual([]);
    });

    it('removes a standalone scan', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL002', 'a2') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      state = reducer(state, { type: 'UNDO_LAST_SCAN' });

      expect(state.scans).toHaveLength(1);
      expect(state.scans[0]!.assetNumber).toBe('TL001');
      expect(state.lastUnlinkedScanIndex).toBe(0);
    });

    it('removes scan from active chain without dissolving chain', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('DL001', 'a2', 'dolly') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      state = reducer(state, { type: 'UNDO_LAST_SCAN' });

      expect(state.scans).toHaveLength(1);
      expect(state.activeChainId).toBe(chainId); // chain stays active
      expect(state.combinations[chainId]!.assetIds).toEqual(['a1']);
    });

    it('keeps chain active when undoing to empty chain', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      state = reducer(state, { type: 'UNDO_LAST_SCAN' });

      expect(state.activeChainId).toBe(chainId); // chain still active
      expect(state.combinations[chainId]!.assetIds).toEqual([]);
    });

    it('dissolves a 2-asset finalized combination and reverts remaining to standalone', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });

      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('DL001', 'a2', 'dolly') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'END_CHAIN' }); // finalize the chain

      state = reducer(state, { type: 'UNDO_LAST_SCAN' });

      expect(state.scans).toHaveLength(1);
      expect(state.scans[0]!.type).toBe('standalone');
      expect(state.scans[0]!.assetNumber).toBe('TL001');
      expect(Object.keys(state.combinations)).toHaveLength(0);
    });

    it('removes asset from a 3+ asset finalized combination without dissolving it', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });
      const chainId = state.activeChainId!;

      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('DL001', 'a2', 'dolly') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL002', 'a3', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'END_CHAIN' }); // finalize

      state = reducer(state, { type: 'UNDO_LAST_SCAN' });

      expect(state.scans).toHaveLength(2);
      expect(state.scans[0]!.type).toBe('combination');
      expect(state.scans[1]!.type).toBe('combination');
      expect(state.combinations[chainId]!.assetIds).toEqual(['a1', 'a2']);
      expect(state.combinations[chainId]!.assetNumbers).toEqual(['TL001', 'DL001']);
      expect(state.combinations[chainId]!.assetCategories).toEqual(['trailer', 'dolly']);
    });

    it('preserves category when dissolving combo to standalone', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'START_CHAIN' });

      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1', 'trailer') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('DL001', 'a2', 'dolly') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'END_CHAIN' });

      state = reducer(state, { type: 'UNDO_LAST_SCAN' });

      expect(state.scans).toHaveLength(1);
      expect(state.scans[0]!.type).toBe('standalone');
      expect((state.scans[0] as StandaloneScan).category).toBe('trailer');
    });
  });

  describe('CONFIRM_SCAN duplicate rejection', () => {
    it('rejects a scan with an already-present assetId', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      // Try to add the same asset again
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001', 'a1') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      expect(state.scans).toHaveLength(1);
      expect(state.currentScan).toBeNull();
    });
  });

  describe('RESTORE', () => {
    it('replaces current state with restored state', () => {
      const restoredState: AssetCountState = {
        isActive: true,
        sessionId: 'sess-1',
        depotId: 'depot-1',
        depotName: 'Perth',
        scans: [makeScan('TL001')],
        currentScan: null,
        combinations: {},
        lastUnlinkedScanIndex: 0,
        activeChainId: null,
      };

      const state = reducer(initialState, { type: 'RESTORE', state: restoredState });
      expect(state).toEqual(restoredState);
    });

    it('defaults activeChainId to null if missing from persisted data', () => {
      const restoredState = {
        isActive: true,
        sessionId: 'sess-1',
        depotId: 'depot-1',
        depotName: 'Perth',
        scans: [],
        currentScan: null,
        combinations: {},
        lastUnlinkedScanIndex: null,
      } as unknown as AssetCountState;

      const state = reducer(initialState, { type: 'RESTORE', state: restoredState });
      expect(state.activeChainId).toBeNull();
    });
  });
});
