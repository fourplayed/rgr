import React, { useMemo } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AssetWithRelations } from '@rgr/shared';
import { formatDate, AssetStatusColors, getDepotBadgeColors, formatAssetNumber } from '@rgr/shared';
import { useDepotLookup } from '../../hooks/useDepots';
import { StatusBadge } from '../common/StatusBadge';
import { DepotBadge } from '../common/DepotBadge';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';

import { ASSET_STATUS_ICONS } from './AssetListItem';
import { AppText } from '../common';

interface AssetInfoCardProps {
  asset: AssetWithRelations;
  nextServiceDate?: string | null | undefined;
  assessment?: string | null;
  onPress?: () => void;
}

/**
 * Compute the color for the registration expiry display.
 * Green: >30 days, Yellow: 7-30 days, Red: <7 days or overdue
 */
function getExpiryColor(expiryDate: string | null, isOverdue: boolean): string {
  if (isOverdue) return colors.error;
  if (!expiryDate) return colors.textSecondary;

  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 7) return colors.error;
  if (daysUntil <= 30) return colors.warning;
  return colors.success;
}

export function AssetInfoCard({ asset, nextServiceDate, assessment, onPress }: AssetInfoCardProps) {
  const depotLookup = useDepotLookup();
  const depotCode = asset.depotCode?.toLowerCase();
  const depot = depotCode ? (depotLookup.byCode.get(depotCode) ?? null) : null;
  const { bg: depotColor, text: depotTextColor } = getDepotBadgeColors(
    depot,
    colors.chrome,
    colors.text
  );
  const statusColor = AssetStatusColors[asset.status];

  const expiryColor = useMemo(
    () => getExpiryColor(asset.registrationExpiry, asset.registrationOverdue),
    [asset.registrationExpiry, asset.registrationOverdue]
  );
  const isDotPending = asset.dotLookupStatus === 'pending';

  const cardContent = (
    <View
      style={[
        styles.card,
        {
          borderLeftWidth: 4,
          borderLeftColor: statusColor,
          backgroundColor: statusColor + '08',
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name={ASSET_STATUS_ICONS[asset.status]} size={36} color={statusColor} />
        <View style={styles.assetColumn}>
          <AppText style={styles.assetNumber}>{formatAssetNumber(asset.assetNumber)}</AppText>
          <AppText style={styles.categoryText}>
            {asset.subtype ? asset.subtype : asset.category === 'dolly' ? 'Dolly' : 'Trailer'}
          </AppText>
        </View>
        <View style={styles.badgeColumn}>
          <StatusBadge status={asset.status} size="small" />
          {asset.depotName && (
            <DepotBadge label={asset.depotName} bgColor={depotColor} textColor={depotTextColor} />
          )}
        </View>
      </View>

      {assessment ? <AppText style={styles.assessmentText}>{assessment}</AppText> : null}

      <CollapsibleSection title="Details" variant="flat" defaultExpanded={false}>
        <View style={styles.infoGrid}>
          <InfoRow label="Registration" value={asset.registrationNumber || 'Unknown'} />
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>Registration Expiry</AppText>
            <View style={styles.expiryValueRow}>
              {isDotPending && <ActivityIndicator size="small" color={colors.textSecondary} />}
              {asset.registrationOverdue && (
                <View style={styles.overdueBadge}>
                  <AppText style={styles.overdueBadgeText}>OVERDUE</AppText>
                </View>
              )}
              <AppText style={[styles.infoValue, { color: expiryColor }]}>
                {asset.registrationExpiry ? formatDate(asset.registrationExpiry) : 'Unknown'}
              </AppText>
            </View>
          </View>
          <InfoRow
            label="Last Scanned"
            value={
              asset.lastLocationUpdatedAt ? formatDate(asset.lastLocationUpdatedAt) : 'Unknown'
            }
          />
          <InfoRow
            label="Next Service Due"
            value={nextServiceDate ? formatDate(nextServiceDate) : 'Unknown'}
          />
        </View>
      </CollapsibleSection>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="View QR Code"
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  assessmentText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
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
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
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
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  expiryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  overdueBadge: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  overdueBadgeText: {
    fontSize: fontSize.micro,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
