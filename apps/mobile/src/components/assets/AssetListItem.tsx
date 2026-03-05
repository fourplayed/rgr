import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AssetWithRelations, AssetStatus } from '@rgr/shared';
import { AssetStatusColors, AssetStatusLabels, getDepotBadgeColors, formatAssetNumber } from '@rgr/shared';
import type { useDepotLookup } from '../../hooks/useDepots';
import { DepotBadge } from '../common/DepotBadge';
import { colors } from '../../theme/colors';
import { cardStyles } from '../../theme/cardStyles';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

const ASSET_STATUS_ICONS: Record<AssetStatus, keyof typeof Ionicons.glyphMap> = {
  serviced: 'checkmark-circle',
  maintenance: 'construct-outline',
  out_of_service: 'close-circle-outline',
};

export interface AssetListItemProps {
  asset: AssetWithRelations;
  onPress: (asset: AssetWithRelations) => void;
  depotLookup: ReturnType<typeof useDepotLookup>;
}

const getStatusLabel = (status: AssetStatus): string => {
  return AssetStatusLabels[status] || status;
};

const getStatusColor = (status: AssetStatus): string => {
  return AssetStatusColors[status] || colors.electricBlue;
};

function AssetListItemComponent({ asset, onPress, depotLookup }: AssetListItemProps) {
  const statusColor = getStatusColor(asset.status);
  const depot = asset.depotCode ? depotLookup.byCode.get(asset.depotCode.toLowerCase()) ?? null : null;
  const depotBadgeColors = asset.depotCode ? getDepotBadgeColors(depot, colors.chrome, colors.text) : null;

  const statusIcon = ASSET_STATUS_ICONS[asset.status] ?? 'ellipse-outline';

  return (
    <TouchableOpacity
      style={[cardStyles.container, { borderLeftColor: statusColor }]}
      onPress={() => onPress(asset)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Asset ${formatAssetNumber(asset.assetNumber)}, status ${getStatusLabel(asset.status)}`}
    >
      <View style={styles.cardRow}>
        <View style={styles.iconContainer}>
          <Ionicons name={statusIcon} size={31} color={statusColor} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.headerRow}>
            <Text style={styles.assetNumber} numberOfLines={1}>{formatAssetNumber(asset.assetNumber)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusBadgeText}>
                {getStatusLabel(asset.status)}
              </Text>
            </View>
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.subtypeLabel}>
              {asset.subtype ? asset.subtype : asset.category === 'dolly' ? 'Dolly' : 'Trailer'}
            </Text>
            {asset.depotName && depotBadgeColors && (
              <DepotBadge
                label={asset.depotName}
                bgColor={depotBadgeColors.bg}
                textColor={depotBadgeColors.text}
              />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const AssetListItem = memo(
  AssetListItemComponent,
  (prevProps, nextProps) =>
    prevProps.asset.id === nextProps.asset.id &&
    prevProps.asset.status === nextProps.asset.status &&
    prevProps.asset.depotCode === nextProps.asset.depotCode &&
    prevProps.asset.subtype === nextProps.asset.subtype &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.depotLookup === nextProps.depotLookup
);

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtypeLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
