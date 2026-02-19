import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAsset, useAssetScans, useAssetMaintenance } from '../../../hooks/useAssetData';
import { AssetInfoCard } from '../../../components/assets/AssetInfoCard';
import { formatRelativeTime } from '@rgr/shared';
import { colors } from '../../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../../theme/spacing';

export default function AssetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: asset,
    isLoading: assetLoading,
    error: assetError,
  } = useAsset(id);

  const {
    data: scans = [],
    isLoading: scansLoading,
  } = useAssetScans(id);

  const {
    data: maintenance = [],
  } = useAssetMaintenance(id);

  if (assetLoading) {
    return (
      <LinearGradient colors={[...colors.gradientColors]} locations={[...colors.gradientLocations]} start={colors.gradientStart} end={colors.gradientEnd} style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.electricBlue} />
        </View>
      </SafeAreaView>
      </LinearGradient>
    );
  }

  if (assetError || !asset) {
    return (
      <LinearGradient colors={[...colors.gradientColors]} locations={[...colors.gradientLocations]} start={colors.gradientStart} end={colors.gradientEnd} style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Failed to load asset</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </LinearGradient>
    );
  }

  const recentScans = scans.slice(0, 5);
  const activeMaintenance = maintenance.filter(
    (m) => m.status === 'scheduled' || m.status === 'in_progress'
  );

  return (
    <LinearGradient colors={[...colors.gradientColors]} locations={[...colors.gradientLocations]} start={colors.gradientStart} end={colors.gradientEnd} style={styles.container}>
    <SafeAreaView style={styles.containerInner}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <Text style={styles.scanButtonText}>Scan This Asset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AssetInfoCard asset={asset} />

        {/* Recent Scans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Scans</Text>
          {scansLoading ? (
            <ActivityIndicator color={colors.electricBlue} />
          ) : recentScans.length === 0 ? (
            <Text style={styles.emptyText}>No scans recorded</Text>
          ) : (
            <View style={styles.scanList}>
              {recentScans.map((scan) => (
                <View key={scan.id} style={styles.scanItem}>
                  <View>
                    <Text style={styles.scanType}>
                      {scan.scanType.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.scanTime}>
                      {formatRelativeTime(scan.createdAt)}
                    </Text>
                  </View>
                  {scan.latitude && scan.longitude && (
                    <Text style={styles.scanLocation}>
                      {scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Active Maintenance */}
        {activeMaintenance.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Maintenance</Text>
            <View style={styles.maintenanceList}>
              {activeMaintenance.map((record) => (
                <View key={record.id} style={styles.maintenanceItem}>
                  <Text style={styles.maintenanceTitle}>
                    {record.maintenanceType?.replace(/_/g, ' ') ?? 'Maintenance'}
                  </Text>
                  <Text style={styles.maintenanceDescription}>
                    {record.description}
                  </Text>
                  <View style={styles.maintenanceFooter}>
                    <Text style={styles.maintenancePriority}>
                      {record.priority} priority
                    </Text>
                    <Text style={styles.maintenanceStatus}>
                      {record.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerInner: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backButton: {
    paddingVertical: spacing.sm,
  },
  backText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textInverse,
  },
  scanButton: {
    backgroundColor: colors.chrome,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  scanButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.backgroundDark,
  },
  content: {
    padding: spacing.base,
    gap: spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.error,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.electricBlue,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textInverse,
  },
  section: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  scanList: {
    gap: spacing.md,
  },
  scanItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scanType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  scanTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  scanLocation: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  maintenanceList: {
    gap: spacing.md,
  },
  maintenanceItem: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  maintenanceTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  maintenanceDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  maintenanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maintenancePriority: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.warning,
    textTransform: 'capitalize',
  },
  maintenanceStatus: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.info,
    textTransform: 'capitalize',
  },
});
