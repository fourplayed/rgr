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
import { useDeleteAsset, useAssetRelatedCounts } from '../../../src/hooks/useAdminAssets';
import { useAssetPhotos } from '../../../src/hooks/usePhotos';
import type { ScanEventWithScanner, MaintenanceRecord, PhotoListItem } from '@rgr/shared';
import { AssetInfoCard } from '../../../src/components/assets/AssetInfoCard';
import { PhotoGallery, PhotoDetailModal } from '../../../src/components/photos';
import { CollapsibleSection } from '../../../src/components/common/CollapsibleSection';
import { ConfirmSheet } from '../../../src/components/common/ConfirmSheet';
import { AlertSheet } from '../../../src/components/common/AlertSheet';
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
import { findDepotByLocationString, getDepotBadgeColors } from '@rgr/shared';
import { useDepotLookup } from '../../../src/hooks/useDepots';

type ActivityItem =
  | { type: 'scan'; data: ScanEventWithScanner; timestamp: Date }
  | { type: 'maintenance'; data: MaintenanceRecord; timestamp: Date }
  | { type: 'photo'; data: PhotoListItem; timestamp: Date };

export default function AssetDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  // Validate route params - handle array case from Expo Router
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [showQRModal, setShowQRModal] = useState(false);
  const [activityExpanded, setActivityExpanded] = useState(true);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [showPhotoDetail, setShowPhotoDetail] = useState(false);
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAlert, setDeleteAlert] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false, title: '', message: '',
  });
  const rotateAnim = useRef(new Animated.Value(1)).current;

  const isSuperuser = !!user?.role && hasRoleLevel(user.role, UserRole.SUPERUSER);
  const deleteMutation = useDeleteAsset();
  const { data: relatedCounts } = useAssetRelatedCounts(isSuperuser ? id ?? null : null);
  const { depots } = useDepotLookup();

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

  const handleDeleteAsset = useCallback(() => {
    if (!id) return;
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        router.back();
      },
      onError: (err) => {
        setShowDeleteConfirm(false);
        setDeleteAlert({
          visible: true,
          title: 'Delete Failed',
          message: err?.message ?? 'An unexpected error occurred',
        });
      },
    });
  }, [id, deleteMutation, router]);

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
      <ScrollView contentContainerStyle={styles.content}>
        {/* Superuser Actions */}
        {isSuperuser && (
          <View style={styles.superuserActions}>
            {asset.qrCodeData && (
              <TouchableOpacity
                style={styles.qrLink}
                onPress={() => setShowQRModal(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="View QR Code"
                accessibilityHint="Double tap to view the asset QR code"
              >
                <Ionicons name="qr-code-outline" size={20} color={colors.neonViolet} />
                <Text style={styles.qrLinkText}>View QR Code</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.deleteLink}
              onPress={() => setShowDeleteConfirm(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Delete asset"
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={styles.deleteLinkText}>Delete Asset</Text>
            </TouchableOpacity>
          </View>
        )}

        <AssetInfoCard
          asset={asset}
          nextServiceDate={nextService?.scheduledDate}
        />

        {/* Photos Section */}
        <CollapsibleSection title="Photos" defaultExpanded={true} variant="flat">
          <PhotoGallery
            assetId={id}
            onPhotoPress={handlePhotoPress}
          />
        </CollapsibleSection>

        {/* Maintenance Section */}
        <CollapsibleSection title="Maintenance" defaultExpanded={true} variant="flat">
          <View style={styles.maintenanceSection}>
            {maintenance.length === 0 ? (
              <Text style={styles.emptyText}>No maintenance records</Text>
            ) : (
              <View style={styles.maintenanceList}>
                {maintenance.slice(0, 5).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.maintenanceCard,
                      { borderLeftColor: colors.maintenancePriority[item.priority as keyof typeof colors.maintenancePriority] || colors.border },
                    ]}
                    onPress={() => handleMaintenancePress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.maintenanceCardContent}>
                      <Text style={styles.maintenanceTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.maintenanceBadges}>
                        <MaintenanceStatusBadge status={item.status} />
                        <MaintenancePriorityBadge priority={item.priority} />
                      </View>
                    </View>
                    <Text style={styles.maintenanceDate}>
                      {item.dueDate ? `Due ${formatRelativeTime(item.dueDate)}` : formatRelativeTime(item.createdAt)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </CollapsibleSection>

        {/* Recent Activity */}
        <View style={styles.activitySectionHeader}>
          <Text style={styles.activitySectionTitle}>Recent Activity</Text>
          <TouchableOpacity
            style={styles.chevronButton}
            onPress={handleToggleActivity}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={activityExpanded ? "Collapse recent activity" : "Expand recent activity"}
            accessibilityHint="Double tap to toggle the activity section"
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
              // Determine activity type for styling
              const activityType = item.type === 'scan'
                ? item.data.scanType
                : item.type === 'photo'
                  ? 'photo_upload'
                  : 'maintenance';
              const activityColor = getScanTypeColor(activityType);

              return (
              <View key={item.data.id} style={[styles.activityCard, { borderLeftWidth: 4, borderLeftColor: activityColor }]}>
                <View style={styles.activityCardContent}>
                  <View style={styles.activityIconContainer}>
                    <Ionicons
                      name={getScanTypeIcon(activityType)}
                      size={31}
                      color={activityColor}
                    />
                  </View>
                  <View style={styles.activityDetails}>
                    <View style={styles.activityHeader}>
                      <Text style={styles.activityTitle}>
                        {item.type === 'scan'
                          ? formatScanTypeLabel(item.data.scanType)
                          : item.type === 'photo'
                            ? 'Photo Upload'
                            : item.data.maintenanceType?.replace(/_/g, ' ') || 'Maintenance'}
                      </Text>
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
                    </View>
                    <View style={styles.activityFooter}>
                      <Text style={styles.activityType}>
                        {item.type === 'scan'
                          ? item.data.scannerName || 'Unknown'
                          : item.type === 'photo'
                            ? item.data.primaryCategory?.replace(/_/g, ' ') || item.data.photoType.replace(/_/g, ' ')
                            : item.data.description || item.data.status.replace(/_/g, ' ')}
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

      {/* Delete Confirm - Superuser Only */}
      <ConfirmSheet
        visible={showDeleteConfirm}
        type="danger"
        title="Delete Asset"
        message={
          asset
            ? `Soft-delete "${asset.assetNumber}"? This sets status to Out of Service.${
                relatedCounts
                  ? `\n\nRelated records: ${relatedCounts.scanEvents} scans, ${relatedCounts.maintenanceRecords} maintenance records (preserved).`
                  : ''
              }`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteAsset}
        onCancel={() => setShowDeleteConfirm(false)}
        isLoading={deleteMutation.isPending}
      />

      {/* Delete Error Alert */}
      <AlertSheet
        visible={deleteAlert.visible}
        type="error"
        title={deleteAlert.title}
        message={deleteAlert.message}
        onDismiss={() => setDeleteAlert({ ...deleteAlert, visible: false })}
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
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    fontStyle: 'italic',
    textTransform: 'uppercase',
  },
  superuserActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.lg,
  },
  qrLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  qrLinkText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.neonViolet,
    textTransform: 'uppercase',
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteLinkText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.error,
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
    fontSize: fontSize.xs,
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

  // Maintenance Section
  maintenanceSection: {
    gap: spacing.sm,
  },
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
  maintenanceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  maintenanceTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    flex: 1,
  },
  maintenanceBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  maintenanceDate: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
});
