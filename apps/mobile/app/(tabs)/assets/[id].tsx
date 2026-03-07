import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import { useAssetDefectReports } from '../../../src/hooks/useDefectData';
import type { ScanEventWithScanner, MaintenanceRecord, MaintenanceRecordWithNames, PhotoListItem, DefectReportListItem, CreateMaintenanceInput } from '@rgr/shared';
import { AssetInfoCard } from '../../../src/components/assets/AssetInfoCard';
import { useAssetAssessment } from '../../../src/hooks/useAssetAssessment';
import { SegmentedTabs } from '../../../src/components/common/SegmentedTabs';
import { PhotoGallery, PhotoDetailModal } from '../../../src/components/photos';
import {
  MaintenanceStatusBadge,
  MaintenancePriorityBadge,
  MaintenanceDetailModal,
  CreateMaintenanceModal,
  DefectStatusBadge,
  DefectReportDetailModal,
  getMaintenanceVisualConfig,
  cardStyles,
} from '../../../src/components/maintenance';
import { useAuthStore } from '../../../src/store/authStore';
import { formatRelativeTime, hasRoleLevel, UserRole, formatAssetNumber } from '@rgr/shared';
import { colors } from '../../../src/theme/colors';
import { spacing, fontSize, borderRadius } from '../../../src/theme/spacing';
import { CONTENT_TOP_OFFSET } from '../../../src/theme/layout';
import {
  getScanTypeIcon,
  getScanTypeColor,
  formatScanTypeLabel,
} from '../../../src/utils/scanFormatters';
import { findDepotByLocationString, getDepotBadgeColors } from '@rgr/shared';
import { useDepotLookup } from '../../../src/hooks/useDepots';
import { useAcceptDefect } from '../../../src/hooks/useAcceptDefect';

type AssetModalState =
  | { type: 'none' }
  | { type: 'defectDetail'; defectId: string }
  | { type: 'acceptDefect'; defectId: string; assetId: string; assetNumber?: string; title: string; description?: string | null }
  | { type: 'maintenanceDetail'; maintenanceId: string };

type ActivityItem =
  | { type: 'scan'; data: ScanEventWithScanner; timestamp: Date }
  | { type: 'maintenance'; data: MaintenanceRecord; timestamp: Date }
  | { type: 'photo'; data: PhotoListItem; timestamp: Date }
  | { type: 'defect'; data: DefectReportListItem; timestamp: Date };

const ASSET_DETAIL_TABS = [
  { key: 'activity', label: 'Activity' },
  { key: 'photos', label: 'Photos' },
  { key: 'maintenance', label: 'Maint.' },
] as const;
type AssetDetailTab = typeof ASSET_DETAIL_TABS[number]['key'];

export default function AssetDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore(s => s.user);

  // Validate route params - handle array case from Expo Router
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [activeTab, setActiveTab] = useState<AssetDetailTab>('activity');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [showPhotoDetail, setShowPhotoDetail] = useState(false);

  // Modal state machine for defect/maintenance flow — only one at a time
  const [modal, setModal] = useState<AssetModalState>({ type: 'none' });
  const pendingTransition = useRef<AssetModalState | null>(null);

  const closeModal = useCallback(() => setModal({ type: 'none' }), []);

  const transitionTo = useCallback((next: AssetModalState) => {
    pendingTransition.current = next;
    setModal({ type: 'none' });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (pendingTransition.current) {
          setModal(pendingTransition.current);
          pendingTransition.current = null;
        }
      });
    });
  }, []);

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
    setModal({ type: 'maintenanceDetail', maintenanceId: item.id });
  }, []);

  // Always fetch (needed for header)
  const {
    data: asset,
    isLoading: assetLoading,
    error: assetError,
  } = useAsset(id);

  // Assessment fetches all data sources unconditionally (not tab-gated)
  const assessment = useAssetAssessment(asset);

  // Gate tab-specific queries: activity + maintenance tabs share scans/maintenance/defects
  const activityOrMaint = activeTab === 'activity' || activeTab === 'maintenance';

  const {
    data: scans = [],
    isLoading: scansLoading,
  } = useAssetScans(activityOrMaint ? id : undefined);

  const {
    data: maintenance = [],
  } = useAssetMaintenance(activityOrMaint ? id : undefined);

  const {
    data: defectReports = [],
  } = useAssetDefectReports(activityOrMaint ? id : undefined);

  // Photos tab only
  const {
    data: photos = [],
  } = useAssetPhotos(activeTab === 'photos' ? id : undefined);

  // Maintenance IDs that are linked to defect reports (used by activity + maintenance tabs)
  const defectLinkedMaintenanceIds = useMemo(
    () => new Set(defectReports.filter(d => d.maintenanceRecordId).map(d => d.maintenanceRecordId)),
    [defectReports]
  );

  // Merge scans, maintenance, defects, and photos into a unified activity feed
  const recentActivity: ActivityItem[] = useMemo(() => {
    const allItems = [
      ...scans.map(scan => ({
        type: 'scan' as const,
        data: scan,
        timestampStr: scan.createdAt,
      })),
      ...maintenance
        .filter(m => !defectLinkedMaintenanceIds.has(m.id))
        .map(m => ({
          type: 'maintenance' as const,
          data: m,
          timestampStr: m.updatedAt || m.createdAt,
        })),
      ...defectReports
        .filter(d => d.status !== 'dismissed')
        .map(d => ({
          type: 'defect' as const,
          data: d,
          timestampStr: d.createdAt,
        })),
      ...photos.map(photo => ({
        type: 'photo' as const,
        data: photo,
        timestampStr: photo.createdAt,
      })),
    ]
      .sort((a, b) => b.timestampStr.localeCompare(a.timestampStr))
      .slice(0, 10);

    return allItems.map(item => ({
      type: item.type,
      data: item.data,
      timestamp: new Date(item.timestampStr),
    })) as ActivityItem[];
  }, [scans, maintenance, defectReports, photos, defectLinkedMaintenanceIds]);

  // Compute next service date from scheduled maintenance
  const nextService = useMemo(
    () =>
      maintenance
        .filter(m => m.status === 'scheduled' && m.scheduledDate)
        .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0],
    [maintenance],
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
              <LoadingDots color={colors.textSecondary} size={6} />
            ) : recentActivity.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="time-outline" size={64} color={colors.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>No activity recorded</Text>
                <Text style={styles.emptySubtext}>Scans and maintenance will appear here</Text>
              </View>
            ) : (
              <View style={styles.activityList}>
              {recentActivity.map((item) => {
                let activityColor: string;
                let activityIcon: keyof typeof Ionicons.glyphMap;

                if (item.type === 'maintenance') {
                  const visual = getMaintenanceVisualConfig(item.data.status, item.data.dueDate);
                  activityColor = visual.color;
                  activityIcon = visual.icon;
                } else if (item.type === 'defect') {
                  activityColor = colors.warning;
                  activityIcon = 'warning';
                } else {
                  const activityType = item.type === 'scan'
                    ? item.data.scanType
                    : 'photo_upload';
                  activityColor = getScanTypeColor(activityType);
                  activityIcon = getScanTypeIcon(activityType);
                }

                const cardContent = (
                  <View style={[cardStyles.containerInline, { borderLeftColor: activityColor }]}>
                    <View style={cardStyles.cardRow}>
                      <View style={cardStyles.cardIconContainer}>
                        <Ionicons
                          name={activityIcon}
                          size={31}
                          color={activityColor}
                        />
                      </View>
                      <View style={cardStyles.cardBody}>
                        <View style={cardStyles.cardContentRow}>
                          <Text style={cardStyles.cardTitle} numberOfLines={1}>
                            {item.type === 'scan'
                              ? formatScanTypeLabel(item.data.scanType)
                              : item.type === 'photo'
                                ? 'Photo Upload'
                                : item.type === 'defect'
                                  ? 'Defect Report'
                                  : item.data.title}
                          </Text>
                          <View style={cardStyles.cardBadges}>
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
                            {item.type === 'defect' && (
                              <DefectStatusBadge status={item.data.status} />
                            )}
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
                          <Text style={cardStyles.cardSecondaryText}>
                            {item.type === 'scan'
                              ? item.data.scannerName || 'Unknown'
                              : item.type === 'photo'
                                ? item.data.primaryCategory?.replace(/_/g, ' ') || item.data.photoType.replace(/_/g, ' ')
                                : item.type === 'defect'
                                  ? item.data.description || item.data.title
                                  : item.data.status === 'completed'
                                    ? `Completed ${item.data.completedAt ? formatRelativeTime(item.data.completedAt) : formatRelativeTime(item.data.updatedAt)}${(item.data as MaintenanceRecordWithNames).completerName ? ` by ${(item.data as MaintenanceRecordWithNames).completerName}` : ''}`
                                    : item.data.description || item.data.maintenanceType?.replace(/_/g, ' ') || item.data.status.replace(/_/g, ' ')}
                          </Text>
                          <Text style={cardStyles.cardTime}>
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

                if (item.type === 'maintenance') {
                  return (
                    <TouchableOpacity
                      key={`m-${item.data.id}`}
                      onPress={() => handleMaintenancePress(item.data)}
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
                      onPress={() => setModal({ type: 'defectDetail', defectId: item.data.id })}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Defect report: ${item.data.title}`}
                    >
                      {cardContent}
                    </TouchableOpacity>
                  );
                }
                return <View key={item.data.id}>{cardContent}</View>;
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
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="construct-outline" size={64} color={colors.textSecondary} />
                </View>
                <Text style={styles.emptyTitle}>No maintenance records</Text>
                <Text style={styles.emptySubtext}>Scheduled tasks will appear here</Text>
              </View>
            ) : (
              <View style={styles.maintenanceList}>
                {maintenance.slice(0, 10).map((item) => {
                  const { icon: maintIcon, color: statusColor } = getMaintenanceVisualConfig(item.status, item.dueDate);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[cardStyles.containerInline, { borderLeftColor: statusColor }]}
                      onPress={() => handleMaintenancePress(item)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Maintenance ${item.title}, status ${item.status}`}
                    >
                      <View style={cardStyles.cardRow}>
                        <View style={cardStyles.cardIconContainer}>
                          <Ionicons
                            name={maintIcon}
                            size={31}
                            color={statusColor}
                          />
                        </View>
                        <View style={cardStyles.cardBody}>
                          <View style={cardStyles.cardContentRow}>
                            <Text style={cardStyles.cardTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <View style={cardStyles.cardBadges}>
                              <MaintenanceStatusBadge status={item.status} />
                            </View>
                          </View>
                          <View style={cardStyles.cardFooter}>
                            <Text style={cardStyles.cardSecondaryText} numberOfLines={1}>
                              {item.description || item.title}
                            </Text>
                            <Text style={cardStyles.cardTime}>
                              {formatRelativeTime(item.createdAt)}
                            </Text>
                          </View>
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
            <Text style={styles.modalAssetNumber}>{formatAssetNumber(asset.assetNumber)}</Text>
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

      {/* Defect / Maintenance modals — flat siblings, never nested */}
      <DefectReportDetailModal
        visible={modal.type === 'defectDetail'}
        defectId={modal.type === 'defectDetail' ? modal.defectId : null}
        onClose={closeModal}
        onAcceptPress={handleAcceptPress}
        onViewTaskPress={handleViewTaskPress}
      />

      <CreateMaintenanceModal
        visible={modal.type === 'acceptDefect'}
        onClose={closeModal}
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
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingVertical: spacing['2xl'],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
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
    lineHeight: 20,
  },
  activityList: {
    gap: spacing.sm,
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
});
