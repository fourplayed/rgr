import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  LayoutAnimation,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CountSummarySheet } from './CountSummarySheet';
import { ScanToast } from './ScanToast';
import { LoadingDots } from '../common/LoadingDots';
import { PillBadge } from '../common/PillBadge';
import { colors } from '../../theme/colors';
import { styles, TOP_BAR_HEIGHT } from './scan.styles';
import { spacing } from '../../theme/spacing';

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
  const topBarHeight = useRef(TOP_BAR_HEIGHT);

  const handleToggleSummary = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSummary(v => !v);
  }, []);

  const handleTopBarLayout = useCallback((e: LayoutChangeEvent) => {
    topBarHeight.current = e.nativeEvent.layout.height;
  }, []);

  const handleStartAssetCount = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onStartAssetCount();
  }, [onStartAssetCount]);

  const handleEndAssetCount = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onEndAssetCount();
  }, [onEndAssetCount]);

  const showFooterTray = assetCountActive || canPerformAssetCount;

  return (
    <SafeAreaView style={styles.overlay}>
      {/* ── Top Bar ──────────────────────────────── */}
      <View style={styles.topBar} onLayout={handleTopBarLayout}>
        {assetCountActive ? (
          <>
            {/* Left group: badges + depot name */}
            <View style={styles.topBarBadges}>
              <PillBadge
                icon="clipboard-outline"
                label="Asset Count"
                color={colors.electricBlue}
                iconSize={14}
              />
              {isChainActive && (
                <PillBadge
                  icon="link"
                  label={`Chain ${activeChainSize ?? 0}/${maxChainSize}`}
                  color={colors.violet}
                  accessibilityLabel={`Combination chain, ${activeChainSize ?? 0} of ${maxChainSize} assets`}
                />
              )}
              <Text
                style={styles.topBarDepotName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {assetCountDepotName}
              </Text>
            </View>

            {/* Right group: tappable count pill */}
            <TouchableOpacity
              style={styles.topBarCount}
              onPress={countSummary && assetCountScanCount > 0 ? handleToggleSummary : undefined}
              disabled={!countSummary || assetCountScanCount === 0}
              accessibilityRole="button"
              accessibilityLabel={`${assetCountScanCount} assets counted. Tap for summary.`}
              accessibilityHint="Opens count summary"
            >
              <Text style={[styles.topBarCountText, countSummary && assetCountScanCount > 0 && styles.tappableCount]}>
                {assetCountScanCount} ▾
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.topBarTitleCenter}>
            <Text style={styles.topBarTitleText}>Scan QR Code</Text>
            <Text style={styles.topBarSubtitleText}>
              Point camera at asset QR code
            </Text>
          </View>
        )}
      </View>

      {/* ── Floating Toast ───────────────────────── */}
      {scanToast && onScanToastDismiss && (
        <View
          style={[
            styles.floatingToastContainer,
            { top: topBarHeight.current + spacing.sm },
          ]}
          pointerEvents="box-none"
        >
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

      {/* ── Footer Tray ──────────────────────────── */}
      {showFooterTray && (
        <View style={styles.footerTray}>
          {assetCountActive ? (
            <>
              {/* Chain controls */}
              {onStartChain && onEndChain && (
                isChainActive ? (
                  <View style={styles.chainActionRow}>
                    <TouchableOpacity
                      style={[styles.scannerButtonBase, styles.buttonError]}
                      onPress={onDiscardChain}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel combination chain"
                    >
                      <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                      <Text style={[styles.scannerButtonText, styles.buttonErrorText]}>Cancel</Text>
                    </TouchableOpacity>
                    {(activeChainSize ?? 0) >= 2 && (
                      <TouchableOpacity
                        style={[styles.scannerButtonBase, styles.buttonSuccess]}
                        onPress={onEndChain}
                        accessibilityRole="button"
                        accessibilityLabel="Done creating combination chain"
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color={colors.textInverse} />
                        <Text style={[styles.scannerButtonText, styles.buttonSuccessText]}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.scannerButtonBase, styles.buttonChain, { marginBottom: spacing.sm }]}
                    onPress={onStartChain}
                    accessibilityRole="button"
                    accessibilityLabel="Create combination chain"
                  >
                    <Ionicons name="link" size={18} color={colors.violet} />
                    <Text style={[styles.scannerButtonText, styles.buttonChainText]}>Create Combination Chain</Text>
                  </TouchableOpacity>
                )
              )}

              {/* End Count (always at bottom) */}
              {canPerformAssetCount && (
                <TouchableOpacity
                  style={[styles.scannerButtonBase, styles.buttonError]}
                  onPress={handleEndAssetCount}
                  accessibilityRole="button"
                  accessibilityLabel="End asset count"
                >
                  <Ionicons name="stop-circle-outline" size={18} color={colors.error} />
                  <Text style={[styles.scannerButtonText, styles.buttonErrorText]}>
                    End Asset Count Mode
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            canPerformAssetCount && (
              <TouchableOpacity
                style={[styles.scannerButtonBase, styles.buttonDefault]}
                onPress={handleStartAssetCount}
                accessibilityRole="button"
                accessibilityLabel="Start asset count"
              >
                <Ionicons name="clipboard-outline" size={18} color={colors.electricBlue} />
                <Text style={[styles.scannerButtonText, styles.buttonDefaultText]}>Asset Count</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      )}

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
