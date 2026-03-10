import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { MaintenancePriority, UpdateMaintenanceInput } from '@rgr/shared';
import { formatRelativeTime, formatAssetNumber, MaintenancePriorityLabels } from '@rgr/shared';
import { LoadingDots, AlertSheet, SheetModal } from '../common';
import { SheetHeader } from '../common/SheetHeader';
import { Button } from '../common/Button';
import { FilterChip } from '../common/FilterChip';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
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
  const defectPhoto = scanEventPhotos?.find((p) => p.photoType === 'defect') ?? null;
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

  // ── Edit mode state ──
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<MaintenancePriority>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const canEdit = canMarkMaintenance && maintenance?.status === 'scheduled';

  // Reset all editing state when the modal switches to a different record or closes.
  useEffect(() => {
    setEditingNotes(false);
    setNotes('');
    setIsEditing(false);
    setShowDatePicker(false);
  }, [maintenanceId, visible]);

  const handleEnterEditMode = useCallback(() => {
    if (!maintenance) return;
    setEditTitle(maintenance.title);
    setEditDescription(maintenance.description ?? '');
    setEditPriority(maintenance.priority);
    setEditDueDate(maintenance.dueDate ?? '');
    setShowDatePicker(false);
    setIsEditing(true);
  }, [maintenance]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setShowDatePicker(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!maintenanceId || !maintenance) return;

    // Only send changed fields
    const input: UpdateMaintenanceInput = {};
    if (editTitle !== maintenance.title) input['title'] = editTitle;
    if (editDescription !== (maintenance.description ?? '')) {
      input['description'] = editDescription || null;
    }
    if (editPriority !== maintenance.priority) input['priority'] = editPriority;
    if (editDueDate !== (maintenance.dueDate ?? '')) {
      input['dueDate'] = editDueDate || null;
    }

    // Nothing changed — just exit
    if (Object.keys(input).length === 0) {
      setIsEditing(false);
      setShowDatePicker(false);
      return;
    }

    try {
      await updateMaintenance({ id: maintenanceId, input });
      setIsEditing(false);
      setShowDatePicker(false);
    } catch (err: unknown) {
      setAlertSheet({
        visible: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to save changes',
      });
    }
  }, [
    maintenanceId,
    maintenance,
    editTitle,
    editDescription,
    editPriority,
    editDueDate,
    updateMaintenance,
  ]);

  const handleDateChange = useCallback((_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) {
      setEditDueDate(selectedDate.toISOString().slice(0, 10));
    }
  }, []);

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
            Cancel
          </Button>
          <Button
            color={colors.success}
            icon="checkmark"
            onPress={handleComplete}
            disabled={updateStatusMutation.isPending || cancelMutation.isPending || isScattering}
            flex
          >
            Complete Task
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
            <Text style={styles.closedStatusText}>Completed</Text>
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
          <Text style={formStyles.label}>Title</Text>
          <BottomSheetTextInput
            style={formStyles.input}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Task title"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="sentences"
            maxLength={200}
            accessibilityLabel="Maintenance title"
          />
        </View>
      );
    }

    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Title</Text>
        <Text style={styles.detailValue}>{maintenance.title}</Text>
      </View>
    );
  };

  const renderDescriptionSection = () => {
    if (!maintenance) return null;

    if (isEditing) {
      return (
        <View style={formStyles.inputGroup}>
          <Text style={formStyles.label}>Description</Text>
          <BottomSheetTextInput
            style={[formStyles.input, formStyles.textArea]}
            value={editDescription}
            onChangeText={setEditDescription}
            placeholder="Describe the maintenance work needed"
            placeholderTextColor={colors.textSecondary}
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
        <Text style={styles.detailLabel}>Description</Text>
        <Text style={styles.detailValue}>{maintenance.description}</Text>
      </View>
    );
  };

  const renderPrioritySection = () => {
    if (!maintenance) return null;

    if (isEditing) {
      return (
        <View style={formStyles.inputGroup}>
          <Text style={formStyles.label}>Priority</Text>
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
          <Text style={formStyles.label}>Due Date</Text>
          <Pressable
            style={styles.dateField}
            onPress={() => setShowDatePicker((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Select due date"
          >
            <Ionicons
              name="calendar-outline"
              size={18}
              color={editDueDate ? colors.text : colors.textSecondary}
            />
            <Text style={[styles.dateFieldText, !editDueDate && styles.dateFieldPlaceholder]}>
              {editDueDate
                ? new Date(editDueDate + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Tap to select date'}
            </Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={editDueDate ? new Date(editDueDate + 'T00:00:00') : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={handleDateChange}
              accentColor={colors.primary}
            />
          )}
        </View>
      );
    }

    if (!maintenance.dueDate) return null;

    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Due Date</Text>
        <Text style={styles.detailValue}>{maintenance.dueDate}</Text>
      </View>
    );
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      onExitComplete={onExitComplete}
      noBackdrop={noBackdrop}
      keyboardAware={isEditing}
    >
      <View style={sheetLayout.containerTall}>
        <SheetHeader
          icon="construct"
          title="Maintenance Task"
          onClose={onClose}
          backgroundColor={colors.warning}
          headerAction={headerAction}
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
            {/* Info Row: Asset Number + View Asset */}
            <Animated.View style={getStyle(0)}>
              <View style={styles.infoRow}>
                {asset?.assetNumber && (
                  <Text style={styles.assetNumberText}>{formatAssetNumber(asset.assetNumber)}</Text>
                )}
                {variant === 'full' && !isEditing && (
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

            {/* Status & Priority Badges (hidden in edit mode) */}
            {!isEditing && (
              <Animated.View style={getStyle(1)}>
                <View style={styles.badgeRow}>
                  <MaintenanceStatusBadge status={maintenance.status} />
                  <MaintenancePriorityBadge priority={maintenance.priority} />
                </View>
              </Animated.View>
            )}

            {/* Details Section */}
            <Animated.View style={getStyle(2)}>
              {isEditing ? (
                <View style={styles.sectionGroup}>
                  <Text style={styles.sectionTitle}>Edit Details</Text>
                  <View style={styles.sectionCard}>
                    {renderTitleSection()}
                    {renderDescriptionSection()}
                    {renderPrioritySection()}
                    {renderDueDateSection()}
                  </View>
                </View>
              ) : (
                <View style={styles.sectionGroup}>
                  <Text style={styles.sectionTitle}>Details</Text>
                  <View style={styles.sectionCard}>
                    {renderTitleSection()}
                    {renderDescriptionSection()}

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

                    {renderDueDateSection()}

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
              )}
            </Animated.View>

            {/* Defect Photo Section (hidden in compact mode and edit mode) */}
            {variant === 'full' && defectPhoto && !isEditing && (
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

            {/* Timestamps Section (hidden in compact mode and edit mode) */}
            {variant === 'full' && !isEditing && (
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

            {/* Notes Section (hidden in compact mode and edit mode) */}
            {variant === 'full' && !isEditing && (
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
                        <BottomSheetTextInput
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
                          <Button variant="secondary" onPress={() => setEditingNotes(false)}>
                            Cancel
                          </Button>
                          <Button
                            onPress={handleSaveNotes}
                            disabled={updateMutation.isPending}
                            isLoading={updateMutation.isPending}
                          >
                            Save
                          </Button>
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
            <Animated.View style={getStyle(6)}>{renderStatusActions()}</Animated.View>
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
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailRow: {},
  detailLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
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
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
  },
  dateFieldText: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  dateFieldPlaceholder: {
    color: colors.textSecondary,
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
