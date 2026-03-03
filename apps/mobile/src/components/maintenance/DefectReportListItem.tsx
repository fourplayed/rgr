import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DefectReportListItem as DefectReportListItemType } from '@rgr/shared';
import { formatRelativeTime } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { DefectStatusBadge } from './DefectStatusBadge';

export const DEFECT_ITEM_HEIGHT = 88;

interface DefectReportListItemProps {
  defect: DefectReportListItemType;
  onPress: (defect: DefectReportListItemType) => void;
}

function DefectReportListItemComponent({ defect, onPress }: DefectReportListItemProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(defect)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Defect report ${defect.title}, status ${defect.status}`}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <Ionicons name="warning" size={20} color={colors.warning} />
        </View>
        <View style={styles.details}>
          <View style={styles.headerRow}>
            <Text style={styles.assetNumber} numberOfLines={1}>
              {defect.assetNumber || 'Unknown Asset'}
            </Text>
            <DefectStatusBadge status={defect.status} />
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>Defect Report</Text>
          <View style={styles.footerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {defect.title}
            </Text>
            <Text style={styles.timestamp}>
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
    prev.defect.status === next.defect.status &&
    prev.defect.assetNumber === next.defect.assetNumber &&
    prev.onPress === next.onPress
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    marginBottom: spacing.sm,
    height: DEFECT_ITEM_HEIGHT - spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetNumber: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  title: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  timestamp: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
});
