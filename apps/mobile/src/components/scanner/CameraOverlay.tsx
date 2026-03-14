import React, { useEffect, useRef } from 'react';
import { View, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { styles } from './scan.styles';
import { AppText } from '../common';
import { ScanProgressOverlay } from './ScanProgressOverlay';
import type { ScanStep } from './ScanProgressOverlay';

interface CameraOverlayProps {
  hasLocationPermission: boolean;
  onRequestLocationPermission: () => void;
  scanStep?: ScanStep | null;
  /** __DEV__-only: triggers a scan using the first asset from the database */
  onDebugScan?: () => void;
}

function CameraOverlayComponent({
  hasLocationPermission,
  onRequestLocationPermission,
  scanStep,
  onDebugScan,
}: CameraOverlayProps) {
  const cornerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (scanStep) {
      // QR detected — solid corners during processing
      cornerOpacity.setValue(1);
      return;
    }

    // Pulse corners to indicate active scanning
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerOpacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(cornerOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scanStep, cornerOpacity]);

  return (
    <SafeAreaView style={styles.overlay}>
      {/* ── Top Bar ──────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBarTitleCenter}>
          <AppText style={styles.topBarTitleText}>Scan QR Code</AppText>
          <AppText style={styles.topBarSubtitleText}>Point camera at asset QR code</AppText>
        </View>
      </View>

      {/* ── Scan Frame ───────────────────────────── */}
      <View style={styles.scanFrame}>
        <View style={styles.scanReticle}>
          <Animated.View
            style={[styles.corner, styles.cornerTopLeft, { opacity: cornerOpacity }]}
          />
          <Animated.View
            style={[styles.corner, styles.cornerTopRight, { opacity: cornerOpacity }]}
          />
          <Animated.View
            style={[styles.corner, styles.cornerBottomLeft, { opacity: cornerOpacity }]}
          />
          <Animated.View
            style={[styles.corner, styles.cornerBottomRight, { opacity: cornerOpacity }]}
          />
          {scanStep ? <ScanProgressOverlay step={scanStep} /> : null}
        </View>
      </View>

      {/* ── Footer: location prompt + debug scan ── */}
      {!hasLocationPermission && (
        <View style={styles.footerTray}>
          <TouchableOpacity
            style={[styles.scannerButtonBase, styles.buttonPrimary]}
            onPress={onRequestLocationPermission}
            accessibilityRole="button"
            accessibilityLabel="Enable location"
            accessibilityHint="Double tap to grant location permission for scan tracking"
          >
            <AppText style={[styles.scannerButtonText, styles.buttonPrimaryText]}>
              Enable Location
            </AppText>
          </TouchableOpacity>
        </View>
      )}
      {onDebugScan && (
        <View style={styles.debugButtonContainer}>
          <Button onPress={onDebugScan} color={colors.electricBlue}>
            Debug Scan
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

// React.memo prevents re-renders when props haven't changed.
// Note: this is only effective if the parent memoizes callback props
// (e.g., via useCallback) — otherwise new function references on every
// render will defeat the shallow comparison.
export const CameraOverlay = React.memo(CameraOverlayComponent);
