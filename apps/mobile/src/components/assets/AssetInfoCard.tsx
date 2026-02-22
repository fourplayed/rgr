import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AssetWithRelations } from '@rgr/shared';
import { formatDate, AssetStatusColors } from '@rgr/shared';
import { StatusBadge } from '../common/StatusBadge';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface AssetInfoCardProps {
  asset: AssetWithRelations;
  nextServiceDate?: string | null | undefined;
  onShowQR?: (() => void) | undefined;
}

export function AssetInfoCard({ asset, nextServiceDate, onShowQR }: AssetInfoCardProps) {
  const depotCode = asset.depotCode?.toLowerCase() as keyof typeof colors.depot | undefined;
  const depotColor = depotCode ? colors.depot[depotCode] : colors.chrome;
  // Karratha (kar) uses fluro yellow which needs dark text
  const depotTextColor = depotCode === 'kar' ? colors.text : colors.textInverse;
  const statusColor = AssetStatusColors[asset.status];

  return (
    <View style={[styles.container, { borderLeftWidth: 4, borderLeftColor: statusColor }]}>
      <View style={styles.header}>
        <View style={styles.assetColumn}>
          <View style={styles.assetRow}>
            <Ionicons name="cube-outline" size={28} color={colors.electricBlue} />
            <Text style={styles.assetNumber}>{asset.assetNumber}</Text>
          </View>
          {asset.lastLatitude && asset.lastLongitude && (
            <Text style={styles.coordsText}>
              {asset.lastLatitude.toFixed(4)}, {asset.lastLongitude.toFixed(4)}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {onShowQR && (
            <TouchableOpacity style={styles.qrIconButton} onPress={onShowQR}>
              <Ionicons name="qr-code-outline" size={20} color={colors.electricBlue} />
            </TouchableOpacity>
          )}
          <View style={styles.badgeStack}>
            <StatusBadge status={asset.status} />
            {asset.depotName && (
              <View style={[styles.depotBadge, { backgroundColor: depotColor }]}>
                <Text style={[styles.depotText, { color: depotTextColor }]}>{asset.depotName}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoRow label="Category" value={asset.category.replace(/_/g, ' ')} />
        {asset.vin && (
          <InfoRow label="VIN" value={asset.vin} />
        )}
        {asset.registrationNumber && (
          <InfoRow label="Registration" value={asset.registrationNumber} />
        )}
        {asset.lastLocationUpdatedAt && (
          <InfoRow
            label="Last Scanned"
            value={formatDate(asset.lastLocationUpdatedAt)}
          />
        )}
        {asset.lastScannerName && (
          <InfoRow label="Last Scanned By" value={asset.lastScannerName} />
        )}
        {nextServiceDate && (
          <InfoRow label="Next Service" value={formatDate(nextServiceDate)} />
        )}
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
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  assetColumn: {
    gap: spacing.xs,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badgeStack: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  qrIconButton: {
    padding: spacing.sm,
  },
  assetNumber: {
    fontSize: fontSize['3xl'],
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  depotBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.base,
  },
  depotText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
  },
  infoGrid: {
    gap: spacing.md,
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
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  coordsText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
