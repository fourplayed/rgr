import { useState, useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useAssetByQRCode, useCreateScanEvent, useUpdateAsset } from '../useAssetData';
import { useLocation } from '../useLocation';
import { useQRScanner } from '../useQRScanner';
import { useDepots, findNearestDepot } from '../useDepots';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import type { Asset, Depot } from '@rgr/shared';
import type { CachedLocationData } from '../../store/locationStore';
import type { LocationData } from '../useLocation';
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
  | { type: 'photoPrompt' }
  | { type: 'assetCountLink' };

interface ConfirmScanOptions {
  isAssetCountActive: boolean;
  assetCountScansLength: number;
  addToAssetCount: () => void;
  canMarkMaintenance: boolean;
}

export interface CountModeAutoConfirmResult {
  asset: Asset;
  scanEventId: string;
}

export type CountModeAutoConfirmCallback = (result: CountModeAutoConfirmResult) => void;

export function useScanFlow() {
  const { user } = useAuthStore();
  const {
    resolvedDepot: cachedDepot,
    lastLocation: cachedLocation,
    isLocationStale,
  } = useLocationStore();

  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [matchedDepot, setMatchedDepot] = useState<{ depot: Depot; distanceKm: number } | null>(null);
  const [effectiveLocation, setEffectiveLocation] = useState<LocationData | CachedLocationData | null>(null);
  const [lastScanEventId, setLastScanEventId] = useState<string | null>(null);
  const [completedAsset, setCompletedAsset] = useState<Asset | null>(null);
  const [markForMaintenance, setMarkForMaintenance] = useState(false);

  // Count mode: ref-based callback for auto-confirm (set by scan.tsx)
  const countModeCallbackRef = useRef<CountModeAutoConfirmCallback | null>(null);

  const [alertSheet, setAlertSheet] = useState<AlertSheetState>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  // Debug logging
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_debugLog, setDebugLog] = useState<string[]>([]);
  const addDebugLog = useCallback((msg: string) => {
    setDebugLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const {
    requestLocation,
    hasPermission: hasLocationPermission,
    requestPermission: requestLocationPermission,
  } = useLocation();

  const { data: depots } = useDepots();
  const { mutateAsync: lookupAsset } = useAssetByQRCode();
  const { mutateAsync: createScan, isPending: isCreatingScan } = useCreateScanEvent();
  const { mutateAsync: updateAssetMutation } = useUpdateAsset();

  const { handleBarCodeScanned, resetScanner } = useQRScanner(
    async (qrData) => {
      try {
        logger.scan(`QR code detected: ${qrData.substring(0, 30)}...`);

        const useCachedLocation = cachedLocation && !isLocationStale() && cachedDepot;

        let scanLocation: LocationData | CachedLocationData;
        let nearestDepot: { depot: Depot; distanceKm: number } | null = null;

        if (useCachedLocation) {
          logger.scan('Using cached location from sign-in');
          scanLocation = cachedLocation;
          nearestDepot = cachedDepot;
          logger.scan(`Cached location: ${scanLocation.latitude.toFixed(4)}, ${scanLocation.longitude.toFixed(4)}`);
          logger.scan(`Cached depot: ${nearestDepot.depot.name} (${nearestDepot.distanceKm.toFixed(2)} km)`);
        } else {
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

        logger.scan('Looking up asset...');
        const asset = await lookupAsset(qrData);
        logger.scan(`Asset found: ${asset.assetNumber}`);

        // Count mode: auto-confirm without showing the confirm sheet
        if (countModeCallbackRef.current && user) {
          try {
            logger.scan('Count mode: auto-confirming scan...');
            const scanEvent = await createScan({
              assetId: asset.id,
              scannedBy: user.id,
              scanType: 'qr_scan',
              latitude: scanLocation.latitude,
              longitude: scanLocation.longitude,
              accuracy: scanLocation.accuracy,
              altitude: scanLocation.altitude,
              heading: scanLocation.heading,
              speed: scanLocation.speed,
              locationDescription: nearestDepot ? nearestDepot.depot.name : null,
            });

            if (nearestDepot) {
              await updateAssetMutation({
                id: asset.id,
                input: { assignedDepotId: nearestDepot.depot.id },
              });
            }

            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            logger.scan('Count mode: scan auto-confirmed');

            setLastScanEventId(scanEvent.id);
            setCompletedAsset(asset);

            countModeCallbackRef.current({
              asset,
              scanEventId: scanEvent.id,
            });
            resetScanner();
            return;
          } catch (autoConfirmError) {
            const msg = autoConfirmError instanceof Error ? autoConfirmError.message : 'Auto-confirm failed';
            logger.error(`Count mode auto-confirm failed: ${msg}`);
            setAlertSheet({
              visible: true,
              type: 'error',
              title: 'Scan Failed',
              message: msg,
            });
            resetScanner();
            return;
          }
        }

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
        logger.scan(`Updating asset depot to ${matchedDepot.depot.name}...`);
        await updateAssetMutation({
          id: scannedAsset.id,
          input: { assignedDepotId: matchedDepot.depot.id },
        });
        logger.scan('Asset depot updated');
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.scan('Scan completed successfully!');

      setLastScanEventId(scanEvent.id);
      setCompletedAsset(scannedAsset);

      // Asset Count Mode: handled by caller
      if (opts.isAssetCountActive) {
        opts.addToAssetCount();

        setShowConfirmSheet(false);
        setMarkForMaintenance(false);

        if (opts.assetCountScansLength >= 1) {
          addDebugLog('Asset count: checking for link option');
          return { type: 'assetCountLink' };
        }
        return null;
      }

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

    // Count mode auto-confirm
    countModeCallbackRef,
  };
}
