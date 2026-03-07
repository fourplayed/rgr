import React, { useEffect, useRef } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, Animated } from 'react-native';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { styles } from './scan.styles';

interface CameraOverlayProps {
  hasLocationPermission: boolean;
  onRequestLocationPermission: () => void;
  scanStatus?: string | null;
  /** __DEV__-only: triggers a scan using the first asset from the database */
  onDebugScan?: () => void;
}

function CameraOverlayComponent({
  hasLocationPermission,
  onRequestLocationPermission,
  scanStatus,
  onDebugScan,
}: CameraOverlayProps) {
  const cornerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (scanStatus) {
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
  }, [scanStatus, cornerOpacity]);

  return (
    <SafeAreaView style={styles.overlay}>
      {/* ── Top Bar ──────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBarTitleCenter}>
          <Text style={styles.topBarTitleText}>Scan QR Code</Text>
          <Text style={styles.topBarSubtitleText}>Point camera at asset QR code</Text>
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
        </View>

        {/* Scan status pill (below reticle) */}
        {scanStatus ? (
          <View style={styles.scanStatusPill}>
            <LoadingDots color={colors.textInverse} size={6} />
            <Text style={styles.scanStatusText}>{scanStatus}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Footer: location prompt + debug scan ── */}
      {(!hasLocationPermission || (__DEV__ && onDebugScan)) && (
        <View style={styles.footerTray}>
          {!hasLocationPermission && (
            <TouchableOpacity
              style={[styles.scannerButtonBase, styles.buttonPrimary]}
              onPress={onRequestLocationPermission}
              accessibilityRole="button"
              accessibilityLabel="Enable location"
              accessibilityHint="Double tap to grant location permission for scan tracking"
            >
              <Text style={[styles.scannerButtonText, styles.buttonPrimaryText]}>
                Enable Location
              </Text>
            </TouchableOpacity>
          )}
          {__DEV__ && onDebugScan && (
            <TouchableOpacity
              style={[
                styles.scannerButtonBase,
                styles.buttonDefault,
                !hasLocationPermission && { marginTop: 8 },
              ]}
              onPress={onDebugScan}
              accessibilityRole="button"
              accessibilityLabel="Debug scan"
            >
              <Text style={[styles.scannerButtonText, styles.buttonDefaultText]}>Debug Scan</Text>
            </TouchableOpacity>
          )}
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
