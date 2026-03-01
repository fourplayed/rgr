import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { MaintenanceListItem as MaintenanceListItemType, MaintenancePriority } from '@rgr/shared';
import { formatRelativeTime } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge';
import { MaintenancePriorityBadge } from './MaintenancePriorityBadge';

// Fixed height for FlatList getItemLayout optimization
export const MAINTENANCE_ITEM_HEIGHT = 88; // 72px content + 16px margin

interface MaintenanceListItemProps {
  maintenance: MaintenanceListItemType;
  onPress: (maintenance: MaintenanceListItemType) => void;
}

const getPriorityBorderColor = (priority: MaintenancePriority): string => {
  return colors.maintenancePriority[priority as keyof typeof colors.maintenancePriority] ?? colors.border;
};

function MaintenanceListItemComponent({ maintenance, onPress }: MaintenanceListItemProps) {
  const borderColor = getPriorityBorderColor(maintenance.priority);
  const dueDateText = maintenance.dueDate
    ? `Due ${formatRelativeTime(maintenance.dueDate)}`
    : 'No due date';

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: borderColor }]}
      onPress={() => onPress(maintenance)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Maintenance ${maintenance.title}, status ${maintenance.status}, priority ${maintenance.priority}`}
    >
      <View style={styles.cardContent}>
        <View style={styles.details}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {maintenance.title}
            </Text>
            <View style={styles.badgeRow}>
              <MaintenanceStatusBadge status={maintenance.status} />
              <MaintenancePriorityBadge priority={maintenance.priority} />
            </View>
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.assetLabel}>
              {maintenance.assetNumber || 'Unknown Asset'}
            </Text>
            <Text style={styles.dueText}>{dueDateText}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Custom memo comparison - re-render if any rendered field changes
export const MaintenanceListItem = memo(
  MaintenanceListItemComponent,
  (prev, next) =>
    prev.maintenance.id === next.maintenance.id &&
    prev.maintenance.title === next.maintenance.title &&
    prev.maintenance.status === next.maintenance.status &&
    prev.maintenance.priority === next.maintenance.priority &&
    prev.maintenance.dueDate === next.maintenance.dueDate &&
    prev.maintenance.assetNumber === next.maintenance.assetNumber &&
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
    marginBottom: spacing.sm,
    height: MAINTENANCE_ITEM_HEIGHT - spacing.sm, // Account for marginBottom
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  assetLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dueText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
});
