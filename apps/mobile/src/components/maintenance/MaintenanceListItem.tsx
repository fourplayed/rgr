import React, { memo, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  MaintenanceListItem as MaintenanceListItemType,
  MaintenanceStatus,
} from '@rgr/shared';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge';
import { cardStyles } from './maintenance.styles';
import { AppText } from '../common';

export const MAINTENANCE_STATUS_CONFIG: Record<
  MaintenanceStatus,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  scheduled: { icon: 'construct', color: colors.maintenanceStatus.scheduled },
  in_progress: { icon: 'time', color: colors.maintenanceStatus.in_progress },
  completed: { icon: 'checkmark-circle', color: colors.maintenanceStatus.completed },
  cancelled: { icon: 'close-circle', color: colors.maintenanceStatus.cancelled },
};

/** Derived visual state for overdue tasks (scheduled + past due date) */
export const MAINTENANCE_OVERDUE_CONFIG = {
  icon: 'alert-circle' as keyof typeof Ionicons.glyphMap,
  color: colors.warning,
};

/** Returns the icon/color config, upgrading scheduled → overdue when past due date */
export function getMaintenanceVisualConfig(status: MaintenanceStatus, dueDate: string | null) {
  if (status === 'scheduled' && dueDate) {
    const end = new Date(dueDate);
    end.setHours(23, 59, 59, 999);
    if (end.getTime() < Date.now()) return MAINTENANCE_OVERDUE_CONFIG;
  }
  return MAINTENANCE_STATUS_CONFIG[status] ?? MAINTENANCE_STATUS_CONFIG.scheduled;
}

// Fixed height for FlatList getItemLayout optimization
export const MAINTENANCE_ITEM_HEIGHT = 72;

interface MaintenanceListItemProps {
  maintenance: MaintenanceListItemType;
  onPress: (maintenance: MaintenanceListItemType) => void;
  isSelecting?: boolean;
  isSelected?: boolean;
  isCompletable?: boolean;
  onLongPress?: (id: string) => void;
}

function MaintenanceListItemComponent({
  maintenance,
  onPress,
  isSelecting = false,
  isSelected = false,
  isCompletable = false,
  onLongPress,
}: MaintenanceListItemProps) {
  const { icon, color } = getMaintenanceVisualConfig(maintenance.status, maintenance.dueDate);
  const handlePress = useCallback(() => {
    onPress(maintenance);
  }, [onPress, maintenance]);
  const handleLongPress = useCallback(() => {
    onLongPress?.(maintenance.id);
  }, [onLongPress, maintenance.id]);
  const containerStyle = useMemo(
    () => [
      cardStyles.container,
      { borderLeftColor: color, backgroundColor: color + '1A' },
      isSelected && selectionStyles.selectedContainer,
    ],
    [color, isSelected]
  );

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Maintenance ${maintenance.title}, status ${maintenance.status}`}
      accessibilityState={isSelecting ? { selected: isSelected } : undefined}
    >
      <View style={cardStyles.cardRow}>
        {isSelecting && (
          <View style={selectionStyles.checkboxContainer}>
            <View
              style={[
                selectionStyles.checkbox,
                isSelected && selectionStyles.checkboxSelected,
                !isCompletable && selectionStyles.checkboxDisabled,
              ]}
            >
              {isSelected && <Ionicons name="checkmark" size={12} color={colors.textInverse} />}
            </View>
          </View>
        )}
        <View style={cardStyles.cardIconContainer}>
          <Ionicons
            name={icon}
            size={32}
            color={isSelecting && !isCompletable ? colors.textDisabled : color}
          />
        </View>
        <View style={cardStyles.cardBody}>
          <View style={cardStyles.cardContentRow}>
            <AppText
              style={[
                cardStyles.cardTitle,
                isSelecting && !isCompletable && selectionStyles.disabledText,
              ]}
              numberOfLines={1}
            >
              {maintenance.assetNumber
                ? formatAssetNumber(maintenance.assetNumber)
                : 'Unknown Asset'}
            </AppText>
            <View style={cardStyles.cardBadges}>
              <MaintenanceStatusBadge status={maintenance.status} />
            </View>
          </View>
          <View style={cardStyles.cardFooter}>
            <AppText style={cardStyles.cardSecondaryText} numberOfLines={1}>
              {maintenance.description || maintenance.title}
            </AppText>
            <AppText style={cardStyles.cardTime}>
              {formatRelativeTime(maintenance.createdAt)}
            </AppText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const selectionStyles = StyleSheet.create({
  selectedContainer: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  checkboxContainer: {
    marginRight: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxDisabled: {
    borderColor: colors.textDisabled,
    backgroundColor: colors.surfaceSubtle,
  },
  disabledText: {
    color: colors.textDisabled,
  },
});

// Custom memo comparison - re-render if any rendered field changes
export const MaintenanceListItem = memo(
  MaintenanceListItemComponent,
  (prev, next) =>
    prev.maintenance.id === next.maintenance.id &&
    prev.maintenance.title === next.maintenance.title &&
    prev.maintenance.description === next.maintenance.description &&
    prev.maintenance.status === next.maintenance.status &&
    prev.maintenance.dueDate === next.maintenance.dueDate &&
    prev.maintenance.assetNumber === next.maintenance.assetNumber &&
    prev.maintenance.createdAt === next.maintenance.createdAt &&
    prev.onPress === next.onPress &&
    prev.isSelecting === next.isSelecting &&
    prev.isSelected === next.isSelected &&
    prev.isCompletable === next.isCompletable &&
    prev.onLongPress === next.onLongPress
);
