import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  Animated,
  InteractionManager,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { useTutorialStore } from '../../src/store/tutorialStore';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { useScanActionFlow } from '../../src/hooks/scan/useScanActionFlow';
import { useAssetAssessment } from '../../src/hooks/useAssetAssessment';
import { PermissionScreen, CameraOverlay, ScanConfirmation, ScanSuccessFlash } from '../../src/components/scanner';
import type { ConfirmAction } from '../../src/components/scanner/ScanConfirmation';
import { DefectReportSheet } from '../../src/components/scanner/DefectReportSheet';
import { CameraCapture } from '../../src/components/photos';
import { CreateMaintenanceModal, DefectReportDetailModal, MaintenanceDetailModal } from '../../src/components/maintenance';
import { TutorialSheet, AlertSheet, ErrorBoundary } from '../../src/components/common';
import { styles } from '../../src/components/scanner/scan.styles';

export default function ScanScreen() {
  const permissions = useUserPermissions();
  const { canMarkMaintenance } = permissions;
  const [permission, requestPermission] = useCameraPermissions();

  // Tutorial state
  const hasSeenScan = useTutorialStore(s => s.seen.scan);
  const hasHydrated = useTutorialStore(s => s._hasHydrated);
  const markSeen = useTutorialStore(s => s.markSeen);
  const [showScanTutorial, setShowScanTutorial] = useState(false);

  // ── Unified scan flow hook ──

  const flow = useScanActionFlow({ canMarkMaintenance });

  // ── Destructure stable handlers from flow (avoids object reference instability) ──

  const {
    scannedAsset,
    matchedDepot,
    isCreatingScan,
    refetchContext,
    handleDonePress,
    handlePhotoPress,
    handleDefectPress,
    handleTaskPress,
    photoCompleted,
    defectCompleted,
    maintenanceCompleted,
    buttonsDisabled,
    showCard,
    handleBarCodeScanned,
    hasLocationPermission,
    requestLocationPermission,
    scanStatus,
    handleUndoPress,
    activeSheet,
    lastScanEventId,
    effectiveLocation,
    handleCameraClose,
    handlePhotoUploaded,
    handleSheetDismiss,
    handleCloseSheet,
    isSubmittingDefect,
    handleDefectCancel,
    handleDefectSubmit: flowDefectSubmit,
    alertSheet,
    setAlertSheet,
    triggerDebugScan,
  } = flow;

  // ── Bottom sheet animation state ──
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const lastAssetRef = useRef(scannedAsset);

  // Preserve asset content during exit animation
  if (scannedAsset) {
    lastAssetRef.current = scannedAsset;
  }

  // ── Success flash state ──
  const [successFlash, setSuccessFlash] = useState<{
    assetNumber: string;
    photoCompleted: boolean;
    defectCompleted: boolean;
    maintenanceCompleted: boolean;
  } | null>(null);

  // ── Context detail modal state ──
  const [contextDefectId, setContextDefectId] = useState<string | null>(null);
  const [contextMaintenanceId, setContextMaintenanceId] = useState<string | null>(null);

  // ── Asset assessment (lazy-loaded when asset is scanned) ──
  const assessment = useAssetAssessment(scannedAsset, matchedDepot);

  // ── Permission Requests ──

  const hasRequestedPermissions = useRef(false);

  useEffect(() => {
    if (hasRequestedPermissions.current) return;
    hasRequestedPermissions.current = true;

    if (!permission?.granted) {
      requestPermission();
    }
    if (!hasLocationPermission) {
      requestLocationPermission();
    }
  }, [permission?.granted, hasLocationPermission, requestLocationPermission, requestPermission]);

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

  // ── Blur backdrop + sheet slide animation ──
  useEffect(() => {
    if (showCard) {
      // Reset to off-screen before mounting so first frame is correct
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      setIsPanelMounted(true);

      // Delay animation to next frame so Modal is rendered first
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 65,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          friction: 9,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsPanelMounted(false);
        }
      });
    }
  }, [showCard, backdropOpacity, sheetTranslateY, SCREEN_HEIGHT]);

  // ── Single-action confirm flow ──

  const confirmedActionRef = useRef<ConfirmAction>(null);
  const prevActiveSheetRef = useRef(activeSheet);

  const finishConfirmFlow = useCallback(() => {
    if (scannedAsset) {
      setSuccessFlash({
        assetNumber: scannedAsset.assetNumber,
        photoCompleted,
        defectCompleted,
        maintenanceCompleted,
      });
    }
    setContextDefectId(null);
    setContextMaintenanceId(null);
    confirmedActionRef.current = null;
    handleDonePress();
  }, [handleDonePress, scannedAsset, photoCompleted, defectCompleted, maintenanceCompleted]);

  // When a sheet closes after a confirmed action, go to success flash
  useEffect(() => {
    const wasOpen = prevActiveSheetRef.current !== null;
    const nowClosed = activeSheet === null;
    prevActiveSheetRef.current = activeSheet;
    if (wasOpen && nowClosed && confirmedActionRef.current !== null) {
      finishConfirmFlow();
    }
  }, [activeSheet, finishConfirmFlow]);

  const handleConfirm = useCallback((action: ConfirmAction) => {
    if (action === null) {
      finishConfirmFlow();
      return;
    }
    confirmedActionRef.current = action;
    if (action === 'photo') handlePhotoPress();
    else if (action === 'defect') handleDefectPress();
    else if (action === 'maintenance') handleTaskPress();
  }, [finishConfirmFlow, handlePhotoPress, handleDefectPress, handleTaskPress]);

  const handleUndoPressWithReset = useCallback(() => {
    setContextDefectId(null);
    setContextMaintenanceId(null);
    confirmedActionRef.current = null;
    handleUndoPress();
  }, [handleUndoPress]);

  // ── Task created callback (refresh scan context + mark completed) ──
  const { markMaintenanceCompleted } = flow;

  const handleTaskCreated = useCallback(() => {
    refetchContext();
    markMaintenanceCompleted();
  }, [refetchContext, markMaintenanceCompleted]);

  // ── Render ──

  if (!permission || !permission.granted) {
    return (
      <PermissionScreen
        isLoading={!permission}
        onRequestPermission={requestPermission}
        canAskAgain={permission?.canAskAgain}
      />
    );
  }

  // Determine variant
  const variant = canMarkMaintenance ? 'mechanic' : 'driver';

  // Use lastAssetRef during exit animation so content doesn't vanish mid-slide
  const displayAsset = scannedAsset ?? lastAssetRef.current;

  return (
    <View style={styles.container}>
      {/* Camera always rendered underneath */}
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={showCard ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        {!showCard && (
          <CameraOverlay
            hasLocationPermission={hasLocationPermission}
            onRequestLocationPermission={requestLocationPermission}
            scanStatus={scanStatus}
            onDebugScan={__DEV__ ? triggerDebugScan : undefined}
          />
        )}
      </CameraView>

      {/* Blur backdrop + confirmation bottom sheet (Modal for z-index above tab header) */}
      <Modal visible={isPanelMounted} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}>
          <BlurView
            intensity={50}
            tint="dark"
            style={{ flex: 1, backgroundColor: 'rgba(0,0,30,0.3)' }}
          />
        </Animated.View>
        {displayAsset && (
          <Animated.View
            style={[
              styles.confirmSheet,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            {variant === 'mechanic' ? (
              <ScanConfirmation
                variant="mechanic"
                asset={displayAsset}
                matchedDepot={matchedDepot}
                isCreating={isCreatingScan}
                onConfirm={handleConfirm}
                onUndoPress={handleUndoPressWithReset}
                photoCompleted={photoCompleted}
                defectCompleted={defectCompleted}
                maintenanceCompleted={maintenanceCompleted}
                disabled={buttonsDisabled}
                assessment={assessment}
              />
            ) : (
              <ScanConfirmation
                variant="driver"
                asset={displayAsset}
                matchedDepot={matchedDepot}
                isCreating={isCreatingScan}
                onConfirm={handleConfirm}
                onUndoPress={handleUndoPressWithReset}
                photoCompleted={photoCompleted}
                disabled={buttonsDisabled}
                assessment={assessment}
              />
            )}
          </Animated.View>
        )}
      </Modal>

      {/* Success flash overlay (after confirm) */}
      <ScanSuccessFlash
        visible={successFlash !== null}
        assetNumber={successFlash?.assetNumber ?? ''}
        photoCompleted={successFlash?.photoCompleted ?? false}
        defectCompleted={successFlash?.defectCompleted ?? false}
        maintenanceCompleted={successFlash?.maintenanceCompleted ?? false}
        onDismiss={() => setSuccessFlash(null)}
      />

      {/* ── Sheet modals (controlled by activeSheet enum) ── */}

      {/* Camera */}
      {scannedAsset && (
        <ErrorBoundary>
          <CameraCapture
            visible={activeSheet === 'camera'}
            assetId={scannedAsset.id}
            photoType="freight"
            scanEventId={lastScanEventId}
            locationDescription={matchedDepot?.depot.name ?? null}
            latitude={effectiveLocation?.latitude ?? null}
            longitude={effectiveLocation?.longitude ?? null}
            onClose={handleCameraClose}
            onPhotoUploaded={handlePhotoUploaded}
            onDismiss={handleSheetDismiss}
          />
        </ErrorBoundary>
      )}

      {/* Defect Report (no photo option in new flow) */}
      <DefectReportSheet
        visible={activeSheet === 'defect'}
        assetNumber={scannedAsset?.assetNumber ?? ''}
        isSubmitting={isSubmittingDefect}
        onSubmit={flowDefectSubmit}
        onCancel={handleDefectCancel}
        onDismiss={handleSheetDismiss}
        showPhotoOption={true}
      />

      {/* Create Maintenance Task */}
      {scannedAsset && (
        <CreateMaintenanceModal
          visible={activeSheet === 'createTask'}
          onClose={handleCloseSheet}
          assetId={scannedAsset.id}
          assetNumber={scannedAsset.assetNumber}
          onCreated={handleTaskCreated}
          showBeginOption={canMarkMaintenance}
        />
      )}

      {/* Alert Sheet for errors */}
      <AlertSheet
        visible={alertSheet.visible}
        type={alertSheet.type}
        title={alertSheet.title}
        message={alertSheet.message}
        onDismiss={() => setAlertSheet(prev => ({ ...prev, visible: false }))}
        actionLabel={alertSheet.actionLabel}
        onAction={alertSheet.onAction}
      />

      {/* Context detail modals (inline previews during scan flow) */}
      <DefectReportDetailModal
        visible={contextDefectId !== null}
        defectId={contextDefectId}
        onClose={() => setContextDefectId(null)}
        variant="compact"
      />
      <MaintenanceDetailModal
        visible={contextMaintenanceId !== null}
        maintenanceId={contextMaintenanceId}
        onClose={() => setContextMaintenanceId(null)}
        variant="compact"
      />

      <TutorialSheet
        visible={showScanTutorial}
        icon="qr-code-outline"
        title="Getting Started"
        body="Point your camera at an asset QR code. We'll detect it automatically and confirm your scan."
        buttonLabel="GOT IT"
        onDismiss={handleScanTutorialDismiss}
      />

    </View>
  );
}
