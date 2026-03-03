import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  InteractionManager,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuthStore } from '../../src/store/authStore';
import { useTutorialStore } from '../../src/store/tutorialStore';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { useScanFlow } from '../../src/hooks/scan/useScanFlow';
import { usePhotoFlow } from '../../src/hooks/scan/usePhotoFlow';
import { useDefectFlow } from '../../src/hooks/scan/useDefectFlow';
import { PermissionScreen } from '../../src/components/scanner/PermissionScreen';
import { CameraOverlay } from '../../src/components/scanner/CameraOverlay';
import { ScanModalStack } from '../../src/components/scanner/ScanModalStack';
import { TutorialSheet } from '../../src/components/common';
import { styles } from '../../src/components/scanner/scan.styles';

export default function ScanScreen() {
  const { user } = useAuthStore();
  const { canMarkMaintenance } = useUserPermissions();
  const [permission, requestPermission] = useCameraPermissions();

  // Tutorial state
  const hasSeenScan = useTutorialStore(s => s.seen.scan);
  const hasHydrated = useTutorialStore(s => s._hasHydrated);
  const markSeen = useTutorialStore(s => s.markSeen);
  const [showScanTutorial, setShowScanTutorial] = useState(false);

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
  }, [scanFlow, photoFlow, defectFlow]);

  resetAllScanStateRef.current = resetAllScanState;

  // ── Orchestration: Confirm Sheet Dismiss ──

  const handleConfirmSheetDismiss = useCallback(() => {
    scanFlow.addDebugLog('Confirm sheet dismissed (native callback)');
    if (defectFlow.resolvePending()) {
      // Defect report shown
    } else {
      photoFlow.resolvePending();
    }
  }, [scanFlow, defectFlow, photoFlow]);

  // ── Orchestration: Confirm Scan ──

  const handleConfirmScan = useCallback(async () => {
    const action = await scanFlow.handleConfirmScan({
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
    }
  }, [scanFlow, canMarkMaintenance, defectFlow, photoFlow]);

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
      queueCamera: (depot, photoType) => photoFlow.queueCamera(depot, photoType),
      showSuccess: (items) => photoFlow.showSuccessWithItems(items),
    });
  }, [defectFlow, scanFlow, user, photoFlow]);

  const handleDefectReportCancel = useCallback(() => {
    defectFlow.handleDefectReportCancel(photoFlow.queuePhotoPrompt);
  }, [defectFlow, photoFlow]);

  const handleDefectReportDismiss = useCallback(() => {
    scanFlow.addDebugLog('Defect report dismissed (native callback)');
    if (photoFlow.pendingCamera) {
      photoFlow.handlePhotoPromptDismiss();
    } else {
      photoFlow.resolvePending();
    }
  }, [scanFlow, photoFlow]);

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

  // ── Scan Tutorial (first visit, after camera ready) ──

  useEffect(() => {
    if (!hasHydrated) return;
    if (hasSeenScan) return;
    if (!permission?.granted) return;

    const task = InteractionManager.runAfterInteractions(() => {
      setShowScanTutorial(true);
    });
    return () => task.cancel();
  }, [hasHydrated, hasSeenScan, permission?.granted]);

  const handleScanTutorialDismiss = useCallback(() => {
    setShowScanTutorial(false);
    markSeen('scan');
  }, [markSeen]);

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
          hasLocationPermission={scanFlow.hasLocationPermission}
          onRequestLocationPermission={scanFlow.requestLocationPermission}
          scanStatus={scanFlow.scanStatus}
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
        photoType={photoFlow.photoTypeRef.current}
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
      />

      <TutorialSheet
        visible={showScanTutorial}
        icon="qr-code-outline"
        title="Getting Started"
        body="Point your camera at an asset QR code. We'll detect it automatically and ask you to confirm the scan."
        buttonLabel="GOT IT"
        onDismiss={handleScanTutorialDismiss}
      />

    </View>
  );
}
