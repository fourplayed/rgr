import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanToast } from './ScanToast';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { styles } from './scan.styles';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface CameraOverlayProps {
  // Asset count mode
  assetCountActive: boolean;
  assetCountDepotName: string | null;
  assetCountScanCount: number;

  // Footer
  hasLocationPermission: boolean;
  onRequestLocationPermission: () => void;
  canPerformAssetCount: boolean;
  onStartAssetCount: () => void;
  onEndAssetCount: () => void;

  // Debug scan (dev only)
  onDebugScan: () => void;

  // Count mode inline components
  scanToast?: {
    visible: boolean;
    message: string;
    type: 'success' | 'info' | 'link';
    showUndo: boolean;
  };
  onScanToastDismiss?: () => void;
  onScanToastUndo?: () => void;

  // Chain mode
  isChainActive?: boolean;
  activeChainSize?: number;
  onStartChain?: () => void;
  onEndChain?: () => void;

  // Scan status overlay
  scanStatus?: string | null;
}

function CameraOverlayComponent({
  assetCountActive,
  assetCountDepotName,
  assetCountScanCount,
  hasLocationPermission,
  onRequestLocationPermission,
  canPerformAssetCount,
  onStartAssetCount,
  onEndAssetCount,
  onDebugScan,
  scanToast,
  onScanToastDismiss,
  onScanToastUndo,
  isChainActive,
  activeChainSize,
  onStartChain,
  onEndChain,
  scanStatus,
}: CameraOverlayProps) {
  return (
    <SafeAreaView style={styles.overlay}>
      <View style={styles.header}>
        {assetCountActive ? (
          <>
            <View style={styles.assetCountBadge}>
              <Ionicons name="clipboard-outline" size={14} color={colors.textInverse} />
              <Text style={styles.assetCountBadgeText}>Asset Count Mode</Text>
            </View>
            {isChainActive && (
              <View style={chainStyles.chainingBadge}>
                <Ionicons name="link" size={12} color={colors.textInverse} />
                <Text style={chainStyles.chainingBadgeText}>Chaining</Text>
              </View>
            )}
            <Text style={styles.title}>{assetCountDepotName}</Text>
            <Text style={styles.subtitle}>
              {assetCountScanCount} assets counted
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

        {/* Scan toast (count mode inline feedback) */}
        {scanToast && onScanToastDismiss && (
          <ScanToast
            visible={scanToast.visible}
            message={scanToast.message}
            type={scanToast.type}
            onUndo={scanToast.showUndo ? onScanToastUndo : undefined}
            onDismiss={onScanToastDismiss}
          />
        )}
      </View>

      {/* Scanning frame */}
      <View style={styles.scanFrame}>
        <View style={[styles.corner, styles.cornerTopLeft]} />
        <View style={[styles.corner, styles.cornerTopRight]} />
        <View style={[styles.corner, styles.cornerBottomLeft]} />
        <View style={[styles.corner, styles.cornerBottomRight]} />
      </View>

      {/* Scan status pill */}
      {scanStatus ? (
        <View style={statusStyles.scanStatusPill}>
          <LoadingDots color={colors.textInverse} size={6} />
          <Text style={statusStyles.scanStatusText}>{scanStatus}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        {/* Chain controls (count mode) */}
        {assetCountActive && onStartChain && onEndChain && (
          isChainActive ? (
            <View style={chainStyles.chainActiveContainer}>
              <View style={chainStyles.chainStatus}>
                <Ionicons name="link" size={16} color={colors.electricBlue} />
                <Text style={chainStyles.chainStatusText}>
                  Building Chain ({activeChainSize ?? 0} {(activeChainSize ?? 0) === 1 ? 'asset' : 'assets'})
                </Text>
              </View>
              <TouchableOpacity
                style={chainStyles.endChainButton}
                onPress={onEndChain}
                accessibilityRole="button"
                accessibilityLabel="End chain"
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.textInverse} />
                <Text style={chainStyles.endChainButtonText}>End Chain</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={chainStyles.startChainButton}
              onPress={onStartChain}
              accessibilityRole="button"
              accessibilityLabel="Start chain"
            >
              <Ionicons name="link" size={18} color={colors.electricBlue} />
              <Text style={chainStyles.startChainButtonText}>Start Chain</Text>
            </TouchableOpacity>
          )
        )}

        {!hasLocationPermission && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={onRequestLocationPermission}
            accessibilityRole="button"
            accessibilityLabel="Enable location"
            accessibilityHint="Double tap to grant location permission for scan tracking"
          >
            <Text style={styles.permissionButtonText}>Enable Location</Text>
          </TouchableOpacity>
        )}

        {/* Debug button for testing */}
        {__DEV__ && (
          <TouchableOpacity
            style={chainStyles.startChainButton}
            onPress={onDebugScan}
          >
            <Ionicons name="bug-outline" size={18} color={colors.warning} />
            <Text style={[chainStyles.startChainButtonText, { color: colors.warning }]}>Debug Scan</Text>
          </TouchableOpacity>
        )}

        {/* Asset Count button for managers+ */}
        {canPerformAssetCount && (
          <TouchableOpacity
            style={[
              styles.assetCountButton,
              assetCountActive && styles.assetCountButtonActive,
            ]}
            onPress={assetCountActive ? onEndAssetCount : onStartAssetCount}
            accessibilityRole="button"
            accessibilityLabel={assetCountActive ? 'End asset count' : 'Start asset count'}
          >
            <Ionicons
              name={assetCountActive ? 'stop-circle-outline' : 'clipboard-outline'}
              size={18}
              color={assetCountActive ? colors.error : colors.electricBlue}
            />
            <Text
              style={[
                styles.assetCountButtonText,
                assetCountActive && styles.assetCountButtonTextActive,
              ]}
            >
              {assetCountActive ? 'End Count' : 'Asset Count'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

// React.memo prevents re-renders when props haven't changed.
// Note: this is only effective if the parent memoizes callback props
// (e.g., via useCallback) — otherwise new function references on every
// render will defeat the shallow comparison.
export const CameraOverlay = React.memo(CameraOverlayComponent);

const statusStyles = StyleSheet.create({
  scanStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  scanStatusText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
});

const chainStyles = StyleSheet.create({
  chainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
    gap: 4,
  },
  chainingBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  chainActiveContainer: {
    marginBottom: spacing.sm,
  },
  chainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chainStatusText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
  },
  endChainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  endChainButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  startChainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.electricBlue + '20',
    borderWidth: 1,
    borderColor: colors.electricBlue + '50',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  startChainButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
});
