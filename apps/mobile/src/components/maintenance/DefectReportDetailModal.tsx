import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { LoadingDots, AlertSheet, InputSheet } from '../common';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows } from '../../theme/spacing';
import type { CreateMaintenanceInput } from '@rgr/shared';
import { useDefectReport, useUpdateDefectReportStatus } from '../../hooks/useDefectData';
import { useAsset } from '../../hooks/useAssetData';
import { useMaintenance } from '../../hooks/useMaintenanceData';
import { useScanEventPhotos, useSignedUrl } from '../../hooks/usePhotos';
import { useAcceptDefect } from '../../hooks/useAcceptDefect';
import { useUserPermissions } from '../../contexts/UserPermissionsContext';
import { CreateMaintenanceModal } from './CreateMaintenanceModal';
import { MaintenanceDetailModal } from './MaintenanceDetailModal';

interface DefectReportDetailModalProps {
  visible: boolean;
  defectId: string | null;
  onClose: () => void;
  /** 'compact' hides timeline, defect photo, linked task, notes, and asset nav link. Default 'full'. */
  variant?: 'full' | 'compact';
}

export function DefectReportDetailModal({
  visible,
  defectId,
  onClose,
  variant = 'full',
}: DefectReportDetailModalProps) {
  const router = useRouter();
  const { canMarkMaintenance } = useUserPermissions();
  const { data: defect, isLoading } = useDefectReport(defectId);
  const { data: asset } = useAsset(defect?.assetId);
  const { data: linkedMaintenance } = useMaintenance(defect?.maintenanceRecordId ?? null);
  const updateStatusMutation = useUpdateDefectReportStatus();
  const { mutateAsync: updateDefectStatus } = updateStatusMutation;
  const acceptDefectMutation = useAcceptDefect();
  const { mutateAsync: acceptDefect } = acceptDefectMutation;

  // Defect photo data
  const { data: scanEventPhotos } = useScanEventPhotos(defect?.scanEventId ?? null);
  const defectPhoto = scanEventPhotos?.find((p) => p.photoType === 'damage') ?? null;
  const {
    data: defectPhotoUrl,
    isLoading: isPhotoLoading,
    error: photoError,
  } = useSignedUrl(defectPhoto?.thumbnailPath ?? defectPhoto?.storagePath ?? undefined);

  // Accept flow: show CreateMaintenanceModal pre-filled
  const [showCreateModal, setShowCreateModal] = useState(false);

  // View linked maintenance task
  const [showMaintenanceDetail, setShowMaintenanceDetail] = useState(false);

  // Dismiss flow
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  // dismissReason is now collected inline by InputSheet

  // Alert sheet
  const [alertSheet, setAlertSheet] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const handleAccept = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  /** Atomic accept: CreateMaintenanceModal collects form data, we handle both
   *  operations in a single server-side transaction via useAcceptDefect. */
  const handleAcceptSubmit = useCallback(async (maintenanceInput: CreateMaintenanceInput) => {
    if (!defectId) return;

    try {
      await acceptDefect({
        defectReportId: defectId,
        maintenanceInput,
      });
    } catch (err) {
      setAlertSheet({
        visible: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to accept defect',
      });
    }
  }, [defectId, acceptDefect]);

  const handleMaintenanceModalClose = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setShowDismissConfirm(true);
  }, []);

  const handleConfirmDismiss = useCallback(async (reason: string) => {
    if (!defectId) return;

    setShowDismissConfirm(false);
    try {
      const args: { id: string; status: 'dismissed'; extras?: { dismissedReason: string } } = {
        id: defectId,
        status: 'dismissed',
      };
      if (reason.trim()) {
        args.extras = { dismissedReason: reason.trim() };
      }
      await updateDefectStatus(args);
    } catch (err) {
      setAlertSheet({
        visible: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to dismiss defect',
      });
    }
  }, [defectId, updateDefectStatus]);

  const handleNavigateToAsset = useCallback(() => {
    if (defect?.assetId) {
      onClose();
      router.push(`/assets/${defect.assetId}`);
    }
  }, [defect, router, onClose]);

  const handleViewLinkedTask = useCallback(() => {
    setShowMaintenanceDetail(true);
  }, []);

  const renderStatusActions = () => {
    if (!defect || !canMarkMaintenance) return null;

    const status = defect.status;

    return (
      <View style={styles.actionsContainer}>
        {status === 'reported' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleAccept}
              disabled={updateStatusMutation.isPending || acceptDefectMutation.isPending}
            >
              <Text style={styles.primaryButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDismiss}
              disabled={updateStatusMutation.isPending}
            >
              <Text style={styles.dangerButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </>
        )}

        {(status === 'accepted' || status === 'resolved' || status === 'dismissed') && (
          <View style={styles.closedStatus}>
            <Ionicons
              name={status === 'accepted' ? 'construct' : status === 'resolved' ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={status === 'accepted' ? colors.info : status === 'resolved' ? colors.success : colors.textSecondary}
            />
            <Text style={styles.closedStatusText}>
              {status === 'accepted' ? 'Accepted' : status === 'resolved' ? 'Resolved' : 'Dismissed'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          {isLoading || !defect ? (
            <>
              <View style={styles.handle} />
              <View style={styles.loadingContainer}>
                <LoadingDots color={colors.textSecondary} size={10} />
              </View>
            </>
          ) : (
            <>
              {/* Header with gradient extending to top of modal */}
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.headerGradient}
              >
                <View style={styles.handleLight} />
                <View style={styles.header}>
                  <View style={styles.headerTitleRow}>
                    <Ionicons name="warning" size={32} color={colors.textInverse} />
                    <Text style={styles.title} numberOfLines={2}>Defect Report</Text>
                  </View>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.headerButton}
                    accessibilityRole="button"
                    accessibilityLabel="Close defect report details"
                  >
                    <Ionicons name="close" size={28} color={colors.textInverse} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
              >
                {/* Asset ID + Asset Link */}
                <View style={styles.badgeRow}>
                  {asset?.assetNumber && (
                    <Text style={styles.assetNumberText}>{formatAssetNumber(asset.assetNumber)}</Text>
                  )}
                  {variant === 'full' && (
                    <TouchableOpacity
                      style={styles.assetLink}
                      onPress={handleNavigateToAsset}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.assetLinkText}>View Asset</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.electricBlue} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Description */}
                {defect.description && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.detailValue}>{defect.description}</Text>
                  </View>
                )}

                {/* Defect Photo (hidden in compact mode) */}
                {variant === 'full' && defectPhoto && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionTitle}>Defect Photo</Text>
                    {isPhotoLoading ? (
                      <View style={styles.defectPhotoPlaceholder}>
                        <LoadingDots color={colors.textSecondary} size={8} />
                      </View>
                    ) : photoError || !defectPhotoUrl ? (
                      <View style={styles.defectPhotoPlaceholder}>
                        <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
                        <Text style={styles.defectPhotoErrorText}>Photo unavailable</Text>
                      </View>
                    ) : (
                      <View
                        style={styles.defectPhotoContainer}
                        accessible
                        accessibilityRole="image"
                        accessibilityLabel="Defect photo"
                      >
                        <Image
                          source={{ uri: defectPhotoUrl }}
                          style={styles.defectPhoto}
                          contentFit="cover"
                          transition={200}
                          cachePolicy="memory-disk"
                        />
                      </View>
                    )}
                  </View>
                )}

                {/* Linked Maintenance Task (hidden in compact mode) */}
                {variant === 'full' && defect.maintenanceRecordId && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionTitle}>Linked Maintenance Task</Text>
                    {linkedMaintenance && (
                      <Text style={styles.detailValue}>{linkedMaintenance.title}</Text>
                    )}
                    <TouchableOpacity
                      style={styles.linkedTaskLink}
                      onPress={handleViewLinkedTask}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.linkedTaskLinkText}>View Task</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.electricBlue} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Timeline (hidden in compact mode) */}
                {variant === 'full' && (
                  <View style={styles.sectionGroup}>
                    <View style={styles.detailRowInline}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reported</Text>
                        <Text style={styles.detailValue}>
                          {formatRelativeTime(defect.createdAt)}
                        </Text>
                      </View>
                      {defect.reporterName && (
                        <View style={styles.detailRowEnd}>
                          <Text style={styles.detailLabel}>Reported By</Text>
                          <Text style={styles.detailValue}>{defect.reporterName}</Text>
                        </View>
                      )}
                    </View>

                    {defect.acceptedAt && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Accepted</Text>
                        <Text style={styles.detailValue}>
                          {formatRelativeTime(defect.acceptedAt)}
                        </Text>
                      </View>
                    )}

                    {defect.resolvedAt && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Resolved</Text>
                        <Text style={styles.detailValue}>
                          {formatRelativeTime(defect.resolvedAt)}
                        </Text>
                      </View>
                    )}

                    {defect.dismissedAt && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Dismissed</Text>
                        <Text style={styles.detailValue}>
                          {formatRelativeTime(defect.dismissedAt)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Dismissed Reason (hidden in compact mode) */}
                {variant === 'full' && defect.dismissedReason && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionTitle}>Dismiss Reason</Text>
                    <View style={styles.sectionCard}>
                      <Text style={styles.detailValue}>{defect.dismissedReason}</Text>
                    </View>
                  </View>
                )}

                {/* Notes (hidden in compact mode) */}
                {variant === 'full' && defect.notes && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <View style={styles.sectionCard}>
                      <Text style={styles.detailValue}>{defect.notes}</Text>
                    </View>
                  </View>
                )}

                {/* Status Actions */}
                {renderStatusActions()}
              </ScrollView>
            </>
          )}
        </View>
      </View>

      {/* Create Maintenance Modal for Accept flow */}
      {defect && (
        <CreateMaintenanceModal
          visible={showCreateModal}
          onClose={handleMaintenanceModalClose}
          assetId={defect.assetId}
          {...(asset?.assetNumber ? { assetNumber: asset.assetNumber } : {})}
          defectReportId={defect.id}
          defaultTitle={defect.title}
          {...(defect.description ? { defaultDescription: defect.description } : {})}
          defaultPriority="high"
          onExternalSubmit={handleAcceptSubmit}
        />
      )}

      {/* Linked Maintenance Task Detail */}
      <MaintenanceDetailModal
        visible={showMaintenanceDetail}
        maintenanceId={defect?.maintenanceRecordId ?? null}
        onClose={() => setShowMaintenanceDetail(false)}
      />

      {/* Dismiss with Reason */}
      <InputSheet
        visible={showDismissConfirm}
        title="Dismiss Defect Report"
        message="Please provide a reason for dismissing this defect report."
        placeholder="Reason for dismissal..."
        submitLabel="Dismiss"
        cancelLabel="Cancel"
        onSubmit={handleConfirmDismiss}
        onCancel={() => setShowDismissConfirm(false)}
        isLoading={updateStatusMutation.isPending}
      />

      {/* Alert Sheet */}
      <AlertSheet
        visible={alertSheet.visible}
        type="error"
        title={alertSheet.title}
        message={alertSheet.message}
        onDismiss={() => setAlertSheet(prev => ({ ...prev, visible: false }))}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  headerGradient: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  handleLight: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  loadingContainer: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing['2xl'],
    backgroundColor: colors.chrome,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.base,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  assetNumberText: {
    fontSize: fontSize.xl,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  assetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  assetLinkText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
  sectionGroup: {
    gap: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailRow: {
  },
  detailRowEnd: {
    alignItems: 'flex-end',
  },
  detailLabel: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
  },
  linkedTaskLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkedTaskLinkText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.md,
  },
  primaryButton: {
    backgroundColor: colors.electricBlue,
    ...shadows.md,
  },
  dangerButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
  },
  primaryButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  dangerButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.error,
    textTransform: 'uppercase',
  },
  closedStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    flex: 1,
    paddingVertical: spacing.base,
  },
  closedStatusText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  defectPhotoContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
  },
  defectPhoto: {
    flex: 1,
  },
  defectPhotoPlaceholder: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  defectPhotoErrorText: {
    fontSize: fontSize.xs,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
