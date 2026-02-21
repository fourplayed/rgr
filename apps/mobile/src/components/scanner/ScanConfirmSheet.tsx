import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { Asset } from '@rgr/shared';
import { formatRelativeTime } from '@rgr/shared';
import { StatusBadge } from '../common/StatusBadge';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';
import type { LocationData } from '../../hooks/useLocation';

interface ScanConfirmSheetProps {
  visible: boolean;
  asset: Asset | null;
  location: LocationData | null;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ScanConfirmSheet({
  visible,
  asset,
  location,
  isSubmitting,
  onConfirm,
  onCancel,
}: ScanConfirmSheetProps) {
  if (!asset) return null;

  const lastScanText = asset.lastLocationUpdatedAt
    ? `Last scanned ${formatRelativeTime(asset.lastLocationUpdatedAt)}`
    : 'Never scanned';

  const lastLocationText = asset.assignedDepotId
    ? 'location tracked'
    : 'location unknown';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
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

            <View style={styles.assetInfo}>
              <View style={styles.assetHeader}>
                <Text style={styles.assetNumber}>{asset.assetNumber ?? 'Unknown'}</Text>
                {asset.status && <StatusBadge status={asset.status} size="small" />}
              </View>

              <Text style={styles.description} numberOfLines={2}>
                {asset.description ?? 'No description'}
              </Text>

              <Text style={styles.lastScan}>
                {lastScanText} {lastLocationText}
              </Text>
            </View>

            {location && (
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Current Location</Text>
                <Text style={styles.coordinates}>
                  {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </Text>
                {location.accuracy && (
                  <Text style={styles.accuracy}>
                    Accuracy: ±{Math.round(location.accuracy)}m
                  </Text>
                )}
              </View>
            )}

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
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Scan</Text>
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
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  assetInfo: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  assetNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  lastScan: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  locationInfo: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  locationTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  coordinates: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.electricBlue,
    fontFamily: 'monospace',
  },
  accuracy: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.base,
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
    fontWeight: fontWeight.semibold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.electricBlue,
  },
  confirmButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
});
