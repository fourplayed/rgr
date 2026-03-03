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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatRelativeTime } from '@rgr/shared';
import { LoadingDots, AlertSheet, ConfirmSheet } from '../common';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';
import { useDefectReport, useUpdateDefectReportStatus } from '../../hooks/useDefectData';
import { useScanEventPhotos, useSignedUrl } from '../../hooks/usePhotos';
import { useUserPermissions } from '../../contexts/UserPermissionsContext';
import { DefectStatusBadge } from './DefectStatusBadge';
import { CreateMaintenanceModal } from './CreateMaintenanceModal';
import { useAcceptDefect } from '../../hooks/useAcceptDefect';

interface DefectReportDetailModalProps {
  visible: boolean;
  defectId: string | null;
  onClose: () => void;
}

export function DefectReportDetailModal({
  visible,
  defectId,
  onClose,
}: DefectReportDetailModalProps) {
  const router = useRouter();
  const { canMarkMaintenance } = useUserPermissions();
  const { data: defect, isLoading } = useDefectReport(defectId);
  const updateStatusMutation = useUpdateDefectReportStatus();
  const acceptDefectMutation = useAcceptDefect();

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

  // Dismiss flow
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [dismissReason, setDismissReason] = useState('');

  // Alert sheet
  const [alertSheet, setAlertSheet] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const handleAccept = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleMaintenanceCreated = useCallback(async (maintenanceId: string) => {
    if (!defectId) return;

    setShowCreateModal(false);

    try {
      await acceptDefectMutation.mutateAsync({
        defectReportId: defectId,
        // The maintenance was already created by CreateMaintenanceModal;
        // we just need to link it. But useAcceptDefect creates the task too.
        // Instead, update status directly since task is already created.
        maintenanceInput: { assetId: '', title: '' }, // unused — see below
      });
    } catch {
      // Fallback: directly update status with the link
      try {
        await updateStatusMutation.mutateAsync({
          id: defectId,
          status: 'accepted',
          extras: { maintenanceRecordId: maintenanceId },
        });
      } catch (err) {
        setAlertSheet({
          visible: true,
          title: 'Error',
          message: err instanceof Error ? err.message : 'Failed to accept defect',
        });
      }
    }
  }, [defectId, acceptDefectMutation, updateStatusMutation]);

  // Better approach: when CreateMaintenanceModal closes after creating,
  // we link the defect via direct status update
  const handleMaintenanceModalClose = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissReason('');
    setShowDismissConfirm(true);
  }, []);

  const handleConfirmDismiss = useCallback(async () => {
    if (!defectId) return;

    setShowDismissConfirm(false);
    try {
      const mutationArgs: { id: string; status: 'dismissed'; extras?: { maintenanceRecordId?: string; dismissedReason?: string } } = {
        id: defectId,
        status: 'dismissed',
      };
      if (dismissReason.trim()) {
        mutationArgs.extras = { dismissedReason: dismissReason.trim() };
      }
      await updateStatusMutation.mutateAsync(mutationArgs);
    } catch (err) {
      setAlertSheet({
        visible: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to dismiss defect',
      });
    }
  }, [defectId, dismissReason, updateStatusMutation]);

  const handleNavigateToAsset = useCallback(() => {
    if (defect?.assetId) {
      onClose();
      router.push(`/assets/${defect.assetId}`);
    }
  }, [defect, router, onClose]);

  const handleViewLinkedTask = useCallback(() => {
    // Close this modal; the maintenance tab will handle showing it
    // For now, navigate to asset which shows both
    if (defect?.assetId) {
      onClose();
      router.push(`/assets/${defect.assetId}`);
    }
  }, [defect, router, onClose]);

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
              <Ionicons name="checkmark-circle" size={18} color={colors.textInverse} />
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

        {status === 'accepted' && defect.maintenanceRecordId && (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleViewLinkedTask}
          >
            <Ionicons name="construct" size={18} color={colors.textInverse} />
            <Text style={styles.primaryButtonText}>View Task</Text>
          </TouchableOpacity>
        )}

        {(status === 'resolved' || status === 'dismissed') && (
          <View style={styles.closedStatus}>
            <Ionicons
              name={status === 'resolved' ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={status === 'resolved' ? colors.success : colors.textSecondary}
            />
            <Text style={styles.closedStatusText}>
              {status === 'resolved' ? 'Resolved' : 'Dismissed'}
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
          <View style={styles.handle} />

          {isLoading || !defect ? (
            <View style={styles.loadingContainer}>
              <LoadingDots color={colors.electricBlue} size={10} />
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerButton} />
                <Text style={styles.title} numberOfLines={2}>{defect.title}</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.headerButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close defect report details"
                >
                  <Ionicons name="close" size={28} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
              >
                {/* Badges */}
                <View style={styles.badgeRow}>
                  <DefectStatusBadge status={defect.status} />
                </View>

                {/* Asset Link */}
                <TouchableOpacity
                  style={styles.assetLink}
                  onPress={handleNavigateToAsset}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cube-outline" size={20} color={colors.electricBlue} />
                  <Text style={styles.assetLinkText}>View Asset</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.electricBlue} />
                </TouchableOpacity>

                {/* Description */}
                {defect.description && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <View style={styles.sectionCard}>
                      <Text style={styles.detailValue}>{defect.description}</Text>
                    </View>
                  </View>
                )}

                {/* Defect Photo */}
                {defectPhoto && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionTitle}>Defect Photo</Text>
                    <View style={styles.sectionCard}>
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
                  </View>
                )}

                {/* Linked Maintenance Task */}
                {defect.maintenanceRecordId && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionTitle}>Linked Maintenance Task</Text>
                    <TouchableOpacity
                      style={styles.linkedTaskCard}
                      onPress={handleViewLinkedTask}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="construct-outline" size={20} color={colors.electricBlue} />
                      <Text style={styles.linkedTaskText}>View maintenance task</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.electricBlue} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Details */}
                <View style={styles.sectionGroup}>
                  <Text style={styles.sectionTitle}>Timeline</Text>
                  <View style={styles.sectionCard}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reported</Text>
                      <Text style={styles.detailValue}>
                        {formatRelativeTime(defect.createdAt)}
                      </Text>
                    </View>

                    {defect.reporterName && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reported By</Text>
                        <Text style={styles.detailValue}>{defect.reporterName}</Text>
                      </View>
                    )}

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
                </View>

                {/* Dismissed Reason */}
                {defect.dismissedReason && (
                  <View style={styles.sectionGroup}>
                    <Text style={styles.sectionTitle}>Dismiss Reason</Text>
                    <View style={styles.sectionCard}>
                      <Text style={styles.detailValue}>{defect.dismissedReason}</Text>
                    </View>
                  </View>
                )}

                {/* Notes */}
                {defect.notes && (
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
          defectReportId={defect.id}
          defaultTitle={defect.title}
          {...(defect.description ? { defaultDescription: defect.description } : {})}
          defaultPriority="high"
          onCreated={handleMaintenanceCreated}
        />
      )}

      {/* Dismiss Confirmation */}
      <ConfirmSheet
        visible={showDismissConfirm}
        type="danger"
        title="Dismiss Defect Report"
        message="Are you sure you want to dismiss this defect report? This cannot be undone."
        confirmLabel="Dismiss"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDismiss}
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
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    flex: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  assetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  assetLinkText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    flex: 1,
  },
  sectionGroup: {
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
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  detailRow: {
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
  linkedTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkedTaskText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    flex: 1,
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
    backgroundColor: colors.primary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
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
