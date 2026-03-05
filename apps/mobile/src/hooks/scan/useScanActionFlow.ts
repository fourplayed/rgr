import { useReducer, useCallback, useRef, useState, useMemo } from 'react';
import { useAssetScanContext } from '../useAssetData';
import { useLocation } from '../useLocation';
import { useQRScanner } from '../useQRScanner';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import type { CachedLocationData } from '../../store/locationStore';
import type { Asset, Depot } from '@rgr/shared';
import type { BarcodeScanningResult } from 'expo-camera';
import { useScanProcessing } from './useScanProcessing';
import { useDefectSubmission } from './useDefectSubmission';
import { useSheetLifecycle } from './useSheetLifecycle';

// ── Types ────────────────────────────────────────────────────────────────────

export type MatchedDepot = { depot: Depot; distanceKm: number };

export type SheetId =
  | 'camera'
  | 'defect'
  | 'createTask'
  | null;

export type ScanFlowState =
  | { phase: 'idle' }
  | { phase: 'scanning'; scanStatus: string }
  | {
      phase: 'confirming';
      scannedAsset: Asset;
      matchedDepot: MatchedDepot | null;
      effectiveLocation: CachedLocationData;
      isCreatingScan: boolean;
    }
  | {
      phase: 'active';
      scannedAsset: Asset;
      matchedDepot: MatchedDepot | null;
      effectiveLocation: CachedLocationData;
      lastScanEventId: string;
      photoCompleted: boolean;
      defectCompleted: boolean;
      activeSheet: SheetId;
      pendingSheet: SheetId;
      selectedItemId: string | null;
    }

export interface AlertSheetState {
  visible: boolean;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// ── Reducer ──────────────────────────────────────────────────────────────────

export type ScanFlowAction =
  | { type: 'QR_DETECTED'; scanStatus: string }
  | { type: 'UPDATE_SCAN_STATUS'; scanStatus: string }
  | {
      type: 'ASSET_FOUND';
      scannedAsset: Asset;
      matchedDepot: MatchedDepot | null;
      effectiveLocation: CachedLocationData;
    }
  | {
      type: 'SCAN_CREATED';
      lastScanEventId: string;
    }
  | { type: 'OPEN_SHEET'; sheet: SheetId; selectedItemId?: string }
  | { type: 'CLOSE_SHEET'; pendingSheet?: SheetId }
  | { type: 'RESOLVE_PENDING' }
  | { type: 'MARK_PHOTO_COMPLETED' }
  | { type: 'MARK_DEFECT_COMPLETED' }
  | { type: 'RESET' };

function reducer(state: ScanFlowState, action: ScanFlowAction): ScanFlowState {
  switch (action.type) {
    case 'QR_DETECTED':
      if (state.phase !== 'idle') return state;
      return { phase: 'scanning', scanStatus: action.scanStatus };

    case 'UPDATE_SCAN_STATUS':
      if (state.phase !== 'scanning') return state;
      return { ...state, scanStatus: action.scanStatus };

    case 'ASSET_FOUND':
      if (state.phase !== 'scanning') return state;
      return {
        phase: 'confirming',
        scannedAsset: action.scannedAsset,
        matchedDepot: action.matchedDepot,
        effectiveLocation: action.effectiveLocation,
        isCreatingScan: true,
      };

    case 'SCAN_CREATED':
      if (state.phase !== 'confirming') return state;
      return {
        phase: 'active',
        scannedAsset: state.scannedAsset,
        matchedDepot: state.matchedDepot,
        effectiveLocation: state.effectiveLocation,
        lastScanEventId: action.lastScanEventId,
        photoCompleted: false,
        defectCompleted: false,
        activeSheet: null,
        pendingSheet: null,
        selectedItemId: null,
      };

    case 'OPEN_SHEET': {
      if (state.phase !== 'active') return state;
      if (state.activeSheet !== null) {
        // Queue this sheet to open after the current one closes
        return {
          ...state,
          pendingSheet: action.sheet,
          selectedItemId: action.selectedItemId ?? state.selectedItemId,
        };
      }
      return {
        ...state,
        activeSheet: action.sheet,
        selectedItemId: action.selectedItemId ?? null,
      };
    }

    case 'CLOSE_SHEET':
      if (state.phase !== 'active') return state;
      return {
        ...state,
        activeSheet: null,
        pendingSheet: action.pendingSheet ?? state.pendingSheet,
      };

    case 'RESOLVE_PENDING':
      if (state.phase !== 'active' || !state.pendingSheet) return state;
      return {
        ...state,
        activeSheet: state.pendingSheet,
        pendingSheet: null,
      };

    case 'MARK_PHOTO_COMPLETED':
      if (state.phase !== 'active') return state;
      return { ...state, photoCompleted: true };

    case 'MARK_DEFECT_COMPLETED':
      if (state.phase !== 'active') return state;
      return { ...state, defectCompleted: true };

    case 'RESET':
      return { phase: 'idle' };

    default:
      return state;
  }
}

// ── Return type ──────────────────────────────────────────────────────────────

interface UseScanActionFlowReturn {
  state: ScanFlowState;
  scannedAsset: Asset | null;
  matchedDepot: MatchedDepot | null;
  effectiveLocation: CachedLocationData | null;
  lastScanEventId: string | null;
  activeSheet: SheetId;
  isCreatingScan: boolean;
  scanStatus: string | null;
  showCard: boolean;
  buttonsDisabled: boolean;
  photoCompleted: boolean;
  defectCompleted: boolean;
  handleBarCodeScanned: (result: BarcodeScanningResult) => void;
  handlePhotoPress: () => void;
  handleDefectPress: () => void;
  handleTaskPress: () => void;
  handleDonePress: () => void;
  handleUndoPress: () => void;
  isDeletingScan: boolean;
  handleSheetDismiss: () => void;
  handleCloseSheet: (pendingSheet?: SheetId) => void;
  handleCameraClose: () => void;
  handlePhotoUploaded: () => void;
  handleDefectSubmit: (notes: string, wantsPhoto: boolean) => void;
  handleDefectCancel: () => void;
  isSubmittingDefect: boolean;
  scanContext: unknown;
  isContextLoading: boolean;
  contextError: Error | null;
  refetchContext: () => void;
  alertSheet: AlertSheetState;
  setAlertSheet: React.Dispatch<React.SetStateAction<AlertSheetState>>;
  hasLocationPermission: boolean;
  requestLocationPermission: () => Promise<boolean>;
  resolvedDepot: MatchedDepot | null;
  addDebugLog: (msg: string) => void;
  triggerDebugScan: () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseScanActionFlowOptions {
  canMarkMaintenance: boolean;
}

export function useScanActionFlow({ canMarkMaintenance }: UseScanActionFlowOptions) {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' });
  const user = useAuthStore(s => s.user);
  const cachedDepot = useLocationStore(s => s.resolvedDepot);
  const {
    hasPermission: hasLocationPermission,
    requestPermission: requestLocationPermission,
  } = useLocation();

  // ── Alert sheet ──
  const [alertSheet, setAlertSheet] = useState<AlertSheetState>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  // ── Debug logging ──
  const debugLogRef = useRef<string[]>([]);
  const addDebugLog = useCallback((msg: string) => {
    const log = debugLogRef.current;
    if (log.length >= 10) log.shift();
    log.push(`${new Date().toLocaleTimeString()}: ${msg}`);
  }, []);

  // Ref to break circular dep: processScan needs resetScanner, but
  // resetScanner comes from useQRScanner which takes processScan.
  const resetScannerRef = useRef<() => void>(() => {});

  // ── Sub-hooks ──
  const scanProcessing = useScanProcessing(dispatch, {
    user,
    setAlertSheet,
    addDebugLog,
    resetScannerRef,
  });

  const defectSubmission = useDefectSubmission(dispatch, {
    user,
    setAlertSheet,
    addDebugLog,
  });

  const sheetLifecycle = useSheetLifecycle(dispatch);

  // ── QR Scanner ──
  const { handleBarCodeScanned, resetScanner } = useQRScanner(scanProcessing.processScan);
  resetScannerRef.current = resetScanner;

  // ── Action handlers (depend on resetScanner) ──
  const handleTaskPress = useCallback(() => {
    dispatch({ type: 'OPEN_SHEET', sheet: 'createTask' });
  }, []);

  const handleDonePress = useCallback(() => {
    dispatch({ type: 'RESET' });
    resetScanner();
  }, [resetScanner]);

  // Wrap undo to extract narrow state slices
  const handleUndoPress = useCallback(() => {
    if (state.phase !== 'active') return;
    scanProcessing.handleUndoPress(
      state.lastScanEventId,
      state.scannedAsset.id,
      resetScanner,
    );
  }, [state, scanProcessing, resetScanner]);

  // Wrap triggerDebugScan to pass resetScanner
  const triggerDebugScan = useCallback(() => {
    scanProcessing.triggerDebugScan(resetScanner);
  }, [scanProcessing, resetScanner]);

  // Wrap handleDefectSubmit to extract narrow state slices
  const handleDefectSubmit = useCallback(
    (notes: string, wantsPhoto: boolean) => {
      if (state.phase !== 'active') return;
      defectSubmission.handleDefectSubmit(
        notes,
        wantsPhoto,
        state.scannedAsset.id,
        state.lastScanEventId,
      );
    },
    [state, defectSubmission],
  );

  // ── Scan context query (mechanic only) ──
  const scanContextAssetId =
    canMarkMaintenance &&
    (state.phase === 'confirming' || state.phase === 'active')
      ? state.scannedAsset.id
      : undefined;

  const scanContextQuery = useAssetScanContext(scanContextAssetId);

  // ── Derived convenience getters (memoized to avoid recomputation) ──
  const scannedAsset = useMemo(
    () => (state.phase === 'confirming' || state.phase === 'active') ? state.scannedAsset : null,
    [state],
  );

  const matchedDepot = useMemo(
    () => (state.phase === 'confirming' || state.phase === 'active') ? state.matchedDepot : null,
    [state],
  );

  const effectiveLocation = useMemo(
    () => (state.phase === 'confirming' || state.phase === 'active') ? state.effectiveLocation : null,
    [state],
  );

  const lastScanEventId = useMemo(
    () => state.phase === 'active' ? state.lastScanEventId : null,
    [state],
  );

  const activeSheet = useMemo(
    () => state.phase === 'active' ? state.activeSheet : null,
    [state],
  );

  const isCreatingScan = useMemo(
    () => state.phase === 'confirming',
    [state.phase],
  );

  const scanStatus = useMemo(
    () => state.phase === 'scanning' ? state.scanStatus : null,
    [state],
  );

  const showCard = useMemo(
    () => state.phase === 'confirming' || state.phase === 'active',
    [state.phase],
  );

  const buttonsDisabled = useMemo(
    () => state.phase !== 'active',
    [state.phase],
  );

  const photoCompleted = useMemo(
    () => state.phase === 'active' ? state.photoCompleted : false,
    [state],
  );

  const defectCompleted = useMemo(
    () => state.phase === 'active' ? state.defectCompleted : false,
    [state],
  );

  return {
    // State
    state,
    scannedAsset,
    matchedDepot,
    effectiveLocation,
    lastScanEventId,
    activeSheet,
    isCreatingScan,
    scanStatus,
    showCard,
    buttonsDisabled,
    photoCompleted,
    defectCompleted,

    // QR scanner
    handleBarCodeScanned,

    // Action handlers
    handlePhotoPress: sheetLifecycle.handlePhotoPress,
    handleDefectPress: defectSubmission.handleDefectPress,
    handleTaskPress,
    handleDonePress,

    // Undo
    handleUndoPress,
    isDeletingScan: scanProcessing.isDeletingScan,

    // Sheet lifecycle
    handleSheetDismiss: sheetLifecycle.handleSheetDismiss,
    handleCloseSheet: sheetLifecycle.handleCloseSheet,

    // Camera
    handleCameraClose: sheetLifecycle.handleCameraClose,
    handlePhotoUploaded: sheetLifecycle.handlePhotoUploaded,

    // Defect
    handleDefectSubmit,
    handleDefectCancel: defectSubmission.handleDefectCancel,
    isSubmittingDefect: defectSubmission.isSubmittingDefect,

    // Scan context (mechanic)
    scanContext: scanContextQuery.data ?? null,
    isContextLoading: scanContextQuery.isLoading,
    contextError: scanContextQuery.error,
    refetchContext: scanContextQuery.refetch,

    // Alert
    alertSheet,
    setAlertSheet,

    // Location
    hasLocationPermission,
    requestLocationPermission,

    // Pre-resolved depot (for overlay badges)
    resolvedDepot: cachedDepot,

    // Debug
    addDebugLog,
    triggerDebugScan,
  } satisfies UseScanActionFlowReturn;
}
