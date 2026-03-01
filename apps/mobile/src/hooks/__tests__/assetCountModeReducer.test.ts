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
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => mockUUID },
});

import { reducer, initialState } from '../assetCountModeReducer';
import type { Action } from '../assetCountModeReducer';
import type { StandaloneScan, AssetCountState, AssetCategory } from '@rgr/shared';

function makeScan(assetNumber: string, assetId?: string, category?: AssetCategory): StandaloneScan {
  return {
    type: 'standalone',
    assetId: assetId ?? `asset-${assetNumber}`,
    assetNumber,
    timestamp: Date.now(),
    ...(category && { category }),
  };
}

describe('assetCountModeReducer', () => {
  describe('START_COUNT', () => {
    it('activates the session with depot info', () => {
      const action: Action = { type: 'START_COUNT', depotId: 'depot-1', depotName: 'Perth' };
      const state = reducer(initialState, action);

      expect(state.isActive).toBe(true);
      expect(state.depotId).toBe('depot-1');
      expect(state.depotName).toBe('Perth');
      expect(state.scans).toEqual([]);
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
    it('moves pending scan to scans array', () => {
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
  });

  describe('CANCEL_SCAN', () => {
    it('clears the pending scan', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001') });
      state = reducer(state, { type: 'CANCEL_SCAN' });

      expect(state.currentScan).toBeNull();
    });
  });

  describe('LINK_TO_PREVIOUS', () => {
    it('creates a new combination from two standalone scans', () => {
      // Set up state with two scans where lastUnlinkedScanIndex points to the first
      const stateBeforeLink: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [makeScan('TL001', 'a1', 'trailer'), makeScan('DL001', 'a2', 'dolly')],
        currentScan: null,
        combinations: {},
        lastUnlinkedScanIndex: 0,
      };

      const state = reducer(stateBeforeLink, { type: 'LINK_TO_PREVIOUS' });

      expect(state.scans).toHaveLength(2);
      expect(state.scans[0]!.type).toBe('combination');
      expect(state.scans[1]!.type).toBe('combination');

      const comboId = mockUUID;
      expect(Object.keys(state.combinations)).toHaveLength(1);
      expect(state.combinations[comboId]).toBeDefined();
      expect(state.combinations[comboId]!.assetNumbers).toEqual(['TL001', 'DL001']);
      expect(state.combinations[comboId]!.assetCategories).toEqual(['trailer', 'dolly']);
    });

    it('extends an existing combination', () => {
      const comboId = mockUUID;

      // Set up state where TL001 and DL001 are already in a combination,
      // and TL002 is a new standalone scan
      const stateBeforeLink: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [
          { type: 'combination', assetId: 'a1', assetNumber: 'TL001', timestamp: 1, combinationId: comboId, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: 'a2', assetNumber: 'DL001', timestamp: 2, combinationId: comboId, combinationPosition: 2, category: 'dolly' },
          makeScan('TL002', 'a3', 'trailer'),
        ],
        currentScan: null,
        combinations: {
          [comboId]: {
            combinationId: comboId,
            assetIds: ['a1', 'a2'],
            assetNumbers: ['TL001', 'DL001'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly'],
          },
        },
        lastUnlinkedScanIndex: 1, // Points to DL001 (in the combo)
      };

      const state = reducer(stateBeforeLink, { type: 'LINK_TO_PREVIOUS' });

      expect(state.combinations[comboId]!.assetIds).toHaveLength(3);
      expect(state.combinations[comboId]!.assetNumbers).toEqual(['TL001', 'DL001', 'TL002']);
      expect(state.combinations[comboId]!.assetCategories).toEqual(['trailer', 'dolly', 'trailer']);
      expect(state.scans[2]!.type).toBe('combination');
    });

    it('returns state unchanged if not enough scans', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      const before = state;
      state = reducer(state, { type: 'LINK_TO_PREVIOUS' });

      // Only 1 scan — should not link
      expect(state).toBe(before);
    });

    it('returns state unchanged if lastUnlinkedScanIndex is null', () => {
      const stateNoLink: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [makeScan('TL001'), makeScan('TL002')],
        currentScan: null,
        combinations: {},
        lastUnlinkedScanIndex: null,
      };

      const state = reducer(stateNoLink, { type: 'LINK_TO_PREVIOUS' });
      expect(state).toBe(stateNoLink);
    });

    it('rejects link when both scans are trailers', () => {
      const stateBeforeLink: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [makeScan('TL001', 'a1', 'trailer'), makeScan('TL002', 'a2', 'trailer')],
        currentScan: null,
        combinations: {},
        lastUnlinkedScanIndex: 0,
      };

      const state = reducer(stateBeforeLink, { type: 'LINK_TO_PREVIOUS' });
      expect(state).toBe(stateBeforeLink);
    });

    it('rejects link when both scans are dollies', () => {
      const stateBeforeLink: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [makeScan('DL001', 'a1', 'dolly'), makeScan('DL002', 'a2', 'dolly')],
        currentScan: null,
        combinations: {},
        lastUnlinkedScanIndex: 0,
      };

      const state = reducer(stateBeforeLink, { type: 'LINK_TO_PREVIOUS' });
      expect(state).toBe(stateBeforeLink);
    });

    it('allows link when trailer + dolly', () => {
      const stateBeforeLink: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [makeScan('TL001', 'a1', 'trailer'), makeScan('DL001', 'a2', 'dolly')],
        currentScan: null,
        combinations: {},
        lastUnlinkedScanIndex: 0,
      };

      const state = reducer(stateBeforeLink, { type: 'LINK_TO_PREVIOUS' });
      expect(state.scans[0]!.type).toBe('combination');
      expect(state.scans[1]!.type).toBe('combination');
    });

    it('rejects link when combo is at max size (5)', () => {
      const comboId = mockUUID;
      const stateAtMax: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [
          { type: 'combination', assetId: 'a1', assetNumber: 'TL001', timestamp: 1, combinationId: comboId, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: 'a2', assetNumber: 'DL001', timestamp: 2, combinationId: comboId, combinationPosition: 2, category: 'dolly' },
          { type: 'combination', assetId: 'a3', assetNumber: 'TL002', timestamp: 3, combinationId: comboId, combinationPosition: 3, category: 'trailer' },
          { type: 'combination', assetId: 'a4', assetNumber: 'DL002', timestamp: 4, combinationId: comboId, combinationPosition: 4, category: 'dolly' },
          { type: 'combination', assetId: 'a5', assetNumber: 'TL003', timestamp: 5, combinationId: comboId, combinationPosition: 5, category: 'trailer' },
          makeScan('DL003', 'a6', 'dolly'),
        ],
        currentScan: null,
        combinations: {
          [comboId]: {
            combinationId: comboId,
            assetIds: ['a1', 'a2', 'a3', 'a4', 'a5'],
            assetNumbers: ['TL001', 'DL001', 'TL002', 'DL002', 'TL003'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly', 'trailer', 'dolly', 'trailer'],
          },
        },
        lastUnlinkedScanIndex: 4,
      };

      const state = reducer(stateAtMax, { type: 'LINK_TO_PREVIOUS' });
      expect(state).toBe(stateAtMax);
    });

    it('rejects extending combo with same category as last', () => {
      const comboId = mockUUID;
      const stateBeforeLink: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [
          { type: 'combination', assetId: 'a1', assetNumber: 'TL001', timestamp: 1, combinationId: comboId, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: 'a2', assetNumber: 'DL001', timestamp: 2, combinationId: comboId, combinationPosition: 2, category: 'dolly' },
          makeScan('DL002', 'a3', 'dolly'),
        ],
        currentScan: null,
        combinations: {
          [comboId]: {
            combinationId: comboId,
            assetIds: ['a1', 'a2'],
            assetNumbers: ['TL001', 'DL001'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly'],
          },
        },
        lastUnlinkedScanIndex: 1,
      };

      const state = reducer(stateBeforeLink, { type: 'LINK_TO_PREVIOUS' });
      expect(state).toBe(stateBeforeLink);
    });
  });

  describe('KEEP_SEPARATE', () => {
    it('updates lastUnlinkedScanIndex to most recent scan', () => {
      let state = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL001') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });
      state = reducer(state, { type: 'ADD_SCAN', scan: makeScan('TL002') });
      state = reducer(state, { type: 'CONFIRM_SCAN' });

      state = reducer(state, { type: 'KEEP_SEPARATE' });
      expect(state.lastUnlinkedScanIndex).toBe(1);
    });
  });

  describe('SET_COMBINATION_NOTES', () => {
    it('sets notes on an existing combination', () => {
      const comboId = mockUUID;
      const stateWithCombo: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [],
        currentScan: null,
        combinations: {
          [comboId]: {
            combinationId: comboId,
            assetIds: ['a1', 'a2'],
            assetNumbers: ['TL001', 'TL002'],
            notes: null,
            photoUri: null,
            photoId: null,
          },
        },
        lastUnlinkedScanIndex: null,
      };

      const state = reducer(stateWithCombo, { type: 'SET_COMBINATION_NOTES', combinationId: comboId, notes: 'test notes' });

      expect(state.combinations[comboId]!.notes).toBe('test notes');
    });

    it('returns state unchanged for missing combination', () => {
      const active = reducer(initialState, { type: 'START_COUNT', depotId: 'd', depotName: 'D' });
      const state = reducer(active, { type: 'SET_COMBINATION_NOTES', combinationId: 'nope', notes: 'x' });

      expect(state).toBe(active);
    });
  });

  describe('SET_COMBINATION_PHOTO', () => {
    it('sets photo on an existing combination', () => {
      const comboId = mockUUID;
      const stateWithCombo: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [],
        currentScan: null,
        combinations: {
          [comboId]: {
            combinationId: comboId,
            assetIds: ['a1', 'a2'],
            assetNumbers: ['TL001', 'TL002'],
            notes: null,
            photoUri: null,
            photoId: null,
          },
        },
        lastUnlinkedScanIndex: null,
      };

      const state = reducer(stateWithCombo, { type: 'SET_COMBINATION_PHOTO', combinationId: comboId, photoUri: 'file://photo.jpg', photoId: null });

      expect(state.combinations[comboId]!.photoUri).toBe('file://photo.jpg');
      expect(state.combinations[comboId]!.photoId).toBeNull();
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

    it('dissolves a 2-asset combination and reverts remaining scan to standalone', () => {
      const comboId = mockUUID;
      const stateWithCombo: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [
          { type: 'combination', assetId: 'a1', assetNumber: 'TL001', timestamp: 1, combinationId: comboId, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: 'a2', assetNumber: 'DL001', timestamp: 2, combinationId: comboId, combinationPosition: 2, category: 'dolly' },
        ],
        currentScan: null,
        combinations: {
          [comboId]: {
            combinationId: comboId,
            assetIds: ['a1', 'a2'],
            assetNumbers: ['TL001', 'DL001'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly'],
          },
        },
        lastUnlinkedScanIndex: 1,
      };

      const state = reducer(stateWithCombo, { type: 'UNDO_LAST_SCAN' });

      expect(state.scans).toHaveLength(1);
      expect(state.scans[0]!.type).toBe('standalone');
      expect(state.scans[0]!.assetNumber).toBe('TL001');
      expect(Object.keys(state.combinations)).toHaveLength(0);
      expect(state.lastUnlinkedScanIndex).toBe(0);
    });

    it('removes asset from a 3+ asset combination without dissolving it', () => {
      const comboId = mockUUID;
      const stateWith3Combo: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [
          { type: 'combination', assetId: 'a1', assetNumber: 'TL001', timestamp: 1, combinationId: comboId, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: 'a2', assetNumber: 'DL001', timestamp: 2, combinationId: comboId, combinationPosition: 2, category: 'dolly' },
          { type: 'combination', assetId: 'a3', assetNumber: 'TL002', timestamp: 3, combinationId: comboId, combinationPosition: 3, category: 'trailer' },
        ],
        currentScan: null,
        combinations: {
          [comboId]: {
            combinationId: comboId,
            assetIds: ['a1', 'a2', 'a3'],
            assetNumbers: ['TL001', 'DL001', 'TL002'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly', 'trailer'],
          },
        },
        lastUnlinkedScanIndex: 2,
      };

      const state = reducer(stateWith3Combo, { type: 'UNDO_LAST_SCAN' });

      expect(state.scans).toHaveLength(2);
      expect(state.scans[0]!.type).toBe('combination');
      expect(state.scans[1]!.type).toBe('combination');
      expect(state.combinations[comboId]!.assetIds).toEqual(['a1', 'a2']);
      expect(state.combinations[comboId]!.assetNumbers).toEqual(['TL001', 'DL001']);
      expect(state.combinations[comboId]!.assetCategories).toEqual(['trailer', 'dolly']);
      expect(state.lastUnlinkedScanIndex).toBe(1);
    });

    it('preserves category when dissolving combo to standalone', () => {
      const comboId = mockUUID;
      const stateWithCombo: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [
          { type: 'combination', assetId: 'a1', assetNumber: 'TL001', timestamp: 1, combinationId: comboId, combinationPosition: 1, category: 'trailer' },
          { type: 'combination', assetId: 'a2', assetNumber: 'DL001', timestamp: 2, combinationId: comboId, combinationPosition: 2, category: 'dolly' },
        ],
        currentScan: null,
        combinations: {
          [comboId]: {
            combinationId: comboId,
            assetIds: ['a1', 'a2'],
            assetNumbers: ['TL001', 'DL001'],
            notes: null,
            photoUri: null,
            photoId: null,
            assetCategories: ['trailer', 'dolly'],
          },
        },
        lastUnlinkedScanIndex: 1,
      };

      const state = reducer(stateWithCombo, { type: 'UNDO_LAST_SCAN' });

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
      };

      const state = reducer(initialState, { type: 'RESTORE', state: restoredState });
      expect(state).toEqual(restoredState);
    });
  });
});
