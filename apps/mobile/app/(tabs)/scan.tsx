import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { useScanFlow } from '../../src/hooks/scan/useScanFlow';
import { useAssetAssessment } from '../../src/hooks/useAssetAssessment';
import { usePersistentBackdrop } from '../../src/hooks/usePersistentBackdrop';
import { PersistentBackdrop } from '../../src/components/common/PersistentBackdrop';
import {
  PermissionScreen,
  CameraOverlay,
  ScanConfirmation,
  ScanSuccessFlash,
} from '../../src/components/scanner';
import { SheetModal } from '../../src/components/common/SheetModal';
import { DefectReportSheet } from '../../src/components/scanner/DefectReportSheet';
import { CameraCapture, PhotoReviewSheet } from '../../src/components/photos';
import {
  CreateMaintenanceModal,
  DefectReportDetailModal,
  MaintenanceDetailModal,
} from '../../src/components/maintenance';
import { useAcceptDefect } from '../../src/hooks/useAcceptDefect';
import type { CreateMaintenanceInput } from '@rgr/shared';
import { AlertSheet, ErrorBoundary } from '../../src/components/common';
import { styles } from '../../src/components/scanner/scan.styles';

export default function ScanScreen() {
  const { canReportDefect, canMarkMaintenance } = useUserPermissions();
  const [permission, requestPermission] = useCameraPermissions();

  // ── Unified scan flow ──
  const flow = useScanFlow({ canReportDefect, canMarkMaintenance });

  // ── Persistent backdrop (blur + fade) ──
  const backdrop = usePersistentBackdrop(flow.showOverlay);

  // ── Asset assessment ──
  const assessment = useAssetAssessment(flow.scannedAsset, flow.matchedDepot);

  // ── Preserve asset during exit animation ──
  const lastAssetRef = useRef(flow.scannedAsset);
  if (flow.scannedAsset) lastAssetRef.current = flow.scannedAsset;
  const displayAsset = flow.scannedAsset ?? lastAssetRef.current;

  // ── Force CameraView remount after CameraCapture modal closes ──
  // iOS only allows one AVCaptureSession; CameraCapture steals it.
  // Incrementing the key forces a fresh session on the scan tab's CameraView.
  const cameraKey = useRef(0);
  const wasCameraOpenRef = useRef(false);
  if (flow.cameraOpen && !wasCameraOpenRef.current) {
    wasCameraOpenRef.current = true;
  } else if (!flow.cameraOpen && wasCameraOpenRef.current) {
    wasCameraOpenRef.current = false;
    cameraKey.current++;
  }

  // ── Permission requests (once) ──
  const hasRequestedPermissions = useRef(false);
  useEffect(() => {
    if (hasRequestedPermissions.current) return;
    hasRequestedPermissions.current = true;
    if (!permission?.granted) requestPermission();
    if (!flow.hasLocationPermission) flow.requestLocationPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flow.xxx accesses stable useCallback-wrapped functions; adding `flow` would re-fire on every render
  }, [
    permission?.granted,
    flow.hasLocationPermission,
    flow.requestLocationPermission,
    requestPermission,
  ]);

  // ── Accept defect → create maintenance ──
  const { mutateAsync: acceptDefect } = useAcceptDefect();

  const handleAcceptPress = useCallback(
    (ctx: {
      defectId: string;
      assetId: string;
      assetNumber: string | null;
      title: string;
      description: string | null;
    }) => {
      flow.openAcceptDefect({ type: 'acceptDefect', ...ctx });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flow.openAcceptDefect is a stable useCallback; adding `flow` would recreate on every render
    [flow.openAcceptDefect]
  );

  const acceptCtx = flow.contextModal.type === 'acceptDefect' ? flow.contextModal : null;

  const handleAcceptSubmit = useCallback(
    async (input: CreateMaintenanceInput) => {
      if (!acceptCtx) return;
      await acceptDefect({
        defectReportId: acceptCtx.defectId,
        maintenanceInput: input,
      });
      flow.closeContextModal();
      flow.refetchContext();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flow.xxx accesses stable callbacks; adding `flow` would recreate on every render
    [acceptCtx, acceptDefect, flow.closeContextModal, flow.refetchContext]
  );

  const handleDismissConfirmed = useCallback(() => {
    flow.closeContextModal();
    flow.refetchContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flow.xxx accesses stable callbacks; adding `flow` would recreate on every render
  }, [flow.closeContextModal, flow.refetchContext]);

  // ── Maintenance created callback ──
  const handleTaskCreated = useCallback(() => {
    flow.refetchContext();
    flow.handleMaintenanceCreated();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flow.xxx accesses stable callbacks; adding `flow` would recreate on every render
  }, [flow.refetchContext, flow.handleMaintenanceCreated]);

  // ── Defect cancel (user closed without submitting) ──
  const handleDefectCancel = useCallback(() => {
    flow.handleSheetDismissed();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flow.handleSheetDismissed is a stable useCallback; adding `flow` would recreate on every render
  }, [flow.handleSheetDismissed]);

  // ── Backdrop press ──
  const handleBackdropPress = useCallback(() => {
    // Don't allow backdrop dismiss of confirmation card
  }, []);

  // ── Details expansion → snap point ──
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const handleDetailsExpandedChange = useCallback((expanded: boolean) => {
    setDetailsExpanded(expanded);
  }, []);

  // ── Permission gate ──
  if (!permission || !permission.granted) {
    return (
      <PermissionScreen
        isLoading={!permission}
        onRequestPermission={requestPermission}
        canAskAgain={permission?.canAskAgain}
      />
    );
  }

  const variant = canMarkMaintenance ? 'mechanic' : 'driver';

  return (
    <View style={styles.container}>
      {/* Camera viewfinder (always rendered, keyed to recover after CameraCapture steals session) */}
      <CameraView
        key={cameraKey.current}
        style={styles.camera}
        facing="back"
        onBarcodeScanned={flow.showOverlay ? undefined : flow.handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      >
        {!flow.showOverlay && (
          <CameraOverlay
            hasLocationPermission={flow.hasLocationPermission}
            onRequestLocationPermission={flow.requestLocationPermission}
            scanStep={flow.scanStep}
            onDebugScan={flow.triggerDebugScan}
          />
        )}
      </CameraView>

      {/* Persistent blur backdrop */}
      <PersistentBackdrop
        opacity={backdrop.backdropOpacity}
        showBackdrop={backdrop.showBackdrop}
        mounted={backdrop.mounted}
        onPress={handleBackdropPress}
      />

      {/* Confirmation card (gorhom SheetModal, no backdrop — PersistentBackdrop handles it).
         Unmount during camera to prevent stale gorhom provider stack entries — iOS native
         Modals freeze the underlying display link, so the dismiss animation never completes
         and the provider retains a stale entry that blocks future present() calls. */}
      {displayAsset &&
        !flow.cameraOpen &&
        !flow.activeSheet &&
        flow.contextModal.type === 'closed' &&
        !flow.isContextTransitioning &&
        !acceptCtx && (
          <SheetModal
            visible={flow.showCard}
            onClose={flow.handleUndoPress}
            noBackdrop
            scrollable
            snapPoint={detailsExpanded ? '92%' : '85%'}
            preventDismissWhileBusy={flow.isCreatingScan}
          >
            {variant === 'mechanic' ? (
              <ScanConfirmation
                variant="mechanic"
                asset={displayAsset}
                matchedDepot={flow.matchedDepot}
                isCreating={flow.isCreatingScan}
                onConfirm={flow.handleConfirmAction}
                onUndoPress={flow.handleUndoPress}
                photoCompleted={flow.photoCompleted}
                defectCompleted={flow.defectCompleted}
                maintenanceCompleted={flow.maintenanceCompleted}
                disabled={flow.buttonsDisabled}
                assessment={assessment}
                scanContext={flow.scanContext}
                onDefectPress={flow.openDefectDetail}
                onTaskPress={flow.openMaintenanceDetail}
                onDetailsExpandedChange={handleDetailsExpandedChange}
              />
            ) : (
              <ScanConfirmation
                variant="driver"
                asset={displayAsset}
                matchedDepot={flow.matchedDepot}
                isCreating={flow.isCreatingScan}
                onConfirm={flow.handleConfirmAction}
                onUndoPress={flow.handleUndoPress}
                photoCompleted={flow.photoCompleted}
                defectCompleted={flow.defectCompleted}
                disabled={flow.buttonsDisabled}
                assessment={assessment}
                scanContext={flow.scanContext}
                onDefectPress={flow.openDefectDetail}
                onDetailsExpandedChange={handleDetailsExpandedChange}
              />
            )}
          </SheetModal>
        )}

      {/* Sub-sheets (noBackdrop — PersistentBackdrop handles it) */}
      <DefectReportSheet
        visible={flow.activeSheet === 'defect'}
        isSubmitting={flow.isSubmittingDefect}
        onSubmit={flow.handleDefectSubmit}
        onCancel={handleDefectCancel}
        onExitComplete={flow.handleSheetExitComplete}
        showPhotoOption={true}
        noBackdrop
      />

      {/* Conditionally mount so the BottomSheetModal registers fresh each time.
         After a native Camera Modal, gorhom's present() is silently dropped on
         a previously-registered modal. Fresh mount = fresh registration = works. */}
      {flow.activeSheet === 'review' && (
        <PhotoReviewSheet
          visible
          photoType={flow.activePhotoType}
          onClose={flow.handleSheetDismissed}
          onConfirmed={flow.handlePhotoFlowComplete}
          onRetake={flow.handleReviewRetake}
          onExitComplete={flow.handleSheetExitComplete}
          noBackdrop
        />
      )}

      {flow.scannedAsset && (
        <CreateMaintenanceModal
          visible={flow.activeSheet === 'createTask'}
          onClose={flow.handleSheetDismissed}
          assetId={flow.scannedAsset.id}
          assetNumber={flow.scannedAsset.assetNumber}
          onCreated={handleTaskCreated}
          noBackdrop
          onExitComplete={flow.handleSheetExitComplete}
        />
      )}

      {/* Context modals (orthogonal to scan flow) */}
      <DefectReportDetailModal
        visible={flow.contextModal.type === 'defectDetail'}
        defectId={flow.contextModal.type === 'defectDetail' ? flow.contextModal.defectId : null}
        onClose={flow.closeContextModal}
        onAcceptPress={handleAcceptPress}
        onDismissConfirmed={handleDismissConfirmed}
        variant="compact"
        noBackdrop
        onExitComplete={flow.handleContextExitComplete}
      />
      <MaintenanceDetailModal
        visible={flow.contextModal.type === 'maintenanceDetail'}
        maintenanceId={
          flow.contextModal.type === 'maintenanceDetail' ? flow.contextModal.maintenanceId : null
        }
        onClose={flow.closeContextModal}
        variant="compact"
        noBackdrop
        onExitComplete={flow.handleContextExitComplete}
      />
      {acceptCtx && (
        <CreateMaintenanceModal
          visible
          onClose={flow.closeContextModal}
          assetId={acceptCtx.assetId}
          assetNumber={acceptCtx.assetNumber}
          defectReportId={acceptCtx.defectId}
          defaultTitle={acceptCtx.description ?? acceptCtx.title}
          defaultDescription={undefined}
          defaultPriority="medium"
          onExternalSubmit={handleAcceptSubmit}
          noBackdrop
          onExitComplete={flow.handleContextExitComplete}
        />
      )}

      {/* Camera (native Modal — required for tab bar coverage) */}
      {flow.scannedAsset && (
        <ErrorBoundary>
          <CameraCapture
            visible={flow.cameraOpen}
            assetId={flow.scannedAsset.id}
            photoType={flow.activePhotoType}
            scanEventId={flow.lastScanEventId}
            locationDescription={flow.matchedDepot?.depot.name ?? null}
            latitude={flow.effectiveLocation?.latitude ?? null}
            longitude={flow.effectiveLocation?.longitude ?? null}
            onClose={flow.handleCameraCancelled}
            onCapturedUri={flow.handleCameraCaptured}
          />
        </ErrorBoundary>
      )}

      {/* Success flash */}
      <ScanSuccessFlash
        visible={flow.isCompleting}
        assetNumber={flow.completionSummary?.assetNumber ?? ''}
        depotName={flow.completionSummary?.depotName ?? null}
        photoCompleted={flow.completionSummary?.photoCompleted ?? false}
        defectCompleted={flow.completionSummary?.defectCompleted ?? false}
        maintenanceCompleted={flow.completionSummary?.maintenanceCompleted ?? false}
        onDismiss={flow.handleCompletionDismiss}
      />

      {/* Alert Sheet for errors */}
      <AlertSheet
        visible={flow.alertSheet.visible}
        type={flow.alertSheet.type}
        title={flow.alertSheet.title}
        message={flow.alertSheet.message}
        onDismiss={() => flow.setAlertSheet((prev) => ({ ...prev, visible: false }))}
        actionLabel={flow.alertSheet.actionLabel}
        onAction={flow.alertSheet.onAction}
      />
    </View>
  );
}
