import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
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
import { PhotoPromptSheet, CameraCapture } from '../../src/components/photos';
import { PhotoTypePicker, type PhotoType } from '../../src/components/photos/PhotoTypePicker';
import type { Asset, Depot } from '@rgr/shared';
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
  const { canMarkMaintenance, canSelectPhotoType, canPerformAssetCount } = useUserPermissions();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [matchedDepot, setMatchedDepot] = useState<{ depot: Depot; distanceKm: number } | null>(null);
  const [effectiveLocation, setEffectiveLocation] = useState<CachedLocationData | null>(null);
  const [showPhotoPrompt, setShowPhotoPrompt] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [lastScanEventId, setLastScanEventId] = useState<string | null>(null);
  const [completedAsset, setCompletedAsset] = useState<Asset | null>(null);

  // Role-specific state
  const [markForMaintenance, setMarkForMaintenance] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<PhotoType>('freight');

  // Asset Count mode (managers+)
  const assetCount = useAssetCountMode();

  const {
    requestLocation,
    hasPermission: hasLocationPermission,
    requestPermission: requestLocationPermission,
    isLoading: isLocationLoading,
  } = useLocation();

  // Fetch depots for location matching
  const { data: depots } = useDepots();

  const { mutateAsync: lookupAsset } = useAssetByQRCode();
  const { mutateAsync: createScan, isPending: isCreatingScan } = useCreateScanEvent();
  const { mutateAsync: updateAssetMutation } = useUpdateAsset();
  const { mutateAsync: createMaintenance } = useCreateMaintenance();

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
            Alert.alert('Location Required', 'Unable to get current location');
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
        Alert.alert('Scan Failed', message);
        resetScanner();
      }
    }
  );

  const handleConfirmScan = async () => {
    if (!scannedAsset || !effectiveLocation || !user) {
      logger.error('Missing required information for scan');
      Alert.alert('Error', 'Missing required information');
      return;
    }

    try {
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

      // Create maintenance record if flagged (mechanics+)
      if (markForMaintenance && canMarkMaintenance) {
        try {
          logger.scan('Creating maintenance record...');
          await createMaintenance({
            assetId: scannedAsset.id,
            reportedBy: user.id,
            title: `Maintenance flagged during scan - ${scannedAsset.assetNumber}`,
            description: `Asset flagged for maintenance attention during scan at ${matchedDepot?.depot.name ?? 'unknown location'}.`,
            priority: 'medium',
            status: 'scheduled',
            scanEventId: scanEvent.id,
          });
          logger.scan('Maintenance record created');
        } catch (maintError) {
          // Don't fail the whole scan if maintenance creation fails
          logger.error('Failed to create maintenance record', maintError);
          Alert.alert(
            'Partial Success',
            'Scan recorded but maintenance flag could not be saved.'
          );
        }
      }

      // Success haptic and animation
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.scan('Scan completed successfully!');

      // Close confirm sheet and show photo prompt
      setShowConfirmSheet(false);
      setLastScanEventId(scanEvent.id);
      setCompletedAsset(scannedAsset);
      setMarkForMaintenance(false); // Reset for next scan
      setShowPhotoPrompt(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit scan';
      logger.error(`Submit failed: ${message}`);
      Alert.alert('Scan Failed', message);
    }
  };

  const handleCancelScan = () => {
    setShowConfirmSheet(false);
    setScannedAsset(null);
    setMatchedDepot(null);
    setEffectiveLocation(null);
    setMarkForMaintenance(false);
    resetScanner();
  };

  const handlePhotoPromptAddPhoto = useCallback(() => {
    setShowPhotoPrompt(false);
    setShowCamera(true);
  }, []);

  const handlePhotoPromptSkip = useCallback(() => {
    // Complete the flow without photo
    const depotInfo = matchedDepot
      ? ` → ${matchedDepot.depot.name}`
      : '';
    Alert.alert('Success', `Asset ${completedAsset?.assetNumber ?? ''} scanned${depotInfo}`);

    // Reset all state
    setShowPhotoPrompt(false);
    setScannedAsset(null);
    setCompletedAsset(null);
    setMatchedDepot(null);
    setEffectiveLocation(null);
    setLastScanEventId(null);
    setSelectedPhotoType('freight');
    resetScanner();
  }, [completedAsset, matchedDepot, resetScanner]);

  const handleCameraClose = useCallback(() => {
    setShowCamera(false);
    // Complete the flow after camera closes (whether photo was taken or not)
    const depotInfo = matchedDepot
      ? ` → ${matchedDepot.depot.name}`
      : '';
    Alert.alert('Success', `Asset ${completedAsset?.assetNumber ?? ''} scanned${depotInfo}`);

    // Reset all state
    setScannedAsset(null);
    setCompletedAsset(null);
    setMatchedDepot(null);
    setEffectiveLocation(null);
    setLastScanEventId(null);
    setSelectedPhotoType('freight');
    resetScanner();
  }, [completedAsset, matchedDepot, resetScanner]);

  // Asset Count handlers (managers+)
  const handleStartAssetCount = useCallback(() => {
    if (!cachedDepot) {
      Alert.alert('No Depot', 'Please wait for location to be determined before starting a count.');
      return;
    }
    assetCount.startCount(cachedDepot.depot.id, cachedDepot.depot.name);
  }, [cachedDepot, assetCount]);

  const handleEndAssetCount = useCallback(() => {
    Alert.alert(
      'End Asset Count',
      `You have counted ${assetCount.scanCount} assets at ${assetCount.depotName}. End this session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Count',
          style: 'destructive',
          onPress: () => {
            // TODO: Submit to database when API is ready
            logger.assetCount('Session ended', { count: assetCount.scanCount });
            assetCount.endCount();
            Alert.alert('Count Complete', `${assetCount.scanCount} assets recorded.`);
          },
        },
      ]
    );
  }, [assetCount]);

  const handlePhotoUploaded = useCallback(() => {
    logger.scan('Photo uploaded successfully');
  }, []);

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
            {!hasLocationPermission ? (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestLocationPermission}
              >
                <Text style={styles.permissionButtonText}>Enable Location</Text>
              </TouchableOpacity>
            ) : cachedLocation && cachedDepot ? (
              <View style={styles.locationInfo}>
                <Text style={styles.coordsText}>
                  {cachedLocation.latitude.toFixed(4)}, {cachedLocation.longitude.toFixed(4)}
                </Text>
                <Text style={styles.depotInfoText}>
                  {cachedDepot.depot.name} • {cachedDepot.distanceKm.toFixed(1)} km away
                </Text>
              </View>
            ) : (
              <View style={styles.locationInfo}>
                <Text style={styles.coordsText}>
                  {isLocationLoading ? 'Getting location...' : 'Ready to scan'}
                </Text>
              </View>
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

      <PhotoPromptSheet
        visible={showPhotoPrompt}
        assetNumber={completedAsset?.assetNumber ?? ''}
        onAddPhoto={handlePhotoPromptAddPhoto}
        onSkip={handlePhotoPromptSkip}
      >
        {/* Photo type picker for mechanics+ */}
        {canSelectPhotoType && (
          <PhotoTypePicker
            selected={selectedPhotoType}
            onChange={setSelectedPhotoType}
          />
        )}
      </PhotoPromptSheet>

      {completedAsset && (
        <CameraCapture
          visible={showCamera}
          assetId={completedAsset.id}
          scanEventId={lastScanEventId}
          locationDescription={matchedDepot?.depot.name ?? null}
          onClose={handleCameraClose}
          onPhotoUploaded={handlePhotoUploaded}
        />
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
    backgroundColor: '#E8E8E8',
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
    backgroundColor: '#0000FF',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignSelf: 'center',
  },
  permissionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  locationInfo: {
    backgroundColor: colors.overlayLight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  coordsText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.chrome,
    marginBottom: spacing.xs,
  },
  depotInfoText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.scanSuccess,
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
    backgroundColor: colors.electricBlue,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
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
});
