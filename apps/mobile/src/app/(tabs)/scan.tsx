import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useAssetByQRCode, useCreateScanEvent, useUpdateAsset } from '../../hooks/useAssetData';
import { useLocation } from '../../hooks/useLocation';
import { useQRScanner } from '../../hooks/useQRScanner';
import { useDepots, findNearestDepot } from '../../hooks/useDepots';
import { useAuthStore } from '../../store/authStore';
import { ScanConfirmSheet } from '../../components/scanner/ScanConfirmSheet';
import type { Asset, Depot } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';

type LogEntry = {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
};

export default function ScanScreen() {
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [matchedDepot, setMatchedDepot] = useState<{ depot: Depot; distanceKm: number } | null>(null);
  const [workflowLog, setWorkflowLog] = useState<LogEntry[]>([]);
  const logScrollRef = useRef<ScrollView>(null);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setWorkflowLog(prev => [...prev, { timestamp: new Date(), message, type }]);
    setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const {
    location,
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

  const { handleBarCodeScanned, resetScanner } = useQRScanner(
    async (qrData) => {
      try {
        addLog(`QR code detected: ${qrData.substring(0, 30)}...`, 'info');

        // Get location first
        addLog('Requesting current location...', 'info');
        const currentLocation = await requestLocation();

        if (!currentLocation) {
          addLog('Failed to get location', 'error');
          Alert.alert('Location Required', 'Unable to get current location');
          resetScanner();
          return;
        }
        addLog(`Location acquired: ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`, 'success');

        // Find nearest depot to current location
        addLog('Searching for nearest depot...', 'info');
        let nearestDepot = null;
        if (depots && depots.length > 0) {
          nearestDepot = findNearestDepot(
            currentLocation.latitude,
            currentLocation.longitude,
            depots
          );
        }
        setMatchedDepot(nearestDepot);
        if (nearestDepot) {
          addLog(`Matched depot: ${nearestDepot.depot.name} (${nearestDepot.distanceKm.toFixed(2)} km)`, 'success');
        } else {
          addLog('No depot matched', 'warning');
        }

        // Lookup asset from QR code
        addLog('Looking up asset...', 'info');
        const asset = await lookupAsset(qrData);
        addLog(`Asset found: ${asset.assetNumber}`, 'success');

        // Show confirmation sheet
        addLog('Showing confirmation sheet', 'info');
        setScannedAsset(asset);
        setShowConfirmSheet(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to scan QR code';
        addLog(`Error: ${message}`, 'error');
        Alert.alert('Scan Failed', message);
        resetScanner();
      }
    }
  );

  const handleConfirmScan = async () => {
    if (!scannedAsset || !location || !user) {
      addLog('Missing required information', 'error');
      Alert.alert('Error', 'Missing required information');
      return;
    }

    try {
      addLog('Submitting scan event...', 'info');
      // Create the scan event
      await createScan({
        assetId: scannedAsset.id,
        scannedBy: user.id,
        scanType: 'qr_scan',
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        heading: location.heading,
        speed: location.speed,
        locationDescription: matchedDepot ? matchedDepot.depot.name : null,
      });
      addLog('Scan event created successfully', 'success');

      // Update asset's assigned depot if we matched one
      if (matchedDepot) {
        addLog(`Updating asset depot to ${matchedDepot.depot.name}...`, 'info');
        await updateAssetMutation({
          id: scannedAsset.id,
          input: { assignedDepotId: matchedDepot.depot.id },
        });
        addLog('Asset depot updated', 'success');
      }

      // Success haptic and animation
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addLog('Scan completed successfully!', 'success');

      // Close sheet and reset
      setShowConfirmSheet(false);
      setScannedAsset(null);
      setMatchedDepot(null);
      resetScanner();

      // Show success message with depot info
      const depotInfo = matchedDepot
        ? ` → ${matchedDepot.depot.name}`
        : '';
      Alert.alert('Success', `Asset ${scannedAsset.assetNumber} scanned${depotInfo}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit scan';
      addLog(`Submit failed: ${message}`, 'error');
      Alert.alert('Scan Failed', message);
    }
  };

  const handleCancelScan = () => {
    setShowConfirmSheet(false);
    setScannedAsset(null);
    setMatchedDepot(null);
    resetScanner();
  };

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
            <Text style={styles.title}>Scan QR Code</Text>
            <Text style={styles.subtitle}>
              Point camera at asset QR code
            </Text>
          </View>

          {/* Scanning frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          <View style={styles.footer}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Location:</Text>
              <Text style={[
                styles.statusValue,
                !hasLocationPermission && styles.statusValueError
              ]}>
                {isLocationLoading
                  ? 'Getting location...'
                  : hasLocationPermission
                    ? (location
                        ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                        : 'Ready')
                    : 'Permission required'}
              </Text>
            </View>
            {!hasLocationPermission && (
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestLocationPermission}
              >
                <Text style={styles.permissionButtonText}>Enable Location</Text>
              </TouchableOpacity>
            )}

          </View>

          {/* Workflow Log Overlay */}
          {workflowLog.length > 0 && (
            <View style={styles.logOverlay}>
              <View style={styles.logContainer}>
                <View style={styles.logHeader}>
                  <Text style={styles.logTitle}>Workflow Log</Text>
                  <TouchableOpacity onPress={() => setWorkflowLog([])}>
                    <Text style={styles.logClear}>Clear</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  ref={logScrollRef}
                  style={styles.logScroll}
                  showsVerticalScrollIndicator={true}
                >
                  {workflowLog.map((entry, index) => (
                    <View key={index} style={styles.logEntry}>
                      <Text style={styles.logTime}>
                        {entry.timestamp.toLocaleTimeString()}
                      </Text>
                      <Text style={[
                        styles.logMessage,
                        entry.type === 'success' && styles.logSuccess,
                        entry.type === 'error' && styles.logError,
                        entry.type === 'warning' && styles.logWarning,
                      ]}>
                        {entry.message}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </SafeAreaView>
      </CameraView>

      <ScanConfirmSheet
        visible={showConfirmSheet}
        asset={scannedAsset}
        location={location}
        matchedDepot={matchedDepot}
        isSubmitting={isCreatingScan}
        onConfirm={handleConfirmScan}
        onCancel={handleCancelScan}
      />
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
    paddingTop: 35,
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

  // Workflow Log
  logOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: spacing.lg,
    paddingTop: 80,
  },
  logContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  logTitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.chrome,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logClear: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.electricBlue,
  },
  logScroll: {
    flex: 1,
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  logTime: {
    fontSize: 10,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginRight: spacing.xs,
    width: 65,
  },
  logMessage: {
    fontSize: 11,
    fontFamily: 'Lato_400Regular',
    color: colors.textInverse,
    flex: 1,
  },
  logSuccess: {
    color: colors.scanSuccess,
  },
  logError: {
    color: colors.error,
  },
  logWarning: {
    color: colors.warning,
  },
});
