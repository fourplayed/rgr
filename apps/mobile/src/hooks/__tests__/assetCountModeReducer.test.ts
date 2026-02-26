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
import type { StandaloneScan, AssetCountState } from '@rgr/shared';

function makeScan(assetNumber: string, assetId?: string): StandaloneScan {
  return {
    type: 'standalone',
    assetId: assetId ?? `asset-${assetNumber}`,
    assetNumber,
    timestamp: Date.now(),
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
        scans: [makeScan('TL001', 'a1'), makeScan('TL002', 'a2')],
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
      expect(state.combinations[comboId]!.assetNumbers).toEqual(['TL001', 'TL002']);
    });

    it('extends an existing combination', () => {
      const comboId = mockUUID;

      // Set up state where TL001 and TL002 are already in a combination,
      // and TL003 is a new standalone scan
      const stateBeforeLink: AssetCountState = {
        isActive: true,
        sessionId: null,
        depotId: 'd',
        depotName: 'D',
        scans: [
          { type: 'combination', assetId: 'a1', assetNumber: 'TL001', timestamp: 1, combinationId: comboId, combinationPosition: 1 },
          { type: 'combination', assetId: 'a2', assetNumber: 'TL002', timestamp: 2, combinationId: comboId, combinationPosition: 2 },
          makeScan('TL003', 'a3'),
        ],
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
        lastUnlinkedScanIndex: 1, // Points to TL002 (in the combo)
      };

      const state = reducer(stateBeforeLink, { type: 'LINK_TO_PREVIOUS' });

      expect(state.combinations[comboId]!.assetIds).toHaveLength(3);
      expect(state.combinations[comboId]!.assetNumbers).toEqual(['TL001', 'TL002', 'TL003']);
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
