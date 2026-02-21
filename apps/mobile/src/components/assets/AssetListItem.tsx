import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Asset } from '@rgr/shared';
import { formatRelativeTime } from '@rgr/shared';
import { StatusBadge } from '../common/StatusBadge';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';

interface AssetListItemProps {
  asset: Asset;
  onPress: (asset: Asset) => void;
}

export function AssetListItem({ asset, onPress }: AssetListItemProps) {
  const lastScanText = asset.lastLocationUpdatedAt
    ? `Scanned ${formatRelativeTime(asset.lastLocationUpdatedAt)}`
    : 'Never scanned';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(asset)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.assetNumber}>{asset.assetNumber}</Text>
          <StatusBadge status={asset.status} size="small" />
        </View>
      </View>

      <Text style={styles.description} numberOfLines={1}>
        {asset.description || 'No description'}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.category}>
          {asset.category.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.lastScan}>{lastScanText}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  description: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  category: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  lastScan: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
});
