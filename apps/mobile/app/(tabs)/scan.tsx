import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  InteractionManager,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/authStore';
import { useTutorialStore } from '../../src/store/tutorialStore';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { UserRoleLabels } from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { useScanActionFlow } from '../../src/hooks/scan/useScanActionFlow';
import { assetKeys } from '../../src/hooks/useAssetData';
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
  const { user } = useAuthStore();
  const permissions = useUserPermissions();
  const { canMarkMaintenance } = permissions;
  const [permission, requestPermission] = useCameraPermissions();
  const queryClient = useQueryClient();

  // Tutorial state
  const hasSeenScan = useTutorialStore(s => s.seen.scan);
  const hasHydrated = useTutorialStore(s => s._hasHydrated);
  const markSeen = useTutorialStore(s => s.markSeen);
  const [showScanTutorial, setShowScanTutorial] = useState(false);

  // ── Unified scan flow hook ──

  const flow = useScanActionFlow({ canMarkMaintenance });

  // ── Badge data for CameraOverlay (memoized for React.memo) ──

  const depotName = useMemo(
    () => flow.resolvedDepot?.depot.name ?? null,
    [flow.resolvedDepot],
  );

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
    if (!flow.hasLocationPermission) {
      flow.requestLocationPermission();
    }
  }, [permission?.granted, flow, requestPermission]);

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

  // ── Sheet dismiss: invalidate scan context after detail modals ──

  const handleDetailSheetDismiss = useCallback(() => {
    // Invalidate scan context so the card refreshes after status changes
    if (flow.scannedAsset) {
      queryClient.invalidateQueries({
        queryKey: assetKeys.scanContext(flow.scannedAsset.id),
      });
    }
    flow.handleSheetDismiss();
  }, [flow, queryClient]);

  // ── Defect submit wrapper (adapts onSubmit signature) ──

  const handleDefectSubmit = useCallback(
    (notes: string, _wantsPhoto: boolean) => {
      // wantsPhoto is always false in new flow (showPhotoOption={false})
      flow.handleDefectSubmit(notes);
    },
    [flow],
  );

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
  const scanCardElement = flow.showCard && flow.scannedAsset ? (
    variant === 'mechanic' ? (
      <ScanCard
        variant="mechanic"
        asset={flow.scannedAsset}
        matchedDepot={flow.matchedDepot}
        isCreating={flow.isCreatingScan}
        scanContext={flow.scanContext}
        isContextLoading={flow.isContextLoading}
        contextError={flow.contextError}
        onRetryContext={flow.refetchContext}
        onDefectPress={(id) => flow.handleInlineItemPress('defect', id)}
        onTaskPress={(id) => flow.handleInlineItemPress('task', id)}
        onDonePress={flow.handleDonePress}
      />
    ) : (
      <ScanCard
        variant="driver"
        asset={flow.scannedAsset}
        matchedDepot={flow.matchedDepot}
        isCreating={flow.isCreatingScan}
      />
    )
  ) : null;

  // Build ScanActionBar element
  const scanActionBarElement = flow.showCard ? (
    variant === 'mechanic' ? (
      <ScanActionBar
        variant="mechanic"
        onPhotoPress={flow.handlePhotoPress}
        onDefectPress={flow.handleDefectPress}
        onTaskPress={flow.handleTaskPress}
        photoCompleted={flow.photoCompleted}
        defectCompleted={flow.defectCompleted}
        disabled={flow.buttonsDisabled}
      />
    ) : (
      <ScanActionBar
        variant="driver"
        onPhotoPress={flow.handlePhotoPress}
        onDonePress={flow.handleDonePress}
        photoCompleted={flow.photoCompleted}
        disabled={flow.buttonsDisabled}
      />
    )
  ) : null;

  // Build ScanToast element
  const scanToastElement = (
    <ScanToast
      visible={flow.showUndoToast}
      message={`Scanned ${flow.scannedAsset?.assetNumber ?? 'asset'}`}
      type="success"
      onUndo={flow.handleUndoPress}
      onDismiss={flow.handleToastDismiss}
      toastId={flow.toastId}
    />
  );

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={flow.handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <CameraOverlay
          hasLocationPermission={flow.hasLocationPermission}
          onRequestLocationPermission={flow.requestLocationPermission}
          scanStatus={flow.scanStatus}
          depotName={depotName}
          roleBadge={roleBadge}
          scanCard={scanCardElement}
          scanActionBar={scanActionBarElement}
          scanToast={scanToastElement}
        />
      </CameraView>

      {/* ── Sheet modals (controlled by activeSheet enum) ── */}

      {/* Camera */}
      {flow.scannedAsset && (
        <ErrorBoundary>
          <CameraCapture
            visible={flow.activeSheet === 'camera'}
            assetId={flow.scannedAsset.id}
            photoType="freight"
            scanEventId={flow.lastScanEventId}
            locationDescription={flow.matchedDepot?.depot.name ?? null}
            latitude={flow.effectiveLocation?.latitude ?? null}
            longitude={flow.effectiveLocation?.longitude ?? null}
            onClose={flow.handleCameraClose}
            onPhotoUploaded={flow.handlePhotoUploaded}
            onDismiss={flow.handleSheetDismiss}
          />
        </ErrorBoundary>
      )}

      {/* Defect Report (no photo option in new flow) */}
      <DefectReportSheet
        visible={flow.activeSheet === 'defect'}
        assetNumber={flow.scannedAsset?.assetNumber ?? ''}
        isSubmitting={flow.isSubmittingDefect}
        onSubmit={handleDefectSubmit}
        onCancel={flow.handleDefectCancel}
        onDismiss={flow.handleSheetDismiss}
        showPhotoOption={false}
      />

      {/* Create Maintenance Task */}
      {flow.scannedAsset && (
        <CreateMaintenanceModal
          visible={flow.activeSheet === 'createTask'}
          onClose={() => flow.handleCloseSheet()}
          assetId={flow.scannedAsset.id}
          assetNumber={flow.scannedAsset.assetNumber}
        />
      )}

      {/* Maintenance Detail (compact variant) */}
      <MaintenanceDetailModal
        visible={flow.activeSheet === 'taskDetail'}
        maintenanceId={flow.selectedItemId}
        onClose={() => flow.handleCloseSheet()}
        variant="compact"
      />

      {/* Defect Report Detail (compact variant) */}
      <DefectReportDetailModal
        visible={flow.activeSheet === 'defectDetail'}
        defectId={flow.selectedItemId}
        onClose={() => flow.handleCloseSheet()}
        variant="compact"
      />

      {/* Alert Sheet for errors */}
      <AlertSheet
        visible={flow.alertSheet.visible}
        type={flow.alertSheet.type}
        title={flow.alertSheet.title}
        message={flow.alertSheet.message}
        onDismiss={() => flow.setAlertSheet(prev => ({ ...prev, visible: false }))}
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
