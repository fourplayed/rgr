import { useReducer, useCallback, useEffect, useRef, useMemo } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import type {
  AssetScan,
  StandaloneScan,
  CombinationScan,
  CombinationGroup,
} from '@rgr/shared';
import { isValidAssetCountState } from '@rgr/shared';
import { reducer, initialState, STORAGE_KEY, DEBOUNCE_MS } from './assetCountModeReducer';

// Re-export types for consumers
export type { AssetScan, StandaloneScan, CombinationScan, CombinationGroup };

/**
 * Hook for managing Asset Count mode with AsyncStorage persistence.
 *
 * Asset Count mode allows managers to perform depot inventory counts by
 * scanning assets. Supports chain mode for linking assets into combinations
 * with mandatory photos and notes. The session persists across app restarts.
 */
export function useAssetCountMode() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Debounce timer ref for persistence
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard to skip redundant persistence write immediately after a RESTORE dispatch
  const isRestoredRef = useRef(false);
  // When true, persistence writes are deferred (e.g. while undo window is open)
  const persistDeferredRef = useRef(false);
  // Always-current state ref for AppState background flush
  const stateRef = useRef(state);
  stateRef.current = state;

  /** Pause debounced persistence writes (e.g. while undo toast is visible). */
  const deferPersistence = useCallback(() => {
    persistDeferredRef.current = true;
    // Cancel any pending write so it doesn't fire during the undo window
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = null;
    }
  }, []);

  /** Resume and flush persistence (e.g. when undo window closes without undo). */
  const flushPersistence = useCallback(() => {
    persistDeferredRef.current = false;
    const current = stateRef.current;
    // Flush immediately — the undo window is over
    if (current.isActive) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch((error) => {
        logger.error('Failed to flush asset count session', error);
      });
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    }
  }, []);

  // Persist to AsyncStorage after state changes (debounced)
  useEffect(() => {
    // Skip writing state back right after a RESTORE — it's already in storage
    if (isRestoredRef.current) {
      isRestoredRef.current = false;
      return;
    }

    // Don't schedule writes while persistence is deferred (undo window open)
    if (persistDeferredRef.current) {
      return;
    }

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

  // Flush pending state to AsyncStorage when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' && persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
        const current = stateRef.current;
        if (current.isActive) {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current)).catch(() => {});
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Restore from AsyncStorage on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          // Validate schema before restoring to prevent crashes from corrupted data
          if (isValidAssetCountState(parsed) && parsed.isActive && parsed.depotId && parsed.depotName) {
            isRestoredRef.current = true;
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

  const startChain = useCallback(() => {
    dispatch({ type: 'START_CHAIN' });
  }, []);

  const endChain = useCallback(() => {
    dispatch({ type: 'END_CHAIN' });
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

  // Chain mode computed values
  const isChainActive = state.activeChainId !== null;
  const activeChainId = state.activeChainId;

  const activeChain: CombinationGroup | null = useMemo(() => {
    if (!state.activeChainId) return null;
    return state.combinations[state.activeChainId] ?? null;
  }, [state.activeChainId, state.combinations]);

  const activeChainSize = activeChain?.assetIds.length ?? 0;

  // Count standalone vs combination scans
  const standaloneCount = state.scans.filter(s => s.type === 'standalone').length;
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

    // Chain mode
    isChainActive,
    activeChainId,
    activeChain,
    activeChainSize,

    // Computed
    standaloneCount,
    combinationCount,

    // Actions
    startCount,
    setSessionId,
    addScan,
    confirmScan,
    cancelScan,
    startChain,
    endChain,
    setCombinationNotes,
    setCombinationPhoto,
    undoLastScan,
    endCount,

    // Persistence control (for undo window sync)
    deferPersistence,
    flushPersistence,
  };
}
