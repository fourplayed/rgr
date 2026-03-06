import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import {
  assetKeys,
  useCreateScanEvent,
  useUpdateAsset,
  useDeleteScanEvent,
} from '../useAssetData';
import { useLocationStore } from '../../store/locationStore';
import type { Asset } from '@rgr/shared';
import { getAssetByQRCode, listAssets } from '@rgr/shared';
import { logger } from '../../utils/logger';
import type { ScanFlowAction, MatchedDepot, AlertSheetState } from './useScanActionFlow';
import type { Profile } from '@rgr/shared';

export function useScanProcessing(
  dispatch: React.Dispatch<ScanFlowAction>,
  helpers: {
    user: Profile | null;
    setAlertSheet: (state: AlertSheetState) => void;
    addDebugLog: (msg: string) => void;
    resetScannerRef: React.MutableRefObject<() => void>;
  },
) {
  const { user, setAlertSheet, addDebugLog, resetScannerRef } = helpers;
  const queryClient = useQueryClient();

  // ── Mutations ──
  const { mutateAsync: createScan } = useCreateScanEvent();
  const { mutateAsync: updateAssetMutation } = useUpdateAsset();
  const { mutateAsync: doDeleteScan, isPending: isDeletingScan } = useDeleteScanEvent();

  // ── Asset lookup (via React Query cache) ──
  const lookupAsset = useCallback(
    async (qrData: string): Promise<Asset> => {
      return queryClient.fetchQuery({
        queryKey: assetKeys.byQRCode(qrData),
        queryFn: async () => {
          const result = await getAssetByQRCode(qrData);
          if (!result.success) throw new Error(result.error);
          return result.data;
        },
        staleTime: 30_000,
      });
    },
    [queryClient],
  );

  // ── Core scan processing ──
  const processScan = useCallback(
    async (qrData: string) => {
      try {
        logger.scan(`QR code detected: ${qrData.substring(0, 30)}...`);
        dispatch({ type: 'QR_DETECTED', scanStatus: 'QR detected' });

        // 1. Read fresh location from the Zustand store to avoid stale closures
        const { lastLocation: freshLocation, resolvedDepot: freshDepot } =
          useLocationStore.getState();

        if (!freshLocation) {
          logger.scan('No resolved location available');
          dispatch({ type: 'RESET' });
          setAlertSheet({
            visible: true,
            type: 'error',
            title: 'Location Not Available',
            message:
              'Please return to the home screen and ensure your location is resolved before scanning.',
          });
          resetScannerRef.current();
          return;
        }

        const scanLocation = freshLocation;
        const nearestDepot: MatchedDepot | null = freshDepot;

        // 2. Lookup asset
        logger.scan('Looking up asset...');
        dispatch({ type: 'UPDATE_SCAN_STATUS', scanStatus: 'Looking up asset...' });
        const asset = await lookupAsset(qrData);
        logger.scan(`Asset found: ${asset.assetNumber}`);

        // 3. Transition to confirming (card shown, buttons disabled)
        dispatch({
          type: 'ASSET_FOUND',
          scannedAsset: asset,
          matchedDepot: nearestDepot,
          effectiveLocation: scanLocation,
        });

        // 4. Guard against expired session
        if (!user) {
          dispatch({ type: 'RESET' });
          setAlertSheet({
            visible: true,
            type: 'error',
            title: 'Session Expired',
            message: 'Please log in again.',
          });
          resetScannerRef.current();
          return;
        }

        // 5. Auto-create scan event
        addDebugLog('Auto-creating scan event...');
        logger.scan('Submitting scan event...');
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
        addDebugLog('Scan created: ' + scanEvent.id.substring(0, 8));
        logger.scan('Scan event created successfully');

        // 6. Update depot assignment if matched (fire-and-forget)
        if (nearestDepot) {
          logger.scan(`Updating asset depot to ${nearestDepot.depot.name}...`);
          updateAssetMutation({
            id: asset.id,
            input: { assignedDepotId: nearestDepot.depot.id },
          })
            .then(() => logger.scan('Asset depot updated'))
            .catch((depotError: unknown) =>
              logger.warn('Depot update failed after successful scan:', depotError),
            );
        }

        // 7. Success!
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        dispatch({ type: 'SCAN_CREATED', lastScanEventId: scanEvent.id });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to scan QR code';
        logger.error(`Scan error: ${message}`);
        dispatch({ type: 'RESET' });
        setAlertSheet({
          visible: true,
          type: 'error',
          title: 'Scan Failed',
          message,
        });
        resetScannerRef.current();
      }
    },
    [user, lookupAsset, createScan, updateAssetMutation, addDebugLog, setAlertSheet, dispatch, resetScannerRef],
  );

  // ── Debug: trigger scan with first asset from DB ──
  const triggerDebugScan = useCallback(
    async (resetScanner: () => void) => {
      const result = await listAssets({ pageSize: 1 });
      if (!result.success) {
        logger.warn('Debug scan: failed to fetch assets');
        return;
      }
      const asset = result.data.data[0];
      if (!asset) {
        logger.warn('Debug scan: no assets found');
        return;
      }
      const qrCode = `rgr://asset/${asset.id}`;
      resetScanner();
      await processScan(qrCode);
    },
    [processScan],
  );

  // ── Undo ──
  const handleUndoPress = useCallback(
    async (lastScanEventId: string, scannedAssetId: string, resetScanner: () => void) => {
      addDebugLog('Undo pressed — deleting scan event');
      dispatch({ type: 'RESET' });
      resetScanner();

      try {
        await doDeleteScan({ scanEventId: lastScanEventId, assetId: scannedAssetId });
        addDebugLog('Scan event deleted');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (error: unknown) {
        logger.warn('Failed to delete scan event during undo:', error);
        // Non-fatal: scan was already removed from UI, just log the failure
      }
    },
    [addDebugLog, doDeleteScan, dispatch],
  );

  return { processScan, triggerDebugScan, handleUndoPress, isDeletingScan };
}
