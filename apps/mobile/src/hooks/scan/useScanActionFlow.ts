import { useReducer, useCallback, useRef, useState } from 'react';
import type { AssetScanContext } from '@rgr/shared';
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
      pendingUndo?: boolean;
    }
  | {
      phase: 'active';
      scannedAsset: Asset;
      matchedDepot: MatchedDepot | null;
      effectiveLocation: CachedLocationData;
      lastScanEventId: string;
      photoCompleted: boolean;
      defectCompleted: boolean;
      maintenanceCompleted: boolean;
      activeSheet: SheetId;
      pendingSheet: SheetId;
      selectedItemId: string | null;
    }

export interface AlertSheetState {
  visible: boolean;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
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
  | { type: 'MARK_MAINTENANCE_COMPLETED' }
  | { type: 'INVALID_QR' }
  | { type: 'CLEAR_INVALID_STATUS' }
  | { type: 'REQUEST_UNDO' }
  | { type: 'RESET' };

function reducer(state: ScanFlowState, action: ScanFlowAction): ScanFlowState {
  switch (action.type) {
    case 'QR_DETECTED':
      if (state.phase !== 'idle' && state.phase !== 'scanning') return state;
      return { phase: 'scanning', scanStatus: action.scanStatus };

    case 'INVALID_QR':
      return { phase: 'scanning', scanStatus: 'Not a valid asset code' };

    case 'CLEAR_INVALID_STATUS':
      if (state.phase !== 'scanning') return state;
      return { phase: 'idle' };

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
      // If undo was queued during confirming, go straight to idle
      if (state.pendingUndo) {
        return { phase: 'idle' };
      }
      return {
        phase: 'active',
        scannedAsset: state.scannedAsset,
        matchedDepot: state.matchedDepot,
        effectiveLocation: state.effectiveLocation,
        lastScanEventId: action.lastScanEventId,
        photoCompleted: false,
        defectCompleted: false,
        maintenanceCompleted: false,
        activeSheet: null,
        pendingSheet: null,
        selectedItemId: null,
      };

    case 'REQUEST_UNDO':
      if (state.phase === 'confirming') {
        return { ...state, pendingUndo: true };
      }
      return state;

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

    case 'MARK_MAINTENANCE_COMPLETED':
      if (state.phase !== 'active') return state;
      return { ...state, maintenanceCompleted: true };

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
  pendingSheet: SheetId;
  isCreatingScan: boolean;
  scanStatus: string | null;
  showCard: boolean;
  buttonsDisabled: boolean;
  photoCompleted: boolean;
  defectCompleted: boolean;
  maintenanceCompleted: boolean;
  handleBarCodeScanned: (result: BarcodeScanningResult) => void;
  handlePhotoPress: () => void;
  handleDefectPress: () => void;
  handleTaskPress: () => void;
  markMaintenanceCompleted: () => void;
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
  scanContext: AssetScanContext | null;
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
  confirmedActionRef: React.MutableRefObject<import('../../components/scanner/ScanConfirmation').ConfirmAction>;
}

export function useScanActionFlow({ canMarkMaintenance, confirmedActionRef }: UseScanActionFlowOptions) {
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
    confirmedActionRef,
    setAlertSheet,
    addDebugLog,
  });

  const sheetLifecycle = useSheetLifecycle(dispatch);

  // ── Invalid QR callback ──
  const handleInvalidQR = useCallback(() => {
    dispatch({ type: 'INVALID_QR' });
    setTimeout(() => dispatch({ type: 'CLEAR_INVALID_STATUS' }), 2000);
  }, [dispatch]);

  // ── QR Scanner ──
  const { handleBarCodeScanned, resetScanner } = useQRScanner(
    scanProcessing.processScan,
    2000,
    handleInvalidQR,
  );
  resetScannerRef.current = resetScanner;

  // ── Action handlers (depend on resetScanner) ──
  const handleTaskPress = useCallback(() => {
    dispatch({ type: 'OPEN_SHEET', sheet: 'createTask' });
  }, []);

  const markMaintenanceCompleted = useCallback(() => {
    dispatch({ type: 'MARK_MAINTENANCE_COMPLETED' });
  }, [dispatch]);

  const handleDonePress = useCallback(() => {
    dispatch({ type: 'RESET' });
    resetScanner();
  }, [resetScanner]);

  // Wrap undo to extract narrow state slices — supports queued undo during confirming
  const handleUndoPress = useCallback(() => {
    if (state.phase === 'confirming') {
      dispatch({ type: 'REQUEST_UNDO' });
      return;
    }
    if (state.phase !== 'active') return;
    scanProcessing.handleUndoPress(
      state.lastScanEventId,
      state.scannedAsset.id,
      resetScanner,
    );
  }, [state, scanProcessing, resetScanner, dispatch]);

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

  // ── Derived convenience getters ──
  // Plain property accesses — cheaper than useMemo overhead since state is
  // a new object on every dispatch (memo with [state] never caches).
  const scannedAsset = (state.phase === 'confirming' || state.phase === 'active') ? state.scannedAsset : null;
  const matchedDepot = (state.phase === 'confirming' || state.phase === 'active') ? state.matchedDepot : null;
  const effectiveLocation = (state.phase === 'confirming' || state.phase === 'active') ? state.effectiveLocation : null;
  const lastScanEventId = state.phase === 'active' ? state.lastScanEventId : null;
  const activeSheet = state.phase === 'active' ? state.activeSheet : null;
  const pendingSheet = state.phase === 'active' ? state.pendingSheet : null;
  const isCreatingScan = state.phase === 'confirming';
  const scanStatus = state.phase === 'scanning' ? state.scanStatus : null;
  const showCard = state.phase === 'confirming' || state.phase === 'active';
  const buttonsDisabled = state.phase !== 'active';
  const photoCompleted = state.phase === 'active' ? state.photoCompleted : false;
  const defectCompleted = state.phase === 'active' ? state.defectCompleted : false;
  const maintenanceCompleted = state.phase === 'active' ? state.maintenanceCompleted : false;

  return {
    // State
    state,
    scannedAsset,
    matchedDepot,
    effectiveLocation,
    lastScanEventId,
    activeSheet,
    pendingSheet,
    isCreatingScan,
    scanStatus,
    showCard,
    buttonsDisabled,
    photoCompleted,
    defectCompleted,
    maintenanceCompleted,

    // QR scanner
    handleBarCodeScanned,

    // Action handlers
    handlePhotoPress: sheetLifecycle.handlePhotoPress,
    handleDefectPress: defectSubmission.handleDefectPress,
    handleTaskPress,
    markMaintenanceCompleted,
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
