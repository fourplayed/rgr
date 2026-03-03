import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LoadingDots } from '../../../src/components/common/LoadingDots';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAsset, useAssetScans, useAssetMaintenance } from '../../../src/hooks/useAssetData';
import { useAssetPhotos } from '../../../src/hooks/usePhotos';
import type { ScanEventWithScanner, MaintenanceRecord, MaintenanceRecordWithNames, PhotoListItem } from '@rgr/shared';
import { AssetInfoCard } from '../../../src/components/assets/AssetInfoCard';
import { buildAssetAssessment } from '../../../src/utils/assetAssessment';
import { SegmentedTabs } from '../../../src/components/common/SegmentedTabs';
import { PhotoGallery, PhotoDetailModal } from '../../../src/components/photos';
import {
  MaintenanceStatusBadge,
  MaintenancePriorityBadge,
  MaintenanceDetailModal,
} from '../../../src/components/maintenance';
import { useAuthStore } from '../../../src/store/authStore';
import { formatRelativeTime, hasRoleLevel, UserRole } from '@rgr/shared';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../../src/theme/layout';
import {
  getScanTypeIcon,
  getScanTypeColor,
  formatScanTypeLabel,
} from '../../../src/utils/scanFormatters';
import { isDefectReport, getMaintenanceIconProps } from '../../../src/utils/maintenanceHelpers';
import { PillBadge } from '../../../src/components/common/PillBadge';
import { findDepotByLocationString, getDepotBadgeColors } from '@rgr/shared';
import { useDepotLookup } from '../../../src/hooks/useDepots';

type ActivityItem =
  | { type: 'scan'; data: ScanEventWithScanner; timestamp: Date }
  | { type: 'maintenance'; data: MaintenanceRecord; timestamp: Date }
  | { type: 'photo'; data: PhotoListItem; timestamp: Date };

const ASSET_DETAIL_TABS = [
  { key: 'activity', label: 'Activity' },
  { key: 'photos', label: 'Photos' },
  { key: 'maintenance', label: 'Maint.' },
] as const;
type AssetDetailTab = typeof ASSET_DETAIL_TABS[number]['key'];

const MAINTENANCE_STATUS_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  scheduled: 'time-outline',
  in_progress: 'construct-outline',
  completed: 'checkmark-circle',
  cancelled: 'close-circle-outline',
};

export default function AssetDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  // Validate route params - handle array case from Expo Router
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [activeTab, setActiveTab] = useState<AssetDetailTab>('activity');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [showPhotoDetail, setShowPhotoDetail] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);

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

  const handleMaintenancePress = useCallback((item: MaintenanceRecord) => {
    setSelectedMaintenanceId(item.id);
  }, []);

  const handleCloseMaintenanceDetail = useCallback(() => {
    setSelectedMaintenanceId(null);
  }, []);

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

  const {
    data: photos = [],
  } = useAssetPhotos(id);

  // Merge scans, maintenance, and photos into a unified activity feed
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
      ...photos.map(photo => ({
        type: 'photo' as const,
        data: photo,
        timestampStr: photo.createdAt,
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
  }, [scans, maintenance, photos]);

  // Compute next service date from scheduled maintenance
  const nextService = useMemo(
    () =>
      maintenance
        .filter(m => m.status === 'scheduled' && m.scheduledDate)
        .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0],
    [maintenance],
  );

  // Build a natural-language assessment of the asset's current state
  const assessment = useMemo(
    () => asset ? buildAssetAssessment({ asset, maintenance, photos, scans, depots }) : null,
    [asset, maintenance, photos, scans, depots],
  );

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
            accessibilityRole="button"
            accessibilityLabel="Go back"
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
            accessibilityRole="button"
            accessibilityLabel="Go back"
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
      <View style={styles.pinnedHeader}>
        <AssetInfoCard
          asset={asset}
          nextServiceDate={nextService?.scheduledDate}
          assessment={assessment}
          {...(isSuperuser && asset.qrCodeData ? { onPress: () => setShowQRModal(true) } : {})}
        />
        <SegmentedTabs tabs={ASSET_DETAIL_TABS} activeTab={activeTab} onTabPress={setActiveTab} />
      </View>

      <View style={styles.tabContentArea}>
        {activeTab === 'activity' && (
          <ScrollView contentContainerStyle={styles.tabScrollContent}>
            {scansLoading ? (
              <LoadingDots color={colors.electricBlue} size={6} />
            ) : recentActivity.length === 0 ? (
              <Text style={styles.emptyText}>No activity recorded</Text>
            ) : (
              <View style={styles.activityList}>
              {recentActivity.map((item) => {
                let activityColor: string;
                let activityIcon: keyof typeof Ionicons.glyphMap;

                if (item.type === 'maintenance') {
                  if (item.data.status === 'completed') {
                    activityColor = colors.maintenanceStatus.completed;
                    activityIcon = 'checkmark-circle';
                  } else {
                    const props = getMaintenanceIconProps(item.data.maintenanceType, item.data.status, MAINTENANCE_STATUS_ICONS);
                    activityColor = props.color;
                    activityIcon = props.icon;
                  }
                } else {
                  const activityType = item.type === 'scan'
                    ? item.data.scanType
                    : 'photo_upload';
                  activityColor = getScanTypeColor(activityType);
                  activityIcon = getScanTypeIcon(activityType);
                }

                const cardContent = (
                  <View style={[styles.activityCard, { borderLeftColor: activityColor }]}>
                    <View style={styles.cardRow}>
                      <View style={styles.cardIconContainer}>
                        <Ionicons
                          name={activityIcon}
                          size={31}
                          color={activityColor}
                        />
                      </View>
                      <View style={styles.cardBody}>
                        <View style={styles.cardContentRow}>
                          <Text style={styles.cardTitle} numberOfLines={1}>
                            {item.type === 'scan'
                              ? formatScanTypeLabel(item.data.scanType)
                              : item.type === 'photo'
                                ? 'Photo Upload'
                                : item.data.title}
                          </Text>
                          <View style={styles.cardBadges}>
                            {item.type === 'scan' && item.data.locationDescription && (() => {
                              const matchedDepot = findDepotByLocationString(item.data.locationDescription, depots);
                              if (!matchedDepot) return null;
                              const badgeColors = getDepotBadgeColors(matchedDepot, colors.chrome, colors.text);
                              return (
                                <View style={[styles.locationBadge, { backgroundColor: badgeColors.bg }]}>
                                  <Text style={[styles.locationText, { color: badgeColors.text }]}>{matchedDepot.name}</Text>
                                </View>
                              );
                            })()}
                            {item.type === 'photo' && item.data.hazardCount > 0 && (
                              <View style={[styles.locationBadge, { backgroundColor: item.data.maxSeverity === 'critical' || item.data.maxSeverity === 'high' ? colors.error : colors.warning }]}>
                                <Text style={[styles.locationText, { color: colors.textInverse }]}>
                                  {item.data.hazardCount} Hazard{item.data.hazardCount !== 1 ? 's' : ''}
                                </Text>
                              </View>
                            )}
                            {item.type === 'maintenance' && (
                              <>
                                {isDefectReport(item.data.maintenanceType) && (
                                  <PillBadge icon="warning" label="Defect" color={colors.warning} />
                                )}
                                <MaintenanceStatusBadge status={item.data.status} />
                                {!isDefectReport(item.data.maintenanceType) && item.data.status !== 'completed' && item.data.status !== 'cancelled' && (
                                  <MaintenancePriorityBadge priority={item.data.priority} />
                                )}
                              </>
                            )}
                          </View>
                        </View>
                        <View style={styles.activityFooter}>
                          <Text style={styles.cardSecondaryText}>
                            {item.type === 'scan'
                              ? item.data.scannerName || 'Unknown'
                              : item.type === 'photo'
                                ? item.data.primaryCategory?.replace(/_/g, ' ') || item.data.photoType.replace(/_/g, ' ')
                                : item.data.status === 'completed'
                                  ? `Completed ${item.data.completedAt ? formatRelativeTime(item.data.completedAt) : formatRelativeTime(item.data.updatedAt)}${(item.data as MaintenanceRecordWithNames).completerName ? ` by ${(item.data as MaintenanceRecordWithNames).completerName}` : ''}`
                                  : item.data.description || item.data.maintenanceType?.replace(/_/g, ' ') || item.data.status.replace(/_/g, ' ')}
                          </Text>
                          <Text style={styles.activityTime}>
                            {formatRelativeTime(
                              item.type === 'maintenance'
                                ? (item.data.updatedAt || item.data.createdAt)
                                : item.data.createdAt
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );

                return item.type === 'maintenance' ? (
                  <TouchableOpacity
                    key={item.data.id}
                    onPress={() => handleMaintenancePress(item.data)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${isDefectReport(item.data.maintenanceType) ? 'Defect report: ' : ''}${item.data.title}`}
                  >
                    {cardContent}
                  </TouchableOpacity>
                ) : (
                  <View key={item.data.id}>{cardContent}</View>
                );
              })}
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'photos' && (
          <View style={styles.photosTab}>
            <PhotoGallery assetId={id} onPhotoPress={handlePhotoPress} />
          </View>
        )}

        {activeTab === 'maintenance' && (
          <ScrollView contentContainerStyle={styles.tabScrollContent}>
            {maintenance.length === 0 ? (
              <Text style={styles.emptyText}>No maintenance records</Text>
            ) : (
              <View style={styles.maintenanceList}>
                {maintenance.slice(0, 10).map((item) => {
                  const isCompleted = item.status === 'completed';
                  const isDefect = isDefectReport(item.maintenanceType);
                  const { icon: maintIcon, color: maintIconColor } = isCompleted
                    ? { icon: 'checkmark-circle' as const, color: colors.maintenanceStatus.completed }
                    : getMaintenanceIconProps(item.maintenanceType, item.status, MAINTENANCE_STATUS_ICONS);
                  const borderColor = isCompleted
                    ? colors.success
                    : isDefect
                      ? colors.warning
                      : colors.maintenancePriority[item.priority as keyof typeof colors.maintenancePriority] || colors.border;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.maintenanceCard, { borderLeftColor: borderColor }]}
                      onPress={() => handleMaintenancePress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardRow}>
                        <View style={styles.cardIconContainer}>
                          <Ionicons
                            name={maintIcon}
                            size={31}
                            color={maintIconColor}
                          />
                        </View>
                        <View style={styles.cardBody}>
                          <View style={styles.cardContentRow}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <View style={styles.cardBadges}>
                              {isDefect && (
                                <PillBadge icon="warning" label="Defect" color={colors.warning} />
                              )}
                              <MaintenanceStatusBadge status={item.status} />
                              {!isDefect && !isCompleted && item.status !== 'cancelled' && (
                                <MaintenancePriorityBadge priority={item.priority} />
                              )}
                            </View>
                          </View>
                          <Text style={styles.cardSecondaryText}>
                            {isCompleted
                              ? `Completed ${item.completedAt ? formatRelativeTime(item.completedAt) : formatRelativeTime(item.updatedAt)}${(item as MaintenanceRecordWithNames).completerName ? ` by ${(item as MaintenanceRecordWithNames).completerName}` : ''}`
                              : item.dueDate ? `Due ${formatRelativeTime(item.dueDate)}` : formatRelativeTime(item.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>

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
                accessibilityRole="button"
                accessibilityLabel="Close QR code modal"
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

      {/* Photo Detail Modal */}
      <PhotoDetailModal
        visible={showPhotoDetail}
        photoId={selectedPhotoId}
        assetId={id}
        onClose={handleClosePhotoDetail}
      />

      {/* Maintenance Detail Modal */}
      <MaintenanceDetailModal
        visible={selectedMaintenanceId !== null}
        maintenanceId={selectedMaintenanceId}
        onClose={handleCloseMaintenanceDetail}
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
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
  activityList: {
    gap: spacing.sm,
  },
  activityCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  activityTime: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
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

  // Maintenance Section
  maintenanceList: {
    gap: spacing.sm,
  },
  maintenanceCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
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
});
