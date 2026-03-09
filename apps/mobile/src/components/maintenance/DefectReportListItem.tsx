import React, { memo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DefectReportListItem as DefectReportListItemType, DefectStatus } from '@rgr/shared';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { DefectStatusBadge } from './DefectStatusBadge';
import { cardStyles } from './maintenance.styles';

export const DEFECT_STATUS_CONFIG: Record<
  DefectStatus,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  reported: { icon: 'warning', color: colors.defectYellow },
  accepted: { icon: 'construct', color: colors.info },
  resolved: { icon: 'checkmark-circle', color: colors.success },
  dismissed: { icon: 'close-circle', color: colors.textSecondary },
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
      style={[cardStyles.container, { borderLeftColor: colors.defectYellow }]}
      onPress={() => onPress(defect)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Defect report ${defect.title}, status ${defect.status}`}
    >
      <View style={cardStyles.cardRow}>
        <View style={cardStyles.cardIconContainer}>
          <Ionicons name={icon} size={31} color={colors.defectYellow} />
        </View>
        <View style={cardStyles.cardBody}>
          <View style={cardStyles.cardContentRow}>
            <Text style={cardStyles.cardTitle} numberOfLines={1}>
              {defect.assetNumber ? formatAssetNumber(defect.assetNumber) : 'Unknown Asset'}
            </Text>
            <View style={cardStyles.cardBadges}>
              <DefectStatusBadge
                status={defect.status}
                {...(defect.status === 'accepted' ? { label: 'Task Created' } : {})}
              />
            </View>
          </View>
          <View style={cardStyles.cardFooter}>
            <Text style={cardStyles.cardSecondaryText} numberOfLines={1}>
              {defect.description || defect.title}
            </Text>
            <Text style={cardStyles.cardTime}>{formatRelativeTime(defect.createdAt)}</Text>
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
