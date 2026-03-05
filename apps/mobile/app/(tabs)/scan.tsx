import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  InteractionManager,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTutorialStore } from '../../src/store/tutorialStore';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { UserRoleLabels, getDepotBadgeColors, formatAssetNumber } from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { useScanActionFlow } from '../../src/hooks/scan/useScanActionFlow';
import { PermissionScreen, CameraOverlay } from '../../src/components/scanner';
import { ScanCard } from '../../src/components/scanner/ScanCard';
import { ScanActionBar } from '../../src/components/scanner/ScanActionBar';
import { ScanToast } from '../../src/components/scanner/ScanToast';
import { DefectReportSheet } from '../../src/components/scanner/DefectReportSheet';
import { CameraCapture } from '../../src/components/photos';
import { CreateMaintenanceModal, MaintenanceDetailModal, DefectReportDetailModal } from '../../src/components/maintenance';
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
    handleInlineItemPress,
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
    showUndoToast,
    handleUndoPress,
    handleToastDismiss,
    toastId: flowToastId,
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
    selectedItemId,
    alertSheet,
    setAlertSheet,
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

  // ── Render ──

  if (!permission || !permission.granted) {
    return (
      <PermissionScreen
        isLoading={!permission}
        onRequestPermission={requestPermission}
      />
    );
  }

  // Determine variant for card + action bar
  const variant = canMarkMaintenance ? 'mechanic' : 'driver';

  // Build ScanCard element
  const scanCardElement = showCard && scannedAsset ? (
    variant === 'mechanic' ? (
      <ScanCard
        variant="mechanic"
        asset={scannedAsset}
        matchedDepot={matchedDepot}
        isCreating={isCreatingScan}
        scanContext={scanContext}
        isContextLoading={isContextLoading}
        contextError={contextError}
        onRetryContext={refetchContext}
        onDefectPress={(id) => handleInlineItemPress('defect', id)}
        onTaskPress={(id) => handleInlineItemPress('task', id)}
        onDonePress={handleDonePress}
      />
    ) : (
      <ScanCard
        variant="driver"
        asset={scannedAsset}
        matchedDepot={matchedDepot}
        isCreating={isCreatingScan}
      />
    )
  ) : null;

  // Build ScanActionBar element
  const scanActionBarElement = showCard ? (
    variant === 'mechanic' ? (
      <ScanActionBar
        variant="mechanic"
        onPhotoPress={handlePhotoPress}
        onDefectPress={handleDefectPress}
        onTaskPress={handleTaskPress}
        photoCompleted={photoCompleted}
        defectCompleted={defectCompleted}
        disabled={buttonsDisabled}
      />
    ) : (
      <ScanActionBar
        variant="driver"
        onPhotoPress={handlePhotoPress}
        onDonePress={handleDonePress}
        photoCompleted={photoCompleted}
        disabled={buttonsDisabled}
      />
    )
  ) : null;

  // Build ScanToast element
  const scanToastElement = (
    <ScanToast
      visible={showUndoToast}
      message={`Scanned ${scannedAsset?.assetNumber ? formatAssetNumber(scannedAsset.assetNumber) : 'asset'}`}
      type="success"
      onUndo={handleUndoPress}
      onDismiss={handleToastDismiss}
      toastId={flowToastId}
    />
  );

  return (
    <View style={styles.container}>
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
          scanCard={scanCardElement}
          scanActionBar={scanActionBarElement}
          scanToast={scanToastElement}
        />
      </CameraView>

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

      {/* Maintenance Detail (compact variant) */}
      <MaintenanceDetailModal
        visible={activeSheet === 'taskDetail'}
        maintenanceId={selectedItemId}
        onClose={handleCloseSheet}
        variant="compact"
      />

      {/* Defect Report Detail (compact variant) */}
      <DefectReportDetailModal
        visible={activeSheet === 'defectDetail'}
        defectId={selectedItemId}
        onClose={handleCloseSheet}
        variant="compact"
      />

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
