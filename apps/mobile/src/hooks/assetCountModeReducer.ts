import { logger } from '../utils/logger';
import type {
  StandaloneScan,
  CombinationScan,
  AssetCountState,
} from '@rgr/shared';
import { isStandaloneScan, MAX_COMBINATION_SIZE } from '@rgr/shared';

/**
 * Generate a UUID v4 for combination IDs.
 * Uses crypto.randomUUID when available, falls back to manual generation.
 */
export function generateUUID(): string {
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
  | { type: 'START_CHAIN' }
  | { type: 'END_CHAIN' }
  | { type: 'SET_COMBINATION_NOTES'; combinationId: string; notes: string }
  | { type: 'SET_COMBINATION_PHOTO'; combinationId: string; photoUri: string; photoId: string | null }
  | { type: 'END_COUNT' }
  | { type: 'RESTORE'; state: AssetCountState }
  | { type: 'UNDO_LAST_SCAN' };

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
  activeChainId: null,
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
      // Reject duplicate asset IDs within the same session
      if (state.scans.some(s => s.assetId === state.currentScan!.assetId)) {
        logger.warn('Duplicate asset scan rejected', {
          assetId: state.currentScan.assetId,
          assetNumber: state.currentScan.assetNumber,
        });
        return {
          ...state,
          currentScan: null,
        };
      }
      logger.assetCount('Confirming scan', {
        assetNumber: state.currentScan.assetNumber,
        totalScans: state.scans.length + 1,
      });

      // Chain mode: add scan to active chain's combination
      if (state.activeChainId) {
        const chainCombo = state.combinations[state.activeChainId];
        if (!chainCombo) {
          logger.warn('Active chain combination not found');
          return { ...state, currentScan: null };
        }

        const scan = state.currentScan;
        const newPosition = chainCombo.assetIds.length + 1;

        if (newPosition > MAX_COMBINATION_SIZE) {
          return { ...state, currentScan: null };
        }

        const combinationScan: CombinationScan = {
          type: 'combination',
          assetId: scan.assetId,
          assetNumber: scan.assetNumber,
          timestamp: scan.timestamp,
          combinationId: state.activeChainId,
          combinationPosition: newPosition,
          ...(scan.category && { category: scan.category }),
        };

        const newCombinations = {
          ...state.combinations,
          [state.activeChainId]: {
            ...chainCombo,
            assetIds: [...chainCombo.assetIds, scan.assetId],
            assetNumbers: [...chainCombo.assetNumbers, scan.assetNumber],
          },
        };

        logger.assetCount('Added item to chain', {
          chainId: state.activeChainId,
          assetNumber: scan.assetNumber,
          chainSize: newPosition,
        });

        const autoEnd = newPosition >= MAX_COMBINATION_SIZE;
        if (autoEnd) {
          logger.assetCount('Chain auto-ended at max size', {
            chainId: state.activeChainId,
          });
        }

        return {
          ...state,
          scans: [...state.scans, combinationScan],
          currentScan: null,
          combinations: newCombinations,
          activeChainId: autoEnd ? null : state.activeChainId,
        };
      }

      // No active chain: standalone
      return {
        ...state,
        scans: [...state.scans, state.currentScan],
        currentScan: null,
      };
    }

    case 'CANCEL_SCAN':
      logger.assetCount('Cancelling pending scan');
      return {
        ...state,
        currentScan: null,
      };

    case 'START_CHAIN': {
      // Guard: if chain already active, ignore
      if (state.activeChainId) {
        logger.assetCount('START_CHAIN ignored — chain already active');
        return state;
      }

      const chainId = generateUUID();
      logger.assetCount('Starting chain', { chainId });

      return {
        ...state,
        activeChainId: chainId,
        combinations: {
          ...state.combinations,
          [chainId]: {
            combinationId: chainId,
            assetIds: [],
            assetNumbers: [],
            notes: null,
            photoUri: null,
            photoId: null,
          },
        },
      };
    }

    case 'END_CHAIN': {
      if (!state.activeChainId) {
        logger.assetCount('END_CHAIN ignored — no active chain');
        return state;
      }

      const chainCombo = state.combinations[state.activeChainId];
      if (!chainCombo) {
        return { ...state, activeChainId: null };
      }

      const chainSize = chainCombo.assetIds.length;

      // 0 items: delete the empty combination
      if (chainSize === 0) {
        const newCombinations = { ...state.combinations };
        delete newCombinations[state.activeChainId];
        logger.assetCount('Empty chain discarded', { chainId: state.activeChainId });
        return {
          ...state,
          activeChainId: null,
          combinations: newCombinations,
        };
      }

      // 1 item: revert scan back to standalone, delete combination
      if (chainSize === 1) {
        const newCombinations = { ...state.combinations };
        delete newCombinations[state.activeChainId];

        const chainId = state.activeChainId;
        const revertedScans = state.scans.map(scan => {
          if (!isStandaloneScan(scan) && scan.combinationId === chainId) {
            return {
              type: 'standalone' as const,
              assetId: scan.assetId,
              assetNumber: scan.assetNumber,
              timestamp: scan.timestamp,
              ...(scan.category && { category: scan.category }),
            };
          }
          return scan;
        });

        logger.assetCount('Single-item chain reverted to standalone', { chainId });
        return {
          ...state,
          activeChainId: null,
          scans: revertedScans,
          combinations: newCombinations,
        };
      }

      // 2+ items: just deactivate the chain, combination stays
      logger.assetCount('Chain ended', {
        chainId: state.activeChainId,
        chainSize,
      });
      return {
        ...state,
        activeChainId: null,
      };
    }

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

    case 'UNDO_LAST_SCAN': {
      if (state.scans.length === 0) {
        logger.warn('No scans to undo');
        return state;
      }

      const lastScan = state.scans[state.scans.length - 1];
      const newScans = state.scans.slice(0, -1);

      // If the removed scan was part of a combination, we need to clean up
      if (lastScan && !isStandaloneScan(lastScan)) {
        const comboId = lastScan.combinationId;
        const combo = state.combinations[comboId];

        // If this combo is the active chain, remove from chain but keep chain active
        if (comboId === state.activeChainId && combo) {
          const newCombinations = {
            ...state.combinations,
            [comboId]: {
              ...combo,
              assetIds: combo.assetIds.filter(id => id !== lastScan.assetId),
              assetNumbers: combo.assetNumbers.filter(n => n !== lastScan.assetNumber),
            },
          };

          logger.assetCount('Undo last scan (removed from active chain)', {
            removedAsset: lastScan.assetNumber,
            chainId: comboId,
          });

          return {
            ...state,
            scans: newScans,
            combinations: newCombinations,
          };
        }

        if (combo && combo.assetIds.length <= 2) {
          // Combination only had 2 assets — removing one dissolves it.
          // Revert the other scan back to standalone.
          const newCombinations = { ...state.combinations };
          delete newCombinations[comboId];

          const revertedScans = newScans.map(scan => {
            if (!isStandaloneScan(scan) && scan.combinationId === comboId) {
              return {
                type: 'standalone' as const,
                assetId: scan.assetId,
                assetNumber: scan.assetNumber,
                timestamp: scan.timestamp,
                ...(scan.category && { category: scan.category }),
              };
            }
            return scan;
          });

          logger.assetCount('Undo last scan (dissolved combination)', {
            removedAsset: lastScan.assetNumber,
            combinationId: comboId,
          });

          return {
            ...state,
            scans: revertedScans,
            combinations: newCombinations,
          };
        } else if (combo) {
          // Combination has 3+ assets — just remove this asset from it
          const newCombinations = {
            ...state.combinations,
            [comboId]: {
              ...combo,
              assetIds: combo.assetIds.filter(id => id !== lastScan.assetId),
              assetNumbers: combo.assetNumbers.filter(n => n !== lastScan.assetNumber),
            },
          };

          logger.assetCount('Undo last scan (removed from combination)', {
            removedAsset: lastScan.assetNumber,
            combinationId: comboId,
          });

          return {
            ...state,
            scans: newScans,
            combinations: newCombinations,
          };
        }
      }

      logger.assetCount('Undo last scan (standalone)', {
        removedAsset: lastScan?.assetNumber,
      });

      return {
        ...state,
        scans: newScans,
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
      return {
        ...action.state,
        // Default activeChainId to null if missing from persisted data
        activeChainId: action.state.activeChainId ?? null,
      };

    default:
      return state;
  }
}
