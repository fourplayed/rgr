import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MaintenanceListItem as MaintenanceListItemType, MaintenanceStatus } from '@rgr/shared';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge';
import { cardStyles } from './maintenance.styles';

export const MAINTENANCE_STATUS_CONFIG: Record<MaintenanceStatus, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  scheduled:   { icon: 'construct-outline',     color: colors.maintenanceStatus.scheduled },
  completed:   { icon: 'checkmark-circle',      color: colors.maintenanceStatus.completed },
  cancelled:   { icon: 'close-circle-outline',  color: colors.maintenanceStatus.cancelled },
};

/** Derived visual state for overdue tasks (scheduled + past due date) */
export const MAINTENANCE_OVERDUE_CONFIG = { icon: 'alert-circle' as keyof typeof Ionicons.glyphMap, color: colors.warning };

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
}

function MaintenanceListItemComponent({ maintenance, onPress }: MaintenanceListItemProps) {
  const { icon, color } = getMaintenanceVisualConfig(maintenance.status, maintenance.dueDate);

  return (
    <TouchableOpacity
      style={[cardStyles.container, { borderLeftColor: color }]}
      onPress={() => onPress(maintenance)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Maintenance ${maintenance.title}, status ${maintenance.status}`}
    >
      <View style={cardStyles.cardRow}>
        <View style={cardStyles.cardIconContainer}>
          <Ionicons name={icon} size={31} color={color} />
        </View>
        <View style={cardStyles.cardBody}>
          <View style={cardStyles.cardContentRow}>
            <Text style={cardStyles.cardTitle} numberOfLines={1}>
              {maintenance.assetNumber ? formatAssetNumber(maintenance.assetNumber) : 'Unknown Asset'}
            </Text>
            <View style={cardStyles.cardBadges}>
              <MaintenanceStatusBadge status={maintenance.status} />
            </View>
          </View>
          <View style={cardStyles.cardFooter}>
            <Text style={cardStyles.cardSecondaryText} numberOfLines={1}>
              {maintenance.description || maintenance.title}
            </Text>
            <Text style={cardStyles.cardTime}>
              {formatRelativeTime(maintenance.createdAt)}
            </Text>
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
    prev.maintenance.description === next.maintenance.description &&
    prev.maintenance.status === next.maintenance.status &&
    prev.maintenance.dueDate === next.maintenance.dueDate &&
    prev.maintenance.assetNumber === next.maintenance.assetNumber &&
    prev.maintenance.createdAt === next.maintenance.createdAt &&
    prev.onPress === next.onPress
);

