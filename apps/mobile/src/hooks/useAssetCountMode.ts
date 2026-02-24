import { useReducer, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

/**
 * A single asset scan within a count session
 */
export interface AssetScan {
  assetId: string;
  assetNumber: string;
  timestamp: number;
  /** UUID grouping linked assets (e.g., trailer + dolly) */
  combinationId?: string;
  /** Position in the combination chain (1-based) */
  combinationPosition?: number;
}

/**
 * State for an Asset Count session
 */
interface AssetCountState {
  /** Whether a count session is currently active */
  isActive: boolean;
  /** The depot being counted */
  depotId: string | null;
  /** Human-readable depot name */
  depotName: string | null;
  /** All confirmed scans in this session */
  scans: AssetScan[];
  /** Current pending scan awaiting confirmation */
  currentScan: AssetScan | null;
}

type Action =
  | { type: 'START_COUNT'; depotId: string; depotName: string }
  | { type: 'ADD_SCAN'; scan: AssetScan }
  | { type: 'CONFIRM_SCAN' }
  | { type: 'CANCEL_SCAN' }
  | { type: 'END_COUNT' }
  | { type: 'RESTORE'; state: AssetCountState };

const STORAGE_KEY = '@rgr/asset_count_session';

const initialState: AssetCountState = {
  isActive: false,
  depotId: null,
  depotName: null,
  scans: [],
  currentScan: null,
};

function reducer(state: AssetCountState, action: Action): AssetCountState {
  switch (action.type) {
    case 'START_COUNT':
      logger.assetCount('Starting count session', {
        depotId: action.depotId,
        depotName: action.depotName,
      });
      return {
        isActive: true,
        depotId: action.depotId,
        depotName: action.depotName,
        scans: [],
        currentScan: null,
      };

    case 'ADD_SCAN':
      logger.assetCount('Adding scan to pending', {
        assetNumber: action.scan.assetNumber,
      });
      return {
        ...state,
        currentScan: action.scan,
      };

    case 'CONFIRM_SCAN':
      if (!state.currentScan) {
        logger.warn('Attempted to confirm scan with no pending scan');
        return state;
      }
      logger.assetCount('Confirming scan', {
        assetNumber: state.currentScan.assetNumber,
        totalScans: state.scans.length + 1,
      });
      return {
        ...state,
        scans: [...state.scans, state.currentScan],
        currentScan: null,
      };

    case 'CANCEL_SCAN':
      logger.assetCount('Cancelling pending scan');
      return {
        ...state,
        currentScan: null,
      };

    case 'END_COUNT':
      logger.assetCount('Ending count session', {
        totalScans: state.scans.length,
      });
      return initialState;

    case 'RESTORE':
      logger.assetCount('Restoring session from storage', {
        scans: action.state.scans.length,
        depotName: action.state.depotName,
      });
      return action.state;

    default:
      return state;
  }
}

/**
 * Hook for managing Asset Count mode with AsyncStorage persistence.
 *
 * Asset Count mode allows managers to perform depot inventory counts by
 * scanning assets. The session persists across app restarts.
 *
 * @example
 * ```tsx
 * const {
 *   isActive,
 *   scans,
 *   startCount,
 *   addScan,
 *   confirmScan,
 *   endCount,
 * } = useAssetCountMode();
 *
 * // Start a count session
 * startCount('depot-uuid', 'Perth Depot');
 *
 * // Add a scan (pending confirmation)
 * addScan({ assetId: '...', assetNumber: 'TL001', timestamp: Date.now() });
 *
 * // Confirm the scan
 * confirmScan();
 *
 * // End session and submit
 * endCount();
 * ```
 */
export function useAssetCountMode() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Persist to AsyncStorage after state changes (only when active)
  useEffect(() => {
    const persist = async () => {
      try {
        if (state.isActive) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        logger.error('Failed to persist asset count session', error);
      }
    };
    persist();
  }, [state]);

  // Restore from AsyncStorage on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as AssetCountState;
          // Validate the restored state has required fields
          if (parsed.isActive && parsed.depotId && parsed.depotName) {
            dispatch({ type: 'RESTORE', state: parsed });
          }
        }
      } catch (error) {
        logger.error('Failed to restore asset count session', error);
      }
    };
    restore();
  }, []);

  const startCount = useCallback((depotId: string, depotName: string) => {
    dispatch({ type: 'START_COUNT', depotId, depotName });
  }, []);

  const addScan = useCallback((scan: AssetScan) => {
    dispatch({ type: 'ADD_SCAN', scan });
  }, []);

  const confirmScan = useCallback(() => {
    dispatch({ type: 'CONFIRM_SCAN' });
  }, []);

  const cancelScan = useCallback(() => {
    dispatch({ type: 'CANCEL_SCAN' });
  }, []);

  const endCount = useCallback(() => {
    dispatch({ type: 'END_COUNT' });
  }, []);

  return {
    // State
    isActive: state.isActive,
    depotId: state.depotId,
    depotName: state.depotName,
    scans: state.scans,
    currentScan: state.currentScan,
    scanCount: state.scans.length,

    // Actions
    startCount,
    addScan,
    confirmScan,
    cancelScan,
    endCount,
  };
}
