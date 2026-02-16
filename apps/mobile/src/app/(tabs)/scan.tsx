import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useAssetByQRCode, useCreateScanEvent } from '../../hooks/useAssetData';
import { useLocation } from '../../hooks/useLocation';
import { useQRScanner } from '../../hooks/useQRScanner';
import { useAuthStore } from '../../store/authStore';
import { ScanConfirmSheet } from '../../components/scanner/ScanConfirmSheet';
import type { Asset } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';

export default function ScanScreen() {
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);

  const {
    location,
    requestLocation,
    hasPermission: hasLocationPermission,
  } = useLocation();

  const { mutateAsync: lookupAsset, isPending: isLookingUp } = useAssetByQRCode();
  const { mutateAsync: createScan, isPending: isCreatingScan } = useCreateScanEvent();

  const { handleBarCodeScanned, resetScanner } = useQRScanner(
    async (qrData) => {
      try {
        // Get location first
        const currentLocation = await requestLocation();

        if (!currentLocation) {
          Alert.alert('Location Required', 'Unable to get current location');
          resetScanner();
          return;
        }

        // Lookup asset from QR code
        const asset = await lookupAsset(qrData);

        // Show confirmation sheet
        setScannedAsset(asset);
        setShowConfirmSheet(true);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to scan QR code';
        Alert.alert('Scan Failed', message);
        resetScanner();
      }
    }
  );

  const handleConfirmScan = async () => {
    if (!scannedAsset || !location || !user) {
      Alert.alert('Error', 'Missing required information');
      return;
    }

    try {
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
      });

      // Success haptic and animation
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Close sheet and reset
      setShowConfirmSheet(false);
      setScannedAsset(null);
      resetScanner();

      // Show success message
      Alert.alert('Success', `Asset ${scannedAsset.assetNumber} scanned successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit scan';
      Alert.alert('Scan Failed', message);
    }
  };

  const handleCancelScan = () => {
    setShowConfirmSheet(false);
    setScannedAsset(null);
    resetScanner();
  };

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  if (!permission) {
    return (
      <LinearGradient colors={[...colors.gradientDark]} style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <Text style={styles.messageText}>Checking camera permission...</Text>
        </View>
      </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={[...colors.gradientDark]} style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <Text style={styles.messageText}>Camera permission is required to scan QR codes</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </LinearGradient>
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
              <Text style={styles.statusValue}>
                {hasLocationPermission ? 'Ready' : 'Not available'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </CameraView>

      <ScanConfirmSheet
        visible={showConfirmSheet}
        asset={scannedAsset}
        location={location}
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
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textInverse,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.chrome,
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
    color: colors.chrome,
    marginRight: spacing.sm,
  },
  statusValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
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
    color: colors.textInverse,
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
    color: colors.textInverse,
  },
});
