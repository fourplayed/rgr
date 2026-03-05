import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Animated,
  InteractionManager,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useTutorialStore } from '../../src/store/tutorialStore';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { UserRoleLabels, getDepotBadgeColors } from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { useScanActionFlow } from '../../src/hooks/scan/useScanActionFlow';
import { PermissionScreen, CameraOverlay, ScanConfirmation } from '../../src/components/scanner';
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

  // ── Context detail modal state ──
  const [contextDefectId, setContextDefectId] = useState<string | null>(null);
  const [contextMaintenanceId, setContextMaintenanceId] = useState<string | null>(null);

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

  // ── Blur backdrop + sheet slide animation ──
  useEffect(() => {
    if (showCard) {
      setIsPanelMounted(true);
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
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsPanelMounted(false);
        }
      });
    }
  }, [showCard, backdropOpacity, sheetTranslateY, SCREEN_HEIGHT]);

  // ── Context item handlers (mechanic taps individual defect/task) ──

  const handleDefectItemPress = useCallback((defectId: string) => {
    setContextDefectId(defectId);
  }, []);

  const handleTaskItemPress = useCallback((maintenanceId: string) => {
    setContextMaintenanceId(maintenanceId);
  }, []);

  // ── Wrap done/undo to also clear context detail modals ──

  const handleDonePressWithReset = useCallback(() => {
    setContextDefectId(null);
    setContextMaintenanceId(null);
    handleDonePress();
  }, [handleDonePress]);

  const handleUndoPressWithReset = useCallback(() => {
    setContextDefectId(null);
    setContextMaintenanceId(null);
    handleUndoPress();
  }, [handleUndoPress]);

  // ── Task created callback (refresh scan context) ──

  const handleTaskCreated = useCallback(() => {
    refetchContext();
  }, [refetchContext]);

  // ── Context press (mechanic taps summary row → navigate to asset detail) ──

  const handleContextPress = useCallback(() => {
    if (!scannedAsset) return;
    router.push(`/assets/${scannedAsset.id}`);
    handleDonePressWithReset();
  }, [scannedAsset, handleDonePressWithReset]);

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
            depotBadge={depotBadge}
            roleBadge={roleBadge}
            onDebugScan={__DEV__ ? triggerDebugScan : undefined}
          />
        )}
      </CameraView>

      {/* Blur backdrop + confirmation bottom sheet */}
      {isPanelMounted && displayAsset && (
        <>
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}>
            <BlurView
              intensity={50}
              tint="dark"
              style={{ flex: 1, backgroundColor: 'rgba(0,0,30,0.3)' }}
            />
          </Animated.View>
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
                scanContext={scanContext}
                isContextLoading={isContextLoading}
                contextError={contextError}
                onRetryContext={refetchContext}
                onPhotoPress={handlePhotoPress}
                onDefectPress={handleDefectPress}
                onTaskPress={handleTaskPress}
                onDonePress={handleDonePressWithReset}
                onUndoPress={handleUndoPressWithReset}
                onContextPress={handleContextPress}
                onDefectItemPress={handleDefectItemPress}
                onTaskItemPress={handleTaskItemPress}
                photoCompleted={photoCompleted}
                defectCompleted={defectCompleted}
                disabled={buttonsDisabled}
              />
            ) : (
              <ScanConfirmation
                variant="driver"
                asset={displayAsset}
                matchedDepot={matchedDepot}
                isCreating={isCreatingScan}
                onPhotoPress={handlePhotoPress}
                onDonePress={handleDonePressWithReset}
                onUndoPress={handleUndoPressWithReset}
                photoCompleted={photoCompleted}
                disabled={buttonsDisabled}
              />
            )}
          </Animated.View>
        </>
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
