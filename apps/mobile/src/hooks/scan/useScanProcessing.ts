import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useQueryClient, onlineManager } from '@tanstack/react-query';
import { assetKeys, useCreateScanEvent, useDeleteScanEvent } from '../useAssetData';
import { useLocationStore, waitForLocationResolution } from '../../store/locationStore';
import type { Asset } from '@rgr/shared';
import { getAssetByQRCode, listAssets, extractAssetInfo, assignAssetDepot } from '@rgr/shared';
import { logger } from '../../utils/logger';
import { enqueueScan } from '../../utils/offlineMutationQueue';
import type { ScanFlowAction, MatchedDepot } from './scanFlowMachine';
import type { AlertSheetState } from './types';
import type { Profile } from '@rgr/shared';
import { useAuthStore } from '../../store/authStore';

export function useScanProcessing(
  dispatch: React.Dispatch<ScanFlowAction>,
  helpers: {
    user: Profile | null;
    setAlertSheet: React.Dispatch<React.SetStateAction<AlertSheetState>>;
    addDebugLog: (msg: string) => void;
    resetScannerRef: React.MutableRefObject<() => void>;
  }
) {
  const { setAlertSheet, addDebugLog, resetScannerRef } = helpers;
  const queryClient = useQueryClient();

  // ── Mutations ──
  const { mutateAsync: createScan } = useCreateScanEvent();
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
    [queryClient]
  );

  // ── Core scan processing ──
  const processScan = useCallback(
    async (qrData: string) => {
      // Track resolved asset ID so the catch block can use it for offline queueing
      let resolvedAssetId: string | null = null;

      try {
        logger.scan(`QR code detected: ${qrData.substring(0, 30)}...`);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        dispatch({ type: 'QR_DETECTED', scanStep: 'detected' });

        // 1. Read fresh location from the Zustand store to avoid stale closures
        let { lastLocation: freshLocation, resolvedDepot: freshDepot } =
          useLocationStore.getState();

        if (!freshLocation) {
          const { isResolvingDepot } = useLocationStore.getState();

          if (isResolvingDepot) {
            logger.scan('Location resolving — waiting for GPS...');
            dispatch({ type: 'UPDATE_SCAN_STEP', scanStep: 'location' });

            // GPS can take up to 18s (10s High + 8s Balanced fallback).
            // Allow 22s so the wait outlasts the worst-case GPS window.
            const resolved = await waitForLocationResolution(22_000);

            if (resolved) {
              const updated = useLocationStore.getState();
              freshLocation = updated.lastLocation;
              freshDepot = updated.resolvedDepot;
              logger.scan('Location resolved — continuing scan');
            }
          }

          if (!freshLocation) {
            logger.scan('No resolved location available');
            dispatch({ type: 'RESET' });
            setAlertSheet({
              visible: true,
              type: 'error',
              title: 'Location Not Available',
              message:
                'Please return to the home screen and ensure your location is resolved before scanning.',
              actionLabel: 'Retry',
              onAction: () => {
                setAlertSheet({ visible: false, type: 'error', title: '', message: '' });
                resetScannerRef.current();
              },
            });
            resetScannerRef.current();
            return;
          }
        }

        const scanLocation = freshLocation;
        const nearestDepot: MatchedDepot | null = freshDepot;

        // 2. Lookup asset
        logger.scan('Looking up asset...');
        dispatch({ type: 'UPDATE_SCAN_STEP', scanStep: 'lookup' });
        const asset = await lookupAsset(qrData);
        resolvedAssetId = asset.id;
        logger.scan(`Asset found: ${asset.assetNumber}`);

        // 3. Guard against expired session (before showing UI)
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
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

        // 4. Transition to confirming (card shown, buttons disabled)
        dispatch({
          type: 'ASSET_FOUND',
          scannedAsset: asset,
          matchedDepot: nearestDepot,
          effectiveLocation: scanLocation,
        });

        // 5. Auto-create scan event
        addDebugLog('Auto-creating scan event...');
        logger.scan('Submitting scan event...');
        const scanEvent = await createScan({
          assetId: asset.id,
          scannedBy: currentUser.id,
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

        // 6. Update depot assignment if matched (non-blocking but error-aware).
        //    Uses assignAssetDepot RPC (SECURITY DEFINER) because drivers/mechanics
        //    lack UPDATE RLS on assets — the generic updateAsset() would fail with PGRST116.
        if (nearestDepot) {
          logger.scan(`Updating asset depot to ${nearestDepot.depot.name}...`);
          assignAssetDepot(asset.id, nearestDepot.depot.id)
            .then((result) => {
              if (result.success) {
                logger.scan('Asset depot updated');
              } else {
                logger.warn('Depot assignment RPC failed:', result.error);
                setAlertSheet({
                  visible: true,
                  type: 'warning',
                  title: 'Depot Update Failed',
                  message: `Scan was recorded but the depot assignment to "${nearestDepot.depot.name}" could not be saved. It will be updated on the next scan.`,
                });
              }
            })
            .catch((depotError: unknown) => {
              logger.warn('Depot update failed after successful scan:', depotError);
              setAlertSheet({
                visible: true,
                type: 'warning',
                title: 'Depot Update Failed',
                message: `Scan was recorded but the depot assignment to "${nearestDepot.depot.name}" could not be saved. It will be updated on the next scan.`,
              });
            });
        }

        // 7. Success!
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        dispatch({ type: 'SCAN_CREATED', lastScanEventId: scanEvent.id });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to scan QR code';
        logger.error(`Scan error: ${message}`);

        // If offline and we have enough context, queue the scan for later replay
        const offlineUser = useAuthStore.getState().user;
        if (!onlineManager.isOnline() && offlineUser) {
          const { lastLocation: loc, resolvedDepot: depot } = useLocationStore.getState();
          // Prefer the resolved asset ID (from step 2) over re-parsing the QR data,
          // since lookup_asset_by_qr normalises both asset numbers and UUIDs.
          // Fall back to QR parsing only if the lookup itself failed.
          const qrAssetId = resolvedAssetId ?? extractAssetInfo(qrData)?.assetId ?? null;

          if (qrAssetId) {
            try {
              await enqueueScan({
                assetId: qrAssetId,
                scannedBy: offlineUser.id,
                scanType: 'qr_scan',
                latitude: loc?.latitude ?? null,
                longitude: loc?.longitude ?? null,
                accuracy: loc?.accuracy ?? null,
                altitude: loc?.altitude ?? null,
                heading: loc?.heading ?? null,
                speed: loc?.speed ?? null,
                locationDescription: depot ? depot.depot.name : null,
              });
              dispatch({ type: 'RESET' });
              setAlertSheet({
                visible: true,
                type: 'info',
                title: 'Scan Queued',
                message:
                  'You are offline. This scan has been saved and will be submitted when connectivity is restored.',
              });
              resetScannerRef.current();
              return;
            } catch (queueError: unknown) {
              logger.warn('Failed to enqueue offline scan:', queueError);
            }
          } else {
            dispatch({ type: 'RESET' });
            setAlertSheet({
              visible: true,
              type: 'error',
              title: 'Cannot Queue Offline',
              message: 'This QR format cannot be queued offline. Try again when connected.',
            });
            resetScannerRef.current();
            return;
          }
        }

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
    [lookupAsset, createScan, addDebugLog, setAlertSheet, dispatch, resetScannerRef]
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
    [processScan]
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
        setAlertSheet({
          visible: true,
          type: 'warning',
          title: 'Undo Failed',
          message: 'The scan could not be removed. It may still appear in your history.',
        });
      }
    },
    [addDebugLog, doDeleteScan, dispatch, setAlertSheet]
  );

  return { processScan, triggerDebugScan, handleUndoPress, isDeletingScan };
}
