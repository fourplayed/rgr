import React, { memo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import type { AssetScan } from '@rgr/shared';
import { isStandaloneScan } from '@rgr/shared';

interface CombinationLinkSheetProps {
  visible: boolean;
  /** The previous scan that can be linked to */
  previousScan: AssetScan | null;
  /** The current scan that was just confirmed */
  currentAssetNumber: string;
  /** Number of assets already in the combination (if extending) */
  existingComboSize?: number;
  onLinkToPrevious: () => void;
  onKeepSeparate: () => void;
  onDismiss?: () => void;
}

function CombinationLinkSheetComponent({
  visible,
  previousScan,
  currentAssetNumber,
  existingComboSize,
  onLinkToPrevious,
  onKeepSeparate,
  onDismiss,
}: CombinationLinkSheetProps) {
  if (!visible || !previousScan) return null;

  const previousAssetNumber = previousScan.assetNumber;
  const isExtendingCombo = !isStandaloneScan(previousScan);
  const comboSize = existingComboSize ?? (isExtendingCombo ? 2 : 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onKeepSeparate}
      onDismiss={onDismiss}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onKeepSeparate}
        />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="link" size={32} color={colors.electricBlue} />
              </View>
              <Text style={styles.title}>Link Assets?</Text>
              <Text style={styles.subtitle}>
                Create a combination with{' '}
                <Text style={styles.assetNumber}>{previousAssetNumber}</Text>
              </Text>
            </View>

            {/* Visual representation of the link */}
            <View style={styles.linkPreview}>
              <View style={styles.assetChip}>
                <Ionicons name="cube-outline" size={16} color={colors.text} />
                <Text style={styles.assetChipText}>{previousAssetNumber}</Text>
                {isExtendingCombo && (
                  <View style={styles.comboBadge}>
                    <Text style={styles.comboBadgeText}>+{comboSize - 1}</Text>
                  </View>
                )}
              </View>

              <View style={styles.linkLine}>
                <View style={styles.linkDot} />
                <View style={styles.linkDash} />
                <Ionicons name="link" size={14} color={colors.electricBlue} />
                <View style={styles.linkDash} />
                <View style={styles.linkDot} />
              </View>

              <View style={[styles.assetChip, styles.assetChipNew]}>
                <Ionicons name="cube" size={16} color={colors.electricBlue} />
                <Text style={[styles.assetChipText, styles.assetChipTextNew]}>
                  {currentAssetNumber}
                </Text>
              </View>
            </View>

            {/* Info text */}
            <Text style={styles.infoText}>
              {isExtendingCombo
                ? 'Add this asset to the existing combination. You can take a photo of them together.'
                : 'Link these assets as a combination (e.g., trailer + dolly). You can take a photo of them together.'}
            </Text>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.separateButton]}
                onPress={onKeepSeparate}
                accessibilityRole="button"
                accessibilityLabel="Keep separate"
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.text} />
                <Text style={styles.separateButtonText}>Keep Separate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.linkButton]}
                onPress={onLinkToPrevious}
                accessibilityRole="button"
                accessibilityLabel="Link assets"
              >
                <Ionicons name="link" size={20} color={colors.textInverse} />
                <Text style={styles.linkButtonText}>Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export const CombinationLinkSheet = memo(CombinationLinkSheetComponent);

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

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.electricBlue + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  assetNumber: {
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
  },

  // Link Preview
  linkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  assetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assetChipNew: {
    borderColor: colors.electricBlue,
    backgroundColor: colors.electricBlue + '10',
  },
  assetChipText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  assetChipTextNew: {
    color: colors.electricBlue,
  },
  comboBadge: {
    backgroundColor: colors.electricBlue,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  comboBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
  },
  linkLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  linkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.electricBlue,
  },
  linkDash: {
    width: 12,
    height: 2,
    backgroundColor: colors.electricBlue,
    marginHorizontal: 2,
  },

  // Info
  infoText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
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
    flexDirection: 'row',
    gap: spacing.sm,
  },
  separateButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  separateButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  linkButton: {
    backgroundColor: colors.electricBlue,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  linkButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
