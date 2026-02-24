import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AssetWithRelations } from '@rgr/shared';
import { formatRelativeTime, AssetStatusColors, AssetStatusLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface AssetListItemProps {
  asset: AssetWithRelations;
  onPress: (asset: AssetWithRelations) => void;
}

const getStatusLabel = (status: string): string => {
  return AssetStatusLabels[status as keyof typeof AssetStatusLabels] || status;
};

const getStatusColor = (status: string): string => {
  return AssetStatusColors[status as keyof typeof AssetStatusColors] || colors.electricBlue;
};

const getDepotBadgeColors = (depotCode: string | null): { bg: string; text: string } => {
  if (!depotCode) {
    return { bg: colors.chrome, text: colors.text };
  }
  const code = depotCode.toLowerCase() as keyof typeof colors.depot;
  const bg = colors.depot[code] || colors.chrome;
  const text = code === 'kar' ? colors.text : colors.textInverse;
  return { bg, text };
};

function AssetListItemComponent({ asset, onPress }: AssetListItemProps) {
  const lastScanText = asset.lastLocationUpdatedAt
    ? formatRelativeTime(asset.lastLocationUpdatedAt)
    : 'Never scanned';

  const statusColor = getStatusColor(asset.status);
  const depotBadgeColors = asset.depotCode ? getDepotBadgeColors(asset.depotCode) : null;

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftWidth: 4, borderLeftColor: statusColor }]}
      onPress={() => onPress(asset)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.details}>
          <View style={styles.headerRow}>
            <Text style={styles.assetNumber}>{asset.assetNumber}</Text>
            <View style={styles.badgeRow}>
              {/* Location Badge */}
              {asset.depotName && depotBadgeColors && (
                <View style={[styles.depotBadge, { backgroundColor: depotBadgeColors.bg }]}>
                  <Text style={[styles.depotBadgeText, { color: depotBadgeColors.text }]}>
                    {asset.depotName}
                  </Text>
                </View>
              )}
              {/* Service Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusBadgeText}>
                  {getStatusLabel(asset.status)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.footerRow}>
            <Text style={styles.subtypeLabel}>
              {asset.subtype || (asset.category === 'dolly' ? 'Dolly' : asset.category.toUpperCase())}
            </Text>
            <Text style={styles.timeText}>{lastScanText}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const AssetListItem = memo(
  AssetListItemComponent,
  (prevProps, nextProps) => prevProps.asset.id === nextProps.asset.id
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  details: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  depotBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  depotBadgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
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
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
});
