import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AssetWithRelations } from '@rgr/shared';
import type { AssetStatus } from '@rgr/shared';
import { formatDate, AssetStatusColors, getDepotBadgeColors, formatAssetNumber } from '@rgr/shared';
import { useDepotLookup } from '../../hooks/useDepots';
import { StatusBadge } from '../common/StatusBadge';
import { DepotBadge } from '../common/DepotBadge';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

const STATUS_ICONS: Record<AssetStatus, keyof typeof Ionicons.glyphMap> = {
  serviced: 'checkmark-circle',
  maintenance: 'construct-outline',
  out_of_service: 'close-circle-outline',
};

interface AssetInfoCardProps {
  asset: AssetWithRelations;
  nextServiceDate?: string | null | undefined;
  assessment?: string | null;
  onPress?: () => void;
}

export function AssetInfoCard({ asset, nextServiceDate, assessment, onPress }: AssetInfoCardProps) {
  const depotLookup = useDepotLookup();
  const depotCode = asset.depotCode?.toLowerCase();
  const depot = depotCode ? depotLookup.byCode.get(depotCode) ?? null : null;
  const { bg: depotColor, text: depotTextColor } = getDepotBadgeColors(depot, colors.chrome, colors.text);
  const statusColor = AssetStatusColors[asset.status];

  const cardContent = (
    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusColor }]}>
      <View style={styles.header}>
        <Ionicons name={STATUS_ICONS[asset.status]} size={36} color={statusColor} />
        <View style={styles.assetColumn}>
          <Text style={styles.assetNumber}>{formatAssetNumber(asset.assetNumber)}</Text>
          <Text style={styles.categoryText}>
            {asset.subtype ? asset.subtype : asset.category === 'dolly' ? 'Dolly' : 'Trailer'}
          </Text>
        </View>
        <View style={styles.badgeColumn}>
          <StatusBadge status={asset.status} size="small" />
          {asset.depotName && (
            <DepotBadge
              label={asset.depotName}
              bgColor={depotColor}
              textColor={depotTextColor}
            />
          )}
        </View>
      </View>

      <CollapsibleSection title="Details" variant="flat" defaultExpanded={false}>
        {assessment ? (
          <Text style={[styles.assessmentText, { marginBottom: spacing.sm }]}>{assessment}</Text>
        ) : null}
        <View style={styles.infoGrid}>
          <InfoRow label="Registration" value={asset.registrationNumber || 'Unknown'} />
          <InfoRow label="Registration Expiry" value={asset.registrationExpiry ? formatDate(asset.registrationExpiry) : 'Unknown'} />
          <InfoRow
            label="Last Scanned"
            value={asset.lastLocationUpdatedAt ? formatDate(asset.lastLocationUpdatedAt) : 'Unknown'}
          />
          <InfoRow label="Next Service Due" value={nextServiceDate ? formatDate(nextServiceDate) : 'Unknown'} />
        </View>
      </CollapsibleSection>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="View QR Code">
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
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
    alignItems: 'center',
    gap: spacing.sm,
  },
  assessmentText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.5,
  },
  assetColumn: {
    flex: 1,
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
