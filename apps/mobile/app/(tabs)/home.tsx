import React, { useRef, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useRecentScans, useAssetCountsByStatus, useTotalScanCount } from '../../src/hooks/useAssetData';
import { useRecentMaintenance } from '../../src/hooks/useMaintenanceData';
import { useRecentDefectReports, useDefectReportStats } from '../../src/hooks/useDefectData';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { formatRelativeTime, UserRoleLabels, formatAssetNumber } from '@rgr/shared';
import type { ScanEventWithScanner, MaintenanceListItem as MaintenanceListItemData, DefectReportListItem as DefectReportListItemData, CreateMaintenanceInput, Depot } from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../src/theme/layout';
import { LoadingDots } from '../../src/components/common/LoadingDots';
import { RefreshLoadingDots } from '../../src/components/common/RefreshLoadingDots';
import { EmptyState } from '../../src/components/common/EmptyState';
import { Badge } from '../../src/components/common/StatusBadge';
import {
  MaintenanceStatusBadge,
  MaintenanceDetailModal,
  CreateMaintenanceModal,
  DefectStatusBadge,
  DefectReportDetailModal,
  DEFECT_STATUS_CONFIG,
  getMaintenanceVisualConfig,
} from '../../src/components/maintenance';
import {
  getScanTypeIcon,
  getScanTypeColor,
  formatScanTypeLabel,
} from '../../src/utils/scanFormatters';
import { findDepotByLocationString, getDepotBadgeColors } from '@rgr/shared';
import { useDepotLookup } from '../../src/hooks/useDepots';
import { useAcceptDefect } from '../../src/hooks/useAcceptDefect';
import { useModalTransition } from '../../src/hooks/useModalTransition';
import { BlurView } from 'expo-blur';
import { useCountUp } from '../../src/hooks/useCountUp';
import { useStaggeredEntrance } from '../../src/hooks/useStaggeredEntrance';

// Dashboard font sizes — now use global tokens (display: 28, hero: 35)
const FONT_SIZE_USERNAME = fontSize.display;
const FONT_SIZE_STAT_VALUE = fontSize.hero;
const FONT_SIZE_STAT_LABEL = fontSize.sm;

type HomeModalState =
  | { type: 'none' }
  | { type: 'defectDetail'; defectId: string }
  | { type: 'acceptDefect'; defectId: string; assetId: string; assetNumber?: string; title: string; description?: string | null }
  | { type: 'maintenanceDetail'; maintenanceId: string };

type DashboardActivityItem =
  | { type: 'scan'; data: ScanEventWithScanner; timestamp: string }
  | { type: 'maintenance'; data: MaintenanceListItemData; timestamp: string }
  | { type: 'defect'; data: DefectReportListItemData; timestamp: string };

/** Renders a count-up animated number for stat cards */
function CountUpValue({ value, style }: { value: number; style: object }) {
  const display = useCountUp(value);
  return <Text style={style}>{display}</Text>;
}

const ActivityCard = memo(function ActivityCard({
  item,
  onPress,
  depots,
  index,
}: {
  item: DashboardActivityItem;
  onPress: (item: DashboardActivityItem) => void;
  depots: Depot[];
  index: number;
}) {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  const entranceOpacity = useStaggeredEntrance(index);

  if (item.type === 'scan') {
    const activityColor = getScanTypeColor(item.data.scanType);
    const matchedDepot = item.data.locationDescription ? findDepotByLocationString(item.data.locationDescription, depots) : null;
    const badgeColors = matchedDepot ? getDepotBadgeColors(matchedDepot, colors.chrome, colors.text) : null;

    return (
      <Animated.View style={{ opacity: entranceOpacity }}>
        <TouchableOpacity
          style={[styles.scanCard, { borderColor: activityColor, borderWidth: 0.5, backgroundColor: activityColor + '08' }]}
          onPress={handlePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${formatScanTypeLabel(item.data.scanType)} scan for asset ${item.data.assetNumber ? formatAssetNumber(item.data.assetNumber) : 'Unknown'}`}
          accessibilityHint="Double tap to view asset details"
        >
          <View style={styles.cardRow}>
            <View style={styles.cardIconContainer}>
              <Ionicons name={getScanTypeIcon(item.data.scanType)} size={32} color={activityColor} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardContentRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.data.assetNumber ? formatAssetNumber(item.data.assetNumber) : 'Unknown Asset'}
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
      </Animated.View>
    );
  }

  if (item.type === 'defect') {
    const defectConfig = DEFECT_STATUS_CONFIG[item.data.status] ?? DEFECT_STATUS_CONFIG.reported;
    return (
      <Animated.View style={{ opacity: entranceOpacity }}>
        <TouchableOpacity
          style={[styles.scanCard, { borderColor: colors.defectYellow, borderWidth: 0.5, backgroundColor: colors.defectYellow + '08' }]}
          onPress={handlePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Defect report: ${item.data.title}`}
        >
          <View style={styles.cardRow}>
            <View style={styles.cardIconContainer}>
              <Ionicons name={defectConfig.icon} size={32} color={colors.defectYellow} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardContentRow}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.data.assetNumber ? formatAssetNumber(item.data.assetNumber) : 'Unknown Asset'}
                </Text>
                <View style={styles.cardBadges}>
                  <DefectStatusBadge status={item.data.status} />
                </View>
              </View>
              <View style={styles.scanFooter}>
                <Text style={styles.cardSecondaryText}>Defect Report</Text>
                <Text style={styles.scanTime}>
                  {formatRelativeTime(item.data.createdAt)}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Maintenance item
  const maintConfig = getMaintenanceVisualConfig(item.data.status, item.data.dueDate);

  return (
    <Animated.View style={{ opacity: entranceOpacity }}>
      <TouchableOpacity
        style={[styles.scanCard, { borderColor: maintConfig.color, borderWidth: 0.5, backgroundColor: maintConfig.color + '08' }]}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Maintenance ${item.data.title}, status ${item.data.status}`}
      >
        <View style={styles.cardRow}>
          <View style={styles.cardIconContainer}>
            <Ionicons name={maintConfig.icon} size={32} color={maintConfig.color} />
          </View>
          <View style={styles.cardBody}>
            <View style={styles.cardContentRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.data.assetNumber ? formatAssetNumber(item.data.assetNumber) : 'Unknown Asset'}
              </Text>
              <View style={styles.cardBadges}>
                <MaintenanceStatusBadge status={item.data.status} />
              </View>
            </View>
            <View style={styles.scanFooter}>
              <Text style={styles.cardSecondaryText}>{item.data.title}</Text>
              <Text style={styles.scanTime}>
                {formatRelativeTime(item.data.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const resolvedDepot = useLocationStore(s => s.resolvedDepot);
  const isResolvingDepot = useLocationStore(s => s.isResolvingDepot);
  const isFocused = useIsFocused();
  const { depots } = useDepotLookup();

  // Modal state machine — only one modal visible at a time
  const { modal, closeModal, transitionTo, isTransitioning, handleExitComplete } = useModalTransition<HomeModalState>({ type: 'none' });

  // Persistent backdrop — stays visible during A→B modal transitions
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const showBackdrop = modal.type !== 'none' || isTransitioning;

  useEffect(() => {
    Animated.timing(backdropOpacity, {
      toValue: showBackdrop ? 1 : 0,
      duration: showBackdrop ? 250 : 200,
      useNativeDriver: true,
    }).start();
  }, [showBackdrop, backdropOpacity]);

  const { mutateAsync: acceptDefect } = useAcceptDefect();

  const handleAcceptPress = useCallback((context: {
    defectId: string;
    assetId: string;
    assetNumber?: string;
    title: string;
    description?: string | null;
  }) => {
    transitionTo({ type: 'acceptDefect', ...context });
  }, [transitionTo]);

  const handleViewTaskPress = useCallback((maintenanceId: string) => {
    transitionTo({ type: 'maintenanceDetail', maintenanceId });
  }, [transitionTo]);

  const handleAcceptSubmit = useCallback(async (input: CreateMaintenanceInput) => {
    if (modal.type !== 'acceptDefect') return;
    await acceptDefect({
      defectReportId: modal.defectId,
      maintenanceInput: input,
    });
    closeModal();
  }, [modal, acceptDefect, closeModal]);

  // Dismiss defect flow (confirmation + delete handled inside DefectReportDetailModal)
  const handleDismissConfirmed = useCallback(() => {
    closeModal();
  }, [closeModal]);

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

  // Recent defect reports for activity feed
  const {
    data: defectData,
    isLoading: defectsLoading,
    refetch: refetchDefects,
    isRefetching: defectsRefetching,
  } = useRecentDefectReports(5);

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

  // Defect report stats for dashboard card
  const {
    data: defectStats,
    isLoading: defectStatsLoading,
    refetch: refetchDefectStats,
    isRefetching: defectStatsRefetching,
  } = useDefectReportStats();

  const isLoading = scansLoading || maintenanceLoading || defectsLoading || statsLoading || scanCountLoading || defectStatsLoading;
  const isRefetching = scansRefetching || maintenanceRefetching || defectsRefetching || statsRefetching || scanCountRefetching || defectStatsRefetching;

  const handleRefresh = useCallback(() => {
    refetchScans();
    refetchMaintenance();
    refetchDefects();
    refetchStats();
    refetchScanCount();
    refetchDefectStats();
  }, [refetchScans, refetchMaintenance, refetchDefects, refetchStats, refetchScanCount, refetchDefectStats]);

  // Get time-based greeting (memoized — only changes on focus)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  // Staggered fade in animations — play once per session, not on every tab focus
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const usernameOpacity = useRef(new Animated.Value(0)).current;
  const geofenceOpacity = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!isFocused) return;

    // On subsequent visits, render at full opacity immediately
    if (hasAnimated.current) {
      greetingOpacity.setValue(1);
      usernameOpacity.setValue(1);
      geofenceOpacity.setValue(1);
      return;
    }

    // First visit — play staggered fade-in
    hasAnimated.current = true;
    greetingOpacity.setValue(0);
    usernameOpacity.setValue(0);
    geofenceOpacity.setValue(0);

    const anim = Animated.sequence([
      Animated.timing(greetingOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(usernameOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(geofenceOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);
    animRef.current = anim;
    anim.start();

    return () => {
      anim.stop();
      animRef.current = null;
    };
  }, [isFocused, greetingOpacity, usernameOpacity, geofenceOpacity]);

  const servicedCount = assetStats?.serviced ?? 0;
  const outOfServiceCount = assetStats?.outOfService ?? 0;

  // Memoize stats cards to prevent recreation on every render
  // Note: Must be before any early returns to maintain hook order
  const statsCards = useMemo(() => [
    { label: 'Total Scans', value: totalScanCount ?? 0, color: colors.electricBlue, icon: 'qr-code' as const, route: '/(tabs)/scan' as const, params: {} },
    { label: 'Serviced', value: servicedCount, color: colors.status.active, icon: 'checkmark-circle' as const, route: '/(tabs)/assets' as const, params: { status: 'serviced' } },
    { label: 'Reported Defects', value: defectStats?.reported ?? 0, color: colors.defectYellow, icon: 'warning' as const, route: '/(tabs)/maintenance' as const, params: { tab: 'defects', defectStatus: 'reported' } },
    { label: 'Out of Service', value: outOfServiceCount, color: colors.status.outOfService, icon: 'close-circle' as const, route: '/(tabs)/assets' as const, params: { status: 'out_of_service' } },
  ], [totalScanCount, servicedCount, defectStats?.reported, outOfServiceCount]);

  // Merge scans, maintenance, and defects into a unified activity feed
  const recentActivity = useMemo<DashboardActivityItem[]>(() => {
    const scanItems: DashboardActivityItem[] = (scans ?? []).map(s => ({ type: 'scan' as const, data: s, timestamp: s.createdAt }));
    const maintItems: DashboardActivityItem[] = (maintenanceData ?? [])
      .filter(m => m.status !== 'cancelled')
      .map(m => ({ type: 'maintenance' as const, data: m, timestamp: m.createdAt }));
    const defectItems: DashboardActivityItem[] = (defectData ?? [])
      .filter(d => d.status !== 'dismissed')
      .map(d => ({ type: 'defect' as const, data: d, timestamp: d.createdAt }));
    return [...scanItems, ...maintItems, ...defectItems]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 5);
  }, [scans, maintenanceData, defectData]);

  // Stable press handler dispatches to router/modal based on item type
  const handleActivityPress = useCallback((item: DashboardActivityItem) => {
    if (item.type === 'scan') {
      router.navigate(`/(tabs)/assets/${item.data.assetId}`);
    } else if (item.type === 'defect') {
      transitionTo({ type: 'defectDetail', defectId: item.data.id });
    } else {
      transitionTo({ type: 'maintenanceDetail', maintenanceId: item.data.id });
    }
  }, [router, transitionTo]);

  // Thin wrapper delegates to memoized ActivityCard (passes index for stagger)
  const renderActivityItem = useCallback(({ item, index }: { item: DashboardActivityItem; index: number }) => (
    <ActivityCard item={item} onPress={handleActivityPress} depots={depots} index={index} />
  ), [handleActivityPress, depots]);

  const roleLabel = user ? (UserRoleLabels[user.role] || user.role) : '';

  // Memoize list header to prevent FlatList header remount on data refetch
  const listHeader = useMemo(() => (
    <>
      <RefreshLoadingDots isRefetching={!!isRefetching} />
      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileHeader}>
          <View>
            <Animated.Text style={[styles.greeting, { opacity: greetingOpacity }]}>{greeting},</Animated.Text>
            <Animated.Text style={[styles.userName, { opacity: usernameOpacity }]}>{user?.fullName}</Animated.Text>
          </View>
          <View style={{ position: 'absolute', top: 0, right: 0 }}>
            <Badge
              label={roleLabel}
              color={colors.userRole[user?.role as keyof typeof colors.userRole] || colors.electricBlue}
              size="small"
            />
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
            <Text style={styles.geofenceText}>You are not within any depot geofence</Text>
          )}
        </Animated.View>
      </View>

      {/* Stats Cards Grid */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Asset Overview</Text>
        <View style={styles.statsGrid}>
          {statsCards.map((stat) => (
            <TouchableOpacity
              key={stat.label}
              style={[styles.statCard, { backgroundColor: stat.color }]}
              onPress={() => router.navigate({ pathname: stat.route, params: stat.params })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${stat.label}: ${stat.value}. Tap to view assets.`}
            >
              <View style={styles.statRow}>
                <Ionicons name={stat.icon} size={32} color="#FFFFFF" style={styles.statIcon} />
                <CountUpValue value={stat.value} style={styles.statValue} />
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity Header */}
      <View style={styles.activityHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
      </View>
    </>
  // depots.length is used instead of the full depots array to prevent re-creation
  // when the array reference changes but content hasn't.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [isRefetching, greeting, user, roleLabel, isResolvingDepot, resolvedDepot, depots.length, statsCards]);

  // Early return must be after all hooks to maintain hook order
  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.containerInner}>
          <View style={styles.centerContent}>
            <LoadingDots color={colors.textSecondary} size={12} />
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
          ListHeaderComponent={listHeader}
          renderItem={renderActivityItem}
          contentContainerStyle={styles.listContent}
          windowSize={3}
          maxToRenderPerBatch={5}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={!!isRefetching}
              onRefresh={handleRefresh}
              tintColor="transparent"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="scan-outline"
              title="No recent activity"
              subtitle="Start scanning assets to see your activity here"
            />
          }
        />

        {/* Persistent backdrop — stays visible during A→B modal transitions */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.modalBackdrop, { opacity: backdropOpacity }]}
          pointerEvents={showBackdrop ? 'auto' : 'none'}
        >
          {Platform.OS === 'ios' && (
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
          )}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeModal}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        {/* Chained modals — gorhom portal rendering (no wrapper needed) */}
        <DefectReportDetailModal
          visible={modal.type === 'defectDetail'}
          defectId={modal.type === 'defectDetail' ? modal.defectId : null}
          onClose={closeModal}
          onAcceptPress={handleAcceptPress}
          onViewTaskPress={handleViewTaskPress}
          onDismissConfirmed={handleDismissConfirmed}
          noBackdrop onExitComplete={handleExitComplete}
        />

        <CreateMaintenanceModal
          visible={modal.type === 'acceptDefect'}
          onClose={closeModal}
          noBackdrop onExitComplete={handleExitComplete}
          {...(modal.type === 'acceptDefect' ? {
            assetId: modal.assetId,
            assetNumber: modal.assetNumber,
            defectReportId: modal.defectId,
            defaultTitle: modal.title,
            defaultDescription: modal.description ?? undefined,
            defaultPriority: 'high' as const,
            onExternalSubmit: handleAcceptSubmit,
          } : {})}
        />

        <MaintenanceDetailModal
          visible={modal.type === 'maintenanceDetail'}
          maintenanceId={modal.type === 'maintenanceDetail' ? modal.maintenanceId : null}
          onClose={closeModal}
          noBackdrop onExitComplete={handleExitComplete}
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
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: -5,
  },
  userName: {
    fontSize: FONT_SIZE_USERNAME,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    marginLeft: 16,
  },
  geofenceText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  geofenceLocation: {
    fontFamily: fonts.bold,
    fontStyle: 'normal',
  },
  
  // Stats Section
  statsSection: {
    marginTop: spacing.sm - 5,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
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
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statValue: {
    fontSize: FONT_SIZE_STAT_VALUE,
    fontFamily: fonts.bold,
    marginBottom: spacing.xs,
    color: colors.textInverse,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: FONT_SIZE_STAT_LABEL,
    fontFamily: fonts.regular,
    color: colors.textInverse,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Activity Section
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing['2xl'] - 5,
    marginBottom: spacing.xs,
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
    fontFamily: fonts.bold,
    color: colors.text,
    flex: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardSecondaryText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  depotLocationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  depotLocationText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  scanFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scanTime: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0,0,30,0.3)',
    zIndex: 10,
  },
});
