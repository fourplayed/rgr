import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { LoadingDots, AlertSheet, ConfirmSheet, SheetModal } from '../common';
import { SheetHeader } from '../common/SheetHeader';
import { SheetFooter } from '../common/SheetFooter';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import {
  useMaintenance,
  useUpdateMaintenanceStatus,
  useUpdateMaintenance,
  useCancelMaintenanceTask,
} from '../../hooks/useMaintenanceData';
import { useAsset } from '../../hooks/useAssetData';
import { useAuthStore } from '../../store/authStore';
import { useScanEventPhotos, useSignedUrl } from '../../hooks/usePhotos';
import { useUserPermissions } from '../../contexts/UserPermissionsContext';
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge';
import { MaintenancePriorityBadge } from './MaintenancePriorityBadge';
import { MAINTENANCE_STATUS_CONFIG } from './MaintenanceListItem';

interface MaintenanceDetailModalProps {
  visible: boolean;
  maintenanceId: string | null;
  onClose: () => void;
  /** 'compact' hides timeline, notes, defect photo, and asset nav link. Default 'full'. */
  variant?: 'full' | 'compact';
  /** Render inline (no native Modal) — use when already inside a Modal. */
  inline?: boolean;
}

export function MaintenanceDetailModal({
  visible,
  maintenanceId,
  onClose,
  variant = 'full',
  inline,
}: MaintenanceDetailModalProps) {
  const router = useRouter();
  const { canMarkMaintenance } = useUserPermissions();
  const user = useAuthStore((s) => s.user);
  const { data: maintenance, isLoading } = useMaintenance(maintenanceId);
  const { data: asset } = useAsset(maintenance?.assetId);
  const updateStatusMutation = useUpdateMaintenanceStatus();
  const { mutateAsync: updateMaintenanceStatus } = updateStatusMutation;
  const updateMutation = useUpdateMaintenance();
  const { mutateAsync: updateMaintenance } = updateMutation;
  const cancelMutation = useCancelMaintenanceTask();
  const { mutateAsync: cancelTask } = cancelMutation;

  // Defect photo data
  const { data: scanEventPhotos } = useScanEventPhotos(maintenance?.scanEventId ?? null);
  const defectPhoto = scanEventPhotos?.find((p) => p.photoType === 'damage') ?? null;
  const {
    data: defectPhotoUrl,
    isLoading: isPhotoLoading,
    error: photoError,
  } = useSignedUrl(defectPhoto?.thumbnailPath ?? defectPhoto?.storagePath ?? undefined);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  // Reset notes editing state when the modal switches to a different record.
  // Modal visible={false} keeps the tree mounted, so stale state persists otherwise.
  useEffect(() => {
    setEditingNotes(false);
    setNotes('');
  }, [maintenanceId]);

  // Sheet states
  const [alertSheet, setAlertSheet] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleComplete = useCallback(async () => {
    if (!maintenanceId) return;

    try {
      await updateMaintenanceStatus({
        id: maintenanceId,
        status: 'completed',
        ...(user?.id ? { extras: { completedBy: user.id } } : {}),
      });
    } catch (err: unknown) {
      setAlertSheet({
        visible: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to complete',
      });
    }
  }, [maintenanceId, updateMaintenanceStatus, user?.id]);

  const handleCancelMaintenance = useCallback(() => {
    if (!maintenanceId) return;
    setShowCancelConfirm(true);
  }, [maintenanceId]);

  const handleConfirmCancel = useCallback(async () => {
    if (!maintenanceId) return;

    setShowCancelConfirm(false);
    try {
      await cancelTask(maintenanceId);
      onClose();
    } catch (err: unknown) {
      setAlertSheet({
        visible: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to cancel',
      });
    }
  }, [maintenanceId, cancelTask, onClose]);

  const handleSaveNotes = useCallback(async () => {
    if (!maintenanceId) return;

    try {
      await updateMaintenance({
        id: maintenanceId,
        input: { notes },
      });
      setEditingNotes(false);
    } catch (err: unknown) {
      setAlertSheet({
        visible: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save notes',
      });
    }
  }, [maintenanceId, notes, updateMaintenance]);

  const handleEditNotes = useCallback(() => {
    setNotes(maintenance?.notes || '');
    setEditingNotes(true);
  }, [maintenance]);

  const handleNavigateToAsset = useCallback(() => {
    if (maintenance?.assetId) {
      onClose();
      router.push(`/assets/${maintenance.assetId}`);
    }
  }, [maintenance, router, onClose]);

  const renderStatusActions = () => {
    if (!maintenance) return null;

    const status = maintenance.status;

    if (canMarkMaintenance && status === 'scheduled') {
      return (
        <View style={styles.actionsContainer}>
          <Button
            color={colors.success}
            icon="checkmark"
            onPress={handleComplete}
            disabled={updateStatusMutation.isPending || cancelMutation.isPending}
            flex
          >
            Mark Complete
          </Button>
          <Button
            variant="secondary"
            onPress={handleCancelMaintenance}
            disabled={updateStatusMutation.isPending || cancelMutation.isPending}
            style={{ borderColor: colors.error }}
            flex
          >
            Cancel
          </Button>
        </View>
      );
    }

    if (status === 'completed') {
      return (
        <View style={styles.actionsContainer}>
          <View style={styles.closedStatus}>
            <Ionicons
              name={MAINTENANCE_STATUS_CONFIG[status]?.icon ?? 'construct-outline'}
              size={20}
              color={MAINTENANCE_STATUS_CONFIG[status]?.color ?? colors.textSecondary}
            />
            <Text style={styles.closedStatusText}>Completed</Text>
          </View>
        </View>
      );
    }

    return null;
  };

  if (!visible) return null;

  return (
    <SheetModal visible={visible} onClose={onClose} inline={!!inline}>
      <View style={styles.sheet}>
        {isLoading || !maintenance ? (
          <>
            <SheetHeader
              icon="construct"
              title="Maintenance"
              onClose={onClose}
              backgroundColor={colors.warning}
              disabled
            />
            <View style={styles.loadingContainer}>
              <LoadingDots color={colors.textSecondary} size={10} />
            </View>
          </>
        ) : (
          <>
            <SheetHeader
              icon="construct"
              title={maintenance.title}
              onClose={onClose}
              backgroundColor={colors.warning}
              titleNumberOfLines={2}
            />

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              bounces={true}
              showsVerticalScrollIndicator={false}
            >
              {/* Info Row: Asset Number + View Asset */}
              <View style={styles.infoRow}>
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

              {/* Status & Priority Badges */}
              <View style={styles.badgeRow}>
                <MaintenanceStatusBadge status={maintenance.status} />
                <MaintenancePriorityBadge priority={maintenance.priority} />
              </View>

              {/* Details Section */}
              <View style={styles.sectionGroup}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.sectionCard}>
                  {maintenance.description && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.detailValue}>{maintenance.description}</Text>
                    </View>
                  )}

                  {maintenance.maintenanceType && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>
                        {maintenance.maintenanceType.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  )}

                  {maintenance.scheduledDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Scheduled Date</Text>
                      <Text style={styles.detailValue}>{maintenance.scheduledDate}</Text>
                    </View>
                  )}

                  {maintenance.dueDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Due Date</Text>
                      <Text style={styles.detailValue}>{maintenance.dueDate}</Text>
                    </View>
                  )}

                  {maintenance.reporterName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Reported By</Text>
                      <Text style={styles.detailValue}>{maintenance.reporterName}</Text>
                    </View>
                  )}

                  {maintenance.assigneeName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Assigned To</Text>
                      <Text style={styles.detailValue}>{maintenance.assigneeName}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Defect Photo Section (hidden in compact mode) */}
              {variant === 'full' && defectPhoto && (
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
                        accessibilityLabel="Defect photo for this maintenance record"
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

              {/* Timestamps Section (hidden in compact mode) */}
              {variant === 'full' && (
                <View style={styles.sectionGroup}>
                  <Text style={styles.sectionTitle}>Timeline</Text>
                  <View style={styles.sectionCard}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Created</Text>
                      <Text style={styles.detailValue}>
                        {formatRelativeTime(maintenance.createdAt)}
                      </Text>
                    </View>

                    {maintenance.completedAt && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Completed</Text>
                        <Text style={styles.detailValue}>
                          {formatRelativeTime(maintenance.completedAt)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Notes Section (hidden in compact mode) */}
              {variant === 'full' && (
                <View style={styles.sectionGroup}>
                  <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Notes</Text>
                      {canMarkMaintenance &&
                        !editingNotes &&
                        maintenance.status !== 'completed' &&
                        maintenance.status !== 'cancelled' && (
                          <TouchableOpacity
                            onPress={handleEditNotes}
                            style={styles.iconButton}
                            accessibilityRole="button"
                            accessibilityLabel="Edit notes"
                            accessibilityHint="Double tap to edit maintenance notes"
                          >
                            <Ionicons name="pencil" size={18} color={colors.electricBlue} />
                          </TouchableOpacity>
                        )}
                    </View>

                    {editingNotes ? (
                      <View style={styles.notesEdit}>
                        <TextInput
                          style={styles.notesInput}
                          value={notes}
                          onChangeText={setNotes}
                          placeholder="Add notes..."
                          placeholderTextColor={colors.textSecondary}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                        />
                        <View style={styles.notesButtonRow}>
                          <TouchableOpacity
                            style={styles.notesCancel}
                            onPress={() => setEditingNotes(false)}
                          >
                            <Text style={styles.notesCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.notesSave}
                            onPress={handleSaveNotes}
                            disabled={updateMutation.isPending}
                          >
                            <Text style={styles.notesSaveText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.notesText}>{maintenance.notes || 'No notes'}</Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Status Actions pinned in footer */}
            {(() => {
              const statusActions = renderStatusActions();
              return statusActions && <SheetFooter>{statusActions}</SheetFooter>;
            })()}
          </>
        )}
      </View>

      {/* Cancel Confirmation Sheet */}
      <ConfirmSheet
        visible={showCancelConfirm}
        type="danger"
        title="Cancel Maintenance"
        message="Are you sure you want to cancel this maintenance task? This will permanently delete it and any linked defect reports."
        confirmLabel="Yes, Cancel"
        cancelLabel="No"
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
        isLoading={cancelMutation.isPending}
      />

      {/* Alert Sheet for errors */}
      <AlertSheet
        visible={alertSheet.visible}
        type="error"
        title={alertSheet.title}
        message={alertSheet.message}
        onDismiss={() => setAlertSheet((prev) => ({ ...prev, visible: false }))}
      />
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  loadingContainer: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetNumberText: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  assetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  assetLinkText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailRow: {},
  detailLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  notesText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  notesEdit: {
    marginTop: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 100,
  },
  notesButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  notesCancel: {
    height: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesCancelText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  notesSave: {
    backgroundColor: colors.electricBlue,
    paddingHorizontal: spacing.lg,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  notesSaveText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
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
    fontFamily: fonts.bold,
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
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
