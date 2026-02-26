import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAssetByQRCode, useCreateScanEvent, useUpdateAsset } from '../../src/hooks/useAssetData';
import { useCreateMaintenance } from '../../src/hooks/useMaintenanceData';
import { useLocation } from '../../src/hooks/useLocation';
import { useQRScanner } from '../../src/hooks/useQRScanner';
import { useDepots, findNearestDepot } from '../../src/hooks/useDepots';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { useUserPermissions } from '../../src/contexts/UserPermissionsContext';
import { useAssetCountMode } from '../../src/hooks/useAssetCountMode';
import { ScanConfirmSheet } from '../../src/components/scanner/ScanConfirmSheet';
import { MaintenanceCheckbox } from '../../src/components/scanner/MaintenanceCheckbox';
import { DefectReportSheet } from '../../src/components/scanner/DefectReportSheet';
import { ScanSuccessSheet } from '../../src/components/scanner/ScanSuccessSheet';
import { CombinationLinkSheet } from '../../src/components/scanner/CombinationLinkSheet';
import { CombinationPhotoSheet } from '../../src/components/scanner/CombinationPhotoSheet';
import { EndCountReviewSheet } from '../../src/components/scanner/EndCountReviewSheet';
import { PhotoPromptSheet, CameraCapture } from '../../src/components/photos';
import { AlertSheet, ErrorBoundary } from '../../src/components/common';
import type { Asset, Depot } from '@rgr/shared';
import { submitAssetCount, isStandaloneScan } from '@rgr/shared';
import type { CachedLocationData } from '../../src/store/locationStore';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../src/theme/layout';
import { logger } from '../../src/utils/logger';

export default function ScanScreen() {
  const { user } = useAuthStore();
  const {
    resolvedDepot: cachedDepot,
    lastLocation: cachedLocation,
    isLocationStale,
  } = useLocationStore();
  const { canMarkMaintenance, canPerformAssetCount } = useUserPermissions();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [matchedDepot, setMatchedDepot] = useState<{ depot: Depot; distanceKm: number } | null>(null);
  const [effectiveLocation, setEffectiveLocation] = useState<CachedLocationData | null>(null);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
  const [pendingPhotoPrompt, setPendingPhotoPrompt] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingCamera, setPendingCamera] = useState(false);
  const [lastScanEventId, setLastScanEventId] = useState<string | null>(null);
  const [completedAsset, setCompletedAsset] = useState<Asset | null>(null);

  // Role-specific state
  const [markForMaintenance, setMarkForMaintenance] = useState(false);

  // Defect report state
  const [showDefectReport, setShowDefectReport] = useState(false);
  const [pendingDefectReport, setPendingDefectReport] = useState(false);

  // Success modal state
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [pendingSuccessSheet, setPendingSuccessSheet] = useState(false);
  const [successItems, setSuccessItems] = useState<Array<{ label: string; value?: string }>>([]);
  // Track photo upload and defect report status via refs (not state)
  // This avoids unnecessary re-renders since these values are only read in callbacks
  const photoUploadedRef = useRef(false);
  const defectReportedRef = useRef(false);
  // Capture matchedDepot when camera opens to prevent stale closure issues
  const matchedDepotForCameraRef = useRef<{ depot: Depot; distanceKm: number } | null>(null);
  const [isSubmittingDefect, setIsSubmittingDefect] = useState(false);

  // Alert sheet state
  const [alertSheet, setAlertSheet] = useState<{
    visible: boolean;
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ visible: false, type: 'error', title: '', message: '' });

  // Count complete success sheet state
  const [showCountCompleteSheet, setShowCountCompleteSheet] = useState(false);
  const [countCompleteItems, setCountCompleteItems] = useState<Array<{ label: string; value?: string }>>([]);

  // Asset Count mode (managers+)
  const assetCount = useAssetCountMode();

  // Combination flow state
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [pendingLinkSheet, setPendingLinkSheet] = useState(false);
  const [showCombinationPhoto, setShowCombinationPhoto] = useState(false);
  const [pendingCombinationPhoto, setPendingCombinationPhoto] = useState(false);
  const [showEndCountReview, setShowEndCountReview] = useState(false);
  const [isSubmittingCount, setIsSubmittingCount] = useState(false);
  const [activeCombinationId, setActiveCombinationId] = useState<string | null>(null);

  const {
    requestLocation,
    hasPermission: hasLocationPermission,
    requestPermission: requestLocationPermission,
  } = useLocation();

  // Fetch depots for location matching
  const { data: depots } = useDepots();

  const { mutateAsync: lookupAsset } = useAssetByQRCode();
  const { mutateAsync: createScan, isPending: isCreatingScan } = useCreateScanEvent();
  const { mutateAsync: updateAssetMutation } = useUpdateAsset();
  const { mutateAsync: createMaintenance } = useCreateMaintenance();

  // Debug state
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_debugLog, setDebugLog] = useState<string[]>([]);
  const addDebugLog = useCallback((msg: string) => {
    setDebugLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const { handleBarCodeScanned, resetScanner } = useQRScanner(
    async (qrData) => {
      try {
        logger.scan(`QR code detected: ${qrData.substring(0, 30)}...`);

        // Check if we have a cached location/depot from sign-in that's still fresh
        const useCachedLocation = cachedLocation && !isLocationStale() && cachedDepot;

        let scanLocation: CachedLocationData | null = null;
        let nearestDepot: { depot: Depot; distanceKm: number } | null = null;

        if (useCachedLocation) {
          // Use cached location and depot - skip GPS request
          logger.scan('Using cached location from sign-in');
          scanLocation = cachedLocation;
          nearestDepot = cachedDepot;
          logger.scan(`Cached location: ${scanLocation.latitude.toFixed(4)}, ${scanLocation.longitude.toFixed(4)}`);
          logger.scan(`Cached depot: ${nearestDepot.depot.name} (${nearestDepot.distanceKm.toFixed(2)} km)`);
        } else {
          // Get fresh location
          logger.scan('Requesting current location...');
          const freshLocation = await requestLocation();

          if (!freshLocation) {
            logger.scan('Failed to get location');
            setAlertSheet({
              visible: true,
              type: 'error',
              title: 'Location Required',
              message: 'Unable to get current location',
            });
            resetScanner();
            return;
          }
          scanLocation = freshLocation;
          logger.scan(`Location acquired: ${scanLocation.latitude.toFixed(4)}, ${scanLocation.longitude.toFixed(4)}`);

          // Find nearest depot to current location
          logger.scan('Searching for nearest depot...');
          if (depots && depots.length > 0) {
            nearestDepot = findNearestDepot(
              scanLocation.latitude,
              scanLocation.longitude,
              depots
            );
          }
          if (nearestDepot) {
            logger.scan(`Matched depot: ${nearestDepot.depot.name} (${nearestDepot.distanceKm.toFixed(2)} km)`);
          } else {
            logger.warn('No depot matched');
          }
        }

        setEffectiveLocation(scanLocation);
        setMatchedDepot(nearestDepot);

        // Lookup asset from QR code
        logger.scan('Looking up asset...');
        const asset = await lookupAsset(qrData);
        logger.scan(`Asset found: ${asset.assetNumber}`);

        // Show confirmation sheet
        logger.scan('Showing confirmation sheet');
        setScannedAsset(asset);
        setShowConfirmSheet(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to scan QR code';
        logger.error(`Scan error: ${message}`);
        setAlertSheet({
          visible: true,
          type: 'error',
          title: 'Scan Failed',
          message,
        });
        resetScanner();
      }
    }
  );

  const handleConfirmScan = async () => {
    addDebugLog('handleConfirmScan called');
    if (!scannedAsset || !effectiveLocation || !user) {
      addDebugLog(`Missing: asset=${!!scannedAsset} loc=${!!effectiveLocation} user=${!!user}`);
      logger.error('Missing required information for scan');
      setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Missing required information',
      });
      return;
    }

    try {
      addDebugLog('Creating scan event...');
      logger.scan('Submitting scan event...');
      // Create the scan event
      const scanEvent = await createScan({
        assetId: scannedAsset.id,
        scannedBy: user.id,
        scanType: 'qr_scan',
        latitude: effectiveLocation.latitude,
        longitude: effectiveLocation.longitude,
        accuracy: effectiveLocation.accuracy,
        altitude: effectiveLocation.altitude,
        heading: effectiveLocation.heading,
        speed: effectiveLocation.speed,
        locationDescription: matchedDepot ? matchedDepot.depot.name : null,
      });
      addDebugLog('Scan created: ' + scanEvent.id.substring(0, 8));
      logger.scan('Scan event created successfully');

      // Update asset's assigned depot if we matched one
      if (matchedDepot) {
        logger.scan(`Updating asset depot to ${matchedDepot.depot.name}...`);
        await updateAssetMutation({
          id: scannedAsset.id,
          input: { assignedDepotId: matchedDepot.depot.id },
        });
        logger.scan('Asset depot updated');
      }

      // Success haptic and animation
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.scan('Scan completed successfully!');

      // Close confirm sheet and route to appropriate next step
      setLastScanEventId(scanEvent.id);
      setCompletedAsset(scannedAsset);

      // Asset Count Mode: Add to count session and check for combination linking
      if (assetCount.isActive) {
        // Add scan to count session as standalone first
        assetCount.addScan({
          type: 'standalone',
          assetId: scannedAsset.id,
          assetNumber: scannedAsset.assetNumber ?? 'Unknown',
          timestamp: Date.now(),
        });
        assetCount.confirmScan();

        // Check if we can offer to link to previous
        // Need at least 2 scans total (previous + current)
        if (assetCount.scans.length >= 1) {
          // After confirmScan, scans array will have the new scan
          // canLinkToPrevious will be true if there's a previous scan
          addDebugLog('Asset count: checking for link option');
          setPendingLinkSheet(true);
        }
        setShowConfirmSheet(false);
        setMarkForMaintenance(false);
        return;
      }

      if (markForMaintenance && canMarkMaintenance) {
        // Route to defect report sheet to collect details
        addDebugLog('Closing confirm sheet, pending defect report');
        setPendingDefectReport(true);
      } else {
        // Route to photo prompt for freight photo
        addDebugLog('Closing confirm sheet, pending photo prompt');
        setPendingPhotoPrompt(true);
      }

      setMarkForMaintenance(false); // Reset for next scan
      setShowConfirmSheet(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit scan';
      addDebugLog(`ERROR: ${message}`);
      logger.error(`Submit failed: ${message}`);
      setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Scan Failed',
        message,
      });
    }
  };

  /**
   * Resets all scan-related state to initial values.
   * Centralizes state reset logic to prevent inconsistencies.
   */
  const resetAllScanState = useCallback(() => {
    // Modal visibility
    setShowConfirmSheet(false);
    setShowPhotoPrompt(false);
    setShowCamera(false);
    setShowDefectReport(false);
    setShowSuccessSheet(false);
    setShowLinkSheet(false);
    setShowCombinationPhoto(false);
    setShowEndCountReview(false);
    // Pending states
    setPendingPhotoPrompt(false);
    setPendingCamera(false);
    setPendingDefectReport(false);
    setPendingSuccessSheet(false);
    setPendingLinkSheet(false);
    setPendingCombinationPhoto(false);
    // Data states
    setScannedAsset(null);
    setCompletedAsset(null);
    setMatchedDepot(null);
    setEffectiveLocation(null);
    setLastScanEventId(null);
    setSuccessItems([]);
    setMarkForMaintenance(false);
    setActiveCombinationId(null);
    // Status flags (refs only)
    photoUploadedRef.current = false;
    defectReportedRef.current = false;
    matchedDepotForCameraRef.current = null;
    // Scanner state
    resetScanner();
  }, [resetScanner]);

  const handleCancelScan = () => {
    setShowConfirmSheet(false);
    setScannedAsset(null);
    setMatchedDepot(null);
    setEffectiveLocation(null);
    setMarkForMaintenance(false);
    resetScanner();
  };

  // Called when confirm sheet dismiss animation completes (iOS)
  const handleConfirmSheetDismiss = useCallback(() => {
    addDebugLog('Confirm sheet dismissed (native callback)');
    if (pendingLinkSheet && assetCount.canLinkToPrevious) {
      addDebugLog('Showing link sheet now');
      setPendingLinkSheet(false);
      setShowLinkSheet(true);
    } else if (pendingLinkSheet) {
      // No previous scan to link to, just reset
      addDebugLog('No previous scan to link, resetting');
      setPendingLinkSheet(false);
      resetScanner();
    } else if (pendingDefectReport) {
      addDebugLog('Showing defect report now');
      setPendingDefectReport(false);
      setShowDefectReport(true);
    } else if (pendingPhotoPrompt) {
      addDebugLog('Showing photo prompt now');
      setPendingPhotoPrompt(false);
      setShowPhotoPrompt(true);
    }
  }, [pendingDefectReport, pendingPhotoPrompt, pendingLinkSheet, assetCount.canLinkToPrevious, addDebugLog, resetScanner]);

  const handlePhotoPromptAddPhoto = useCallback(() => {
    addDebugLog('Add Photo tapped - pending camera');
    // Capture matchedDepot for camera close handler (prevents stale closure)
    matchedDepotForCameraRef.current = matchedDepot;
    setPendingCamera(true); // Will show after modal dismiss
    setShowPhotoPrompt(false);
  }, [addDebugLog, matchedDepot]);

  // Called when photo prompt dismiss animation completes (iOS)
  const handlePhotoPromptDismiss = useCallback(() => {
    addDebugLog('Photo prompt dismissed (native callback)');
    if (pendingCamera) {
      addDebugLog('Showing camera now');
      setPendingCamera(false);
      setShowCamera(true);
    } else if (pendingSuccessSheet) {
      addDebugLog('Showing success sheet now');
      setPendingSuccessSheet(false);
      setShowSuccessSheet(true);
    }
  }, [pendingCamera, pendingSuccessSheet, addDebugLog]);

  const handlePhotoPromptSkip = useCallback(() => {
    // Complete the flow without photo - pending success sheet after dismiss
    setSuccessItems([
      {
        label: 'Asset location updated',
        value: matchedDepot?.depot.name ?? 'Location recorded',
      },
    ]);
    setPendingSuccessSheet(true);
    setShowPhotoPrompt(false);
  }, [matchedDepot]);

  // Defect Report handlers
  const handleDefectReportSubmit = useCallback(async (notes: string, wantsPhoto: boolean) => {
    if (!completedAsset || !user || !lastScanEventId) {
      setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Missing required information',
      });
      return;
    }

    setIsSubmittingDefect(true);
    addDebugLog('Submitting defect report...');

    try {
      await createMaintenance({
        assetId: completedAsset.id,
        reportedBy: user.id,
        title: `Defect reported - ${completedAsset.assetNumber}`,
        description: notes,
        priority: 'high',
        status: 'scheduled',
        scanEventId: lastScanEventId,
      });
      addDebugLog('Defect report created');

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (wantsPhoto) {
        // User wants to take a photo of the defect
        addDebugLog('User wants defect photo - pending camera');
        defectReportedRef.current = true;
        // Capture matchedDepot for camera close handler (prevents stale closure)
        matchedDepotForCameraRef.current = matchedDepot;
        setPendingCamera(true);
        setShowDefectReport(false);
      } else {
        // Complete without photo - show success sheet
        setShowDefectReport(false);
        setSuccessItems([
          {
            label: 'Asset location updated',
            value: matchedDepot?.depot.name ?? 'Location recorded',
          },
          { label: 'Defect report submitted' },
        ]);
        setShowSuccessSheet(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit defect report';
      addDebugLog(`ERROR: ${message}`);
      setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Error',
        message,
      });
    } finally {
      setIsSubmittingDefect(false);
    }
  }, [completedAsset, user, lastScanEventId, matchedDepot, createMaintenance, addDebugLog]);

  const handleDefectReportCancel = useCallback(() => {
    addDebugLog('Defect report cancelled');
    // Go back to photo prompt instead
    setShowDefectReport(false);
    setPendingPhotoPrompt(true);
  }, [addDebugLog]);

  const handleDefectReportDismiss = useCallback(() => {
    addDebugLog('Defect report dismissed (native callback)');
    if (pendingCamera) {
      addDebugLog('Showing camera now');
      setPendingCamera(false);
      setShowCamera(true);
    } else if (pendingPhotoPrompt) {
      addDebugLog('Showing photo prompt now');
      setPendingPhotoPrompt(false);
      setShowPhotoPrompt(true);
    }
  }, [pendingCamera, pendingPhotoPrompt, addDebugLog]);

  const handleCameraClose = useCallback(() => {
    // Build success items based on what was completed (use refs for latest values)
    // Use the captured ref to avoid stale closure issues with matchedDepot
    const depotName = matchedDepotForCameraRef.current?.depot.name ?? 'Location recorded';
    const items: Array<{ label: string; value?: string }> = [
      {
        label: 'Asset location updated',
        value: depotName,
      },
    ];
    if (defectReportedRef.current) {
      items.push({ label: 'Defect report submitted' });
    }
    if (photoUploadedRef.current) {
      items.push({ label: 'Photo successfully uploaded' });
    }
    setSuccessItems(items);
    setPendingSuccessSheet(true);
    setShowCamera(false);
  }, []);

  const handleCameraDismiss = useCallback(() => {
    addDebugLog('Camera dismissed (native callback)');
    if (pendingSuccessSheet) {
      addDebugLog('Showing success sheet now');
      setPendingSuccessSheet(false);
      setShowSuccessSheet(true);
      photoUploadedRef.current = false;
      defectReportedRef.current = false;
    }
  }, [pendingSuccessSheet, addDebugLog]);

  // Asset Count handlers (managers+)
  const handleStartAssetCount = useCallback(() => {
    if (!cachedDepot) {
      setAlertSheet({
        visible: true,
        type: 'warning',
        title: 'No Depot',
        message: 'Please wait for location to be determined before starting a count.',
      });
      return;
    }
    assetCount.startCount(cachedDepot.depot.id, cachedDepot.depot.name);
  }, [cachedDepot, assetCount]);

  const handleEndAssetCount = useCallback(() => {
    // Show review sheet instead of simple confirm
    setShowEndCountReview(true);
  }, []);

  // Combination Link handlers
  const handleLinkToPrevious = useCallback(() => {
    addDebugLog('Linking to previous asset');
    assetCount.linkToPrevious();
    // Get the combination ID for photo capture
    const comboId = assetCount.getLastCombinationId();
    if (comboId) {
      setActiveCombinationId(comboId);
      setPendingCombinationPhoto(true);
    }
    setShowLinkSheet(false);
  }, [assetCount, addDebugLog]);

  const handleKeepSeparate = useCallback(() => {
    addDebugLog('Keeping scan separate');
    assetCount.keepSeparate();
    setShowLinkSheet(false);
    resetScanner();
  }, [assetCount, addDebugLog, resetScanner]);

  const handleLinkSheetDismiss = useCallback(() => {
    addDebugLog('Link sheet dismissed');
    if (pendingCombinationPhoto && activeCombinationId) {
      addDebugLog('Showing combination photo now');
      setPendingCombinationPhoto(false);
      setShowCombinationPhoto(true);
    } else {
      resetScanner();
    }
  }, [pendingCombinationPhoto, activeCombinationId, addDebugLog, resetScanner]);

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
    addDebugLog('Combination photo complete');
    setShowCombinationPhoto(false);
    setActiveCombinationId(null);
    resetScanner();
  }, [addDebugLog, resetScanner]);

  const handleCombinationPhotoSkip = useCallback(() => {
    addDebugLog('Combination photo skipped');
    setShowCombinationPhoto(false);
    setActiveCombinationId(null);
    resetScanner();
  }, [addDebugLog, resetScanner]);

  // End Count Review handlers
  const handleSubmitCount = useCallback(async () => {
    if (!assetCount.depotId || !user) {
      setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Missing required information',
      });
      return;
    }

    setIsSubmittingCount(true);
    addDebugLog('Submitting asset count...');

    try {
      // Build items array from scans
      const items = assetCount.scans.map(scan => ({
        assetId: scan.assetId,
        combinationId: isStandaloneScan(scan) ? null : scan.combinationId,
        combinationPosition: isStandaloneScan(scan) ? null : scan.combinationPosition,
      }));

      // Build combinations array
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
      addDebugLog('Asset count submitted successfully');

      const count = assetCount.scanCount;
      const comboCount = assetCount.combinationCount;
      assetCount.endCount();
      setShowEndCountReview(false);

      // Show success sheet
      const successItems = [
        { label: 'Asset count completed', value: `${count} assets recorded` },
      ];
      if (comboCount > 0) {
        successItems.push({ label: 'Combinations', value: `${comboCount} linked groups` });
      }
      setCountCompleteItems(successItems);
      setShowCountCompleteSheet(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit count';
      addDebugLog(`ERROR: ${message}`);
      setAlertSheet({
        visible: true,
        type: 'error',
        title: 'Submit Failed',
        message,
      });
    } finally {
      setIsSubmittingCount(false);
    }
  }, [assetCount, user, addDebugLog]);

  const handleCancelEndCount = useCallback(() => {
    setShowEndCountReview(false);
  }, []);

  const handleEditCombination = useCallback((combinationId: string) => {
    setActiveCombinationId(combinationId);
    setShowEndCountReview(false);
    setShowCombinationPhoto(true);
  }, []);

  const handlePhotoUploaded = useCallback(() => {
    logger.scan('Photo uploaded successfully');
    photoUploadedRef.current = true;
  }, []);

  const handleSuccessDismiss = useCallback(() => {
    resetAllScanState();
  }, [resetAllScanState]);

  // Track if initial permission requests have been made
  const hasRequestedPermissions = useRef(false);

  // Request camera and location permissions on mount
  useEffect(() => {
    if (hasRequestedPermissions.current) return;
    hasRequestedPermissions.current = true;

    if (!permission?.granted) {
      requestPermission();
    }
    if (!hasLocationPermission) {
      requestLocationPermission();
    }
  }, [permission?.granted, hasLocationPermission, requestPermission, requestLocationPermission]);

  if (!permission) {
    return (
      <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <Text style={styles.messageText}>Checking camera permission...</Text>
        </View>
      </SafeAreaView>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <Text style={styles.messageText}>Camera permission is required to scan QR codes</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission"
            accessibilityHint="Double tap to allow camera access for scanning QR codes"
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </View>
    );
  }

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
        <SafeAreaView style={styles.overlay}>
          <View style={styles.header}>
            {assetCount.isActive ? (
              <>
                <View style={styles.assetCountBadge}>
                  <Ionicons name="clipboard-outline" size={14} color={colors.textInverse} />
                  <Text style={styles.assetCountBadgeText}>Asset Count Mode</Text>
                </View>
                <Text style={styles.title}>{assetCount.depotName}</Text>
                <Text style={styles.subtitle}>
                  {assetCount.scanCount} assets counted
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>Scan QR Code</Text>
                <Text style={styles.subtitle}>
                  Point camera at asset QR code
                </Text>
              </>
            )}
          </View>

          {/* Scanning frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          <View style={styles.footer}>
            {!hasLocationPermission && (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestLocationPermission}
              >
                <Text style={styles.permissionButtonText}>Enable Location</Text>
              </TouchableOpacity>
            )}

            {/* Debug button for simulator testing */}
            {__DEV__ && (
              <TouchableOpacity
                style={styles.debugButton}
                onPress={async () => {
                  // Fetch a real asset to test with - try multiple formats
                  const testCodes = ['RGR-TL001', 'TL001', 'RGR-DL001', 'DL001'];
                  let asset = null;
                  for (const code of testCodes) {
                    try {
                      asset = await lookupAsset(code);
                      if (asset) break;
                    } catch {
                      // Try next code
                    }
                  }

                  if (!asset) {
                    setAlertSheet({
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
                  setScannedAsset(asset);
                  setEffectiveLocation(mockLocation);
                  setMatchedDepot(cachedDepot);
                  setShowConfirmSheet(true);
                }}
              >
                <Ionicons name="bug-outline" size={18} color={colors.warning} />
                <Text style={styles.debugButtonText}>Debug Scan</Text>
              </TouchableOpacity>
            )}

            {/* Asset Count button for managers+ */}
            {canPerformAssetCount && (
              <TouchableOpacity
                style={[
                  styles.assetCountButton,
                  assetCount.isActive && styles.assetCountButtonActive,
                ]}
                onPress={assetCount.isActive ? handleEndAssetCount : handleStartAssetCount}
                accessibilityRole="button"
                accessibilityLabel={assetCount.isActive ? 'End asset count' : 'Start asset count'}
              >
                <Ionicons
                  name={assetCount.isActive ? 'stop-circle-outline' : 'clipboard-outline'}
                  size={18}
                  color={assetCount.isActive ? colors.error : colors.electricBlue}
                />
                <Text
                  style={[
                    styles.assetCountButtonText,
                    assetCount.isActive && styles.assetCountButtonTextActive,
                  ]}
                >
                  {assetCount.isActive ? 'End Count' : 'Asset Count'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </CameraView>

      <ScanConfirmSheet
        visible={showConfirmSheet}
        asset={scannedAsset}
        location={effectiveLocation}
        matchedDepot={matchedDepot}
        isSubmitting={isCreatingScan}
        onConfirm={handleConfirmScan}
        onCancel={handleCancelScan}
        onDismiss={handleConfirmSheetDismiss}
      >
        {/* Maintenance checkbox for mechanics+ */}
        {canMarkMaintenance && (
          <MaintenanceCheckbox
            checked={markForMaintenance}
            onChange={setMarkForMaintenance}
            disabled={isCreatingScan}
          />
        )}
      </ScanConfirmSheet>

      <DefectReportSheet
        visible={showDefectReport}
        assetNumber={completedAsset?.assetNumber ?? ''}
        isSubmitting={isSubmittingDefect}
        onSubmit={handleDefectReportSubmit}
        onCancel={handleDefectReportCancel}
        onDismiss={handleDefectReportDismiss}
      />

      <PhotoPromptSheet
        visible={showPhotoPrompt}
        assetNumber={completedAsset?.assetNumber ?? ''}
        onAddPhoto={handlePhotoPromptAddPhoto}
        onSkip={handlePhotoPromptSkip}
        onDismiss={handlePhotoPromptDismiss}
      />

      {completedAsset && (
        <ErrorBoundary>
          <CameraCapture
            visible={showCamera}
            assetId={completedAsset.id}
            scanEventId={lastScanEventId}
            locationDescription={matchedDepot?.depot.name ?? null}
            latitude={effectiveLocation?.latitude ?? null}
            longitude={effectiveLocation?.longitude ?? null}
            onClose={handleCameraClose}
            onPhotoUploaded={handlePhotoUploaded}
            onDismiss={handleCameraDismiss}
          />
        </ErrorBoundary>
      )}

      <ScanSuccessSheet
        visible={showSuccessSheet}
        items={successItems}
        onDismiss={handleSuccessDismiss}
      />

      {/* Count Complete Success Sheet */}
      <ScanSuccessSheet
        visible={showCountCompleteSheet}
        items={countCompleteItems}
        onDismiss={() => setShowCountCompleteSheet(false)}
      />

      {/* Alert Sheet for errors/warnings */}
      <AlertSheet
        visible={alertSheet.visible}
        type={alertSheet.type}
        title={alertSheet.title}
        message={alertSheet.message}
        onDismiss={() => setAlertSheet(prev => ({ ...prev, visible: false }))}
      />

      {/* Combination Link Sheet */}
      <CombinationLinkSheet
        visible={showLinkSheet}
        previousScan={assetCount.previousScanForLink}
        currentAssetNumber={completedAsset?.assetNumber ?? ''}
        existingComboSize={
          assetCount.previousScanForLink && !isStandaloneScan(assetCount.previousScanForLink)
            ? assetCount.combinations[assetCount.previousScanForLink.combinationId]?.assetIds.length
            : undefined
        }
        onLinkToPrevious={handleLinkToPrevious}
        onKeepSeparate={handleKeepSeparate}
        onDismiss={handleLinkSheetDismiss}
      />

      {/* Combination Photo Sheet */}
      {activeCombinationId && assetCount.combinations[activeCombinationId] && (
        <CombinationPhotoSheet
          visible={showCombinationPhoto}
          assetNumbers={assetCount.combinations[activeCombinationId].assetNumbers}
          combinationId={activeCombinationId}
          onCapture={handleCombinationPhotoCapture}
          onNotesChange={handleCombinationNotesChange}
          onComplete={handleCombinationPhotoComplete}
          onSkip={handleCombinationPhotoSkip}
        />
      )}

      {/* End Count Review Sheet */}
      <EndCountReviewSheet
        visible={showEndCountReview}
        depotName={assetCount.depotName ?? ''}
        scans={assetCount.scans}
        combinations={assetCount.combinations}
        isSubmitting={isSubmittingCount}
        onEditCombination={handleEditCombination}
        onSubmit={handleSubmitCount}
        onCancel={handleCancelEndCount}
      />

      {/* Debug Overlay */}
      {__DEV__ && (
        <>
          <TouchableOpacity
            style={styles.debugToggle}
            onPress={() => setShowDebugOverlay(prev => !prev)}
          >
            <Text style={styles.debugToggleText}>
              {showDebugOverlay ? '✕' : '🐛'}
            </Text>
          </TouchableOpacity>

          {showDebugOverlay && (
            <View style={styles.debugOverlay}>
              <Text style={styles.debugTitle}>Scan Flow</Text>

              {/* Step 1: QR Scanned */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={scannedAsset ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={scannedAsset ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, scannedAsset && styles.debugStepComplete]}>
                  QR Code Scanned
                </Text>
                {scannedAsset && (
                  <Text style={styles.debugStepDetail}>{scannedAsset.assetNumber}</Text>
                )}
              </View>

              {/* Step 2: Location Acquired */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={effectiveLocation ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={effectiveLocation ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, effectiveLocation && styles.debugStepComplete]}>
                  Location Acquired
                </Text>
              </View>

              {/* Step 3: Depot Matched */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={matchedDepot ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={matchedDepot ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, matchedDepot && styles.debugStepComplete]}>
                  Depot Matched
                </Text>
                {matchedDepot && (
                  <Text style={styles.debugStepDetail}>{matchedDepot.depot.name}</Text>
                )}
              </View>

              {/* Step 4: Confirm Sheet Shown */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={showConfirmSheet ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={showConfirmSheet ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, showConfirmSheet && styles.debugStepComplete]}>
                  Awaiting Confirmation
                </Text>
              </View>

              {/* Step 5: Scan Confirmed */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={completedAsset ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={completedAsset ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, completedAsset && styles.debugStepComplete]}>
                  Scan Confirmed
                </Text>
              </View>

              {/* Step 6: Defect Report (optional) */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={defectReportedRef.current ? 'checkmark-circle' : 'remove-circle-outline'}
                  size={20}
                  color={defectReportedRef.current ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, defectReportedRef.current && styles.debugStepComplete]}>
                  Defect Reported
                </Text>
                <Text style={styles.debugStepOptional}>(optional)</Text>
              </View>

              {/* Step 7: Photo Captured (optional) */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={photoUploadedRef.current ? 'checkmark-circle' : 'remove-circle-outline'}
                  size={20}
                  color={photoUploadedRef.current ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, photoUploadedRef.current && styles.debugStepComplete]}>
                  Photo Uploaded
                </Text>
                <Text style={styles.debugStepOptional}>(optional)</Text>
              </View>

              {/* Step 8: Flow Complete */}
              <View style={styles.debugStep}>
                <Ionicons
                  name={showSuccessSheet ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={showSuccessSheet ? colors.success : colors.textSecondary}
                />
                <Text style={[styles.debugStepText, showSuccessSheet && styles.debugStepComplete]}>
                  Flow Complete
                </Text>
              </View>

              {/* Current Modal State */}
              <Text style={[styles.debugTitle, { marginTop: 12 }]}>Active Modal</Text>
              <Text style={styles.debugModalState}>
                {showConfirmSheet ? 'Confirm Sheet' :
                 showDefectReport ? 'Defect Report' :
                 showPhotoPrompt ? 'Photo Prompt' :
                 showCamera ? 'Camera' :
                 showSuccessSheet ? 'Success Sheet' :
                 'None (Scanning)'}
              </Text>

              {/* Reset Button */}
              <TouchableOpacity
                style={styles.debugResetButton}
                onPress={() => {
                  addDebugLog('Force reset scanner triggered');
                  resetAllScanState();
                }}
              >
                <Ionicons name="refresh" size={16} color={colors.textInverse} />
                <Text style={styles.debugResetButtonText}>Reset Flow</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const SCAN_FRAME_SIZE = 250;
const CORNER_SIZE = 40;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
  },
  containerInner: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.scanOverlay,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: CONTENT_TOP_OFFSET,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.scanCorner,
  },
  cornerTopLeft: {
    top: -SCAN_FRAME_SIZE / 2,
    left: -SCAN_FRAME_SIZE / 2,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTopRight: {
    top: -SCAN_FRAME_SIZE / 2,
    right: -SCAN_FRAME_SIZE / 2,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBottomLeft: {
    bottom: -SCAN_FRAME_SIZE / 2,
    left: -SCAN_FRAME_SIZE / 2,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBottomRight: {
    bottom: -SCAN_FRAME_SIZE / 2,
    right: -SCAN_FRAME_SIZE / 2,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlayLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  statusLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.chrome,
    marginRight: spacing.sm,
  },
  statusValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.scanSuccess,
  },
  statusValueError: {
    color: colors.error,
  },
  permissionButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    height: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  permissionButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  messageText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },

  // Asset Count Mode
  assetCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.electricBlue,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
    gap: 4,
  },
  assetCountBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  assetCountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  assetCountButtonActive: {
    backgroundColor: colors.error + '20',
    borderWidth: 1,
    borderColor: colors.error,
  },
  assetCountButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
  assetCountButtonTextActive: {
    color: colors.error,
  },

  // Debug button (only shown in __DEV__)
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning + '20',
    borderWidth: 1,
    borderColor: colors.warning,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  debugButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.warning,
    textTransform: 'uppercase',
  },

  // Debug overlay
  debugToggle: {
    position: 'absolute',
    top: '50%',
    left: 0,
    width: 40,
    height: 40,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  debugToggleText: {
    fontSize: 20,
    color: '#fff',
  },
  debugOverlay: {
    position: 'absolute',
    top: CONTENT_TOP_OFFSET + 60,
    right: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderRadius: 12,
    padding: 16,
    zIndex: 999,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  debugStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  debugStepText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  debugStepComplete: {
    color: colors.success,
    fontWeight: 'bold',
  },
  debugStepDetail: {
    fontSize: 12,
    color: colors.electricBlue,
    fontFamily: 'Lato_700Bold',
  },
  debugStepOptional: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  debugModalState: {
    fontSize: 14,
    color: colors.electricBlue,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugResetButton: {
    marginTop: 16,
    backgroundColor: colors.error,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  debugResetButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
