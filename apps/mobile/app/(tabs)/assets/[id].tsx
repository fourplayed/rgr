import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LoadingDots } from '../../../src/components/common/LoadingDots';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAsset, useAssetScans, useAssetMaintenance } from '../../../src/hooks/useAssetData';
import { useAssetPhotos } from '../../../src/hooks/usePhotos';
import { useAssetDefectReports } from '../../../src/hooks/useDefectData';
import type {
  ScanEventWithScanner,
  MaintenanceRecord,
  MaintenanceRecordWithNames,
  PhotoListItem,
  DefectReportListItem,
} from '@rgr/shared';
import { AssetInfoCard } from '../../../src/components/assets/AssetInfoCard';
import { useAssetAssessment } from '../../../src/hooks/useAssetAssessment';
import { SegmentedTabs } from '../../../src/components/common/SegmentedTabs';
import { PhotoGallery, PhotoDetailModal } from '../../../src/components/photos';
import {
  MaintenanceStatusBadge,
  MaintenancePriorityBadge,
  DefectStatusBadge,
  getMaintenanceVisualConfig,
  cardStyles,
} from '../../../src/components/maintenance';
import { useAuthStore } from '../../../src/store/authStore';
import { formatRelativeTime, hasRoleLevel, UserRole, formatAssetNumber } from '@rgr/shared';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../../src/theme/layout';
import {
  getScanTypeIcon,
  getScanTypeColor,
  formatScanTypeLabel,
} from '../../../src/utils/scanFormatters';
import { findDepotByLocationString, getDepotBadgeColors } from '@rgr/shared';
import { useDepotLookup } from '../../../src/hooks/useDepots';
import { useDefectMaintenanceModals } from '../../../src/hooks/useDefectMaintenanceModals';
import { DefectMaintenanceModals } from '../../../src/components/common/DefectMaintenanceModals';
import { useTabFade } from '../../../src/hooks/useTabFade';
import { EmptyState } from '../../../src/components/common/EmptyState';
import { BottomSheet } from '../../../src/components/common/BottomSheet';
import { AppText } from '../../../src/components/common';

type ActivityItem =
  | { type: 'scan'; data: ScanEventWithScanner }
  | { type: 'maintenance'; data: MaintenanceRecord }
  | { type: 'photo'; data: PhotoListItem }
  | { type: 'defect'; data: DefectReportListItem };

// ---------------------------------------------------------------------------
// ActivityCard — memoized to prevent re-render when unrelated state changes.
// Receives an individual item plus the depot list (stable reference from hook).
// ---------------------------------------------------------------------------
type ActivityCardProps = {
  item: ActivityItem;
  depots: ReturnType<typeof useDepotLookup>['depots'];
  onMaintenancePress: (item: MaintenanceRecord) => void;
  onDefectPress: (defectId: string) => void;
};

const ActivityCard = React.memo(function ActivityCard({
  item,
  depots,
  onMaintenancePress,
  onDefectPress,
}: ActivityCardProps) {
  let activityColor: string;
  let activityIcon: keyof typeof Ionicons.glyphMap;

  if (item.type === 'maintenance') {
    const visual = getMaintenanceVisualConfig(item.data.status, item.data.dueDate);
    activityColor = visual.color;
    activityIcon = visual.icon;
  } else if (item.type === 'defect') {
    activityColor = colors.defectYellow;
    activityIcon = 'warning';
  } else {
    const activityType = item.type === 'scan' ? item.data.scanType : 'photo_upload';
    activityColor = getScanTypeColor(activityType);
    activityIcon = getScanTypeIcon(activityType);
  }

  // Depot badge — only relevant for scan items with a locationDescription.
  let depotBadge: React.ReactNode = null;
  if (item.type === 'scan' && item.data.locationDescription) {
    const matchedDepot = findDepotByLocationString(item.data.locationDescription, depots);
    if (matchedDepot) {
      const badgeColors = getDepotBadgeColors(matchedDepot, colors.chrome, colors.text);
      depotBadge = (
        <View style={[activityCardStyles.locationBadge, { backgroundColor: badgeColors.bg }]}>
          <AppText style={[activityCardStyles.locationText, { color: badgeColors.text }]}>
            {matchedDepot.name}
          </AppText>
        </View>
      );
    }
  }

  const secondaryText = (() => {
    if (item.type === 'scan') return item.data.scannerName || 'Unknown';
    if (item.type === 'photo') {
      return (
        item.data.primaryCategory?.replace(/_/g, ' ') || item.data.photoType.replace(/_/g, ' ')
      );
    }
    if (item.type === 'defect') return item.data.description || item.data.title;
    // maintenance
    if (item.data.status === 'completed') {
      const completedAt = item.data.completedAt
        ? formatRelativeTime(item.data.completedAt)
        : formatRelativeTime(item.data.updatedAt);
      const completerSuffix = (item.data as MaintenanceRecordWithNames).completerName
        ? ` by ${(item.data as MaintenanceRecordWithNames).completerName}`
        : '';
      return `Completed ${completedAt}${completerSuffix}`;
    }
    return (
      item.data.description ||
      item.data.maintenanceType?.replace(/_/g, ' ') ||
      item.data.status.replace(/_/g, ' ')
    );
  })();

  const timeValue =
    item.type === 'maintenance' ? item.data.updatedAt || item.data.createdAt : item.data.createdAt;

  const titleText = (() => {
    if (item.type === 'scan') return formatScanTypeLabel(item.data.scanType);
    if (item.type === 'photo') return 'Photo Upload';
    if (item.type === 'defect') return 'Defect Report';
    return item.data.title;
  })();

  const cardContent = (
    <View
      style={[
        cardStyles.containerInline,
        { borderColor: activityColor, backgroundColor: activityColor + '1A' },
      ]}
    >
      <View style={cardStyles.cardRow}>
        <View style={cardStyles.cardIconContainer}>
          <Ionicons name={activityIcon} size={32} color={activityColor} />
        </View>
        <View style={cardStyles.cardBody}>
          <View style={cardStyles.cardContentRow}>
            <AppText style={cardStyles.cardTitle} numberOfLines={1}>
              {titleText}
            </AppText>
            <View style={cardStyles.cardBadges}>
              {depotBadge}
              {item.type === 'photo' && item.data.hazardCount > 0 && (
                <View
                  style={[
                    activityCardStyles.locationBadge,
                    {
                      backgroundColor:
                        item.data.maxSeverity === 'critical' || item.data.maxSeverity === 'high'
                          ? colors.error
                          : colors.warning,
                    },
                  ]}
                >
                  <AppText style={[activityCardStyles.locationText, { color: colors.textInverse }]}>
                    {item.data.hazardCount} Hazard{item.data.hazardCount !== 1 ? 's' : ''}
                  </AppText>
                </View>
              )}
              {item.type === 'defect' && <DefectStatusBadge status={item.data.status} />}
              {item.type === 'maintenance' && (
                <>
                  <MaintenanceStatusBadge status={item.data.status} />
                  {item.data.status !== 'completed' && item.data.status !== 'cancelled' && (
                    <MaintenancePriorityBadge priority={item.data.priority} />
                  )}
                </>
              )}
            </View>
          </View>
          <View style={cardStyles.cardFooter}>
            <AppText style={cardStyles.cardSecondaryText}>{secondaryText}</AppText>
            <AppText style={cardStyles.cardTime}>{formatRelativeTime(timeValue)}</AppText>
          </View>
        </View>
      </View>
    </View>
  );

  if (item.type === 'maintenance') {
    return (
      <TouchableOpacity
        key={`m-${item.data.id}`}
        onPress={() => onMaintenancePress(item.data)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Maintenance ${item.data.title}, status ${item.data.status}`}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }
  if (item.type === 'defect') {
    return (
      <TouchableOpacity
        key={`d-${item.data.id}`}
        onPress={() => onDefectPress(item.data.id)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Defect report: ${item.data.title}`}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }
  return <View key={item.data.id}>{cardContent}</View>;
});

// Styles scoped to ActivityCard (mirrors the inline styles previously on AssetDetailScreen).
const activityCardStyles = StyleSheet.create({
  locationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  locationText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
});

// ---------------------------------------------------------------------------
// MaintenanceCard — memoized card for the Maintenance tab list.
// Receives a single MaintenanceRecord and a stable press handler.
// ---------------------------------------------------------------------------
type MaintenanceCardProps = {
  item: MaintenanceRecord;
  onPress: (item: MaintenanceRecord) => void;
};

const MaintenanceCard = React.memo(function MaintenanceCard({
  item,
  onPress,
}: MaintenanceCardProps) {
  const { icon: maintIcon, color: statusColor } = getMaintenanceVisualConfig(
    item.status,
    item.dueDate
  );

  return (
    <TouchableOpacity
      style={[
        cardStyles.containerInline,
        { borderColor: statusColor, backgroundColor: statusColor + '1A' },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Maintenance ${item.title}, status ${item.status}`}
    >
      <View style={cardStyles.cardRow}>
        <View style={cardStyles.cardIconContainer}>
          <Ionicons name={maintIcon} size={32} color={statusColor} />
        </View>
        <View style={cardStyles.cardBody}>
          <View style={cardStyles.cardContentRow}>
            <AppText style={cardStyles.cardTitle} numberOfLines={1}>
              {item.title}
            </AppText>
            <View style={cardStyles.cardBadges}>
              <MaintenanceStatusBadge status={item.status} />
            </View>
          </View>
          <View style={cardStyles.cardFooter}>
            <AppText style={cardStyles.cardSecondaryText} numberOfLines={1}>
              {item.description || item.title}
            </AppText>
            <AppText style={cardStyles.cardTime}>{formatRelativeTime(item.createdAt)}</AppText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const ASSET_DETAIL_TABS = [
  { key: 'activity', label: 'Activity' },
  { key: 'photos', label: 'Photos' },
  { key: 'maintenance', label: 'Maint.' },
] as const;
type AssetDetailTab = (typeof ASSET_DETAIL_TABS)[number]['key'];

export default function AssetDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  // Validate route params - handle array case from Expo Router
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [activeTab, setActiveTab] = useState<AssetDetailTab>('activity');
  const { opacity: tabOpacity, visibleTab } = useTabFade(activeTab);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [showPhotoDetail, setShowPhotoDetail] = useState(false);

  // Shared defect/maintenance modal chain (detail -> accept -> task detail)
  const modals = useDefectMaintenanceModals();

  const isSuperuser = !!user?.role && hasRoleLevel(user.role, UserRole.SUPERUSER);
  const { depots } = useDepotLookup();

  const handlePhotoPress = useCallback((photo: PhotoListItem) => {
    setSelectedPhotoId(photo.id);
    setShowPhotoDetail(true);
  }, []);

  const handleClosePhotoDetail = useCallback(() => {
    setShowPhotoDetail(false);
    setSelectedPhotoId(null);
  }, []);

  const handleMaintenancePress = useCallback(
    (item: MaintenanceRecord) => {
      modals.openMaintenanceDetail(item.id);
    },
    [modals]
  );

  const handleDefectPress = useCallback(
    (defectId: string) => {
      modals.openDefectDetail(defectId);
    },
    [modals]
  );

  // Always fetch (needed for header)
  const { data: asset, isLoading: assetLoading, error: assetError } = useAsset(id);

  // Assessment fetches all data sources unconditionally (not tab-gated)
  const assessment = useAssetAssessment(asset);

  // Gate tab-specific queries on visibleTab (not activeTab) so data stays alive during fade-out
  const activityOrMaint =
    visibleTab === 'activity' ||
    visibleTab === 'maintenance' ||
    activeTab === 'activity' ||
    activeTab === 'maintenance';

  const { data: scans = [], isLoading: scansLoading } = useAssetScans(
    activityOrMaint ? id : undefined
  );

  const { data: maintenance = [] } = useAssetMaintenance(activityOrMaint ? id : undefined);

  const { data: defectReports = [] } = useAssetDefectReports(activityOrMaint ? id : undefined);

  // Photos tab only
  const photosNeeded = visibleTab === 'photos' || activeTab === 'photos';
  const { data: photos = [] } = useAssetPhotos(photosNeeded ? id : undefined);

  // Maintenance IDs that are linked to defect reports (used by activity + maintenance tabs)
  const defectLinkedMaintenanceIds = useMemo(
    () =>
      new Set(defectReports.filter((d) => d.maintenanceRecordId).map((d) => d.maintenanceRecordId)),
    [defectReports]
  );

  // Merge scans, maintenance, defects, and photos into a unified activity feed
  const recentActivity: ActivityItem[] = useMemo(() => {
    const allItems = [
      ...scans.map((scan) => ({
        type: 'scan' as const,
        data: scan,
        timestampStr: scan.createdAt,
      })),
      ...maintenance
        .filter((m) => !defectLinkedMaintenanceIds.has(m.id))
        .map((m) => ({
          type: 'maintenance' as const,
          data: m,
          timestampStr: m.updatedAt || m.createdAt,
        })),
      ...defectReports
        .filter((d) => d.status !== 'dismissed')
        .map((d) => ({
          type: 'defect' as const,
          data: d,
          timestampStr: d.createdAt,
        })),
      ...photos.map((photo) => ({
        type: 'photo' as const,
        data: photo,
        timestampStr: photo.createdAt,
      })),
    ]
      .sort((a, b) => b.timestampStr.localeCompare(a.timestampStr))
      .slice(0, 10);

    return allItems.map((item) => ({
      type: item.type,
      data: item.data,
    })) as ActivityItem[];
  }, [scans, maintenance, defectReports, photos, defectLinkedMaintenanceIds]);

  // Compute next service date from scheduled maintenance
  const nextService = useMemo(
    () =>
      maintenance
        .filter((m) => m.status === 'scheduled' && m.scheduledDate)
        .sort(
          (a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime()
        )[0],
    [maintenance]
  );

  // Validate required route param
  if (!id) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.containerInner}>
          <View style={styles.centerContent}>
            <AppText style={styles.errorText}>Asset ID is required</AppText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <AppText style={styles.retryButtonText}>Go Back</AppText>
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
            <LoadingDots color={colors.textSecondary} size={12} />
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
            <AppText style={styles.errorText}>Failed to load asset</AppText>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <AppText style={styles.retryButtonText}>Go Back</AppText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.containerInner}>
        <View style={styles.pinnedHeader}>
          <AssetInfoCard
            asset={asset}
            nextServiceDate={nextService?.scheduledDate}
            assessment={assessment}
            {...(isSuperuser && asset.qrCodeData ? { onPress: () => setShowQRModal(true) } : {})}
          />
          <SegmentedTabs tabs={ASSET_DETAIL_TABS} activeTab={activeTab} onTabPress={setActiveTab} />
        </View>

        <Animated.View style={[styles.tabContentArea, { opacity: tabOpacity }]}>
          {visibleTab === 'activity' && (
            <ScrollView contentContainerStyle={styles.tabScrollContent}>
              {scansLoading ? (
                <LoadingDots color={colors.textSecondary} size={6} />
              ) : recentActivity.length === 0 ? (
                <EmptyState
                  icon="time-outline"
                  title="No activity recorded"
                  subtitle="Scans and maintenance will appear here"
                />
              ) : (
                <View style={styles.activityList}>
                  {recentActivity.map((item) => (
                    <ActivityCard
                      key={
                        item.type === 'maintenance'
                          ? `m-${item.data.id}`
                          : item.type === 'defect'
                            ? `d-${item.data.id}`
                            : item.data.id
                      }
                      item={item}
                      depots={depots}
                      onMaintenancePress={handleMaintenancePress}
                      onDefectPress={handleDefectPress}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {visibleTab === 'photos' && (
            <View style={styles.photosTab}>
              <PhotoGallery assetId={id} onPhotoPress={handlePhotoPress} />
            </View>
          )}

          {visibleTab === 'maintenance' && (
            <ScrollView contentContainerStyle={styles.tabScrollContent}>
              {maintenance.length === 0 ? (
                <EmptyState
                  icon="construct-outline"
                  title="No maintenance records"
                  subtitle="Scheduled tasks will appear here"
                />
              ) : (
                <View style={styles.maintenanceList}>
                  {maintenance.map((item) => (
                    <MaintenanceCard key={item.id} item={item} onPress={handleMaintenancePress} />
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>

        {/* QR Code Sheet - Superuser Only */}
        <BottomSheet visible={showQRModal} onDismiss={() => setShowQRModal(false)}>
          <View style={styles.qrSheetContent}>
            <AppText style={styles.qrSheetTitle}>Asset QR Code</AppText>
            <AppText style={styles.modalAssetNumber}>
              {formatAssetNumber(asset.assetNumber)}
            </AppText>
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
            <AppText style={styles.qrDataText}>{asset.qrCodeData}</AppText>
          </View>
        </BottomSheet>

        {/* Photo Detail Modal */}
        <PhotoDetailModal
          visible={showPhotoDetail}
          photoId={selectedPhotoId}
          assetId={id}
          onClose={handleClosePhotoDetail}
        />

        {/* Shared defect/maintenance modal chain */}
        <DefectMaintenanceModals {...modals} />
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
  pinnedHeader: {
    paddingHorizontal: spacing.base,
    paddingTop: CONTENT_TOP_OFFSET,
    gap: spacing.md,
  },
  tabContentArea: {
    flex: 1,
  },
  photosTab: {
    flex: 1,
    padding: spacing.base,
  },
  tabScrollContent: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
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
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  activityList: {
    gap: spacing.sm,
  },
  // QR Code Sheet
  qrSheetContent: {
    alignItems: 'center',
    padding: spacing.xl,
    paddingBottom: spacing.xl + spacing.base,
  },
  qrSheetTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  modalAssetNumber: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
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
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // Maintenance Section
  maintenanceList: {
    gap: spacing.sm,
  },
});
