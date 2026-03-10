import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Modal,
  Animated,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { useScanActionFlow } from '../../src/hooks/scan/useScanActionFlow';
import { useAssetAssessment } from '../../src/hooks/useAssetAssessment';
import { PermissionScreen, CameraOverlay, ScanConfirmation, ScanSuccessFlash } from '../../src/components/scanner';
import type { ConfirmAction } from '../../src/components/scanner/ScanConfirmation';
import { DefectReportSheet } from '../../src/components/scanner/DefectReportSheet';
import { CameraCapture, PhotoReviewSheet } from '../../src/components/photos';
import { CreateMaintenanceModal, DefectReportDetailModal, MaintenanceDetailModal } from '../../src/components/maintenance';
import { useAcceptDefect } from '../../src/hooks/useAcceptDefect';
import type { CreateMaintenanceInput } from '@rgr/shared';
import { AlertSheet, ErrorBoundary } from '../../src/components/common';
import { styles } from '../../src/components/scanner/scan.styles';

export default function ScanScreen() {
  const permissions = useUserPermissions();
  const { canMarkMaintenance } = permissions;
  const [permission, requestPermission] = useCameraPermissions();

  // ── Single-action confirm flow ref (passed into flow hook so cancel clears it) ──
  const confirmedActionRef = useRef<ConfirmAction>(null);

  // ── Unified scan flow hook ──

  const flow = useScanActionFlow({ canMarkMaintenance, confirmedActionRef });

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
    pendingSheet,
    lastScanEventId,
    effectiveLocation,
    handleCameraClose,
    handlePhotoCaptured,
    handleReviewConfirmed,
    handleReviewRetake,
    handleReviewClose,
    handleSheetDismiss,
    handleCloseSheet,
    isSubmittingDefect,
    handleDefectCancel,
    handleDefectSubmit: flowDefectSubmit,
    alertSheet,
    setAlertSheet,
    triggerDebugScan,
    activePhotoType,
  } = flow;

  // ── Bottom sheet animation state ──
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
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
    depotName: string | null;
    photoCompleted: boolean;
    defectCompleted: boolean;
    maintenanceCompleted: boolean;
  } | null>(null);

  // Unmount Modal after success flash is dismissed (card already slid out)
  useEffect(() => {
    if (!successFlash && !showCard && isPanelMounted) {
      setIsPanelMounted(false);
    }
  }, [successFlash, showCard, isPanelMounted]);

  // ── Context detail modal state ──
  const [contextDefectId, setContextDefectId] = useState<string | null>(null);
  const [contextMaintenanceId, setContextMaintenanceId] = useState<string | null>(null);

  // ── Accept defect → create maintenance task flow ──
  const { mutateAsync: acceptDefect } = useAcceptDefect();
  const [acceptDefectContext, setAcceptDefectContext] = useState<{
    defectId: string;
    assetId: string;
    assetNumber?: string;
    title: string;
    description?: string | null;
  } | null>(null);

  // Fade confirmation card when a context modal overlays it
  const confirmOpacity = useRef(new Animated.Value(1)).current;
  const contextModalOpen = contextDefectId !== null || contextMaintenanceId !== null || acceptDefectContext !== null;

  useEffect(() => {
    Animated.timing(confirmOpacity, {
      toValue: contextModalOpen ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [contextModalOpen, confirmOpacity]);

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

  // ── Sheet slide animation ──
  useEffect(() => {
    if (showCard) {
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      setIsPanelMounted(true);

      // Delay animation to next frame so Modal is rendered first
      requestAnimationFrame(() => {
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }).start();
      });
    } else {
      Animated.spring(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        friction: 9,
        tension: 50,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !successFlash) {
          setIsPanelMounted(false);
        }
      });
    }
  }, [showCard, sheetTranslateY, SCREEN_HEIGHT, successFlash]);

  // ── Single-action confirm flow ──

  const prevActiveSheetRef = useRef(activeSheet);

  const finishConfirmFlow = useCallback(() => {
    if (scannedAsset) {
      setSuccessFlash({
        assetNumber: scannedAsset.assetNumber,
        depotName: matchedDepot?.depot.name ?? null,
        photoCompleted,
        defectCompleted,
        maintenanceCompleted,
      });
    }
    setContextDefectId(null);
    setContextMaintenanceId(null);
    setAcceptDefectContext(null);
    confirmedActionRef.current = null;
    handleDonePress();
  }, [handleDonePress, scannedAsset, matchedDepot, photoCompleted, defectCompleted, maintenanceCompleted]);

  // When a sheet closes after a confirmed action, go to success flash
  // Skip when pendingSheet exists — another sheet is about to open via RESOLVE_PENDING
  useEffect(() => {
    const wasOpen = prevActiveSheetRef.current !== null;
    const nowClosed = activeSheet === null;
    prevActiveSheetRef.current = activeSheet;
    if (wasOpen && nowClosed && !pendingSheet && confirmedActionRef.current !== null) {
      finishConfirmFlow();
    }
  }, [activeSheet, pendingSheet, finishConfirmFlow]);

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
    setAcceptDefectContext(null);
    confirmedActionRef.current = null;
    handleUndoPress();
  }, [handleUndoPress]);

  // ── Task created callback (refresh scan context + mark completed) ──
  const { markMaintenanceCompleted } = flow;

  const handleTaskCreated = useCallback(() => {
    refetchContext();
    markMaintenanceCompleted();
  }, [refetchContext, markMaintenanceCompleted]);

  // ── Accept defect handlers ──
  const handleAcceptPress = useCallback((context: {
    defectId: string;
    assetId: string;
    assetNumber?: string;
    title: string;
    description?: string | null;
  }) => {
    setContextDefectId(null);
    setAcceptDefectContext(context);
  }, []);

  const handleAcceptSubmit = useCallback(async (input: CreateMaintenanceInput) => {
    if (!acceptDefectContext) return;
    await acceptDefect({
      defectReportId: acceptDefectContext.defectId,
      maintenanceInput: input,
    });
    setAcceptDefectContext(null);
    refetchContext();
  }, [acceptDefectContext, acceptDefect, refetchContext]);

  // ── Dismiss defect flow (confirmation + delete handled inside DefectReportDetailModal) ──
  const handleDismissConfirmed = useCallback(() => {
    setContextDefectId(null);
    refetchContext();
  }, [refetchContext]);

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
            onDebugScan={triggerDebugScan}
          />
        )}
      </CameraView>

      {/* Blur backdrop + confirmation bottom sheet (Modal for z-index above tab header) */}
      <Modal visible={isPanelMounted} transparent animationType="none" statusBarTranslucent>
        <SafeAreaProvider>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
        {displayAsset && (
          <Animated.View
            style={[
              styles.confirmSheet,
              { transform: [{ translateY: sheetTranslateY }], opacity: confirmOpacity },
            ]}
            pointerEvents={contextModalOpen ? 'none' : 'auto'}
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
                scanContext={flow.scanContext}
                onDefectPress={(id) => setContextDefectId(id)}
                onTaskPress={(id) => setContextMaintenanceId(id)}
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

        {/* Context modals — rendered inline (no nested native Modal) to avoid iOS stacking issues */}
        <DefectReportDetailModal
          visible={contextDefectId !== null}
          defectId={contextDefectId}
          onClose={() => setContextDefectId(null)}
          onAcceptPress={handleAcceptPress}
          onDismissConfirmed={handleDismissConfirmed}
          variant="compact"
        />
        <MaintenanceDetailModal
          visible={contextMaintenanceId !== null}
          maintenanceId={contextMaintenanceId}
          onClose={() => setContextMaintenanceId(null)}
          variant="compact"
        />
        {/* Create maintenance from defect accept */}
        {acceptDefectContext && (
          <CreateMaintenanceModal
            visible
            onClose={() => setAcceptDefectContext(null)}
            assetId={acceptDefectContext.assetId}
            assetNumber={acceptDefectContext.assetNumber}
            defectReportId={acceptDefectContext.defectId}
            defaultTitle={acceptDefectContext.title}
            defaultDescription={acceptDefectContext.description ?? undefined}
            defaultPriority="high"
            onExternalSubmit={handleAcceptSubmit}
          />
        )}

        {/* Photo Review — rendered inline to avoid iOS stacked-Modal layout issues */}
        <PhotoReviewSheet
          visible={activeSheet === 'review'}
          photoType={activePhotoType}
          onClose={handleReviewClose}
          onConfirmed={handleReviewConfirmed}
          onRetake={handleReviewRetake}
          onExitComplete={handleSheetDismiss}
        />

        {/* Success flash — inside Modal so it renders above the dark backdrop */}
        <ScanSuccessFlash
          visible={successFlash !== null}
          assetNumber={successFlash?.assetNumber ?? ''}
          depotName={successFlash?.depotName ?? null}
          photoCompleted={successFlash?.photoCompleted ?? false}
          defectCompleted={successFlash?.defectCompleted ?? false}
          maintenanceCompleted={successFlash?.maintenanceCompleted ?? false}
          onDismiss={() => setSuccessFlash(null)}
        />
        </SafeAreaProvider>
      </Modal>

      {/* ── Sheet modals (controlled by activeSheet enum) ── */}

      {/* Camera */}
      {scannedAsset && (
        <ErrorBoundary>
          <CameraCapture
            visible={activeSheet === 'camera'}
            assetId={scannedAsset.id}
            photoType={activePhotoType}
            scanEventId={lastScanEventId}
            locationDescription={matchedDepot?.depot.name ?? null}
            latitude={effectiveLocation?.latitude ?? null}
            longitude={effectiveLocation?.longitude ?? null}
            onClose={handleCameraClose}
            onPhotoCaptured={handlePhotoCaptured}
            onDismiss={handleSheetDismiss}
          />
        </ErrorBoundary>
      )}

      {/* Defect Report (no photo option in new flow) */}
      <DefectReportSheet
        visible={activeSheet === 'defect'}
        isSubmitting={isSubmittingDefect}
        onSubmit={flowDefectSubmit}
        onCancel={handleDefectCancel}
        onExitComplete={handleSheetDismiss}
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

    </View>
  );
}
