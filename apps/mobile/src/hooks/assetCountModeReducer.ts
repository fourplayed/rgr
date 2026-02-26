import { logger } from '../utils/logger';
import type {
  StandaloneScan,
  CombinationScan,
  AssetCountState,
} from '@rgr/shared';
import { isStandaloneScan } from '@rgr/shared';

/**
 * Generate a UUID v4 for combination IDs.
 * Uses crypto.randomUUID when available, falls back to manual generation.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type Action =
  | { type: 'START_COUNT'; depotId: string; depotName: string }
  | { type: 'SET_SESSION_ID'; sessionId: string }
  | { type: 'ADD_SCAN'; scan: StandaloneScan }
  | { type: 'CONFIRM_SCAN' }
  | { type: 'CANCEL_SCAN' }
  | { type: 'LINK_TO_PREVIOUS' }
  | { type: 'KEEP_SEPARATE' }
  | { type: 'SET_COMBINATION_NOTES'; combinationId: string; notes: string }
  | { type: 'SET_COMBINATION_PHOTO'; combinationId: string; photoUri: string; photoId: string | null }
  | { type: 'END_COUNT' }
  | { type: 'RESTORE'; state: AssetCountState };

export const STORAGE_KEY = '@rgr/asset_count_session';
export const DEBOUNCE_MS = 500;

export const initialState: AssetCountState = {
  isActive: false,
  sessionId: null,
  depotId: null,
  depotName: null,
  scans: [],
  currentScan: null,
  combinations: {},
  lastUnlinkedScanIndex: null,
};

export function reducer(state: AssetCountState, action: Action): AssetCountState {
  switch (action.type) {
    case 'START_COUNT':
      logger.assetCount('Starting count session', {
        depotId: action.depotId,
        depotName: action.depotName,
      });
      return {
        ...initialState,
        isActive: true,
        depotId: action.depotId,
        depotName: action.depotName,
      };

    case 'SET_SESSION_ID':
      return {
        ...state,
        sessionId: action.sessionId,
      };

    case 'ADD_SCAN':
      logger.assetCount('Adding scan to pending', {
        assetNumber: action.scan.assetNumber,
      });
      return {
        ...state,
        currentScan: action.scan,
      };

    case 'CONFIRM_SCAN': {
      if (!state.currentScan) {
        logger.warn('Attempted to confirm scan with no pending scan');
        return state;
      }
      logger.assetCount('Confirming scan', {
        assetNumber: state.currentScan.assetNumber,
        totalScans: state.scans.length + 1,
      });
      // Add scan as standalone, track its index as potential link target
      const newIndex = state.scans.length;
      return {
        ...state,
        scans: [...state.scans, state.currentScan],
        currentScan: null,
        lastUnlinkedScanIndex: newIndex,
      };
    }

    case 'CANCEL_SCAN':
      logger.assetCount('Cancelling pending scan');
      return {
        ...state,
        currentScan: null,
      };

    case 'LINK_TO_PREVIOUS': {
      // Link the current scan (last in array) to the previous unlinked scan
      if (state.lastUnlinkedScanIndex === null || state.scans.length < 2) {
        logger.warn('No previous scan to link to');
        return state;
      }

      const previousIndex = state.lastUnlinkedScanIndex;
      const currentIndex = state.scans.length - 1;

      // Previous scan could be standalone or already in a combination
      const previousScan = state.scans[previousIndex];
      const currentScan = state.scans[currentIndex];

      // Guard against undefined scans (should not happen due to earlier checks)
      if (!previousScan || !currentScan) {
        logger.warn('Missing scans in LINK_TO_PREVIOUS');
        return state;
      }

      let combinationId: string;
      const newCombinations = { ...state.combinations };
      const newScans = [...state.scans];

      if (isStandaloneScan(previousScan)) {
        // Create new combination
        combinationId = generateUUID();

        // Convert previous scan to combination scan
        const previousAsCombination: CombinationScan = {
          type: 'combination',
          assetId: previousScan.assetId,
          assetNumber: previousScan.assetNumber,
          timestamp: previousScan.timestamp,
          combinationId,
          combinationPosition: 1,
        };
        newScans[previousIndex] = previousAsCombination;

        // Convert current scan to combination scan
        const currentAsCombination: CombinationScan = {
          type: 'combination',
          assetId: currentScan.assetId,
          assetNumber: currentScan.assetNumber,
          timestamp: currentScan.timestamp,
          combinationId,
          combinationPosition: 2,
        };
        newScans[currentIndex] = currentAsCombination;

        // Create combination group
        newCombinations[combinationId] = {
          combinationId,
          assetIds: [previousScan.assetId, currentScan.assetId],
          assetNumbers: [previousScan.assetNumber, currentScan.assetNumber],
          notes: null,
          photoUri: null,
          photoId: null,
        };

        logger.assetCount('Created new combination', {
          combinationId,
          assets: [previousScan.assetNumber, currentScan.assetNumber],
        });
      } else {
        // Extend existing combination
        combinationId = previousScan.combinationId;
        const existingCombo = state.combinations[combinationId];

        // Guard against missing combo
        if (!existingCombo) {
          logger.warn('Missing combination in LINK_TO_PREVIOUS');
          return state;
        }

        const newPosition = existingCombo.assetIds.length + 1;

        // Convert current scan to combination scan
        const currentAsCombination: CombinationScan = {
          type: 'combination',
          assetId: currentScan.assetId,
          assetNumber: currentScan.assetNumber,
          timestamp: currentScan.timestamp,
          combinationId,
          combinationPosition: newPosition,
        };
        newScans[currentIndex] = currentAsCombination;

        // Update combination group
        newCombinations[combinationId] = {
          ...existingCombo,
          assetIds: [...existingCombo.assetIds, currentScan.assetId],
          assetNumbers: [...existingCombo.assetNumbers, currentScan.assetNumber],
        };

        logger.assetCount('Extended combination', {
          combinationId,
          assets: newCombinations[combinationId]?.assetNumbers ?? [],
        });
      }

      return {
        ...state,
        scans: newScans,
        combinations: newCombinations,
        // Current scan stays as the last linkable (in case user wants to add more)
        lastUnlinkedScanIndex: currentIndex,
      };
    }

    case 'KEEP_SEPARATE':
      // Just clear the link candidate - current scan is already standalone
      logger.assetCount('Keeping scan separate');
      return {
        ...state,
        // The most recent scan becomes the new linkable candidate
        lastUnlinkedScanIndex: state.scans.length - 1,
      };

    case 'SET_COMBINATION_NOTES': {
      const combo = state.combinations[action.combinationId];
      if (!combo) {
        logger.warn('Combination not found for notes update', { combinationId: action.combinationId });
        return state;
      }
      return {
        ...state,
        combinations: {
          ...state.combinations,
          [action.combinationId]: {
            ...combo,
            notes: action.notes,
          },
        },
      };
    }

    case 'SET_COMBINATION_PHOTO': {
      const combo = state.combinations[action.combinationId];
      if (!combo) {
        logger.warn('Combination not found for photo update', { combinationId: action.combinationId });
        return state;
      }
      return {
        ...state,
        combinations: {
          ...state.combinations,
          [action.combinationId]: {
            ...combo,
            photoUri: action.photoUri,
            photoId: action.photoId,
          },
        },
      };
    }

    case 'END_COUNT':
      logger.assetCount('Ending count session', {
        totalScans: state.scans.length,
        combinations: Object.keys(state.combinations).length,
      });
      return initialState;

    case 'RESTORE':
      logger.assetCount('Restoring session from storage', {
        scans: action.state.scans.length,
        depotName: action.state.depotName,
        combinations: Object.keys(action.state.combinations).length,
      });
      return action.state;

    default:
      return state;
  }
}
