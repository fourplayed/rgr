import React, { memo, useCallback, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DefectReportListItem as DefectReportListItemType } from '@rgr/shared';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { DefectStatusBadge, DEFECT_STATUS_CONFIG } from './DefectStatusBadge';
import { cardStyles } from './maintenance.styles';
import { AppText } from '../common';

export const DEFECT_ITEM_HEIGHT = 72;

interface DefectReportListItemProps {
  defect: DefectReportListItemType;
  onPress: (defect: DefectReportListItemType) => void;
}

function DefectReportListItemComponent({ defect, onPress }: DefectReportListItemProps) {
  const { icon, color } = DEFECT_STATUS_CONFIG[defect.status] ?? DEFECT_STATUS_CONFIG.reported;
  const handlePress = useCallback(() => {
    onPress(defect);
  }, [onPress, defect]);
  const containerStyle = useMemo(
    () => [
      cardStyles.container,
      { borderLeftColor: color, backgroundColor: color + '08' },
    ],
    [color]
  );

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Defect report ${defect.title}, status ${defect.status}`}
    >
      <View style={cardStyles.cardRow}>
        <View style={cardStyles.cardIconContainer}>
          <Ionicons name={icon} size={32} color={color} />
        </View>
        <View style={cardStyles.cardBody}>
          <View style={cardStyles.cardContentRow}>
            <AppText style={cardStyles.cardTitle} numberOfLines={1}>
              {defect.assetNumber ? formatAssetNumber(defect.assetNumber) : 'Unknown Asset'}
            </AppText>
            <View style={cardStyles.cardBadges}>
              <DefectStatusBadge status={defect.status} />
            </View>
          </View>
          <View style={cardStyles.cardFooter}>
            <AppText style={cardStyles.cardSecondaryText} numberOfLines={1}>
              {defect.description || defect.title}
            </AppText>
            <AppText style={cardStyles.cardTime}>{formatRelativeTime(defect.createdAt)}</AppText>
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
