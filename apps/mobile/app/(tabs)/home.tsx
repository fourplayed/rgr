import React, { useRef, useEffect } from 'react';
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
import { useMyRecentScans, useAssetCountsByStatus } from '../../src/hooks/useAssetData';
import { useAuthStore } from '../../src/store/authStore';
import { useLocationStore } from '../../src/store/locationStore';
import { formatRelativeTime, UserRoleLabels } from '@rgr/shared';
import { colors } from '../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../src/theme/layout';
import { LoadingDots } from '../../src/components/common/LoadingDots';

// Map scan types to icons
const getScanTypeIcon = (scanType: string): keyof typeof Ionicons.glyphMap => {
  switch (scanType) {
    case 'qr_scan':
    case 'nfc_scan':
    case 'gps_auto':
    case 'manual_entry':
      return 'qr-code-outline';
    case 'photo_upload':
      return 'camera-outline';
    case 'maintenance':
      return 'construct-outline';
    default:
      return 'scan-outline';
  }
};

const getScanTypeColor = (scanType: string): string => {
  switch (scanType) {
    case 'qr_scan':
    case 'nfc_scan':
    case 'gps_auto':
    case 'manual_entry':
      return colors.electricBlue; // Match Total Assets stat card
    case 'photo_upload':
      return '#34C759'; // Green for photo upload
    case 'maintenance':
      return '#FF9500'; // Orange for maintenance
    default:
      return colors.electricBlue;
  }
};

const formatScanTypeLabel = (scanType: string): string => {
  return scanType
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => {
      const upper = word.toUpperCase();
      if (upper === 'QR' || upper === 'NFC' || upper === 'GPS') {
        return upper;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

const getDepotCodeFromLocation = (locationDescription: string): keyof typeof colors.depot | null => {
  const location = locationDescription.toLowerCase();
  if (location.includes('karratha')) return 'kar';
  if (location.includes('perth')) return 'per';
  if (location.includes('wubin')) return 'wub';
  if (location.includes('newman')) return 'new';
  if (location.includes('hedland')) return 'hed';
  if (location.includes('carnarvon')) return 'car';
  return null;
};

const getLocationBadgeColors = (locationDescription: string): { bg: string; text: string } => {
  const depotCode = getDepotCodeFromLocation(locationDescription);
  if (!depotCode) {
    return { bg: colors.chrome, text: colors.text };
  }
  const bg = colors.depot[depotCode];
  const text = depotCode === 'kar' ? colors.text : colors.textInverse;
  return { bg, text };
};

const depotNames: Record<string, string> = {
  kar: 'Karratha', per: 'Perth', wub: 'Wubin',
  new: 'Newman', hed: 'Hedland', car: 'Carnarvon',
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { resolvedDepot, isResolvingDepot } = useLocationStore();

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

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Staggered fade in animations
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const usernameOpacity = useRef(new Animated.Value(0)).current;
  const geofenceOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runAnimation = () => {
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
      ]).start(() => runAnimation());
    };

    runAnimation();
  }, [greetingOpacity, usernameOpacity, geofenceOpacity]);

  if (!user) {
    return null;
  }

  const roleLabel = UserRoleLabels[user.role] || user.role;
  const recentScans = scans.slice(0, 5);

  const totalAssets = assetStats?.total ?? 0;
  const servicedCount = assetStats?.serviced ?? 0;
  const outOfServiceCount = assetStats?.outOfService ?? 0;

  const statsCards = [
    { label: 'Total Assets', value: totalAssets, color: colors.electricBlue, icon: 'cube-outline' as const },
    { label: 'Serviced', value: servicedCount, color: colors.status.active, icon: 'checkmark-circle-outline' as const },
    { label: 'Total Scans', value: scans.length, color: colors.status.maintenance, icon: 'qr-code-outline' as const },
    { label: 'Out of Service', value: outOfServiceCount, color: colors.status.outOfService, icon: 'close-circle-outline' as const },
  ];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.containerInner}>
          <View style={styles.centerContent}>
            <LoadingDots color="#0000FF" size={12} />
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
                    <Animated.Text style={[styles.greeting, { opacity: greetingOpacity }]}>{greeting},</Animated.Text>
                    <Animated.Text style={[styles.userName, { opacity: usernameOpacity }]}>{user.fullName}</Animated.Text>
                    <Animated.View style={{ opacity: geofenceOpacity }}>
                      {isResolvingDepot ? (
                        <LoadingDots color={colors.textSecondary} size={6} />
                      ) : resolvedDepot ? (
                        <Text style={styles.geofenceText}>
                          Your current location is within the <Text style={styles.geofenceLocation}>{resolvedDepot.depot.name}</Text> geofence
                        </Text>
                      ) : (
                        <Text style={styles.geofenceText}>You are not within any depot geofence</Text>
                      )}
                    </Animated.View>
                  </View>
                  <View style={[styles.badgeBase, { backgroundColor: colors.userRole[user.role as keyof typeof colors.userRole] || colors.electricBlue, position: 'absolute', top: 0, right: 0 }]}>
                    <Text style={[styles.badgeText, { color: colors.textInverse }]}>{roleLabel}</Text>
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
                <Text style={styles.activitySubtitle}>{scans.length} total scans</Text>
              </View>
            </>
          }
          renderItem={({ item }) => {
            const activityColor = getScanTypeColor(item.scanType);
            const depotCode = item.locationDescription ? getDepotCodeFromLocation(item.locationDescription) : null;
            const badgeColors = item.locationDescription ? getLocationBadgeColors(item.locationDescription) : null;

            return (
            <TouchableOpacity
              style={[styles.scanCard, { borderLeftWidth: 4, borderLeftColor: activityColor }]}
              onPress={() => router.navigate(`/(tabs)/assets/${item.assetId}`)}
              activeOpacity={0.7}
            >
              <View style={styles.scanCardContent}>
                <View style={styles.scanIconContainer}>
                  <Ionicons name={getScanTypeIcon(item.scanType)} size={31} color={activityColor} />
                </View>
                <View style={styles.scanDetails}>
                  <View style={styles.scanHeader}>
                    <Text style={styles.assetNumber}>
                      {item.assetNumber || 'Unknown Asset'}
                    </Text>
                    {depotCode && badgeColors && (
                      <View style={[styles.depotLocationBadge, { backgroundColor: badgeColors.bg }]}>
                        <Text style={[styles.depotLocationText, { color: badgeColors.text }]}>{depotNames[depotCode]}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.scanFooter}>
                    <Text style={styles.scanTypeLabel}>
                      {formatScanTypeLabel(item.scanType)}
                    </Text>
                    <Text style={styles.scanTime}>
                      {formatRelativeTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            );
          }}
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
    backgroundColor: colors.chrome,
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
  },
  userName: {
    fontSize: fontSize.userName,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    marginBottom: spacing.xs,
    marginLeft: 16,
  },
  geofenceText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginLeft: 32,
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
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  scanCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanIconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  scanDetails: {
    flex: 1,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  assetNumber: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
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
  scanTypeLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
