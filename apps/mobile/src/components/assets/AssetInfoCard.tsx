import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { AssetWithRelations } from '@rgr/shared';
import { formatDate, AssetStatusColors } from '@rgr/shared';
import { StatusBadge } from '../common/StatusBadge';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface AssetInfoCardProps {
  asset: AssetWithRelations;
  nextServiceDate?: string | null | undefined;
}

export function AssetInfoCard({ asset, nextServiceDate }: AssetInfoCardProps) {
  const depotCode = asset.depotCode?.toLowerCase() as keyof typeof colors.depot | undefined;
  const depotColor = depotCode ? colors.depot[depotCode] : colors.chrome;
  // Karratha (kar) uses fluro yellow which needs dark text
  const depotTextColor = depotCode === 'kar' ? colors.text : colors.textInverse;
  const statusColor = AssetStatusColors[asset.status];

  return (
    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusColor }]}>
      <View style={styles.header}>
        <View style={styles.assetColumn}>
          <Text style={styles.assetNumber}>{asset.assetNumber}</Text>
          <Text style={styles.categoryText}>
            {asset.category === 'trailer' && asset.subtype
              ? asset.subtype
              : asset.category.replace(/_/g, ' ')}
          </Text>
        </View>
        <View style={styles.badgeColumn}>
          <StatusBadge status={asset.status} size="small" />
          {asset.depotName && (
            <View style={[styles.depotBadge, { backgroundColor: depotColor }]}>
              <Text style={[styles.depotText, { color: depotTextColor }]}>{asset.depotName}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoGrid}>
        <InfoRow label="Registration" value={asset.registrationNumber || 'Unknown'} />
        <InfoRow label="Current Location" value={asset.depotName || 'Unknown'} />
        <InfoRow
          label="Last Scanned"
          value={asset.lastLocationUpdatedAt ? formatDate(asset.lastLocationUpdatedAt) : 'Unknown'}
        />
        <InfoRow label="Last Scanned By" value={asset.lastScannerName || 'Unknown'} />
        <InfoRow label="Next Service" value={nextServiceDate ? formatDate(nextServiceDate) : 'Unknown'} />
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  assetColumn: {
    gap: spacing.xs,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize['2xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  depotBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  depotText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
  },
  infoGrid: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  categoryText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
