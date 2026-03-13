import { useReducer, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { BackHandler } from 'react-native';
import type { AssetScanContext, PhotoType } from '@rgr/shared';
import * as Haptics from 'expo-haptics';
import { useAssetScanContext } from '../useAssetData';
import { useCreateDefectReport } from '../useDefectData';
import { useLocation } from '../useLocation';
import { useQRScanner } from '../useQRScanner';
import { useDepots } from '../useDepots';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import type { CachedLocationData } from '../../store/locationStore';
import type { Asset } from '@rgr/shared';
import type { BarcodeScanningResult } from 'expo-camera';
import { useScanProcessing } from './useScanProcessing';
import { useModalTransition } from '../useModalTransition';
import { logger } from '../../utils/logger';
import { scanFlowReducer, initialScanFlowState } from './scanFlowMachine';
import type {
  ScanFlowState,
  ScanFlowAction,
  MatchedDepot,
  ScanSheetId,
  ConfirmAction,
  CompletionSummary,
} from './scanFlowMachine';

// Re-export types for consumers
export type {
  ScanFlowState,
  ScanFlowAction,
  MatchedDepot,
  ScanSheetId,
  ConfirmAction,
  CompletionSummary,
} from './scanFlowMachine';

// ── Context modal type ──

export type ScanContextModal =
  | { type: 'closed' }
  | { type: 'defectDetail'; defectId: string }
  | { type: 'maintenanceDetail'; maintenanceId: string }
  | {
      type: 'acceptDefect';
      defectId: string;
      assetId: string;
      assetNumber: string | null;
      title: string;
      description: string | null;
    };

const CLOSED_MODAL: ScanContextModal = { type: 'closed' };

// ── Alert sheet state ──

export interface AlertSheetState {
  visible: boolean;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

// ── Return type ──

export interface UseScanFlowReturn {
  // State
  state: ScanFlowState;
  scannedAsset: Asset | null;
  matchedDepot: MatchedDepot | null;
  effectiveLocation: CachedLocationData | null;
  lastScanEventId: string | null;
  activeSheet: ScanSheetId | null;
  cameraOpen: boolean;
  isCreatingScan: boolean;
  scanStatus: string | null;
  showOverlay: boolean;
  showCard: boolean;
  buttonsDisabled: boolean;
  photoCompleted: boolean;
  defectCompleted: boolean;
  maintenanceCompleted: boolean;
  activePhotoType: PhotoType;
  isCompleting: boolean;
  completionSummary: CompletionSummary | null;

  // QR scanner
  handleBarCodeScanned: (result: BarcodeScanningResult) => void;

  // Action handlers
  handleConfirmAction: (action: ConfirmAction) => void;
  handleDonePress: () => void;
  handleUndoPress: () => void;
  isDeletingScan: boolean;

  // Camera
  handleCameraCaptured: (uri: string) => void;
  handleCameraCancelled: () => void;

  // Sheet lifecycle
  handleSheetExitComplete: () => void;
  handleSheetDismissed: () => void;

  // Defect
  handleDefectSubmit: (notes: string, wantsPhoto: boolean) => void;
  isSubmittingDefect: boolean;

  // Photo review
  handlePhotoFlowComplete: () => void;
  handleReviewRetake: () => void;

  // Maintenance
  handleMaintenanceCreated: () => void;

  // Success flash dismiss
  handleCompletionDismiss: () => void;

  // Scan context (mechanic)
  scanContext: AssetScanContext | null;
  isContextLoading: boolean;
  contextError: Error | null;
  refetchContext: () => unknown;

  // Context modals
  contextModal: ScanContextModal;
  openDefectDetail: (id: string) => void;
  openMaintenanceDetail: (id: string) => void;
  openAcceptDefect: (ctx: Extract<ScanContextModal, { type: 'acceptDefect' }>) => void;
  closeContextModal: () => void;
  handleContextExitComplete: () => void;

  // Alert
  alertSheet: AlertSheetState;
  setAlertSheet: React.Dispatch<React.SetStateAction<AlertSheetState>>;

  // Location
  hasLocationPermission: boolean;
  requestLocationPermission: () => Promise<boolean>;

  // Pre-resolved depot (for overlay badges)
  resolvedDepot: MatchedDepot | null;

  // Debug
  addDebugLog: (msg: string) => void;
  triggerDebugScan: () => void;
}

// ── Hook ──

interface UseScanFlowOptions {
  canMarkMaintenance: boolean;
}

const SHEET_EXIT_SAFETY_TIMEOUT = 1500;
const COMPLETING_SAFETY_TIMEOUT = 5000;

export function useScanFlow({ canMarkMaintenance }: UseScanFlowOptions): UseScanFlowReturn {
  const [state, dispatch] = useReducer(scanFlowReducer, initialScanFlowState);
  const user = useAuthStore((s) => s.user);
  const cachedDepot = useLocationStore((s) => s.resolvedDepot);
  const ensureFresh = useLocationStore((s) => s.ensureFresh);
  const depotsData = useDepots().data;
  const depots = useMemo(() => depotsData ?? [], [depotsData]);
  const { hasPermission: hasLocationPermission, requestPermission: requestLocationPermission } =
    useLocation();

  // Proactively refresh location when scan tab mounts
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

  // ── resetScannerRef (breaks circular dep) ──
  const resetScannerRef = useRef<() => void>(() => {});

  // ── Sub-hooks ──
  const {
    processScan,
    triggerDebugScan: triggerDebugScanImpl,
    handleUndoPress: undoScanEvent,
    isDeletingScan,
  } = useScanProcessing(dispatch, {
    user,
    setAlertSheet,
    addDebugLog,
    resetScannerRef,
  });

  const { mutateAsync: createDefectReport, isPending: isSubmittingDefect } =
    useCreateDefectReport();

  // ── Invalid QR callback ──
  const invalidQRTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInvalidQR = useCallback(() => {
    dispatch({ type: 'INVALID_QR' });
    if (invalidQRTimerRef.current) clearTimeout(invalidQRTimerRef.current);
    invalidQRTimerRef.current = setTimeout(() => {
      invalidQRTimerRef.current = null;
      dispatch({ type: 'CLEAR_INVALID_STATUS' });
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (invalidQRTimerRef.current) {
        clearTimeout(invalidQRTimerRef.current);
        invalidQRTimerRef.current = null;
      }
    };
  }, []);

  // ── QR Scanner ──
  const { handleBarCodeScanned, resetScanner } = useQRScanner(processScan, 2000, handleInvalidQR);
  resetScannerRef.current = resetScanner;

  // ── Context modals ──
  const {
    modal: contextModal,
    closeModal: closeContextModal,
    transitionTo: transitionContextModal,
    handleExitComplete: handleContextExitComplete,
  } = useModalTransition<ScanContextModal>(CLOSED_MODAL);

  const openDefectDetail = useCallback(
    (id: string) => transitionContextModal({ type: 'defectDetail', defectId: id }),
    [transitionContextModal]
  );

  const openMaintenanceDetail = useCallback(
    (id: string) => transitionContextModal({ type: 'maintenanceDetail', maintenanceId: id }),
    [transitionContextModal]
  );

  const openAcceptDefect = useCallback(
    (ctx: Extract<ScanContextModal, { type: 'acceptDefect' }>) => transitionContextModal(ctx),
    [transitionContextModal]
  );

  // ── Track latest active-phase IDs for undo ──
  const undoIdsRef = useRef<{ scanEventId: string; assetId: string } | null>(null);
  if (state.phase === 'active') {
    undoIdsRef.current = { scanEventId: state.lastScanEventId, assetId: state.scannedAsset.id };
  } else if (state.phase === 'idle') {
    undoIdsRef.current = null;
  }

  // ── Derived state (above callbacks so deps can reference stable primitives) ──
  const scannedAsset =
    state.phase === 'confirming' || state.phase === 'active' ? state.scannedAsset : null;
  const matchedDepot =
    state.phase === 'confirming' || state.phase === 'active' ? state.matchedDepot : null;
  const effectiveLocation =
    state.phase === 'confirming' || state.phase === 'active' ? state.effectiveLocation : null;
  const lastScanEventId = state.phase === 'active' ? state.lastScanEventId : null;
  const activeSheet = state.phase === 'active' ? state.activeSheet : null;
  const cameraOpen = state.phase === 'active' ? state.cameraOpen : false;
  const isAwaitingSheetExit = state.phase === 'active' ? state.awaitingSheetExit : false;
  const isCreatingScan = state.phase === 'confirming';
  const scanStatus = state.phase === 'scanning' ? state.scanStatus : null;
  // showOverlay: backdrop stays up during the entire confirming/active phase
  const showOverlay = state.phase === 'confirming' || state.phase === 'active';
  // showCard: confirmation card hides when camera, review sheet, pending review,
  // or a sub-sheet exit animation is in progress (awaitingSheetExit).
  // Presenting the confirmation card while a sub-sheet is still animating out
  // causes a gorhom BottomSheetModal stack conflict — the exiting sheet's
  // onDismiss callback can be suppressed, blocking SHEET_EXIT_COMPLETE.
  const showCard =
    state.phase === 'confirming' ||
    (state.phase === 'active' &&
      !state.cameraOpen &&
      state.activeSheet !== 'review' &&
      !state.capturedPhotoUri &&
      !state.awaitingSheetExit);
  const buttonsDisabled = state.phase !== 'active';
  const photoCompleted = state.phase === 'active' ? state.photoCompleted : false;
  const defectCompleted = state.phase === 'active' ? state.defectCompleted : false;
  const maintenanceCompleted = state.phase === 'active' ? state.maintenanceCompleted : false;
  const isCompleting = state.phase === 'completing';
  const completionSummary = state.phase === 'completing' ? state.summary : null;
  const activePhotoType: PhotoType =
    state.phase === 'active' && state.defectCompleted ? 'defect' : 'freight';

  // ── Action handlers ──

  const handleConfirmAction = useCallback((action: ConfirmAction) => {
    dispatch({ type: 'CONFIRM_ACTION', action });
  }, []);

  const handleDonePress = useCallback(() => {
    dispatch({ type: 'RESET' });
    resetScanner();
  }, [resetScanner]);

  const handleUndoPress = useCallback(() => {
    if (state.phase === 'confirming') {
      dispatch({ type: 'UNDO' });
      return;
    }
    if (state.phase !== 'active') return;
    const ids = undoIdsRef.current;
    if (!ids) return;
    closeContextModal();
    dispatch({ type: 'UNDO' });
    undoScanEvent(ids.scanEventId, ids.assetId, resetScanner);
  }, [state.phase, undoScanEvent, resetScanner, closeContextModal]);

  const handleCameraCaptured = useCallback((uri: string) => {
    dispatch({ type: 'CAMERA_CAPTURED', uri });
  }, []);

  const handleCameraCancelled = useCallback(() => {
    dispatch({ type: 'CAMERA_CANCELLED' });
  }, []);

  // ── Delayed review sheet open ──
  // After CAMERA_CAPTURED, the native Modal must fully dismiss before a gorhom
  // SheetModal can present.  This effect detects the "captured photo pending review"
  // state and opens the review sheet after a brief delay.
  let pendingReview = false;
  if (state.phase === 'active') {
    pendingReview =
      !state.cameraOpen &&
      !!state.capturedPhotoUri &&
      state.activeSheet === null &&
      !state.awaitingSheetExit;
  }

  useEffect(() => {
    if (!pendingReview) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'OPEN_REVIEW' });
    }, 200);
    return () => clearTimeout(timer);
  }, [pendingReview]);

  const handleSheetExitComplete = useCallback(() => {
    dispatch({ type: 'SHEET_EXIT_COMPLETE' });
  }, []);

  const handleSheetDismissed = useCallback(() => {
    dispatch({ type: 'SHEET_DISMISSED' });
  }, []);

  const handleDefectSubmit = useCallback(
    async (notes: string, wantsPhoto: boolean) => {
      if (state.phase !== 'active' || !scannedAsset || !lastScanEventId) return;
      if (!user) {
        setAlertSheet({
          visible: true,
          type: 'error',
          title: 'Session Expired',
          message: 'Please log in again.',
        });
        return;
      }
      addDebugLog('Submitting defect report...');
      try {
        await createDefectReport({
          assetId: scannedAsset.id,
          reportedBy: user.id,
          title: 'Defect reported',
          description: notes,
          scanEventId: lastScanEventId,
        });
        addDebugLog('Defect report created');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        dispatch({ type: 'DEFECT_SUBMITTED', wantsPhoto });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to submit defect report';
        if (__DEV__) console.error('[useScanFlow] handleDefectSubmit ERROR:', message, error);
        addDebugLog(`ERROR: ${message}`);
        setAlertSheet({
          visible: true,
          type: 'error',
          title: 'Error',
          message,
        });
      }
    },
    [
      state.phase,
      scannedAsset?.id,
      lastScanEventId,
      user,
      createDefectReport,
      addDebugLog,
      setAlertSheet,
    ]
  );

  const handlePhotoFlowComplete = useCallback(() => {
    logger.scan('Photo uploaded successfully');
    dispatch({ type: 'PHOTO_FLOW_COMPLETE' });
  }, []);

  const handleReviewRetake = useCallback(() => {
    dispatch({ type: 'RETAKE_PHOTO' });
  }, []);

  const handleMaintenanceCreated = useCallback(() => {
    dispatch({ type: 'MAINTENANCE_CREATED' });
  }, []);

  const handleCompletionDismiss = useCallback(() => {
    dispatch({ type: 'RESET' });
    resetScanner();
  }, [resetScanner]);

  // ── Debug scan ──
  const triggerDebugScan = useCallback(() => {
    triggerDebugScanImpl(resetScanner);
  }, [triggerDebugScanImpl, resetScanner]);

  // ── Safety timeout: force SHEET_EXIT_COMPLETE if stuck ──
  const sheetExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (state.phase === 'active' && state.awaitingSheetExit) {
      sheetExitTimeoutRef.current = setTimeout(() => {
        if (__DEV__) {
          console.warn(
            '[useScanFlow] Safety timeout — SHEET_EXIT_COMPLETE did not fire within 1500ms'
          );
        }
        dispatch({ type: 'SHEET_EXIT_COMPLETE' });
      }, SHEET_EXIT_SAFETY_TIMEOUT);
    } else {
      if (sheetExitTimeoutRef.current) {
        clearTimeout(sheetExitTimeoutRef.current);
        sheetExitTimeoutRef.current = null;
      }
    }
    return () => {
      if (sheetExitTimeoutRef.current) {
        clearTimeout(sheetExitTimeoutRef.current);
        sheetExitTimeoutRef.current = null;
      }
    };
  }, [isAwaitingSheetExit]);

  // ── Safety timeout: auto-RESET if stuck in completing ──
  useEffect(() => {
    if (state.phase !== 'completing') return;
    const timer = setTimeout(() => {
      if (__DEV__) {
        console.warn(
          '[useScanFlow] Safety timeout — stuck in completing phase for 5s, auto-resetting'
        );
      }
      dispatch({ type: 'RESET' });
      resetScanner();
    }, COMPLETING_SAFETY_TIMEOUT);
    return () => clearTimeout(timer);
  }, [state.phase, resetScanner]);

  // ── BackHandler (Android) ──
  useEffect(() => {
    if (state.phase === 'idle' || state.phase === 'scanning') return;

    const handler = () => {
      if (state.phase === 'active') {
        if (cameraOpen) {
          dispatch({ type: 'CAMERA_CANCELLED' });
          return true;
        }
        if (activeSheet !== null) {
          dispatch({ type: 'SHEET_DISMISSED' });
          return true;
        }
        // Back on confirmation card → undo
        handleUndoPress();
        return true;
      }
      if (state.phase === 'confirming') {
        dispatch({ type: 'UNDO' });
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [state.phase, cameraOpen, activeSheet, handleUndoPress]);

  // ── Scan context query (mechanic only) ──
  const scanContextAssetId =
    canMarkMaintenance && (state.phase === 'confirming' || state.phase === 'active')
      ? state.scannedAsset.id
      : undefined;

  const scanContextQuery = useAssetScanContext(scanContextAssetId);

  return {
    state,
    scannedAsset,
    matchedDepot,
    effectiveLocation,
    lastScanEventId,
    activeSheet,
    cameraOpen,
    isCreatingScan,
    scanStatus,
    showOverlay,
    showCard,
    buttonsDisabled,
    photoCompleted,
    defectCompleted,
    maintenanceCompleted,
    activePhotoType,
    isCompleting,
    completionSummary,

    handleBarCodeScanned,

    handleConfirmAction,
    handleDonePress,
    handleUndoPress,
    isDeletingScan,

    handleCameraCaptured,
    handleCameraCancelled,

    handleSheetExitComplete,
    handleSheetDismissed,

    handleDefectSubmit,
    isSubmittingDefect,

    handlePhotoFlowComplete,
    handleReviewRetake,

    handleMaintenanceCreated,

    handleCompletionDismiss,

    scanContext: scanContextQuery.data ?? null,
    isContextLoading: scanContextQuery.isLoading,
    contextError: scanContextQuery.error,
    refetchContext: scanContextQuery.refetch,

    contextModal,
    openDefectDetail,
    openMaintenanceDetail,
    openAcceptDefect,
    closeContextModal,
    handleContextExitComplete,

    alertSheet,
    setAlertSheet,

    hasLocationPermission,
    requestLocationPermission,

    resolvedDepot: cachedDepot,

    addDebugLog,
    triggerDebugScan,
  } satisfies UseScanFlowReturn;
}
