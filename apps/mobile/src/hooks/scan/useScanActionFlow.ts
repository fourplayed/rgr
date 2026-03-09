import { useReducer, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import type { AssetScanContext, PhotoType } from '@rgr/shared';
import { useAssetScanContext } from '../useAssetData';
import { useLocation } from '../useLocation';
import { useQRScanner } from '../useQRScanner';
import { useDepots } from '../useDepots';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import type { CachedLocationData } from '../../store/locationStore';
import type { Asset } from '@rgr/shared';
import type { BarcodeScanningResult } from 'expo-camera';
import { useScanProcessing } from './useScanProcessing';
import { useDefectSubmission } from './useDefectSubmission';
import { useSheetLifecycle } from './useSheetLifecycle';
import { scanFlowReducer, initialScanFlowState } from './scanFlowReducer';
import type { ScanFlowState, MatchedDepot, SheetId } from './scanFlowReducer';

// Re-export types for consumers
export type { ScanFlowState, ScanFlowAction, MatchedDepot, SheetId } from './scanFlowReducer';

export interface AlertSheetState {
  visible: boolean;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
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
  activePhotoType: PhotoType;
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
  handlePhotoCaptured: () => void;
  handleReviewConfirmed: () => void;
  handleReviewRetake: () => void;
  handleReviewClose: () => void;
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
  confirmedActionRef: React.MutableRefObject<
    import('../../components/scanner/ScanConfirmation').ConfirmAction
  >;
}

export function useScanActionFlow({
  canMarkMaintenance,
  confirmedActionRef,
}: UseScanActionFlowOptions) {
  const [state, dispatch] = useReducer(scanFlowReducer, initialScanFlowState);
  const user = useAuthStore((s) => s.user);
  const cachedDepot = useLocationStore((s) => s.resolvedDepot);
  const ensureFresh = useLocationStore((s) => s.ensureFresh);
  const depotsData = useDepots().data;
  const depots = useMemo(() => depotsData ?? [], [depotsData]);
  const { hasPermission: hasLocationPermission, requestPermission: requestLocationPermission } =
    useLocation();

  // ── Proactively refresh location when scan tab mounts ──
  useEffect(() => {
    if (depots.length > 0) ensureFresh(depots);
  }, [depots, ensureFresh]);

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

  const sheetLifecycle = useSheetLifecycle(dispatch, confirmedActionRef);

  // ── Invalid QR callback ──
  const invalidQRTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInvalidQR = useCallback(() => {
    dispatch({ type: 'INVALID_QR' });
    if (invalidQRTimerRef.current) clearTimeout(invalidQRTimerRef.current);
    invalidQRTimerRef.current = setTimeout(() => {
      invalidQRTimerRef.current = null;
      dispatch({ type: 'CLEAR_INVALID_STATUS' });
    }, 2000);
  }, [dispatch]);

  // Cleanup invalid QR timer on unmount
  useEffect(() => {
    return () => {
      if (invalidQRTimerRef.current) {
        clearTimeout(invalidQRTimerRef.current);
        invalidQRTimerRef.current = null;
      }
    };
  }, []);

  // ── QR Scanner ──
  const { handleBarCodeScanned, resetScanner } = useQRScanner(
    scanProcessing.processScan,
    2000,
    handleInvalidQR
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

  // Track latest active-phase IDs via ref to prevent stale closure in undo handler.
  // Without this, a rapid state transition between press and async execution could
  // cause the undo to reference an outdated scan event ID.
  const undoIdsRef = useRef<{ scanEventId: string; assetId: string } | null>(null);
  if (state.phase === 'active') {
    undoIdsRef.current = { scanEventId: state.lastScanEventId, assetId: state.scannedAsset.id };
  } else if (state.phase === 'idle') {
    undoIdsRef.current = null;
  }

  // Wrap undo to extract narrow state slices — supports queued undo during confirming
  const handleUndoPress = useCallback(() => {
    if (state.phase === 'confirming') {
      dispatch({ type: 'REQUEST_UNDO' });
      return;
    }
    if (state.phase !== 'active') return;
    const ids = undoIdsRef.current;
    if (!ids) return;
    scanProcessing.handleUndoPress(ids.scanEventId, ids.assetId, resetScanner);
  }, [state.phase, scanProcessing, resetScanner, dispatch]);

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
        state.lastScanEventId
      );
    },
    [state, defectSubmission]
  );

  // ── Scan context query (mechanic only) ──
  const scanContextAssetId =
    canMarkMaintenance && (state.phase === 'confirming' || state.phase === 'active')
      ? state.scannedAsset.id
      : undefined;

  const scanContextQuery = useAssetScanContext(scanContextAssetId);

  // ── Derived convenience getters ──
  // Plain property accesses — cheaper than useMemo overhead since state is
  // a new object on every dispatch (memo with [state] never caches).
  const scannedAsset =
    state.phase === 'confirming' || state.phase === 'active' ? state.scannedAsset : null;
  const matchedDepot =
    state.phase === 'confirming' || state.phase === 'active' ? state.matchedDepot : null;
  const effectiveLocation =
    state.phase === 'confirming' || state.phase === 'active' ? state.effectiveLocation : null;
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
  const activePhotoType: PhotoType =
    state.phase === 'active' &&
    state.defectCompleted &&
    (state.activeSheet === 'camera' || state.activeSheet === 'review')
      ? 'defect'
      : 'freight';

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
    activePhotoType,

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
    handlePhotoCaptured: sheetLifecycle.handlePhotoCaptured,

    // Review
    handleReviewConfirmed: sheetLifecycle.handleReviewConfirmed,
    handleReviewRetake: sheetLifecycle.handleReviewRetake,
    handleReviewClose: sheetLifecycle.handleReviewClose,

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
