import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { useAssetCountMode } from '../../src/hooks/useAssetCountMode';
import { useScanFlow } from '../../src/hooks/scan/useScanFlow';
import { usePhotoFlow } from '../../src/hooks/scan/usePhotoFlow';
import { useDefectFlow } from '../../src/hooks/scan/useDefectFlow';
import { PermissionScreen } from '../../src/components/scanner/PermissionScreen';
import { CameraOverlay } from '../../src/components/scanner/CameraOverlay';
import { ScanModalStack } from '../../src/components/scanner/ScanModalStack';
import type { CachedLocationData } from '../../src/store/locationStore';
import type { CountModeAutoConfirmResult } from '../../src/hooks/scan/useScanFlow';
import { isStandaloneScan, submitAssetCount } from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { styles } from '../../src/components/scanner/scan.styles';

export default function ScanScreen() {
  const { user } = useAuthStore();
  const { resolvedDepot: cachedDepot } = useLocationStore();
  const { canMarkMaintenance, canPerformAssetCount } = useUserPermissions();
  const [permission, requestPermission] = useCameraPermissions();

  // Asset Count mode (managers+)
  const assetCount = useAssetCountMode();

  // ── Extracted Hooks ──

  const scanFlow = useScanFlow();

  // resetAllScanState is defined as a ref-based callback to avoid circular init issues
  // (photoFlow needs resetAllScanState, but resetAllScanState needs photoFlow)
  const resetAllScanStateRef = useRef<() => void>(() => {});

  const photoFlow = usePhotoFlow({
    addDebugLog: scanFlow.addDebugLog,
    resetAllScanState: () => resetAllScanStateRef.current(),
  });

  const defectFlow = useDefectFlow({
    addDebugLog: scanFlow.addDebugLog,
  });

  const resetAllScanState = useCallback(() => {
    scanFlow.resetScanFlow();
    photoFlow.resetPhotoFlow();
    defectFlow.resetDefectFlow();
    // Combination/count state
    setShowLinkSheet(false);
    setPendingLinkSheet(false);
    setShowCombinationPhoto(false);
    setPendingCombinationPhoto(false);
    setShowEndCountReview(false);
    setActiveCombinationId(null);
    // Count mode inline state
    setScanToast({ visible: false, message: '', type: 'success', showUndo: false });
    setQuickLinkBar({ visible: false, currentAssetNumber: '', previousAssetNumber: '' });
  }, [scanFlow, photoFlow, defectFlow]);

  resetAllScanStateRef.current = resetAllScanState;

  // ── Combination / Count State ──

  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [pendingLinkSheet, setPendingLinkSheet] = useState(false);
  const [showCombinationPhoto, setShowCombinationPhoto] = useState(false);
  const [pendingCombinationPhoto, setPendingCombinationPhoto] = useState(false);
  const [showEndCountReview, setShowEndCountReview] = useState(false);
  const [isSubmittingCount, setIsSubmittingCount] = useState(false);
  const [activeCombinationId, setActiveCombinationId] = useState<string | null>(null);

  // Scan toast state (count mode inline feedback)
  const [scanToast, setScanToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'info' | 'link';
    showUndo: boolean;
  }>({ visible: false, message: '', type: 'success', showUndo: false });

  // Quick-link bar state (count mode inline link prompt)
  const [quickLinkBar, setQuickLinkBar] = useState<{
    visible: boolean;
    currentAssetNumber: string;
    previousAssetNumber: string;
  }>({ visible: false, currentAssetNumber: '', previousAssetNumber: '' });

  // Debug state
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);

  // ── Count Mode Auto-Confirm ──

  // Wire up the count mode callback ref so useScanFlow can auto-confirm scans
  useEffect(() => {
    if (assetCount.isActive) {
      scanFlow.countModeCallbackRef.current = (result: CountModeAutoConfirmResult) => {
        const { asset } = result;
        const assetNumber = asset.assetNumber ?? 'Unknown';

        // Capture the previous scan's asset number BEFORE dispatching,
        // since the current last scan is the actual "previous" relative to the new one
        const previousAssetNumber = assetCount.scans.length > 0
          ? assetCount.scans[assetCount.scans.length - 1]?.assetNumber ?? ''
          : '';

        // Check for duplicate scan before adding
        const isDuplicate = assetCount.scans.some(s => s.assetId === asset.id);
        if (isDuplicate) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setScanToast({
            visible: true,
            message: `${assetNumber} already counted`,
            type: 'info',
            showUndo: false,
          });
          scanFlow.addDebugLog(`Count mode: duplicate scan rejected ${assetNumber}`);
          return;
        }

        // Add to asset count
        assetCount.addScan({
          type: 'standalone',
          assetId: asset.id,
          assetNumber,
          timestamp: Date.now(),
        });
        assetCount.confirmScan();

        // Dismiss any existing quick-link bar (auto-dismiss = keep separate)
        if (quickLinkBar.visible) {
          assetCount.keepSeparate();
          setQuickLinkBar({ visible: false, currentAssetNumber: '', previousAssetNumber: '' });
        }

        // Show scan toast with undo
        setScanToast({
          visible: true,
          message: `${assetNumber} counted`,
          type: 'success',
          showUndo: true,
        });

        // Show quick-link bar if there's a previous scan to link to
        // (we use the previously captured previousAssetNumber since state hasn't updated yet)
        if (previousAssetNumber) {
          // Defer to next tick so reducer state settles
          setTimeout(() => {
            setQuickLinkBar({
              visible: true,
              currentAssetNumber: assetNumber,
              previousAssetNumber,
            });
          }, 0);
        }

        scanFlow.addDebugLog(`Count mode: auto-confirmed ${assetNumber}`);
      };
    } else {
      scanFlow.countModeCallbackRef.current = null;
    }
  }, [assetCount.isActive, assetCount, scanFlow, quickLinkBar.visible]);

  const handleScanToastDismiss = useCallback(() => {
    setScanToast(prev => ({ ...prev, visible: false }));
  }, []);

  const handleScanToastUndo = useCallback(() => {
    scanFlow.addDebugLog('Undo last scan');
    assetCount.undoLastScan();
    setScanToast(prev => ({ ...prev, visible: false }));
    // Also dismiss quick-link bar since the scan was undone
    setQuickLinkBar({ visible: false, currentAssetNumber: '', previousAssetNumber: '' });
  }, [assetCount, scanFlow]);

  // ── Quick Link Bar (count mode inline linking) ──

  const handleQuickLink = useCallback(() => {
    scanFlow.addDebugLog('Quick-linking to previous asset');
    assetCount.linkToPrevious();
    const linked = quickLinkBar.currentAssetNumber;
    const prev = quickLinkBar.previousAssetNumber;
    setQuickLinkBar({ visible: false, currentAssetNumber: '', previousAssetNumber: '' });
    // Show link confirmation toast
    setScanToast({
      visible: true,
      message: `${prev} + ${linked} linked`,
      type: 'link',
      showUndo: false,
    });
  }, [assetCount, scanFlow, quickLinkBar]);

  const handleQuickLinkDismiss = useCallback(() => {
    scanFlow.addDebugLog('Quick-link dismissed (keep separate)');
    assetCount.keepSeparate();
    setQuickLinkBar({ visible: false, currentAssetNumber: '', previousAssetNumber: '' });
  }, [assetCount, scanFlow]);

  // ── Orchestration: Confirm Sheet Dismiss ──

  const handleConfirmSheetDismiss = useCallback(() => {
    scanFlow.addDebugLog('Confirm sheet dismissed (native callback)');
    if (pendingLinkSheet && assetCount.canLinkToPrevious) {
      scanFlow.addDebugLog('Showing link sheet now');
      setPendingLinkSheet(false);
      setShowLinkSheet(true);
    } else if (pendingLinkSheet) {
      scanFlow.addDebugLog('No previous scan to link, resetting');
      setPendingLinkSheet(false);
      scanFlow.resetScanner();
    } else if (defectFlow.resolvePending()) {
      // Defect report shown
    } else {
      photoFlow.resolvePending();
    }
  }, [pendingLinkSheet, assetCount.canLinkToPrevious, scanFlow, defectFlow, photoFlow]);

  // ── Orchestration: Confirm Scan ──

  const handleConfirmScan = useCallback(async () => {
    const action = await scanFlow.handleConfirmScan({
      isAssetCountActive: assetCount.isActive,
      assetCountScansLength: assetCount.scans.length,
      addToAssetCount: () => {
        if (!scanFlow.scannedAsset) return;
        assetCount.addScan({
          type: 'standalone',
          assetId: scanFlow.scannedAsset.id,
          assetNumber: scanFlow.scannedAsset.assetNumber ?? 'Unknown',
          timestamp: Date.now(),
        });
        assetCount.confirmScan();
      },
      canMarkMaintenance,
    });

    if (!action) return;

    switch (action.type) {
      case 'defectReport':
        defectFlow.queueDefectReport();
        break;
      case 'photoPrompt':
        photoFlow.queuePhotoPrompt();
        break;
      case 'assetCountLink':
        setPendingLinkSheet(true);
        break;
    }
  }, [scanFlow, assetCount, canMarkMaintenance, defectFlow, photoFlow]);

  // ── Photo Flow Wrappers ──

  const handlePhotoPromptAddPhoto = useCallback(() => {
    photoFlow.handlePhotoPromptAddPhoto(scanFlow.matchedDepot);
  }, [photoFlow, scanFlow.matchedDepot]);

  const handlePhotoPromptSkip = useCallback(() => {
    photoFlow.handlePhotoPromptSkip(scanFlow.matchedDepot);
  }, [photoFlow, scanFlow.matchedDepot]);

  const handleCameraClose = useCallback(() => {
    photoFlow.handleCameraClose(defectFlow.defectReportedRef.current);
  }, [photoFlow, defectFlow.defectReportedRef]);

  // ── Defect Flow Wrappers ──

  const handleDefectReportSubmit = useCallback((notes: string, wantsPhoto: boolean) => {
    defectFlow.handleDefectReportSubmit(notes, wantsPhoto, {
      completedAsset: scanFlow.completedAsset,
      userId: user?.id ?? null,
      lastScanEventId: scanFlow.lastScanEventId,
      matchedDepot: scanFlow.matchedDepot,
      setAlertSheet: scanFlow.setAlertSheet,
      queueCamera: (depot) => photoFlow.queueCamera(depot),
      showSuccess: (items) => photoFlow.showSuccessWithItems(items),
    });
  }, [defectFlow, scanFlow, user, photoFlow]);

  const handleDefectReportCancel = useCallback(() => {
    defectFlow.handleDefectReportCancel(photoFlow.queuePhotoPrompt);
  }, [defectFlow, photoFlow]);

  const handleDefectReportDismiss = useCallback(() => {
    scanFlow.addDebugLog('Defect report dismissed (native callback)');
    // After defect report dismisses, resolve any pending photo flow states
    // photoFlow.handlePhotoPromptDismiss handles both pendingCamera and pendingSuccessSheet
    // but we need to check the raw pending states here
    if (photoFlow.pendingCamera) {
      // Camera was queued (user wanted to take photo of defect)
      photoFlow.handlePhotoPromptDismiss();
    } else {
      photoFlow.resolvePending();
    }
  }, [scanFlow, photoFlow]);

  // ── Asset Count Handlers ──

  const handleStartAssetCount = useCallback(() => {
    if (!cachedDepot) {
      scanFlow.setAlertSheet({
        visible: true,
        type: 'warning',
        title: 'No Depot',
        message: 'Please wait for location to be determined before starting a count.',
      });
      return;
    }
    assetCount.startCount(cachedDepot.depot.id, cachedDepot.depot.name);
  }, [cachedDepot, assetCount, scanFlow]);

  const handleEndAssetCount = useCallback(() => {
    setShowEndCountReview(true);
  }, []);

  // Combination Link handlers
  const handleLinkToPrevious = useCallback(() => {
    scanFlow.addDebugLog('Linking to previous asset');
    const comboId = assetCount.linkToPrevious();
    if (comboId) {
      setActiveCombinationId(comboId);
      setPendingCombinationPhoto(true);
    }
    setShowLinkSheet(false);
  }, [assetCount, scanFlow]);

  const handleKeepSeparate = useCallback(() => {
    scanFlow.addDebugLog('Keeping scan separate');
    assetCount.keepSeparate();
    setShowLinkSheet(false);
    scanFlow.resetScanner();
  }, [assetCount, scanFlow]);

  const handleLinkSheetDismiss = useCallback(() => {
    scanFlow.addDebugLog('Link sheet dismissed');
    if (pendingCombinationPhoto && activeCombinationId) {
      scanFlow.addDebugLog('Showing combination photo now');
      setPendingCombinationPhoto(false);
      setShowCombinationPhoto(true);
    } else {
      scanFlow.resetScanner();
    }
  }, [pendingCombinationPhoto, activeCombinationId, scanFlow]);

  // Combination Photo handlers
  const handleCombinationPhotoCapture = useCallback((photoUri: string) => {
    if (activeCombinationId) {
      assetCount.setCombinationPhoto(activeCombinationId, photoUri, null);
    }
  }, [activeCombinationId, assetCount]);

  const handleCombinationNotesChange = useCallback((notes: string) => {
    if (activeCombinationId) {
      assetCount.setCombinationNotes(activeCombinationId, notes);
    }
  }, [activeCombinationId, assetCount]);

  const handleCombinationPhotoComplete = useCallback(() => {
    scanFlow.addDebugLog('Combination photo complete');
    setShowCombinationPhoto(false);
    setActiveCombinationId(null);
    scanFlow.resetScanner();
  }, [scanFlow]);

  const handleCombinationPhotoSkip = useCallback(() => {
    scanFlow.addDebugLog('Combination photo skipped');
    setShowCombinationPhoto(false);
    setActiveCombinationId(null);
    scanFlow.resetScanner();
  }, [scanFlow]);

  // End Count Review handlers
  const handleSubmitCount = useCallback(async () => {
    if (!assetCount.depotId || !user) {
      scanFlow.setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Missing required information',
      });
      return;
    }

    setIsSubmittingCount(true);
    scanFlow.addDebugLog('Submitting asset count...');

    try {
      const items = assetCount.scans.map(scan => ({
        assetId: scan.assetId,
        combinationId: isStandaloneScan(scan) ? null : scan.combinationId,
        combinationPosition: isStandaloneScan(scan) ? null : scan.combinationPosition,
      }));

      const combinations = Object.values(assetCount.combinations).map(combo => ({
        combinationId: combo.combinationId,
        notes: combo.notes,
        photoId: combo.photoId,
      }));

      const result = await submitAssetCount({
        depotId: assetCount.depotId,
        countedBy: user.id,
        items,
        combinations,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      scanFlow.addDebugLog('Asset count submitted successfully');

      const count = assetCount.scanCount;
      const comboCount = assetCount.combinationCount;
      assetCount.endCount();
      setShowEndCountReview(false);

      // Show inline toast instead of modal
      const comboText = comboCount > 0 ? ` (${comboCount} combos)` : '';
      setScanToast({
        visible: true,
        message: `Count submitted: ${count} assets${comboText}`,
        type: 'success',
        showUndo: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit count';
      scanFlow.addDebugLog(`ERROR: ${message}`);
      scanFlow.setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Submit Failed',
        message,
      });
    } finally {
      setIsSubmittingCount(false);
    }
  }, [assetCount, user, scanFlow]);

  const handleCancelEndCount = useCallback(() => {
    setShowEndCountReview(false);
  }, []);

  const handleDiscardCount = useCallback(() => {
    assetCount.endCount();
    setShowEndCountReview(false);
    resetAllScanState();
    scanFlow.addDebugLog('Asset count discarded');
  }, [assetCount, resetAllScanState, scanFlow]);

  const handleEditCombination = useCallback((combinationId: string) => {
    setActiveCombinationId(combinationId);
    setShowEndCountReview(false);
    setShowCombinationPhoto(true);
  }, []);

  // ── Debug Scan ──

  const handleDebugScan = useCallback(async () => {
    const testCodes = ['RGR-TL001', 'TL001', 'RGR-DL001', 'DL001'];
    let asset = null;
    for (const code of testCodes) {
      try {
        asset = await scanFlow.lookupAsset(code);
        if (asset) break;
      } catch {
        // Try next code
      }
    }

    if (!asset) {
      scanFlow.setAlertSheet({
        visible: true,
        type: 'warning',
        title: 'Debug Error',
        message: 'No test assets found. Is the database seeded?',
      });
      return;
    }

    const mockLocation: CachedLocationData = {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      altitude: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    };
    scanFlow.setScannedAsset(asset);
    scanFlow.setEffectiveLocation(mockLocation);
    scanFlow.setMatchedDepot(cachedDepot);
    scanFlow.setShowConfirmSheet(true);
  }, [scanFlow, cachedDepot]);

  // ── Permission Requests ──

  const hasRequestedPermissions = useRef(false);

  useEffect(() => {
    if (hasRequestedPermissions.current) return;
    hasRequestedPermissions.current = true;

    if (!permission?.granted) {
      requestPermission();
    }
    if (!scanFlow.hasLocationPermission) {
      scanFlow.requestLocationPermission();
    }
  }, [permission?.granted, scanFlow, requestPermission]);

  // ── Render ──

  if (!permission || !permission.granted) {
    return (
      <PermissionScreen
        isLoading={!permission}
        onRequestPermission={requestPermission}
      />
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanFlow.handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <CameraOverlay
          assetCountActive={assetCount.isActive}
          assetCountDepotName={assetCount.depotName}
          assetCountScanCount={assetCount.scanCount}
          hasLocationPermission={scanFlow.hasLocationPermission}
          onRequestLocationPermission={scanFlow.requestLocationPermission}
          canPerformAssetCount={canPerformAssetCount}
          onStartAssetCount={handleStartAssetCount}
          onEndAssetCount={handleEndAssetCount}
          onDebugScan={handleDebugScan}
          // Count mode inline components
          scanToast={scanToast}
          onScanToastDismiss={handleScanToastDismiss}
          onScanToastUndo={handleScanToastUndo}
          quickLinkBar={quickLinkBar}
          onQuickLink={handleQuickLink}
          onQuickLinkDismiss={handleQuickLinkDismiss}
        />
      </CameraView>

      <ScanModalStack
        // Scan confirm
        showConfirmSheet={scanFlow.showConfirmSheet}
        scannedAsset={scanFlow.scannedAsset}
        effectiveLocation={scanFlow.effectiveLocation}
        matchedDepot={scanFlow.matchedDepot}
        isCreatingScan={scanFlow.isCreatingScan}
        markForMaintenance={scanFlow.markForMaintenance}
        canMarkMaintenance={canMarkMaintenance}
        onSetMarkForMaintenance={scanFlow.setMarkForMaintenance}
        onConfirmScan={handleConfirmScan}
        onCancelScan={scanFlow.handleCancelScan}
        onConfirmSheetDismiss={handleConfirmSheetDismiss}
        // Defect report
        showDefectReport={defectFlow.showDefectReport}
        isSubmittingDefect={defectFlow.isSubmittingDefect}
        completedAsset={scanFlow.completedAsset}
        onDefectReportSubmit={handleDefectReportSubmit}
        onDefectReportCancel={handleDefectReportCancel}
        onDefectReportDismiss={handleDefectReportDismiss}
        // Photo prompt
        showPhotoPrompt={photoFlow.showPhotoPrompt}
        onPhotoPromptAddPhoto={handlePhotoPromptAddPhoto}
        onPhotoPromptSkip={handlePhotoPromptSkip}
        onPhotoPromptDismiss={photoFlow.handlePhotoPromptDismiss}
        // Camera
        showCamera={photoFlow.showCamera}
        lastScanEventId={scanFlow.lastScanEventId}
        onCameraClose={handleCameraClose}
        onPhotoUploaded={photoFlow.handlePhotoUploaded}
        onCameraDismiss={photoFlow.handleCameraDismiss}
        // Success
        showSuccessSheet={photoFlow.showSuccessSheet}
        successItems={photoFlow.successItems}
        onSuccessDismiss={photoFlow.handleSuccessDismiss}
        // Alert
        alertSheet={scanFlow.alertSheet}
        onAlertDismiss={() => scanFlow.setAlertSheet(prev => ({ ...prev, visible: false }))}
        // Combination link
        showLinkSheet={showLinkSheet}
        previousScanForLink={assetCount.previousScanForLink}
        currentAssetNumber={scanFlow.completedAsset?.assetNumber ?? ''}
        existingComboSize={
          assetCount.previousScanForLink && !isStandaloneScan(assetCount.previousScanForLink)
            ? assetCount.combinations[assetCount.previousScanForLink.combinationId]?.assetIds.length
            : undefined
        }
        onLinkToPrevious={handleLinkToPrevious}
        onKeepSeparate={handleKeepSeparate}
        onLinkSheetDismiss={handleLinkSheetDismiss}
        // Combination photo
        showCombinationPhoto={showCombinationPhoto}
        activeCombinationId={activeCombinationId}
        combinationAssetNumbers={
          activeCombinationId && assetCount.combinations[activeCombinationId]
            ? assetCount.combinations[activeCombinationId].assetNumbers
            : []
        }
        onCombinationPhotoCapture={handleCombinationPhotoCapture}
        onCombinationNotesChange={handleCombinationNotesChange}
        onCombinationPhotoComplete={handleCombinationPhotoComplete}
        onCombinationPhotoSkip={handleCombinationPhotoSkip}
        // End count review
        showEndCountReview={showEndCountReview}
        endCountDepotName={assetCount.depotName ?? ''}
        endCountScans={assetCount.scans}
        endCountCombinations={assetCount.combinations}
        isSubmittingCount={isSubmittingCount}
        onEditCombination={handleEditCombination}
        onSubmitCount={handleSubmitCount}
        onCancelEndCount={handleCancelEndCount}
        onDiscardCount={handleDiscardCount}
      />

      {/* Debug Overlay */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.debugToggle}
          onPress={() => setShowDebugOverlay(prev => !prev)}
        >
          <Text style={styles.debugToggleText}>
            {showDebugOverlay ? '\u2715' : '\uD83D\uDC1B'}
          </Text>
        </TouchableOpacity>
      )}

      {__DEV__ && showDebugOverlay && (
        <View style={styles.debugOverlay}>
              <Text style={styles.debugTitle}>Scan Flow</Text>

              {/* Step 1: QR Scanned */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={scanFlow.scannedAsset ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={scanFlow.scannedAsset ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, scanFlow.scannedAsset && styles.debugStepComplete]}>
                  QR Code Scanned
                </Text>
                {scanFlow.scannedAsset && (
                  <Text style={styles.debugStepDetail}>{scanFlow.scannedAsset.assetNumber}</Text>
                )}
              </View>

              {/* Step 2: Location Acquired */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={scanFlow.effectiveLocation ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={scanFlow.effectiveLocation ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, scanFlow.effectiveLocation && styles.debugStepComplete]}>
                  Location Acquired
                </Text>
              </View>

              {/* Step 3: Depot Matched */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={scanFlow.matchedDepot ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={scanFlow.matchedDepot ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, scanFlow.matchedDepot && styles.debugStepComplete]}>
                  Depot Matched
                </Text>
                {scanFlow.matchedDepot && (
                  <Text style={styles.debugStepDetail}>{scanFlow.matchedDepot.depot.name}</Text>
                )}
              </View>

              {/* Step 4: Confirm Sheet Shown */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={scanFlow.showConfirmSheet ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={scanFlow.showConfirmSheet ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, scanFlow.showConfirmSheet && styles.debugStepComplete]}>
                  Awaiting Confirmation
                </Text>
              </View>

              {/* Step 5: Scan Confirmed */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={scanFlow.completedAsset ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={scanFlow.completedAsset ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, scanFlow.completedAsset && styles.debugStepComplete]}>
                  Scan Confirmed
                </Text>
              </View>

              {/* Step 6: Defect Report (optional) */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={defectFlow.defectReportedRef.current ? 'checkmark-circle' : 'remove-circle-outline'}
                  size={20}
                  color={defectFlow.defectReportedRef.current ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, defectFlow.defectReportedRef.current && styles.debugStepComplete]}>
                  Defect Reported
                </Text>
                <Text style={styles.debugStepOptional}>(optional)</Text>
              </View>

              {/* Step 7: Photo Captured (optional) */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={photoFlow.photoUploadedRef.current ? 'checkmark-circle' : 'remove-circle-outline'}
                  size={20}
                  color={photoFlow.photoUploadedRef.current ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, photoFlow.photoUploadedRef.current && styles.debugStepComplete]}>
                  Photo Uploaded
                </Text>
                <Text style={styles.debugStepOptional}>(optional)</Text>
              </View>

              {/* Step 8: Flow Complete */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={photoFlow.showSuccessSheet ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={photoFlow.showSuccessSheet ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, photoFlow.showSuccessSheet && styles.debugStepComplete]}>
                  Flow Complete
                </Text>
              </View>

              {/* Current Modal State */}
              <Text style={[styles.debugTitle, { marginTop: 12 }]}>Active Modal</Text>
              <Text style={styles.debugModalState}>
                {scanFlow.showConfirmSheet ? 'Confirm Sheet' :
                 defectFlow.showDefectReport ? 'Defect Report' :
                 photoFlow.showPhotoPrompt ? 'Photo Prompt' :
                 photoFlow.showCamera ? 'Camera' :
                 photoFlow.showSuccessSheet ? 'Success Sheet' :
                 'None (Scanning)'}
              </Text>

              {/* Reset Button */}
              <TouchableOpacity
                style={styles.debugResetButton}
                onPress={() => {
                  scanFlow.addDebugLog('Force reset scanner triggered');
                  resetAllScanState();
                }}
              >
                <Ionicons name="refresh" size={16} color={colors.textInverse} />
                <Text style={styles.debugResetButtonText}>Reset Flow</Text>
              </TouchableOpacity>
            </View>
          )}
    </View>
  );
}
