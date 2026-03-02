import React, { useState, useCallback } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  // Debug scan (dev only)
  onDebugScan: () => void;

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
  onDebugScan,
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
                label={`Linking (${activeChainSize ?? 0} of ${maxChainSize})`}
                color={colors.warning}
              />
            )}
            <Text style={styles.title}>{assetCountDepotName}</Text>
            <TouchableOpacity
              onPress={countSummary && assetCountScanCount > 0 ? handleToggleSummary : undefined}
              disabled={!countSummary || assetCountScanCount === 0}
              accessibilityRole="button"
              accessibilityLabel={`${assetCountScanCount} assets counted. Tap for summary.`}
            >
              <Text style={[styles.subtitle, countSummary && assetCountScanCount > 0 && summaryStyles.tappableCount]}>
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
        {/* Link controls (count mode) */}
        {assetCountActive && onStartChain && onEndChain && (
          isChainActive ? (
            <View style={chainStyles.chainActiveContainer}>
              <View style={chainStyles.chainStatus}>
                <Ionicons name="link" size={16} color={colors.electricBlue} />
                <Text style={chainStyles.chainStatusText}>
                  Linking Assets ({activeChainSize ?? 0} of {maxChainSize})
                </Text>
              </View>
              <TouchableOpacity
                style={chainStyles.endChainButton}
                onPress={onEndChain}
                accessibilityRole="button"
                accessibilityLabel="Done linking assets"
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.textInverse} />
                <Text style={chainStyles.endChainButtonText}>Done Linking</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={chainStyles.startChainButton}
              onPress={onStartChain}
              accessibilityRole="button"
              accessibilityLabel="Link assets together"
            >
              <Ionicons name="link" size={18} color={colors.electricBlue} />
              <Text style={chainStyles.startChainButtonText}>Link Assets</Text>
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

      {/* Mid-count summary sheet */}
      {countSummary && (
        <Modal
          visible={showSummary}
          transparent
          animationType="slide"
          onRequestClose={handleToggleSummary}
        >
          <View style={summaryStyles.backdrop}>
            <TouchableOpacity
              style={summaryStyles.backdropTouchable}
              activeOpacity={1}
              onPress={handleToggleSummary}
            />
            <View style={summaryStyles.sheet}>
              <View style={summaryStyles.handle} />

              <View style={summaryStyles.content}>
                <Text style={summaryStyles.title}>Count Summary</Text>

                <View style={summaryStyles.statsRow}>
                  <View style={summaryStyles.statBox}>
                    <Text style={summaryStyles.statValue}>{countSummary.standaloneCount}</Text>
                    <Text style={summaryStyles.statLabel}>Standalone</Text>
                  </View>
                  <View style={summaryStyles.statDivider} />
                  <View style={summaryStyles.statBox}>
                    <Text style={summaryStyles.statValue}>{countSummary.combinationCount}</Text>
                    <Text style={summaryStyles.statLabel}>Combinations</Text>
                  </View>
                  <View style={summaryStyles.statDivider} />
                  <View style={summaryStyles.statBox}>
                    <Text style={summaryStyles.statValue}>{assetCountScanCount}</Text>
                    <Text style={summaryStyles.statLabel}>Total</Text>
                  </View>
                </View>

                {countSummary.recentAssetNumbers.length > 0 && (
                  <View style={summaryStyles.recentSection}>
                    <Text style={summaryStyles.recentTitle}>Recent Scans</Text>
                    {countSummary.recentAssetNumbers.map((num, i) => (
                      <View key={`${num}-${i}`} style={summaryStyles.recentItem}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={summaryStyles.recentText}>{num}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={summaryStyles.closeButton}
                  onPress={handleToggleSummary}
                  accessibilityRole="button"
                  accessibilityLabel="Close summary"
                >
                  <Text style={summaryStyles.closeButtonText}>Continue Scanning</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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

const summaryStyles = StyleSheet.create({
  tappableCount: {
    textDecorationLine: 'underline',
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '50%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  recentSection: {
    marginBottom: spacing.lg,
  },
  recentTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recentText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  closeButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
});
