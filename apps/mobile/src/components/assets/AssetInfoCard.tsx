import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Asset } from '@rgr/shared';
import { formatDate } from '@rgr/shared';
import { StatusBadge } from '../common/StatusBadge';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';

interface AssetInfoCardProps {
  asset: Asset;
}

export function AssetInfoCard({ asset }: AssetInfoCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.assetNumber}>{asset.assetNumber}</Text>
        <StatusBadge status={asset.status} />
      </View>

      <Text style={styles.description}>
        {asset.description || 'No description'}
      </Text>

      <View style={styles.infoGrid}>
        <InfoRow label="Category" value={asset.category.replace(/_/g, ' ')} />
        <InfoRow
          label="Depot"
          value={asset.depot?.name || 'Not assigned'}
        />
        <InfoRow
          label="VIN"
          value={asset.vin || 'N/A'}
        />
        <InfoRow
          label="License Plate"
          value={asset.licensePlate || 'N/A'}
        />
        {asset.lastScannedAt && (
          <InfoRow
            label="Last Scanned"
            value={formatDate(asset.lastScannedAt)}
          />
        )}
        {asset.lastLocationUpdatedAt && (
          <InfoRow
            label="Last Location Update"
            value={formatDate(asset.lastLocationUpdatedAt)}
          />
        )}
      </View>

      {(asset.lastLatitude && asset.lastLongitude) && (
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Last Known Location</Text>
          <Text style={styles.coordinates}>
            {asset.lastLatitude.toFixed(6)}, {asset.lastLongitude.toFixed(6)}
          </Text>
          {asset.lastAccuracy && (
            <Text style={styles.accuracy}>
              Accuracy: ±{Math.round(asset.lastAccuracy)}m
            </Text>
          )}
        </View>
      )}
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
  assetNumber: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
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
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  locationSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  coordinates: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.electricBlue,
    fontFamily: 'monospace',
  },
  accuracy: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
