import { useReducer, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import type {
  AssetScan,
  StandaloneScan,
  CombinationScan,
  CombinationGroup,
} from '@rgr/shared';
import { isValidAssetCountState, isStandaloneScan } from '@rgr/shared';
import { reducer, initialState, STORAGE_KEY, DEBOUNCE_MS } from './assetCountModeReducer';

// Re-export types for consumers
export type { AssetScan, StandaloneScan, CombinationScan, CombinationGroup };

/**
 * Hook for managing Asset Count mode with AsyncStorage persistence.
 *
 * Asset Count mode allows managers to perform depot inventory counts by
 * scanning assets. Supports linking assets into combinations with photos
 * and notes. The session persists across app restarts.
 *
 * @example
 * ```tsx
 * const {
 *   isActive,
 *   scans,
 *   combinations,
 *   startCount,
 *   addScan,
 *   confirmScan,
 *   linkToPrevious,
 *   keepSeparate,
 *   endCount,
 * } = useAssetCountMode();
 *
 * // Start a count session
 * startCount('depot-uuid', 'Perth Depot');
 *
 * // Add a scan (pending confirmation)
 * addScan({ type: 'standalone', assetId: '...', assetNumber: 'TL001', timestamp: Date.now() });
 *
 * // Confirm the scan
 * confirmScan();
 *
 * // Link to previous if desired
 * if (hasUnlinkedPrevious) {
 *   linkToPrevious(); // Creates/extends combination
 * }
 *
 * // End session and submit
 * endCount();
 * ```
 */
export function useAssetCountMode() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Debounce timer ref for persistence
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist to AsyncStorage after state changes (debounced)
  useEffect(() => {
    // Clear any pending timeout
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }

    // Debounce persistence to prevent rapid writes during combo flow
    persistTimeoutRef.current = setTimeout(async () => {
      try {
        if (state.isActive) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        logger.error('Failed to persist asset count session', error);
      }
    }, DEBOUNCE_MS);

    // Cleanup on unmount
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [state]);

  // Restore from AsyncStorage on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          // Validate schema before restoring to prevent crashes from corrupted data
          if (isValidAssetCountState(parsed) && parsed.isActive && parsed.depotId && parsed.depotName) {
            dispatch({ type: 'RESTORE', state: parsed });
          } else if (parsed !== null) {
            // Clear invalid data
            logger.warn('Invalid asset count session data in storage, clearing');
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (error) {
        logger.error('Failed to restore asset count session', error);
        // Clear corrupted data on parse error
        AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      }
    };
    restore();
  }, []);

  const startCount = useCallback((depotId: string, depotName: string) => {
    dispatch({ type: 'START_COUNT', depotId, depotName });
  }, []);

  const setSessionId = useCallback((sessionId: string) => {
    dispatch({ type: 'SET_SESSION_ID', sessionId });
  }, []);

  const addScan = useCallback((scan: StandaloneScan) => {
    dispatch({ type: 'ADD_SCAN', scan });
  }, []);

  const confirmScan = useCallback(() => {
    dispatch({ type: 'CONFIRM_SCAN' });
  }, []);

  const cancelScan = useCallback(() => {
    dispatch({ type: 'CANCEL_SCAN' });
  }, []);

  const linkToPrevious = useCallback(() => {
    dispatch({ type: 'LINK_TO_PREVIOUS' });
  }, []);

  const keepSeparate = useCallback(() => {
    dispatch({ type: 'KEEP_SEPARATE' });
  }, []);

  const setCombinationNotes = useCallback((combinationId: string, notes: string) => {
    dispatch({ type: 'SET_COMBINATION_NOTES', combinationId, notes });
  }, []);

  const setCombinationPhoto = useCallback((combinationId: string, photoUri: string, photoId: string | null = null) => {
    dispatch({ type: 'SET_COMBINATION_PHOTO', combinationId, photoUri, photoId });
  }, []);

  const undoLastScan = useCallback(() => {
    dispatch({ type: 'UNDO_LAST_SCAN' });
  }, []);

  const endCount = useCallback(() => {
    dispatch({ type: 'END_COUNT' });
  }, []);

  // Computed: Can we offer to link the current scan to a previous one?
  // Must have at least 2 scans, and the previous one must exist
  const canLinkToPrevious = state.scans.length >= 2 && state.lastUnlinkedScanIndex !== null;

  // Get the previous scan info for display in link sheet
  const previousScanForLink = canLinkToPrevious && state.lastUnlinkedScanIndex !== null
    ? state.scans[state.lastUnlinkedScanIndex]
    : null;

  // Get the most recently created/extended combination (for photo capture after linking)
  const getLastCombinationId = useCallback((): string | null => {
    const lastScan = state.scans[state.scans.length - 1];
    if (lastScan && !isStandaloneScan(lastScan)) {
      return lastScan.combinationId;
    }
    return null;
  }, [state.scans]);

  // Count standalone vs combination scans
  const standaloneCount = state.scans.filter(isStandaloneScan).length;
  const combinationCount = Object.keys(state.combinations).length;

  return {
    // State
    isActive: state.isActive,
    sessionId: state.sessionId,
    depotId: state.depotId,
    depotName: state.depotName,
    scans: state.scans,
    currentScan: state.currentScan,
    combinations: state.combinations,
    scanCount: state.scans.length,

    // Computed
    canLinkToPrevious,
    previousScanForLink,
    standaloneCount,
    combinationCount,

    // Actions
    startCount,
    setSessionId,
    addScan,
    confirmScan,
    cancelScan,
    linkToPrevious,
    keepSeparate,
    setCombinationNotes,
    setCombinationPhoto,
    undoLastScan,
    endCount,
    getLastCombinationId,
  };
}
