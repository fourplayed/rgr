import React, { ReactNode } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoadingDots } from '../common/LoadingDots';
import type { Asset, Depot } from '@rgr/shared';
import { AssetStatusColors, getDepotBadgeColors } from '@rgr/shared';
import { StatusBadge } from '../common/StatusBadge';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import type { LocationData } from '../../hooks/useLocation';

interface ScanConfirmSheetProps {
  visible: boolean;
  asset: Asset | null;
  location: LocationData | null;
  matchedDepot: { depot: Depot; distanceKm: number } | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Called when the modal dismiss animation completes (iOS only) */
  onDismiss?: () => void;
  /** Optional role-specific content (e.g., maintenance checkbox) */
  children?: ReactNode;
}

export function ScanConfirmSheet({
  visible,
  asset,
  location,
  matchedDepot,
  isSubmitting,
  onConfirm,
  onCancel,
  onDismiss,
  children,
}: ScanConfirmSheetProps) {
  if (!asset) return null;

  // Format subtype display
  const subtypeDisplay = asset.subtype
    ? asset.subtype
    : asset.category === 'dolly' ? 'Dolly' : 'Trailer';

  // Get status color for left border
  const statusColor = AssetStatusColors[asset.status as keyof typeof AssetStatusColors] || colors.electricBlue;

  const depotBadgeColors = matchedDepot ? getDepotBadgeColors(matchedDepot.depot, colors.chrome, colors.text) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      onDismiss={onDismiss}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onCancel}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.content}>
            <Text style={styles.title}>Confirm Scan</Text>

            {/* Asset Info Card */}
            <View style={[styles.assetCard, { borderLeftWidth: 4, borderLeftColor: statusColor }]}>
              <View style={styles.assetHeader}>
                <Text style={styles.assetNumber}>{asset.assetNumber ?? 'Unknown'}</Text>
                {asset.status && <StatusBadge status={asset.status} size="small" />}
              </View>

              <Text style={styles.subtype}>{subtypeDisplay}</Text>
            </View>

            {/* Location & Depot Card (merged) */}
            <View style={[styles.locationCard, matchedDepot && styles.locationCardSuccess]}>
              <View style={styles.locationHeader}>
                <View style={styles.locationHeaderLeft}>
                  <View style={styles.locationTitleRow}>
                    <Ionicons
                      name={matchedDepot ? "checkmark-circle" : "navigate"}
                      size={20}
                      color={matchedDepot ? colors.success : colors.electricBlue}
                    />
                    <Text style={styles.locationTitle}>
                      {matchedDepot ? 'Depot Matched' : 'Current Location'}
                    </Text>
                  </View>
                  {location && (
                    <View style={styles.coordinatesRow}>
                      <Text style={styles.coordinates}>
                        {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                      </Text>
                      {location.accuracy && (
                        <Text style={styles.accuracy}> ±{Math.round(location.accuracy)}m</Text>
                      )}
                    </View>
                  )}
                  {!matchedDepot && location && (
                    <Text style={styles.noDepotText}>No depot within range</Text>
                  )}
                </View>

                {matchedDepot && depotBadgeColors ? (
                  <View style={styles.depotColumn}>
                    <View style={[styles.depotBadge, { backgroundColor: depotBadgeColors.bg }]}>
                      <Text style={[styles.depotBadgeText, { color: depotBadgeColors.text }]}>
                        {matchedDepot.depot.name}
                      </Text>
                    </View>
                    <Text style={styles.depotDistance}>
                      {matchedDepot.distanceKm.toFixed(1)} km away
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Role-specific content (e.g., defect report checkbox) */}
            {children}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Cancel scan"
                accessibilityHint="Double tap to cancel and return to scanning"
                accessibilityState={{ disabled: isSubmitting }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={onConfirm}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel={isSubmitting ? "Submitting scan" : "Confirm scan"}
                accessibilityHint="Double tap to confirm and submit the scan"
                accessibilityState={{ disabled: isSubmitting }}
              >
                {isSubmitting ? (
                  <LoadingDots color={colors.textInverse} size={8} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: spacing['2xl'],
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
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // Asset Card
  assetCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  subtype: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Location Card
  locationCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.electricBlue,
  },
  locationCardSuccess: {
    borderLeftColor: colors.success,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  locationHeaderLeft: {
    flex: 1,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  locationTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  depotColumn: {
    alignItems: 'flex-end',
  },
  depotBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  depotBadgeText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
  },
  depotDistance: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  noDepotText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.warning,
    marginTop: spacing.xs,
  },
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coordinates: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  accuracy: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  confirmButton: {
    backgroundColor: colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
