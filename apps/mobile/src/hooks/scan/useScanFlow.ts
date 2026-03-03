import { useState, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useAssetByQRCode, useCreateScanEvent, useUpdateAsset } from '../useAssetData';
import { useLocation } from '../useLocation';
import { useQRScanner } from '../useQRScanner';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import type { Asset, Depot } from '@rgr/shared';
import type { CachedLocationData } from '../../store/locationStore';
import { logger } from '../../utils/logger';

export interface AlertSheetState {
  visible: boolean;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

/**
 * Describes the next step after a successful scan confirmation.
 * The main component uses this to route to the appropriate flow.
 */
export type PostConfirmAction =
  | { type: 'defectReport' }
  | { type: 'photoPrompt' };

interface ConfirmScanOptions {
  canMarkMaintenance: boolean;
}

export function useScanFlow() {
  const { user } = useAuthStore();
  const {
    resolvedDepot: cachedDepot,
    lastLocation: cachedLocation,
  } = useLocationStore();

  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [matchedDepot, setMatchedDepot] = useState<{ depot: Depot; distanceKm: number } | null>(null);
  const [effectiveLocation, setEffectiveLocation] = useState<CachedLocationData | null>(null);
  const [lastScanEventId, setLastScanEventId] = useState<string | null>(null);
  const [completedAsset, setCompletedAsset] = useState<Asset | null>(null);
  const [markForMaintenance, setMarkForMaintenance] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const [alertSheet, setAlertSheet] = useState<AlertSheetState>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  // Debug logging — stored in a ref to avoid re-renders since the UI never reads this
  const debugLogRef = useRef<string[]>([]);
  const addDebugLog = useCallback((msg: string) => {
    const log = debugLogRef.current;
    if (log.length >= 10) log.shift();
    log.push(`${new Date().toLocaleTimeString()}: ${msg}`);
  }, []);

  const {
    hasPermission: hasLocationPermission,
    requestPermission: requestLocationPermission,
  } = useLocation();

  const { mutateAsync: lookupAsset } = useAssetByQRCode();
  const { mutateAsync: createScan, isPending: isCreatingScan } = useCreateScanEvent();
  const { mutateAsync: updateAssetMutation } = useUpdateAsset();

  const { handleBarCodeScanned, resetScanner } = useQRScanner(
    async (qrData) => {
      try {
        logger.scan(`QR code detected: ${qrData.substring(0, 30)}...`);
        setScanStatus('QR detected');

        // Always use location resolved at login / home screen
        if (!cachedLocation) {
          logger.scan('No resolved location available');
          setScanStatus(null);
          setAlertSheet({
            visible: true,
            type: 'error',
            title: 'Location Not Available',
            message: 'Please return to the home screen and ensure your location is resolved before scanning.',
          });
          resetScanner();
          return;
        }

        const scanLocation = cachedLocation;
        const nearestDepot: { depot: Depot; distanceKm: number } | null = cachedDepot;
        logger.scan(`Using resolved location: ${scanLocation.latitude.toFixed(4)}, ${scanLocation.longitude.toFixed(4)}`);
        if (nearestDepot) {
          logger.scan(`Resolved depot: ${nearestDepot.depot.name} (${nearestDepot.distanceKm.toFixed(2)} km)`);
        }

        logger.scan('Looking up asset...');
        setScanStatus('Looking up asset...');
        const asset = await lookupAsset(qrData);
        logger.scan(`Asset found: ${asset.assetNumber}`);

        setEffectiveLocation(scanLocation);
        setMatchedDepot(nearestDepot);

        logger.scan('Showing confirmation sheet');
        setScanStatus(null);
        setScannedAsset(asset);
        setShowConfirmSheet(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to scan QR code';
        logger.error(`Scan error: ${message}`);
        setScanStatus(null);
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

  /**
   * Confirms the scan. Returns the action the main component should take next,
   * or null if the action was handled internally (e.g., asset count mode).
   */
  const handleConfirmScan = useCallback(async (
    opts: ConfirmScanOptions
  ): Promise<PostConfirmAction | null> => {
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
      return null;
    }

    try {
      addDebugLog('Creating scan event...');
      logger.scan('Submitting scan event...');
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

      if (matchedDepot) {
        try {
          logger.scan(`Updating asset depot to ${matchedDepot.depot.name}...`);
          await updateAssetMutation({
            id: scannedAsset.id,
            input: { assignedDepotId: matchedDepot.depot.id },
          });
          logger.scan('Asset depot updated');
        } catch (depotError) {
          logger.warn('Depot update failed after successful scan:', depotError);
        }
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.scan('Scan completed successfully!');

      setLastScanEventId(scanEvent.id);
      setCompletedAsset(scannedAsset);

      let action: PostConfirmAction;
      if (markForMaintenance && opts.canMarkMaintenance) {
        addDebugLog('Closing confirm sheet, pending defect report');
        action = { type: 'defectReport' };
      } else {
        addDebugLog('Closing confirm sheet, pending photo prompt');
        action = { type: 'photoPrompt' };
      }

      setMarkForMaintenance(false);
      setShowConfirmSheet(false);
      return action;
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
      return null;
    }
  }, [scannedAsset, effectiveLocation, user, matchedDepot, markForMaintenance, createScan, updateAssetMutation, addDebugLog]);

  const handleCancelScan = useCallback(() => {
    setShowConfirmSheet(false);
    setScannedAsset(null);
    setMatchedDepot(null);
    setEffectiveLocation(null);
    setMarkForMaintenance(false);
    resetScanner();
  }, [resetScanner]);

  const resetScanFlow = useCallback(() => {
    setShowConfirmSheet(false);
    setScannedAsset(null);
    setCompletedAsset(null);
    setMatchedDepot(null);
    setEffectiveLocation(null);
    setLastScanEventId(null);
    setMarkForMaintenance(false);
    setScanStatus(null);
    resetScanner();
  }, [resetScanner]);

  return {
    // State
    scannedAsset,
    effectiveLocation,
    matchedDepot,
    showConfirmSheet,
    markForMaintenance,
    setMarkForMaintenance,
    lastScanEventId,
    completedAsset,
    isCreatingScan,
    scanStatus,

    // Handlers
    handleBarCodeScanned,
    handleConfirmScan,
    handleCancelScan,
    resetScanFlow,

    // Alert
    alertSheet,
    setAlertSheet,

    // Location
    hasLocationPermission,
    requestLocationPermission,

    // Scanner
    resetScanner,

    // Debug
    addDebugLog,

    // Exposed for debug scan button
    lookupAsset,
    setScannedAsset,
    setEffectiveLocation,
    setMatchedDepot,
    setShowConfirmSheet,

    // Exposed for camera ref capture
    cachedDepot,

  };
}
