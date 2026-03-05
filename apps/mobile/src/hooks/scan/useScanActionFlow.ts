import { useReducer, useCallback, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
  assetKeys,
  useCreateScanEvent,
  useUpdateAsset,
  useDeleteScanEvent,
  useAssetScanContext,
} from '../useAssetData';
import { useCreateDefectReport } from '../useDefectData';
import { useLocation } from '../useLocation';
import { useQRScanner } from '../useQRScanner';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import type { CachedLocationData } from '../../store/locationStore';
import type { Asset, Depot } from '@rgr/shared';
import { getAssetByQRCode, listAssets } from '@rgr/shared';
import { logger } from '../../utils/logger';

// ── Types ────────────────────────────────────────────────────────────────────

export type MatchedDepot = { depot: Depot; distanceKm: number };

export type SheetId =
  | 'camera'
  | 'defect'
  | 'createTask'
  | 'taskDetail'
  | 'defectDetail'
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
  | { phase: 'error'; error: string };

export interface AlertSheetState {
  visible: boolean;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// ── Reducer ──────────────────────────────────────────────────────────────────

type ScanFlowAction =
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

// ── Hook ─────────────────────────────────────────────────────────────────────

interface UseScanActionFlowOptions {
  canMarkMaintenance: boolean;
}

export function useScanActionFlow({ canMarkMaintenance }: UseScanActionFlowOptions) {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' });
  const { user } = useAuthStore();
  const {
    resolvedDepot: cachedDepot,
  } = useLocationStore();

  const {
    hasPermission: hasLocationPermission,
    requestPermission: requestLocationPermission,
  } = useLocation();

  const queryClient = useQueryClient();

  // ── Mutations ──
  const { mutateAsync: createScan } = useCreateScanEvent();
  const { mutateAsync: updateAssetMutation } = useUpdateAsset();
  const { mutateAsync: doDeleteScan, isPending: isDeletingScan } = useDeleteScanEvent();
  const { mutateAsync: createDefectReport, isPending: isSubmittingDefect } = useCreateDefectReport();

  // ── Alert sheet ──
  const [alertSheet, setAlertSheet] = useState<AlertSheetState>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  // ── Photo capture tracking ──
  const photoUploadedRef = useRef(false);

  // ── Debug logging ──
  const debugLogRef = useRef<string[]>([]);
  const addDebugLog = useCallback((msg: string) => {
    const log = debugLogRef.current;
    if (log.length >= 10) log.shift();
    log.push(`${new Date().toLocaleTimeString()}: ${msg}`);
  }, []);

  // ── Asset lookup (via React Query cache) ──
  const lookupAsset = useCallback(
    async (qrData: string) => {
      return queryClient.fetchQuery({
        queryKey: assetKeys.byQRCode(qrData),
        queryFn: async () => {
          const result = await getAssetByQRCode(qrData);
          if (!result.success) throw new Error(result.error);
          return result.data;
        },
        staleTime: 30_000,
      });
    },
    [queryClient]
  );

  // Ref to break circular dep: processScan needs resetScanner, but
  // resetScanner comes from useQRScanner which takes processScan.
  const resetScannerRef = useRef<() => void>(() => {});

  // ── Core scan processing (extracted so it can be called directly for debug) ──
  const processScan = useCallback(
    async (qrData: string) => {
      try {
        logger.scan(`QR code detected: ${qrData.substring(0, 30)}...`);
        dispatch({ type: 'QR_DETECTED', scanStatus: 'QR detected' });

        // 1. Read fresh location from the Zustand store to avoid stale closures
        const { lastLocation: freshLocation, resolvedDepot: freshDepot } =
          useLocationStore.getState();

        if (!freshLocation) {
          logger.scan('No resolved location available');
          dispatch({ type: 'RESET' });
          setAlertSheet({
            visible: true,
            type: 'error',
            title: 'Location Not Available',
            message:
              'Please return to the home screen and ensure your location is resolved before scanning.',
          });
          resetScannerRef.current();
          return;
        }

        const scanLocation = freshLocation;
        const nearestDepot: MatchedDepot | null = freshDepot;

        // 2. Lookup asset
        logger.scan('Looking up asset...');
        dispatch({ type: 'UPDATE_SCAN_STATUS', scanStatus: 'Looking up asset...' });
        const asset = await lookupAsset(qrData);
        logger.scan(`Asset found: ${asset.assetNumber}`);

        // 3. Transition to confirming (card shown, buttons disabled)
        dispatch({
          type: 'ASSET_FOUND',
          scannedAsset: asset,
          matchedDepot: nearestDepot,
          effectiveLocation: scanLocation,
        });

        // 4. Guard against expired session
        if (!user) {
          dispatch({ type: 'RESET' });
          setAlertSheet({
            visible: true,
            type: 'error',
            title: 'Session Expired',
            message: 'Please log in again.',
          });
          resetScannerRef.current();
          return;
        }

        // 5. Auto-create scan event
        addDebugLog('Auto-creating scan event...');
        logger.scan('Submitting scan event...');
        const scanEvent = await createScan({
          assetId: asset.id,
          scannedBy: user.id,
          scanType: 'qr_scan',
          latitude: scanLocation.latitude,
          longitude: scanLocation.longitude,
          accuracy: scanLocation.accuracy,
          altitude: scanLocation.altitude,
          heading: scanLocation.heading,
          speed: scanLocation.speed,
          locationDescription: nearestDepot ? nearestDepot.depot.name : null,
        });
        addDebugLog('Scan created: ' + scanEvent.id.substring(0, 8));
        logger.scan('Scan event created successfully');

        // 6. Update depot assignment if matched (fire-and-forget)
        if (nearestDepot) {
          logger.scan(`Updating asset depot to ${nearestDepot.depot.name}...`);
          updateAssetMutation({
            id: asset.id,
            input: { assignedDepotId: nearestDepot.depot.id },
          })
            .then(() => logger.scan('Asset depot updated'))
            .catch((depotError) =>
              logger.warn('Depot update failed after successful scan:', depotError)
            );
        }

        // 7. Success!
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        dispatch({ type: 'SCAN_CREATED', lastScanEventId: scanEvent.id });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to scan QR code';
        logger.error(`Scan error: ${message}`);
        dispatch({ type: 'RESET' });
        setAlertSheet({
          visible: true,
          type: 'error',
          title: 'Scan Failed',
          message,
        });
        resetScannerRef.current();
      }
    },
    [user, lookupAsset, createScan, updateAssetMutation, addDebugLog, setAlertSheet]
  );

  // ── QR Scanner ──
  const { handleBarCodeScanned, resetScanner } = useQRScanner(processScan);
  resetScannerRef.current = resetScanner;

  // ── Debug: trigger scan with first asset from DB ──
  const triggerDebugScan = useCallback(async () => {
    const result = await listAssets({ pageSize: 1 });
    if (!result.success) {
      logger.warn('Debug scan: failed to fetch assets');
      return;
    }
    const asset = result.data.data[0];
    if (!asset) {
      logger.warn('Debug scan: no assets found');
      return;
    }
    const qrCode = `rgr://asset/${asset.id}`;
    resetScanner();
    await processScan(qrCode);
  }, [processScan, resetScanner]);

  // ── Action handlers ──

  const handlePhotoPress = useCallback(() => {
    photoUploadedRef.current = false;
    dispatch({ type: 'OPEN_SHEET', sheet: 'camera' });
  }, []);

  const handleDefectPress = useCallback(() => {
    dispatch({ type: 'OPEN_SHEET', sheet: 'defect' });
  }, []);

  const handleTaskPress = useCallback(() => {
    dispatch({ type: 'OPEN_SHEET', sheet: 'createTask' });
  }, []);

  const handleDonePress = useCallback(() => {
    dispatch({ type: 'RESET' });
    resetScanner();
  }, [resetScanner]);

  // ── Undo ──

  const handleUndoPress = useCallback(async () => {
    if (state.phase !== 'active') return;

    addDebugLog('Undo pressed — deleting scan event');
    const scanEventId = state.lastScanEventId;
    dispatch({ type: 'RESET' });
    resetScanner();

    try {
      await doDeleteScan(scanEventId);
      addDebugLog('Scan event deleted');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      logger.warn('Failed to delete scan event during undo:', error);
      // Non-fatal: scan was already removed from UI, just log the failure
    }
  }, [state, addDebugLog, doDeleteScan, resetScanner]);

  // ── Sheet lifecycle ──

  const handleSheetDismiss = useCallback(() => {
    dispatch({ type: 'RESOLVE_PENDING' });
  }, []);

  const handleCloseSheet = useCallback((pendingSheet?: SheetId) => {
    if (pendingSheet) {
      dispatch({ type: 'CLOSE_SHEET', pendingSheet });
    } else {
      dispatch({ type: 'CLOSE_SHEET' });
    }
  }, []);

  // ── Camera handlers ──

  const handlePhotoUploaded = useCallback(() => {
    logger.scan('Photo uploaded successfully');
    photoUploadedRef.current = true;
  }, []);

  const handleCameraClose = useCallback(() => {
    if (photoUploadedRef.current) {
      dispatch({ type: 'MARK_PHOTO_COMPLETED' });
    }
    photoUploadedRef.current = false;
    dispatch({ type: 'CLOSE_SHEET' });
  }, []);

  // ── Defect report handlers ──

  const handleDefectSubmit = useCallback(
    async (notes: string, wantsPhoto: boolean) => {
      if (state.phase !== 'active') return;

      addDebugLog('Submitting defect report...');
      if (!user) {
        setAlertSheet({
          visible: true,
          type: 'error',
          title: 'Session Expired',
          message: 'Please log in again.',
        });
        return;
      }
      try {
        await createDefectReport({
          assetId: state.scannedAsset.id,
          reportedBy: user.id,
          title: 'Defect reported',
          description: notes,
          scanEventId: state.lastScanEventId,
        });

        addDebugLog('Defect report created');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        dispatch({ type: 'MARK_DEFECT_COMPLETED' });
        if (wantsPhoto) {
          dispatch({ type: 'CLOSE_SHEET', pendingSheet: 'camera' });
        } else {
          dispatch({ type: 'CLOSE_SHEET' });
        }

        // Invalidate scan context so the card updates
        queryClient.invalidateQueries({
          queryKey: assetKeys.scanContext(state.scannedAsset.id),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to submit defect report';
        addDebugLog(`ERROR: ${message}`);
        setAlertSheet({
          visible: true,
          type: 'error',
          title: 'Error',
          message,
        });
      }
    },
    [state, user, createDefectReport, addDebugLog, queryClient]
  );

  const handleDefectCancel = useCallback(() => {
    dispatch({ type: 'CLOSE_SHEET' });
  }, []);

  // ── Scan context query (mechanic only) ──
  const scanContextAssetId =
    canMarkMaintenance &&
    (state.phase === 'confirming' || state.phase === 'active')
      ? state.scannedAsset.id
      : undefined;

  const scanContextQuery = useAssetScanContext(scanContextAssetId);

  // ── Derived convenience getters ──
  const scannedAsset =
    state.phase === 'confirming' || state.phase === 'active'
      ? state.scannedAsset
      : null;

  const matchedDepot =
    state.phase === 'confirming' || state.phase === 'active'
      ? state.matchedDepot
      : null;

  const effectiveLocation =
    state.phase === 'confirming' || state.phase === 'active'
      ? state.effectiveLocation
      : null;

  const lastScanEventId =
    state.phase === 'active' ? state.lastScanEventId : null;

  const activeSheet =
    state.phase === 'active' ? state.activeSheet : null;

  const isCreatingScan = state.phase === 'confirming';

  const scanStatus =
    state.phase === 'scanning' ? state.scanStatus : null;

  const showCard =
    state.phase === 'confirming' || state.phase === 'active';

  const buttonsDisabled = state.phase !== 'active';

  const photoCompleted =
    state.phase === 'active' ? state.photoCompleted : false;

  const defectCompleted =
    state.phase === 'active' ? state.defectCompleted : false;

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
    handlePhotoPress,
    handleDefectPress,
    handleTaskPress,
    handleDonePress,

    // Undo
    handleUndoPress,
    isDeletingScan,

    // Sheet lifecycle
    handleSheetDismiss,
    handleCloseSheet,

    // Camera
    handleCameraClose,
    handlePhotoUploaded,

    // Defect
    handleDefectSubmit,
    handleDefectCancel,
    isSubmittingDefect,

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
  };
}
