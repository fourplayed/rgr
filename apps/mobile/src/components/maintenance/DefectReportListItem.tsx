import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DefectReportListItem as DefectReportListItemType, DefectStatus } from '@rgr/shared';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { DefectStatusBadge } from './DefectStatusBadge';

export const DEFECT_STATUS_CONFIG: Record<DefectStatus, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  reported:  { icon: 'warning',          color: colors.warning },
  accepted:  { icon: 'construct',        color: colors.info },
  resolved:  { icon: 'checkmark-circle', color: colors.success },
  dismissed: { icon: 'close-circle',     color: colors.textSecondary },
};

export const DEFECT_ITEM_HEIGHT = 72;

interface DefectReportListItemProps {
  defect: DefectReportListItemType;
  onPress: (defect: DefectReportListItemType) => void;
}

function DefectReportListItemComponent({ defect, onPress }: DefectReportListItemProps) {
  const { icon, color } = DEFECT_STATUS_CONFIG[defect.status] ?? DEFECT_STATUS_CONFIG.reported;

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: color }]}
      onPress={() => onPress(defect)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Defect report ${defect.title}, status ${defect.status}`}
    >
      <View style={styles.cardRow}>
        <View style={styles.cardIconContainer}>
          <Ionicons name={icon} size={31} color={color} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardContentRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {defect.assetNumber ? formatAssetNumber(defect.assetNumber) : 'Unknown Asset'}
            </Text>
            <View style={styles.cardBadges}>
              <DefectStatusBadge status={defect.status} label={defect.status === 'accepted' ? 'Task Created' : undefined} />
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardSecondaryText} numberOfLines={1}>
              {defect.description || defect.title}
            </Text>
            <Text style={styles.cardTime}>
              {formatRelativeTime(defect.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const DefectReportListItem = memo(
  DefectReportListItemComponent,
  (prev, next) =>
    prev.defect.id === next.defect.id &&
    prev.defect.title === next.defect.title &&
    prev.defect.description === next.defect.description &&
    prev.defect.status === next.defect.status &&
    prev.defect.assetNumber === next.defect.assetNumber &&
    prev.onPress === next.onPress
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  cardContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    flex: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSecondaryText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTime: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
});
