import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  type LayoutChangeEvent,
} from 'react-native';
import { LoadingDots } from '../common/LoadingDots';
import { PillBadge } from '../common/PillBadge';
import { colors } from '../../theme/colors';
import { styles, TOP_BAR_HEIGHT } from './scan.styles';

interface CameraOverlayProps {
  hasLocationPermission: boolean;
  onRequestLocationPermission: () => void;
  scanStatus?: string | null;
  /** Resolved depot badge config — null hides the badge entirely */
  depotBadge: { label: string; bgColor: string; textColor: string } | null;
  /** User role badge config — null hides the badge */
  roleBadge: { label: string; color: string } | null;
}

function CameraOverlayComponent({
  hasLocationPermission,
  onRequestLocationPermission,
  scanStatus,
  depotBadge,
  roleBadge,
}: CameraOverlayProps) {
  const topBarHeight = useRef(TOP_BAR_HEIGHT);

  const handleTopBarLayout = useCallback((e: LayoutChangeEvent) => {
    topBarHeight.current = e.nativeEvent.layout.height;
  }, []);

  return (
    <SafeAreaView style={styles.overlay}>
      {/* ── Top Bar ──────────────────────────────── */}
      <View style={styles.topBar} onLayout={handleTopBarLayout}>
        <View style={styles.topBarTitleCenter}>
          <Text style={styles.topBarTitleText}>Scan QR Code</Text>
          <Text style={styles.topBarSubtitleText}>
            Point camera at asset QR code
          </Text>
        </View>
      </View>

      {/* ── Depot & role context badges (above scan frame) ── */}
      {(depotBadge || roleBadge) && (
        <View style={styles.contextBadgeRow}>
          {depotBadge && (
            <PillBadge
              icon="location"
              label={depotBadge.label}
              color={depotBadge.bgColor}
              textColor={depotBadge.textColor}
              accessibilityRole="text"
              accessibilityLabel={`Depot: ${depotBadge.label}`}
            />
          )}
          {roleBadge && (
            <PillBadge
              icon="person"
              label={roleBadge.label}
              color={roleBadge.color}
              accessibilityRole="text"
              accessibilityLabel={`Role: ${roleBadge.label}`}
            />
          )}
        </View>
      )}

      {/* ── Scan Frame ───────────────────────────── */}
      <View style={styles.scanFrame}>
        <View style={styles.scanReticle}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>

        {/* Scan status pill (below reticle) */}
        {scanStatus ? (
          <View style={styles.scanStatusPill}>
            <LoadingDots color={colors.textInverse} size={6} />
            <Text style={styles.scanStatusText}>{scanStatus}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Footer: location prompt ── */}
      {!hasLocationPermission ? (
        <View style={styles.footerTray}>
          <TouchableOpacity
            style={[styles.scannerButtonBase, styles.buttonPrimary]}
            onPress={onRequestLocationPermission}
            accessibilityRole="button"
            accessibilityLabel="Enable location"
            accessibilityHint="Double tap to grant location permission for scan tracking"
          >
            <Text style={[styles.scannerButtonText, styles.buttonPrimaryText]}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// React.memo prevents re-renders when props haven't changed.
// Note: this is only effective if the parent memoizes callback props
// (e.g., via useCallback) — otherwise new function references on every
// render will defeat the shallow comparison.
export const CameraOverlay = React.memo(CameraOverlayComponent);
