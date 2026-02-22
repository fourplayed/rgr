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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMyRecentScans, useAssetCountsByStatus } from '../../hooks/useAssetData';
import { useAuthStore } from '../../store/authStore';
import { formatRelativeTime, UserRoleLabels } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Recent scans (last 5)
  const {
    data: scans = [],
    isLoading: scansLoading,
    refetch: refetchScans,
    isRefetching: scansRefetching,
  } = useMyRecentScans(user?.id);

  // Asset counts by status using efficient RPC call (single query instead of 3)
  const {
    data: assetStats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isRefetching: statsRefetching,
  } = useAssetCountsByStatus();

  const isLoading = scansLoading || statsLoading;
  const isRefetching = scansRefetching || statsRefetching;

  const handleRefresh = () => {
    refetchScans();
    refetchStats();
  };

  if (!user) {
    return null;
  }

  const roleLabel = UserRoleLabels[user.role] || user.role;
  const recentScans = scans.slice(0, 5);

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const totalAssets = assetStats?.total ?? 0;
  const servicedCount = assetStats?.serviced ?? 0;
  const outOfServiceCount = assetStats?.outOfService ?? 0;

  const statsCards = [
    { label: 'Total Assets', value: totalAssets, color: colors.electricBlue, icon: 'cube-outline' as const },
    { label: 'Serviced', value: servicedCount, color: colors.status.active, icon: 'checkmark-circle-outline' as const },
    { label: 'Total Scans', value: scans.length, color: colors.status.maintenance, icon: 'scan-outline' as const },
    { label: 'Out of Service', value: outOfServiceCount, color: colors.status.outOfService, icon: 'close-circle-outline' as const },
  ];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.containerInner}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.electricBlue} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <FlatList
          data={recentScans}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {/* User Profile Section */}
              <View style={styles.profileSection}>
                <View style={styles.profileHeader}>
                  <View>
                    <Text style={styles.greeting}>{greeting},</Text>
                    <Text style={styles.userName}>{user.fullName}</Text>
                  </View>
                  <View style={styles.badgesContainer}>
                    <View style={[styles.roleBadge, { backgroundColor: colors.userRole[user.role as keyof typeof colors.userRole] || colors.electricBlue }]}>
                      <Text style={styles.roleText}>{roleLabel}</Text>
                    </View>
                    {user.depot && (
                      <View style={[styles.depotBadge, { backgroundColor: colors.depot[user.depot.toLowerCase() as keyof typeof colors.depot] || colors.chrome }]}>
                        <Text style={[styles.depotText, { color: user.depot.toLowerCase() === 'karratha' ? colors.text : colors.textInverse }]}>{user.depot}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Stats Cards Grid */}
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Asset Overview</Text>
                <View style={styles.statsGrid}>
                  {statsCards.map((stat) => (
                    <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.color }]}>
                      <View style={styles.statRow}>
                        <Ionicons name={stat.icon} size={28} color="#FFFFFF" style={styles.statIcon} />
                        <Text style={styles.statValue}>{stat.value}</Text>
                      </View>
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Recent Activity Header */}
              <View style={styles.activityHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <Text style={styles.activitySubtitle}>{scans.length} total scans</Text>
              </View>
            </>
          }
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
              <View style={styles.scanFooter}>
                <Text style={styles.scanType}>
                  {item.scanType.replace(/_/g, ' ')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={!!isRefetching}
              onRefresh={handleRefresh}
              tintColor={colors.electricBlue}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No recent scans</Text>
              <Text style={styles.emptySubtext}>
                Start scanning assets to see your activity here
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8E8',
  },
  containerInner: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.base,
  },

  // Profile Section
  profileSection: {
    marginTop: 20,
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  userName: {
    fontSize: fontSize['3xl'],
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  badgesContainer: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.semibold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  depotBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  depotText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Stats Section
  statsSection: {
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.bold,
    color: '#000000',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '38%',
    borderRadius: borderRadius.md,
    padding: spacing.base,
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  statIcon: {
    marginRight: spacing.sm,
  },
  statValue: {
    fontSize: fontSize['3xl'],
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Activity Section
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  activitySubtitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },

  // Scan Cards
  scanCard: {
    backgroundColor: colors.background,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scanTime: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  scanFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanType: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    fontWeight: fontWeight.medium,
    color: colors.electricBlue,
    textTransform: 'capitalize',
  },

  // Empty State
  emptyState: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
