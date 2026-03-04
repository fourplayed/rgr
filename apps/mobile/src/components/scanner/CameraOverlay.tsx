import React, { useCallback, useRef, type ReactNode } from 'react';
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
  /** Resolved depot name — null hides the badge entirely */
  depotName: string | null;
  /** User role badge config — null hides the badge */
  roleBadge: { label: string; color: string } | null;
  /** Optional scan result card rendered between top bar and scan frame */
  scanCard?: ReactNode;
  /** Optional action bar rendered in footer area */
  scanActionBar?: ReactNode;
  /** Optional undo toast rendered at top of scan frame */
  scanToast?: ReactNode;
}

function CameraOverlayComponent({
  hasLocationPermission,
  onRequestLocationPermission,
  scanStatus,
  depotName,
  roleBadge,
  scanCard,
  scanActionBar,
  scanToast,
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

      {/* ── Scan Card (between top bar and scan frame) ── */}
      {scanCard}

      {/* ── Undo Toast ── */}
      {scanToast}

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

        {/* Depot & role context badges */}
        {(depotName || roleBadge) && (
          <View style={styles.contextBadgeRow}>
            {depotName && (
              <PillBadge
                icon="location"
                label={depotName}
                color="rgba(0, 0, 0, 0.6)"
                accessibilityRole="text"
                accessibilityLabel={`Depot: ${depotName}`}
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
      </View>

      {/* ── Footer: Action bar or location prompt ── */}
      {scanActionBar ? (
        scanActionBar
      ) : !hasLocationPermission ? (
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
