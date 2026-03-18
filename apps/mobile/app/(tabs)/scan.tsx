import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { useScanFlow } from '../../src/hooks/scan/useScanFlow';
import type { AlertSheetState } from '../../src/hooks/scan/types';
import { useDefectMaintenanceModals } from '../../src/hooks/useDefectMaintenanceModals';
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
import { CreateMaintenanceModal } from '../../src/components/maintenance';
import { DefectMaintenanceModals } from '../../src/components/common/DefectMaintenanceModals';
import { AlertSheet, ErrorBoundary } from '../../src/components/common';
import { styles } from '../../src/components/scanner/scan.styles';

export default function ScanScreen() {
  const { canReportDefect, canMarkMaintenance } = useUserPermissions();
  const [permission, requestPermission] = useCameraPermissions();

  // ── Context modals (shared hook — same as home, maintenance, assets/[id]) ──
  const modals = useDefectMaintenanceModals();

  // ── Alert sheet (owned here, passed down) ──
  const [alertSheet, setAlertSheet] = useState<AlertSheetState>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  // ── Unified scan flow ──
  const flow = useScanFlow({
    canReportDefect,
    canMarkMaintenance,
    setAlertSheet,
    onBeforeUndo: modals.closeModal,
  });

  // ── Reactive refetch: when a context modal closes, refetch scan context ──
  const prevModalTypeRef = useRef(modals.modal.type);
  useEffect(() => {
    if (prevModalTypeRef.current !== 'none' && modals.modal.type === 'none') {
      flow.refetchContext();
    }
    prevModalTypeRef.current = modals.modal.type;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flow.refetchContext is a stable React Query refetch fn
  }, [modals.modal.type, flow.refetchContext]);

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

      {/* Confirmation card mount guard — each condition prevents a specific gorhom conflict:
       * displayAsset              — no asset scanned yet
       * !flow.cameraOpen          — native Modal freezes display link, gorhom dismiss never completes
       * !flow.activeSheet         — sub-sheet animating out would collide in gorhom provider stack
       * modals.modal.type === 'none' — context modal occupies the same gorhom portal slot
       *                               (subsumes old !acceptCtx condition)
       * !modals.isTransitioning   — context modal A→B transition in progress
       */}
      {displayAsset &&
        !flow.cameraOpen &&
        !flow.activeSheet &&
        modals.modal.type === 'none' &&
        !modals.isTransitioning && (
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
                onDefectPress={modals.openDefectDetail}
                onTaskPress={modals.openMaintenanceDetail}
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
                onDefectPress={modals.openDefectDetail}
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

      {/* SCAN-SPECIFIC: renderBackdrop={false} because the scan screen's own
       * PersistentBackdrop (driven by flow.showOverlay) already covers context
       * modals. Do NOT change to renderBackdrop={true} or use without this flag. */}
      <DefectMaintenanceModals {...modals} variant="compact" renderBackdrop={false} />

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
        visible={alertSheet.visible}
        type={alertSheet.type}
        title={alertSheet.title}
        message={alertSheet.message}
        onDismiss={() => setAlertSheet((prev) => ({ ...prev, visible: false }))}
        actionLabel={alertSheet.actionLabel}
        onAction={alertSheet.onAction}
      />
    </View>
  );
}
