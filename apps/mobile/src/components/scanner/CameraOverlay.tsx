import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CountSummarySheet } from './CountSummarySheet';
import { ScanToast } from './ScanToast';
import { LoadingDots } from '../common/LoadingDots';
import { PillBadge } from '../common/PillBadge';
import { colors } from '../../theme/colors';
import { styles } from './scan.styles';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

export interface CountSummaryData {
  standaloneCount: number;
  combinationCount: number;
  recentAssetNumbers: string[];
}

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

  // Count mode inline components
  scanToast?: {
    visible: boolean;
    message: string;
    type: 'success' | 'info' | 'link';
    showUndo: boolean;
  };
  scanToastId?: number;
  onScanToastDismiss?: () => void;
  onScanToastUndo?: () => void;
  onUndoWindowOpen?: () => void;
  onUndoWindowClose?: () => void;

  // Chain (linking) mode
  isChainActive?: boolean;
  activeChainSize?: number;
  maxChainSize?: number;
  onStartChain?: () => void;
  onEndChain?: () => void;
  onDiscardChain?: () => void;

  // Mid-count summary
  countSummary?: CountSummaryData;

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
  scanToast,
  scanToastId,
  onScanToastDismiss,
  onScanToastUndo,
  onUndoWindowOpen,
  onUndoWindowClose,
  isChainActive,
  activeChainSize,
  maxChainSize = 5,
  onStartChain,
  onEndChain,
  onDiscardChain,
  countSummary,
  scanStatus,
}: CameraOverlayProps) {
  const [showSummary, setShowSummary] = useState(false);
  const handleToggleSummary = useCallback(() => setShowSummary(v => !v), []);
  return (
    <SafeAreaView style={styles.overlay}>
      <View style={styles.header}>
        {assetCountActive ? (
          <>
            <PillBadge
              icon="clipboard-outline"
              label="Asset Count Mode"
              color={colors.electricBlue}
              iconSize={14}
            />
            {isChainActive && (
              <PillBadge
                icon="link"
                label={`Combo Chain (${activeChainSize ?? 0} of ${maxChainSize})`}
                color={colors.violet}
              />
            )}
            <Text style={styles.title}>{assetCountDepotName}</Text>
            <TouchableOpacity
              onPress={countSummary && assetCountScanCount > 0 ? handleToggleSummary : undefined}
              disabled={!countSummary || assetCountScanCount === 0}
              accessibilityRole="button"
              accessibilityLabel={`${assetCountScanCount} assets counted. Tap for summary.`}
            >
              <Text style={[styles.subtitle, countSummary && assetCountScanCount > 0 && headerStyles.tappableCount]}>
                {assetCountScanCount} assets counted {countSummary && assetCountScanCount > 0 ? '▾' : ''}
              </Text>
            </TouchableOpacity>
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
            toastId={scanToastId}
            onUndoWindowOpen={onUndoWindowOpen}
            onUndoWindowClose={onUndoWindowClose}
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
        {assetCountActive ? (
          <>
            {/* Chain controls (top area) */}
            {onStartChain && onEndChain && (
              isChainActive ? (
                <View style={chainStyles.chainActiveContainer}>
                  <TouchableOpacity
                    style={chainStyles.cancelChainButton}
                    onPress={onDiscardChain}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel combination chain"
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                    <Text style={chainStyles.cancelChainButtonText}>Cancel Chain</Text>
                  </TouchableOpacity>
                  {(activeChainSize ?? 0) >= 2 && (
                    <TouchableOpacity
                      style={chainStyles.endChainButton}
                      onPress={onEndChain}
                      accessibilityRole="button"
                      accessibilityLabel="Done creating combination chain"
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color={colors.textInverse} />
                      <Text style={chainStyles.endChainButtonText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <TouchableOpacity
                  style={chainStyles.startChainButton}
                  onPress={onStartChain}
                  accessibilityRole="button"
                  accessibilityLabel="Create combination chain"
                >
                  <Ionicons name="link" size={18} color={colors.violet} />
                  <Text style={chainStyles.startChainButtonText}>Create Combination Chain</Text>
                </TouchableOpacity>
              )
            )}

            {/* End Count (always at bottom) */}
            {canPerformAssetCount && (
              <TouchableOpacity
                style={[styles.assetCountButton, styles.assetCountButtonActive]}
                onPress={onEndAssetCount}
                accessibilityRole="button"
                accessibilityLabel="End asset count"
              >
                <Ionicons name="stop-circle-outline" size={18} color={colors.error} />
                <Text style={[styles.assetCountButtonText, styles.assetCountButtonTextActive]}>
                  End Asset Count Mode
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
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

            {canPerformAssetCount && (
              <TouchableOpacity
                style={styles.assetCountButton}
                onPress={onStartAssetCount}
                accessibilityRole="button"
                accessibilityLabel="Start asset count"
              >
                <Ionicons name="clipboard-outline" size={18} color={colors.electricBlue} />
                <Text style={styles.assetCountButtonText}>Asset Count</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Mid-count summary sheet */}
      {countSummary && (
        <CountSummarySheet
          visible={showSummary}
          countSummary={countSummary}
          scanCount={assetCountScanCount}
          onDismiss={handleToggleSummary}
        />
      )}
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
  chainActiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cancelChainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '20',
    borderWidth: 1,
    borderColor: colors.error + '50',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  cancelChainButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.error,
    textTransform: 'uppercase',
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
    backgroundColor: colors.violet + '20',
    borderWidth: 1,
    borderColor: colors.violet + '50',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  startChainButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.violet,
    textTransform: 'uppercase',
  },
});

const headerStyles = StyleSheet.create({
  tappableCount: {
    textDecorationLine: 'underline',
  },
});
