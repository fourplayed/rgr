import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LoadingDots } from '../../../src/components/common/LoadingDots';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAsset, useAssetScans, useAssetMaintenance } from '../../../src/hooks/useAssetData';
import type { ScanEventWithScanner, MaintenanceRecord } from '@rgr/shared';
import { AssetInfoCard } from '../../../src/components/assets/AssetInfoCard';
import { useAuthStore } from '../../../src/store/authStore';
import { formatRelativeTime } from '@rgr/shared';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../../src/theme/layout';
import {
  getScanTypeIcon,
  getScanTypeColor,
  formatScanTypeLabel,
  getDepotCodeFromLocation,
  getLocationBadgeColors,
  DEPOT_NAMES,
} from '../../../src/utils/scanFormatters';

type ActivityItem =
  | { type: 'scan'; data: ScanEventWithScanner; timestamp: Date }
  | { type: 'maintenance'; data: MaintenanceRecord; timestamp: Date };

export default function AssetDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  // Validate route params - handle array case from Expo Router
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [showQRModal, setShowQRModal] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(true);
  const rotateAnim = useRef(new Animated.Value(1)).current;

  const isSuperuser = user?.role === 'superuser';

  useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: activityExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [activityExpanded, rotateAnim]);

  const handleToggleActivity = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActivityExpanded(prev => !prev);
  }, []);

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

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

  // Merge scans and maintenance into a unified activity feed
  // Optimization: Sort by timestamp string first, slice, then create Date objects
  // This avoids creating Date objects for items we won't display
  const recentActivity: ActivityItem[] = useMemo(() => {
    const allItems = [
      ...scans.map(scan => ({
        type: 'scan' as const,
        data: scan,
        timestampStr: scan.createdAt,
      })),
      ...maintenance.map(m => ({
        type: 'maintenance' as const,
        data: m,
        timestampStr: m.updatedAt || m.createdAt,
      })),
    ]
      .sort((a, b) => b.timestampStr.localeCompare(a.timestampStr))
      .slice(0, 10);

    // Create Date objects only for items we'll render
    return allItems.map(item => ({
      type: item.type,
      data: item.data,
      timestamp: new Date(item.timestampStr),
    })) as ActivityItem[];
  }, [scans, maintenance]);

  // Compute next service date from scheduled maintenance
  const nextService = maintenance
    .filter(m => m.status === 'scheduled' && m.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0];

  // Validate required route param
  if (!id) {
    return (
      <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Asset ID is required</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      </View>
    );
  }

  if (assetLoading) {
    return (
      <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.centerContent}>
          <LoadingDots color={colors.electricBlue} size={12} />
        </View>
      </SafeAreaView>
      </View>
    );
  }

  if (assetError || !asset) {
    return (
      <View style={styles.container}>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
    <SafeAreaView style={styles.containerInner}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* QR Code Link - Superuser Only */}
        {isSuperuser && asset.qrCodeData && (
          <TouchableOpacity
            style={styles.qrLink}
            onPress={() => setShowQRModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={20} color={colors.neonViolet} />
            <Text style={styles.qrLinkText}>View QR Code</Text>
          </TouchableOpacity>
        )}

        <AssetInfoCard
          asset={asset}
          nextServiceDate={nextService?.scheduledDate}
        />

        {/* Recent Activity */}
        <View style={styles.activitySectionHeader}>
          <Text style={styles.activitySectionTitle}>Recent Activity</Text>
          <TouchableOpacity
            style={styles.chevronButton}
            onPress={handleToggleActivity}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
              <Ionicons
                name="chevron-down"
                size={20}
                color={colors.text}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {activityExpanded && (
          scansLoading ? (
            <LoadingDots color={colors.electricBlue} size={6} />
          ) : recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>No activity recorded</Text>
          ) : (
            <View style={styles.activityList}>
            {recentActivity.map((item) => {
              const activityColor = getScanTypeColor(item.type === 'scan' ? item.data.scanType : 'maintenance');

              return (
              <View key={item.data.id} style={[styles.activityCard, { borderLeftWidth: 4, borderLeftColor: activityColor }]}>
                <View style={styles.activityCardContent}>
                  <View style={styles.activityIconContainer}>
                    <Ionicons
                      name={getScanTypeIcon(item.type === 'scan' ? item.data.scanType : 'maintenance')}
                      size={31}
                      color={getScanTypeColor(item.type === 'scan' ? item.data.scanType : 'maintenance')}
                    />
                  </View>
                  <View style={styles.activityDetails}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityTitle}>
                        {item.type === 'scan'
                          ? formatScanTypeLabel(item.data.scanType)
                          : item.data.maintenanceType?.replace(/_/g, ' ') || 'Maintenance'}
                      </Text>
                      {item.type === 'scan' && item.data.locationDescription && (() => {
                        const depotCode = getDepotCodeFromLocation(item.data.locationDescription);
                        if (!depotCode) return null;
                        const badgeColors = getLocationBadgeColors(item.data.locationDescription);
                        return (
                          <View style={[styles.locationBadge, { backgroundColor: badgeColors.bg }]}>
                            <Text style={[styles.locationText, { color: badgeColors.text }]}>{DEPOT_NAMES[depotCode]}</Text>
                          </View>
                        );
                      })()}
                    </View>
                    <View style={styles.activityFooter}>
                      <Text style={styles.activityType}>
                        {item.type === 'scan'
                          ? item.data.scannerName || 'Unknown'
                          : item.data.description || item.data.status.replace(/_/g, ' ')}
                      </Text>
                      <Text style={styles.activityTime}>
                        {formatRelativeTime(item.type === 'scan' ? item.data.createdAt : item.data.updatedAt || item.data.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              );
            })}
            </View>
          )
        )}
      </ScrollView>

      {/* QR Code Modal - Superuser Only */}
      <Modal
        visible={showQRModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Asset QR Code</Text>
              <TouchableOpacity
                onPress={() => setShowQRModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalAssetNumber}>{asset.assetNumber}</Text>
            <View style={styles.qrContainer}>
              {asset.qrCodeData && (
                <QRCode
                  value={asset.qrCodeData}
                  size={200}
                  color={colors.text}
                  backgroundColor={colors.background}
                />
              )}
            </View>
            <Text style={styles.qrDataText}>{asset.qrCodeData}</Text>
          </View>
        </View>
      </Modal>
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
  content: {
    padding: spacing.base,
    paddingTop: CONTENT_TOP_OFFSET,
    gap: spacing.lg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.error,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.electricBlue,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  emptyText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
  qrLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-end',
  },
  qrLinkText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.neonViolet,
    textTransform: 'uppercase',
  },
  activitySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chevronButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  activitySectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 5,
  },
  activityList: {
    gap: spacing.sm,
    marginTop: -5,
  },
  activityCard: {
    backgroundColor: colors.background,
    padding: spacing.base,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconContainer: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activityDetails: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  activityTitle: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityTime: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  locationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  locationText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_700Bold',
    textTransform: 'uppercase',
  },
  activityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityType: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },

  // QR Code Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalAssetNumber: {
    fontSize: fontSize.xl,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
  },
  qrContainer: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  qrDataText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
