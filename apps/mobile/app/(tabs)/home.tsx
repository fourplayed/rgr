import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useRecentScans, useAssetCountsByStatus, useTotalScanCount } from '../../src/hooks/useAssetData';
import { useRecentMaintenance } from '../../src/hooks/useMaintenanceData';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { formatRelativeTime, UserRoleLabels } from '@rgr/shared';
import type { ScanEventWithScanner, MaintenanceListItem as MaintenanceListItemData } from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../src/theme/layout';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { RefreshLoadingDots } from '../../src/components/common/RefreshLoadingDots';
import { PillBadge } from '../../src/components/common/PillBadge';
import {
  MaintenanceStatusBadge,
  MaintenancePriorityBadge,
  MaintenanceDetailModal,
} from '../../src/components/maintenance';
import {
  getScanTypeIcon,
  getScanTypeColor,
  formatScanTypeLabel,
} from '../../src/utils/scanFormatters';
import { isDefectReport, getMaintenanceIconProps } from '../../src/utils/maintenanceHelpers';
import { findDepotByLocationString, getDepotBadgeColors } from '@rgr/shared';
import { useDepotLookup } from '../../src/hooks/useDepots';

type DashboardActivityItem =
  | { type: 'scan'; data: ScanEventWithScanner; timestamp: string }
  | { type: 'maintenance'; data: MaintenanceListItemData; timestamp: string };

const MAINTENANCE_STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  scheduled: 'time-outline',
  in_progress: 'construct-outline',
  completed: 'checkmark-circle',
  cancelled: 'close-circle-outline',
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { resolvedDepot, isResolvingDepot, resolveDepot } = useLocationStore();
  const isFocused = useIsFocused();
  const { depots } = useDepotLookup();

  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);

  // Recent scans across all users (global activity)
  const {
    data: scans = [],
    isLoading: scansLoading,
    refetch: refetchScans,
    isRefetching: scansRefetching,
  } = useRecentScans();

  // Recent maintenance records for activity feed
  const {
    data: maintenanceData,
    isLoading: maintenanceLoading,
    refetch: refetchMaintenance,
    isRefetching: maintenanceRefetching,
  } = useRecentMaintenance(5);

  // Asset counts by status using efficient RPC call (single query instead of 3)
  const {
    data: assetStats,
    isLoading: statsLoading,
    refetch: refetchStats,
    isRefetching: statsRefetching,
  } = useAssetCountsByStatus();

  // Total scan count using server-side COUNT (not capped by limit)
  const {
    data: totalScanCount,
    isLoading: scanCountLoading,
    refetch: refetchScanCount,
    isRefetching: scanCountRefetching,
  } = useTotalScanCount();

  const isLoading = scansLoading || maintenanceLoading || statsLoading || scanCountLoading;
  const isRefetching = scansRefetching || maintenanceRefetching || statsRefetching || scanCountRefetching;

  const handleRefresh = useCallback(() => {
    refetchScans();
    refetchMaintenance();
    refetchStats();
    refetchScanCount();
  }, [refetchScans, refetchMaintenance, refetchStats, refetchScanCount]);

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Staggered fade in animations
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const usernameOpacity = useRef(new Animated.Value(0)).current;
  const geofenceOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Don't run animation when screen isn't focused (saves CPU/battery)
    if (!isFocused) return;

    let cancelled = false;

    const runAnimation = () => {
      if (cancelled) return;

      // Reset
      greetingOpacity.setValue(0);
      usernameOpacity.setValue(0);
      geofenceOpacity.setValue(0);

      Animated.sequence([
        // Fade in greeting
        Animated.timing(greetingOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        // Fade in username
        Animated.timing(usernameOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        // Fade in geofence
        Animated.timing(geofenceOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        // Hold for 15 seconds
        Animated.delay(15000),
        // Fade out all
        Animated.parallel([
          Animated.timing(greetingOpacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(usernameOpacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(geofenceOpacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (!cancelled) runAnimation();
      });
    };

    runAnimation();

    // Cleanup: stop animation loop when unmounted or unfocused
    return () => {
      cancelled = true;
    };
  }, [isFocused, greetingOpacity, usernameOpacity, geofenceOpacity]);

  const totalAssets = assetStats?.total ?? 0;
  const servicedCount = assetStats?.serviced ?? 0;
  const outOfServiceCount = assetStats?.outOfService ?? 0;

  // Memoize stats cards to prevent recreation on every render
  // Note: Must be before any early returns to maintain hook order
  const statsCards = useMemo(() => [
    { label: 'Total Assets', value: totalAssets, color: colors.electricBlue, icon: 'cube-outline' as const },
    { label: 'Serviced', value: servicedCount, color: colors.status.active, icon: 'checkmark-circle-outline' as const },
    { label: 'Total Scans', value: totalScanCount ?? 0, color: colors.status.maintenance, icon: 'qr-code-outline' as const },
    { label: 'Out of Service', value: outOfServiceCount, color: colors.status.outOfService, icon: 'close-circle-outline' as const },
  ], [totalAssets, servicedCount, totalScanCount, outOfServiceCount]);

  // Merge scans and maintenance into a unified activity feed
  const recentActivity = useMemo<DashboardActivityItem[]>(() => {
    const scanItems: DashboardActivityItem[] = (scans ?? []).map(s => ({ type: 'scan' as const, data: s, timestamp: s.createdAt }));
    const maintItems: DashboardActivityItem[] = (maintenanceData ?? []).map(m => ({ type: 'maintenance' as const, data: m, timestamp: m.createdAt }));
    return [...scanItems, ...maintItems]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 5);
  }, [scans, maintenanceData]);

  // Memoized render function for FlatList items
  // Note: Must be before any early returns to maintain hook order
  const renderActivityItem = useCallback(({ item }: { item: DashboardActivityItem }) => {
    if (item.type === 'scan') {
      const activityColor = getScanTypeColor(item.data.scanType);
      const matchedDepot = item.data.locationDescription ? findDepotByLocationString(item.data.locationDescription, depots) : null;
      const badgeColors = matchedDepot ? getDepotBadgeColors(matchedDepot, colors.chrome, colors.text) : null;

      return (
        <TouchableOpacity
          style={[styles.scanCard, { borderLeftColor: activityColor }]}
          onPress={() => router.navigate(`/(tabs)/assets/${item.data.assetId}`)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${formatScanTypeLabel(item.data.scanType)} scan for asset ${item.data.assetNumber || 'Unknown'}`}
          accessibilityHint="Double tap to view asset details"
        >
          <View style={styles.cardRow}>
            <View style={styles.cardIconContainer}>
              <Ionicons name={getScanTypeIcon(item.data.scanType)} size={31} color={activityColor} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardContentRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.data.assetNumber || 'Unknown Asset'}
                </Text>
                <View style={styles.cardBadges}>
                  {matchedDepot && badgeColors && (
                    <View style={[styles.depotLocationBadge, { backgroundColor: badgeColors.bg }]}>
                      <Text style={[styles.depotLocationText, { color: badgeColors.text }]}>{matchedDepot.name}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.scanFooter}>
                <Text style={styles.cardSecondaryText}>
                  {formatScanTypeLabel(item.data.scanType)}
                </Text>
                <Text style={styles.scanTime}>
                  {formatRelativeTime(item.data.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // Maintenance item
    const isDefect = isDefectReport(item.data.maintenanceType);
    const { icon: maintIcon, color: maintColor } = item.data.status === 'completed'
      ? { icon: 'checkmark-circle' as const, color: colors.maintenanceStatus.completed }
      : getMaintenanceIconProps(item.data.maintenanceType, item.data.status, MAINTENANCE_STATUS_ICONS);
    const borderColor = item.data.status === 'completed'
      ? colors.success
      : isDefect
        ? colors.warning
        : colors.maintenanceStatus[item.data.status as keyof typeof colors.maintenanceStatus] ?? colors.border;

    return (
      <TouchableOpacity
        style={[styles.scanCard, { borderLeftColor: borderColor }]}
        onPress={() => setSelectedMaintenanceId(item.data.id)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${isDefect ? 'Defect report: ' : ''}${item.data.title}`}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardIconContainer}>
            <Ionicons name={maintIcon} size={31} color={maintColor} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardContentRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.data.title}
              </Text>
              <View style={styles.cardBadges}>
                {isDefect && (
                  <PillBadge icon="warning" label="Defect" color={colors.warning} />
                )}
                <MaintenanceStatusBadge status={item.data.status} />
                {!isDefect && item.data.status !== 'completed' && item.data.status !== 'cancelled' && (
                  <MaintenancePriorityBadge priority={item.data.priority} />
                )}
              </View>
            </View>
            <View style={styles.scanFooter}>
              <Text style={styles.cardSecondaryText}>
                {item.data.assetNumber || 'Unknown Asset'}
              </Text>
              <Text style={styles.scanTime}>
                {formatRelativeTime(item.data.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [router, depots]);

  // Early return must be after all hooks to maintain hook order
  if (!user) {
    return null;
  }

  const roleLabel = UserRoleLabels[user.role] || user.role;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.containerInner}>
          <View style={styles.centerContent}>
            <LoadingDots size={12} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.scrollGuard} />
        <FlatList<DashboardActivityItem>
          data={recentActivity}
          keyExtractor={(item) => `${item.type}-${item.data.id}`}
          ListHeaderComponent={
            <>
              <RefreshLoadingDots isRefetching={!!isRefetching} />
              {/* User Profile Section */}
              <View style={styles.profileSection}>
                <View style={styles.profileHeader}>
                  <View>
                    <Animated.Text style={[styles.greeting, { opacity: greetingOpacity }]}>{greeting},</Animated.Text>
                    <Animated.Text style={[styles.userName, { opacity: usernameOpacity }]}>{user.fullName}</Animated.Text>
                  </View>
                  <View style={[styles.badgeBase, { backgroundColor: colors.userRole[user.role as keyof typeof colors.userRole] || colors.electricBlue, position: 'absolute', top: 0, right: 0 }]}>
                    <Text style={[styles.badgeText, { color: colors.textInverse }]}>{roleLabel}</Text>
                  </View>
                </View>
                <Animated.View style={{ opacity: geofenceOpacity, alignItems: 'flex-end', marginRight: 16 }}>
                  {isResolvingDepot ? (
                    <LoadingDots color={colors.textSecondary} size={6} />
                  ) : resolvedDepot ? (
                    <Text style={styles.geofenceText}>
                      Your location is within the <Text style={styles.geofenceLocation}>{resolvedDepot.depot.name}</Text> geofence
                    </Text>
                  ) : (
                    <View style={styles.geofenceRow}>
                      <Text style={styles.geofenceText}>You are not within any depot geofence</Text>
                      <TouchableOpacity
                        onPress={() => resolveDepot()}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel="Retry geofence detection"
                        accessibilityRole="button"
                      >
                        <Ionicons name="refresh-outline" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )}
                </Animated.View>
              </View>

              {/* Stats Cards Grid */}
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Asset Overview</Text>
                <View style={styles.statsGrid}>
                  {statsCards.map((stat) => (
                    <View key={stat.label} style={[styles.statCard, { backgroundColor: stat.color }]}>
                      <View style={styles.statRow}>
                        <Ionicons name={stat.icon} size={32} color="#FFFFFF" style={styles.statIcon} />
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
                <Text style={styles.activitySubtitle}>Recent activity</Text>
              </View>
            </>
          }
          renderItem={renderActivityItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={!!isRefetching}
              onRefresh={handleRefresh}
              tintColor="transparent"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No recent activity</Text>
              <Text style={styles.emptySubtext}>
                Start scanning assets to see your activity here
              </Text>
            </View>
          }
        />

        {/* Maintenance Detail Modal */}
        <MaintenanceDetailModal
          visible={selectedMaintenanceId !== null}
          maintenanceId={selectedMaintenanceId}
          onClose={() => setSelectedMaintenanceId(null)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
  },
  containerInner: {
    flex: 1,
  },
  scrollGuard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CONTENT_TOP_OFFSET,
    backgroundColor: colors.chrome,
    zIndex: 1,
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
    marginTop: CONTENT_TOP_OFFSET,
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingRight: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    marginTop: -5,
  },
  userName: {
    fontSize: fontSize.userName,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.xs,
    marginLeft: 16,
  },
  geofenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  geofenceText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  geofenceLocation: {
    fontFamily: 'Lato_700Bold',
    fontStyle: 'normal',
  },
  badgeBase: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Stats Section
  statsSection: {
    marginTop: spacing.sm - 5,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
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
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
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
    fontSize: fontSize.statValue,
    fontFamily: 'Lato_700Bold',
    marginBottom: spacing.xs,
    color: colors.textInverse,
  },
  statLabel: {
    fontSize: fontSize.statLabel,
    fontFamily: 'Lato_400Regular',
    color: colors.textInverse,
    textAlign: 'center',
  },

  // Activity Section
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing['2xl'] - 5,
    marginBottom: spacing.xs,
  },
  activitySubtitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },

  // Scan Cards
  scanCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  cardContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    flex: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardSecondaryText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  depotLocationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  depotLocationText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
  },
  scanFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scanTime: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },

  // Empty State
  emptyState: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
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
