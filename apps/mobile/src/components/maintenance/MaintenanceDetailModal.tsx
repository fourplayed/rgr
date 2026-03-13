import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { BottomSheetScrollView } from '../common/SheetModal';
import { AppTextInput } from '../common/AppTextInput';
import { DatePickerField } from '../common/DatePickerField';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { MaintenancePriority, UpdateMaintenanceInput } from '@rgr/shared';
import {
  formatRelativeTime,
  formatAssetNumber,
  formatDate,
  MaintenancePriorityLabels,
} from '@rgr/shared';
import { AppText, LoadingDots, AlertSheet, SheetModal } from '../common';
import { SheetHeader } from '../common/SheetHeader';
import { Button } from '../common/Button';
import { FilterChip } from '../common/FilterChip';
import { colors } from '../../theme/colors';
import {
  spacing,
  fontSize,
  borderRadius,
  fontFamily as fonts,
  shadows,
  lineHeight,
} from '../../theme/spacing';
import { formStyles } from '../../theme/formStyles';
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
import { useStaggeredEntrances } from '../../hooks/useStaggeredEntrance';
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge';
import { MaintenancePriorityBadge } from './MaintenancePriorityBadge';
import { MAINTENANCE_STATUS_CONFIG } from './MaintenanceListItem';

const PRIORITY_ORDER: MaintenancePriority[] = ['low', 'medium', 'critical'];

interface MaintenanceDetailModalProps {
  visible: boolean;
  maintenanceId: string | null;
  onClose: () => void;
  /** 'compact' hides timeline, notes, defect photo, and asset nav link. Default 'full'. */
  variant?: 'full' | 'compact';
  /** Render without backdrop (parent provides persistent backdrop for chaining). */
  noBackdrop?: boolean;
  /** Fires after exit animation completes. */
  onExitComplete?: () => void;
}

export function MaintenanceDetailModal({
  visible,
  maintenanceId,
  onClose,
  variant = 'full',
  noBackdrop,
  onExitComplete,
}: MaintenanceDetailModalProps) {
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
  const defectPhoto = scanEventPhotos?.find((p) => p.photoType === 'defect') ?? null;
  const {
    data: defectPhotoUrl,
    isLoading: isPhotoLoading,
    error: photoError,
  } = useSignedUrl(defectPhoto?.thumbnailPath ?? defectPhoto?.storagePath ?? undefined);

  // Scatter exit animation
  const { getStyle, scatter, reset: resetScatter, isScattering } = useScatterExit();

  const { getEntryStyle } = useStaggeredEntrances(!isLoading && !!maintenance ? 7 : 0);

  // Compose scatter-exit (opacity + translateX) with entrance (opacity) via multiply
  const getAnimatedStyle = (index: number) => ({
    opacity: Animated.multiply(getStyle(index).opacity, getEntryStyle(index).opacity),
    transform: getStyle(index).transform,
  });

  useEffect(() => {
    if (visible) resetScatter();
  }, [visible, resetScatter]);

  const [editingNotes, setEditingNotes] = useState(false);
  const notesRef = useRef('');

  // ── Edit mode state ──
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const editDescriptionRef = useRef('');
  const [editPriority, setEditPriority] = useState<MaintenancePriority>('medium');
  const [editDueDate, setEditDueDate] = useState('');

  const canEdit = canMarkMaintenance && maintenance?.status === 'scheduled';

  // Reset all editing state when the modal switches to a different record or closes.
  useEffect(() => {
    setEditingNotes(false);
    setIsEditing(false);
  }, [maintenanceId, visible]);

  const handleEnterEditMode = useCallback(() => {
    if (!maintenance) return;
    setEditTitle(maintenance.title);
    editDescriptionRef.current = maintenance.description ?? '';
    setEditPriority(maintenance.priority);
    setEditDueDate(maintenance.dueDate ?? '');
    setIsEditing(true);
  }, [maintenance]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!maintenanceId || !maintenance) return;

    // Only send changed fields
    const input: UpdateMaintenanceInput = {};
    if (editTitle !== maintenance.title) input['title'] = editTitle;
    if (editDescriptionRef.current !== (maintenance.description ?? '')) {
      input['description'] = editDescriptionRef.current || null;
    }
    if (editPriority !== maintenance.priority) input['priority'] = editPriority;
    if (editDueDate !== (maintenance.dueDate ?? '')) {
      input['dueDate'] = editDueDate || null;
    }

    // Nothing changed — just exit
    if (Object.keys(input).length === 0) {
      setIsEditing(false);
      return;
    }

    try {
      await updateMaintenance({ id: maintenanceId, input });
      setIsEditing(false);
    } catch (err: unknown) {
      setAlertSheet({
        visible: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save changes',
      });
    }
  }, [maintenanceId, maintenance, editTitle, editPriority, editDueDate, updateMaintenance]);

  // Header action: pencil → enter edit mode (only for scheduled tasks by permitted users)
  const headerAction = useMemo(() => {
    if (!canEdit || isEditing) return undefined;
    return {
      icon: 'pencil' as const,
      onPress: handleEnterEditMode,
      accessibilityLabel: 'Edit maintenance task',
    };
  }, [canEdit, isEditing, handleEnterEditMode]);

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
      ]
    );
  }, [maintenanceId, cancelTask, onClose, scatter]);

  const handleSaveNotes = useCallback(async () => {
    if (!maintenanceId) return;

    try {
      await updateMaintenance({
        id: maintenanceId,
        input: { notes: notesRef.current },
      });
      setEditingNotes(false);
    } catch (err: unknown) {
      setAlertSheet({
        visible: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save notes',
      });
    }
  }, [maintenanceId, updateMaintenance]);

  const handleEditNotes = useCallback(() => {
    notesRef.current = maintenance?.notes || '';
    setEditingNotes(true);
  }, [maintenance]);

  const renderStatusActions = () => {
    if (!maintenance) return null;

    // In edit mode, show Save/Cancel instead of normal actions
    if (isEditing) {
      return (
        <View style={styles.actionsContainer}>
          <Button
            variant="secondary"
            onPress={handleCancelEdit}
            disabled={updateMutation.isPending}
            flex
          >
            Cancel
          </Button>
          <Button
            color={colors.success}
            icon="checkmark"
            onPress={handleSaveEdit}
            disabled={updateMutation.isPending}
            isLoading={updateMutation.isPending}
            flex
            style={styles.ctaButton}
          >
            Save
          </Button>
        </View>
      );
    }

    const status = maintenance.status;

    if (canMarkMaintenance && status === 'scheduled') {
      return (
        <View style={styles.actionsContainer}>
          <Button
            variant="danger"
            onPress={handleCancelMaintenance}
            disabled={updateStatusMutation.isPending || cancelMutation.isPending || isScattering}
            flex
          >
            Dismiss
          </Button>
          <Button
            color={colors.success}
            onPress={handleComplete}
            disabled={updateStatusMutation.isPending || cancelMutation.isPending || isScattering}
            flex
            style={styles.ctaButton}
          >
            Complete
          </Button>
        </View>
      );
    }

    if (status === 'completed') {
      return (
        <View style={styles.actionsContainer}>
          <View style={styles.closedStatus}>
            <Ionicons
              name={MAINTENANCE_STATUS_CONFIG[status]?.icon ?? 'construct'}
              size={20}
              color={MAINTENANCE_STATUS_CONFIG[status]?.color ?? colors.textSecondary}
            />
            <AppText style={styles.closedStatusText}>Completed</AppText>
          </View>
        </View>
      );
    }

    return null;
  };

  // ── Render helpers for detail fields (read-only vs. edit) ──

  const renderTitleSection = () => {
    if (!maintenance) return null;

    if (isEditing) {
      return (
        <View style={formStyles.inputGroup}>
          <AppText style={formStyles.label}>Title</AppText>
          <AppTextInput
            style={formStyles.input}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Task title"
            autoCapitalize="sentences"
            maxLength={200}
            accessibilityLabel="Maintenance title"
          />
        </View>
      );
    }

    return (
      <View style={styles.detailRow}>
        <AppText style={styles.detailLabel}>Title</AppText>
        <AppText style={styles.detailValue}>{maintenance.title}</AppText>
      </View>
    );
  };

  const renderDescriptionSection = () => {
    if (!maintenance) return null;

    if (isEditing) {
      return (
        <View style={formStyles.inputGroup}>
          <AppText style={formStyles.label}>Description</AppText>
          <AppTextInput
            style={[formStyles.input, formStyles.textArea]}
            defaultValue={editDescriptionRef.current}
            onChangeText={(text) => {
              editDescriptionRef.current = text;
            }}
            placeholder="Describe the maintenance work needed"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Maintenance description"
          />
        </View>
      );
    }

    if (!maintenance.description) return null;

    return (
      <View style={styles.detailRow}>
        <AppText style={styles.detailLabel}>Description</AppText>
        <AppText style={styles.detailValue}>{maintenance.description}</AppText>
      </View>
    );
  };

  const renderPrioritySection = () => {
    if (!maintenance) return null;

    if (isEditing) {
      return (
        <View style={formStyles.inputGroup}>
          <AppText style={formStyles.label}>Priority</AppText>
          <View style={styles.chipContainer}>
            {PRIORITY_ORDER.map((p) => (
              <FilterChip
                key={p}
                label={MaintenancePriorityLabels[p]}
                isSelected={editPriority === p}
                onPress={() => setEditPriority(p)}
                selectedColor={colors.maintenancePriority[p]}
              />
            ))}
          </View>
        </View>
      );
    }

    return null; // Priority is shown via badge row in read-only mode
  };

  const renderDueDateSection = () => {
    if (!maintenance) return null;

    if (isEditing) {
      return (
        <View style={formStyles.inputGroup}>
          <AppText style={formStyles.label}>Due Date</AppText>
          {/* Allow past dates: overdue tasks need date re-selection */}
          <DatePickerField value={editDueDate} onChange={setEditDueDate} />
        </View>
      );
    }

    if (!maintenance.dueDate) return null;

    return (
      <View style={styles.detailRow}>
        <AppText style={styles.detailLabel}>Due Date</AppText>
        <AppText style={styles.detailValue}>{formatDate(maintenance.dueDate)}</AppText>
      </View>
    );
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      onExitComplete={onExitComplete}
      noBackdrop={noBackdrop}
      keyboardAware={isEditing || editingNotes}
      snapPoint={editingNotes || isEditing ? '80%' : ['60%', '85%']}
    >
      <View style={sheetLayout.container}>
        <SheetHeader
          icon="construct"
          title="Scheduled Task"
          onClose={onClose}
          backgroundColor={colors.maintenanceStatus.scheduled}
          headerAction={headerAction}
          titleStyle={{
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        />

        {isLoading || !maintenance ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.textSecondary} size={10} />
          </View>
        ) : (
          <BottomSheetScrollView
            style={sheetLayout.scroll}
            contentContainerStyle={[
              sheetLayout.scrollContent,
              { paddingTop: spacing.lg, paddingBottom: sheetBottomPadding, gap: spacing.md },
            ]}
            bounces={true}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps={isEditing ? 'handled' : undefined}
          >
            {/* Info Row: Asset Number + Badges */}
            <Animated.View style={getAnimatedStyle(0)}>
              <View style={styles.infoRow}>
                <View>
                  <View style={styles.assetIdGroup}>
                    {asset?.assetNumber && (
                      <>
                        <Ionicons name="cube" size={22} color={colors.text} />
                        <AppText style={styles.assetNumberText}>
                          {formatAssetNumber(asset.assetNumber)}
                        </AppText>
                      </>
                    )}
                  </View>
                  {maintenance.reporterName && (
                    <AppText style={styles.createdByText} numberOfLines={1}>
                      {formatRelativeTime(maintenance.createdAt)} by {maintenance.reporterName}
                    </AppText>
                  )}
                </View>
                {!isEditing && (
                  <View style={styles.badgeRow}>
                    <View style={styles.badgeWrap}>
                      <MaintenanceStatusBadge status={maintenance.status} />
                    </View>
                    <View style={styles.badgeWrap}>
                      <MaintenancePriorityBadge priority={maintenance.priority} />
                    </View>
                  </View>
                )}
              </View>
            </Animated.View>

            <View style={styles.divider} />

            {/* Details */}
            {isEditing ? (
              <Animated.View style={getAnimatedStyle(2)}>
                <View style={styles.sectionGroup}>
                  <AppText style={styles.sectionTitle}>Edit Details</AppText>
                  <View style={styles.sectionCard}>
                    {renderTitleSection()}
                    {renderDescriptionSection()}
                    {renderPrioritySection()}
                    {renderDueDateSection()}
                  </View>
                </View>
              </Animated.View>
            ) : (
              <>
                <Animated.View style={getAnimatedStyle(1)}>
                  <View style={styles.titleDueRow}>
                    {renderTitleSection()}
                    {renderDueDateSection()}
                  </View>
                </Animated.View>
                <Animated.View style={getAnimatedStyle(2)}>
                  {renderDescriptionSection()}
                </Animated.View>

                {maintenance.maintenanceType && (
                  <Animated.View style={getAnimatedStyle(2)}>
                    <View style={styles.detailRow}>
                      <AppText style={styles.detailLabel}>Type</AppText>
                      <AppText style={styles.detailValue}>
                        {maintenance.maintenanceType.replace(/_/g, ' ')}
                      </AppText>
                    </View>
                  </Animated.View>
                )}

                {maintenance.scheduledDate && (
                  <Animated.View style={getAnimatedStyle(2)}>
                    <View style={styles.detailRow}>
                      <AppText style={styles.detailLabel}>Scheduled Date</AppText>
                      <AppText style={styles.detailValue}>
                        {formatDate(maintenance.scheduledDate)}
                      </AppText>
                    </View>
                  </Animated.View>
                )}

                {maintenance.assigneeName && (
                  <Animated.View style={getAnimatedStyle(3)}>
                    <View style={styles.detailRow}>
                      <AppText style={styles.detailLabel}>Assigned To</AppText>
                      <AppText style={styles.detailValue}>{maintenance.assigneeName}</AppText>
                    </View>
                  </Animated.View>
                )}
              </>
            )}

            {/* Defect Photo Section (hidden in compact mode and edit mode) */}
            {variant === 'full' && defectPhoto && !isEditing && (
              <Animated.View style={getAnimatedStyle(3)}>
                <View style={styles.sectionGroup}>
                  <AppText style={styles.sectionTitle}>Defect Photo</AppText>
                  <View style={styles.sectionCard}>
                    {isPhotoLoading ? (
                      <View style={styles.defectPhotoPlaceholder}>
                        <LoadingDots color={colors.textSecondary} size={8} />
                      </View>
                    ) : photoError || !defectPhotoUrl ? (
                      <View style={styles.defectPhotoPlaceholder}>
                        <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
                        <AppText style={styles.defectPhotoErrorText}>Photo unavailable</AppText>
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

            {/* Notes Section (hidden in compact mode and edit mode) */}
            {variant === 'full' && !isEditing && (
              <Animated.View style={getAnimatedStyle(5)}>
                <View style={styles.sectionGroup}>
                  <View style={styles.notesHeader}>
                    <AppText style={styles.sectionTitle}>Notes</AppText>
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
                          <Ionicons name="pencil" size={16} color={colors.electricBlue} />
                        </TouchableOpacity>
                      )}
                  </View>
                  <View style={[styles.sectionCard, editingNotes && styles.notesCardEditing]}>
                    {editingNotes ? (
                      <>
                        <AppTextInput
                          style={styles.notesInput}
                          defaultValue={notesRef.current}
                          onChangeText={(text) => {
                            notesRef.current = text;
                          }}
                          placeholder="Add notes..."
                          placeholderTextColor={colors.textDisabled}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                        />
                        <View style={styles.notesButtonRow}>
                          <Button variant="secondary" onPress={() => setEditingNotes(false)}>
                            Cancel
                          </Button>
                          <Button
                            color={colors.electricBlue}
                            onPress={handleSaveNotes}
                            disabled={updateMutation.isPending}
                            isLoading={updateMutation.isPending}
                          >
                            Save
                          </Button>
                        </View>
                      </>
                    ) : (
                      <AppText style={styles.notesText}>
                        {maintenance.notes || 'No notes yet'}
                      </AppText>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}
            {/* Status Actions */}
            <Animated.View style={getAnimatedStyle(6)}>{renderStatusActions()}</Animated.View>
          </BottomSheetScrollView>
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
    alignItems: 'flex-end',
    gap: spacing.xs,
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
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notesText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: lineHeight.body,
  },
  notesCardEditing: {
    borderColor: colors.electricBlue,
    borderLeftWidth: 3,
    backgroundColor: 'rgba(0, 168, 255, 0.03)',
  },
  notesInput: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.text,
    minHeight: 96,
    padding: 0,
  },
  notesButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
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
  ctaButton: {
    ...shadows.lg,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  titleDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  createdByText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  badgeWrap: {
    alignSelf: 'flex-end',
  },
  assetIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
