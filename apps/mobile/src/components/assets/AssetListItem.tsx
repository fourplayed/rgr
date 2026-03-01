import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AssetWithRelations, AssetStatus } from '@rgr/shared';
import { formatRelativeTime, AssetStatusColors, AssetStatusLabels, getDepotBadgeColors } from '@rgr/shared';
import { useDepotLookup } from '../../hooks/useDepots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface AssetListItemProps {
  asset: AssetWithRelations;
  onPress: (asset: AssetWithRelations) => void;
}

const getStatusLabel = (status: AssetStatus): string => {
  return AssetStatusLabels[status] || status;
};

const getStatusColor = (status: AssetStatus): string => {
  return AssetStatusColors[status] || colors.electricBlue;
};

function AssetListItemComponent({ asset, onPress }: AssetListItemProps) {
  const depotLookup = useDepotLookup();
  const lastScanText = asset.lastLocationUpdatedAt
    ? formatRelativeTime(asset.lastLocationUpdatedAt)
    : 'Never scanned';

  const statusColor = getStatusColor(asset.status);
  const depot = asset.depotCode ? depotLookup.byCode.get(asset.depotCode.toLowerCase()) ?? null : null;
  const depotBadgeColors = asset.depotCode ? getDepotBadgeColors(depot, colors.chrome, colors.text) : null;

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftWidth: 4, borderLeftColor: statusColor }]}
      onPress={() => onPress(asset)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Asset ${asset.assetNumber}, status ${asset.status}`}
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
              {asset.subtype ? asset.subtype : asset.category === 'dolly' ? 'Dolly' : 'Trailer'}
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
  (prevProps, nextProps) =>
    prevProps.asset.id === nextProps.asset.id &&
    prevProps.asset.status === nextProps.asset.status &&
    prevProps.asset.depotCode === nextProps.asset.depotCode &&
    prevProps.asset.lastLocationUpdatedAt === nextProps.asset.lastLocationUpdatedAt &&
    prevProps.asset.subtype === nextProps.asset.subtype &&
    prevProps.onPress === nextProps.onPress
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
