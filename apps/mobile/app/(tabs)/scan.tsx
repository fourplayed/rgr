import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  InteractionManager,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useTutorialStore } from '../../src/store/tutorialStore';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { UserRoleLabels, getDepotBadgeColors } from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { useScanActionFlow } from '../../src/hooks/scan/useScanActionFlow';
import { PermissionScreen, CameraOverlay, ScanConfirmation } from '../../src/components/scanner';
import { DefectReportSheet } from '../../src/components/scanner/DefectReportSheet';
import { CameraCapture } from '../../src/components/photos';
import { CreateMaintenanceModal } from '../../src/components/maintenance';
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
    scanContext,
    isContextLoading,
    contextError,
    refetchContext,
    handleDonePress,
    handlePhotoPress,
    handleDefectPress,
    handleTaskPress,
    photoCompleted,
    defectCompleted,
    buttonsDisabled,
    showCard,
    handleBarCodeScanned,
    hasLocationPermission,
    requestLocationPermission,
    scanStatus,
    resolvedDepot: flowResolvedDepot,
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

  // ── Badge data for CameraOverlay (memoized for React.memo) ──

  const depotBadge = useMemo(() => {
    if (!flowResolvedDepot) return null;
    const { bg, text } = getDepotBadgeColors(flowResolvedDepot.depot);
    return { label: flowResolvedDepot.depot.name, bgColor: bg, textColor: text };
  }, [flowResolvedDepot]);

  const roleBadge = useMemo(() => {
    const r = permissions.role;
    if (!r) return null;
    return {
      label: UserRoleLabels[r] ?? r,
      color: colors.userRole[r] ?? colors.textSecondary,
    };
  }, [permissions.role]);

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

  // ── Context press (mechanic taps summary row → navigate to asset detail) ──

  const handleContextPress = useCallback(() => {
    if (!scannedAsset) return;
    router.push(`/assets/${scannedAsset.id}`);
    handleDonePress();
  }, [scannedAsset, handleDonePress]);

  // ── Render ──

  if (!permission || !permission.granted) {
    return (
      <PermissionScreen
        isLoading={!permission}
        onRequestPermission={requestPermission}
      />
    );
  }

  // Determine variant
  const variant = canMarkMaintenance ? 'mechanic' : 'driver';

  return (
    <View style={styles.container}>
      {showCard && scannedAsset ? (
        variant === 'mechanic' ? (
          <ScanConfirmation
            variant="mechanic"
            asset={scannedAsset}
            matchedDepot={matchedDepot}
            isCreating={isCreatingScan}
            scanContext={scanContext}
            isContextLoading={isContextLoading}
            contextError={contextError}
            onRetryContext={refetchContext}
            onPhotoPress={handlePhotoPress}
            onDefectPress={handleDefectPress}
            onTaskPress={handleTaskPress}
            onDonePress={handleDonePress}
            onUndoPress={handleUndoPress}
            onContextPress={handleContextPress}
            photoCompleted={photoCompleted}
            defectCompleted={defectCompleted}
            disabled={buttonsDisabled}
          />
        ) : (
          <ScanConfirmation
            variant="driver"
            asset={scannedAsset}
            matchedDepot={matchedDepot}
            isCreating={isCreatingScan}
            onPhotoPress={handlePhotoPress}
            onDonePress={handleDonePress}
            onUndoPress={handleUndoPress}
            photoCompleted={photoCompleted}
            disabled={buttonsDisabled}
          />
        )
      ) : (
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        >
          <CameraOverlay
            hasLocationPermission={hasLocationPermission}
            onRequestLocationPermission={requestLocationPermission}
            scanStatus={scanStatus}
            depotBadge={depotBadge}
            roleBadge={roleBadge}
            onDebugScan={__DEV__ ? triggerDebugScan : undefined}
          />
        </CameraView>
      )}

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
        showPhotoOption={false}
      />

      {/* Create Maintenance Task */}
      {scannedAsset && (
        <CreateMaintenanceModal
          visible={activeSheet === 'createTask'}
          onClose={handleCloseSheet}
          assetId={scannedAsset.id}
          assetNumber={scannedAsset.assetNumber}
        />
      )}

      {/* Alert Sheet for errors */}
      <AlertSheet
        visible={alertSheet.visible}
        type={alertSheet.type}
        title={alertSheet.title}
        message={alertSheet.message}
        onDismiss={() => setAlertSheet(prev => ({ ...prev, visible: false }))}
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
