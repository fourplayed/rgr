import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMyRecentScans } from '../../hooks/useAssetData';
import { useAuthStore } from '../../store/authStore';
import { formatRelativeTime } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';

export default function ActivityScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    data: scans = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useMyRecentScans(user?.id);

  if (isLoading) {
    return (
      <LinearGradient colors={[...colors.gradientLight]} style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.header}>
          <Text style={styles.title}>My Activity</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.electricBlue} />
        </View>
      </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={[...colors.gradientLight]} style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.header}>
          <Text style={styles.title}>My Activity</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Failed to load activity</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[...colors.gradientLight]} style={styles.container}>
    <SafeAreaView style={styles.containerInner}>
      <View style={styles.header}>
        <Text style={styles.title}>My Activity</Text>
        <Text style={styles.subtitle}>{scans.length} scans</Text>
      </View>

      <FlatList
        data={scans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.scanCard}
            onPress={() => router.push(`/(tabs)/assets/${item.assetId}`)}
            activeOpacity={0.7}
          >
            <View style={styles.scanHeader}>
              <Text style={styles.assetNumber}>
                {item.assetNumber || 'Unknown Asset'}
              </Text>
              <Text style={styles.scanTime}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>

            {item.locationDescription && (
              <Text style={styles.assetDescription} numberOfLines={1}>
                {item.locationDescription}
              </Text>
            )}

            <View style={styles.scanFooter}>
              <Text style={styles.scanType}>
                {item.scanType.replace(/_/g, ' ')}
              </Text>
              {item.latitude && item.longitude && (
                <Text style={styles.coordinates}>
                  {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={refetch}
            tintColor={colors.electricBlue}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No scans recorded yet</Text>
            <Text style={styles.emptySubtext}>
              Start scanning assets to see your activity here
            </Text>
          </View>
        }
      />
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
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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
  listContent: {
    padding: spacing.base,
  },
  scanCard: {
    backgroundColor: colors.background,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scanTime: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  assetDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  scanFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanType: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.electricBlue,
    textTransform: 'capitalize',
  },
  coordinates: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  emptyState: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
