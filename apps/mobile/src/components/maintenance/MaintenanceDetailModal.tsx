import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Animated, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { LoadingDots, AlertSheet, SheetModal } from '../common';
import { IconCircle } from '../common/IconCircle';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
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
import { useScatterExit } from '../../hooks/useScatterExit';
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
  /** When false, skip backdrop (ModalShell provides it). */
  backdrop?: boolean;
  /** Fires after exit animation completes. */
  onExitComplete?: () => void;
}

export function MaintenanceDetailModal({
  visible,
  maintenanceId,
  onClose,
  variant = 'full',
  inline,
  backdrop,
  onExitComplete,
}: MaintenanceDetailModalProps) {
  const router = useRouter();
  const { canMarkMaintenance } = useUserPermissions();
  const sheetBottomPadding = useSheetBottomPadding();
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

  // Scatter exit animation
  const { getStyle, scatter, reset: resetScatter, isScattering } = useScatterExit();

  useEffect(() => {
    if (visible) resetScatter();
  }, [visible, resetScatter]);

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
    Alert.alert(
      'Cancel Maintenance',
      'Are you sure you want to cancel this maintenance task? This will permanently delete it and any linked defect reports.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelTask(maintenanceId);
              scatter(7, () => onClose());
            } catch (err: unknown) {
              setAlertSheet({
                visible: true,
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to cancel',
              });
            }
          },
        },
      ],
    );
  }, [maintenanceId, cancelTask, onClose, scatter]);

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
            disabled={updateStatusMutation.isPending || cancelMutation.isPending || isScattering}
            flex
          >
            Mark Complete
          </Button>
          <Button
            variant="secondary"
            onPress={handleCancelMaintenance}
            disabled={updateStatusMutation.isPending || cancelMutation.isPending || isScattering}
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

  return (
    <SheetModal visible={visible} onClose={onClose} inline={!!inline} backdrop={backdrop} onExitComplete={onExitComplete}>
      <View style={styles.container}>
        <View style={styles.handle} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        {isLoading || !maintenance ? (
          <>
            <View style={styles.headerContent}>
              <IconCircle icon="construct" color={colors.warning} />
              <Text style={styles.headerTitle}>Maintenance</Text>
            </View>
            <View style={styles.loadingContainer}>
              <LoadingDots color={colors.textSecondary} size={10} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.headerContent}>
              <IconCircle icon="construct" color={colors.warning} />
              <Text style={styles.headerTitle} numberOfLines={2}>{maintenance.title}</Text>
            </View>

            <ScrollView
              style={sheetLayout.scroll}
              contentContainerStyle={[sheetLayout.scrollContent, { paddingTop: spacing.base, paddingBottom: sheetBottomPadding, gap: spacing.md }]}
              bounces={true}
              showsVerticalScrollIndicator={false}
            >
              {/* Info Row: Asset Number + View Asset */}
              <Animated.View style={getStyle(0)}>
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
              </Animated.View>

              {/* Status & Priority Badges */}
              <Animated.View style={getStyle(1)}>
                <View style={styles.badgeRow}>
                  <MaintenanceStatusBadge status={maintenance.status} />
                  <MaintenancePriorityBadge priority={maintenance.priority} />
                </View>
              </Animated.View>

              {/* Details Section */}
              <Animated.View style={getStyle(2)}>
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
              </Animated.View>

              {/* Defect Photo Section (hidden in compact mode) */}
              {variant === 'full' && defectPhoto && (
                <Animated.View style={getStyle(3)}>
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
                </Animated.View>
              )}

              {/* Timestamps Section (hidden in compact mode) */}
              {variant === 'full' && (
                <Animated.View style={getStyle(4)}>
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
                </Animated.View>
              )}

              {/* Notes Section (hidden in compact mode) */}
              {variant === 'full' && (
                <Animated.View style={getStyle(5)}>
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
                </Animated.View>
              )}
              {/* Status Actions */}
              <Animated.View style={getStyle(6)}>
                {renderStatusActions()}
              </Animated.View>
            </ScrollView>
          </>
        )}
      </View>

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
  container: {
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
    marginBottom: spacing.sm,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize['2xl'],
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  loadingContainer: {
    padding: spacing['3xl'],
    alignItems: 'center',
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
    marginTop: spacing.lg,
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
