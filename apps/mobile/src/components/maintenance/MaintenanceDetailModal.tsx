import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { formatRelativeTime, MaintenanceStatusLabels, MaintenancePriorityLabels } from '@rgr/shared';
import type { MaintenanceStatus } from '@rgr/shared';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, fontWeight, borderRadius } from '../../theme/spacing';
import { useMaintenance, useUpdateMaintenanceStatus, useUpdateMaintenance } from '../../hooks/useMaintenanceData';
import { MaintenanceStatusBadge } from './MaintenanceStatusBadge';
import { MaintenancePriorityBadge } from './MaintenancePriorityBadge';

interface MaintenanceDetailModalProps {
  visible: boolean;
  maintenanceId: string | null;
  onClose: () => void;
}

export function MaintenanceDetailModal({
  visible,
  maintenanceId,
  onClose,
}: MaintenanceDetailModalProps) {
  const router = useRouter();
  const { data: maintenance, isLoading } = useMaintenance(maintenanceId);
  const updateStatusMutation = useUpdateMaintenanceStatus();
  const updateMutation = useUpdateMaintenance();

  const [actualCost, setActualCost] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const handleStartWork = useCallback(async () => {
    if (!maintenanceId) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: maintenanceId,
        status: 'in_progress',
      });
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start work');
    }
  }, [maintenanceId, updateStatusMutation]);

  const handleComplete = useCallback(async () => {
    if (!maintenanceId) return;

    Alert.prompt(
      'Complete Maintenance',
      'Enter actual cost (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async (cost?: string) => {
            try {
              const parsedCost = cost ? parseFloat(cost) : undefined;
              const params: { id: string; status: MaintenanceStatus; actualCost?: number } = {
                id: maintenanceId,
                status: 'completed',
              };
              if (parsedCost !== undefined) {
                params.actualCost = parsedCost;
              }
              await updateStatusMutation.mutateAsync(params);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete');
            }
          },
        },
      ],
      'plain-text',
      '',
      'decimal-pad'
    );
  }, [maintenanceId, updateStatusMutation]);

  const handleCancel = useCallback(async () => {
    if (!maintenanceId) return;

    Alert.alert(
      'Cancel Maintenance',
      'Are you sure you want to cancel this maintenance record?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateStatusMutation.mutateAsync({
                id: maintenanceId,
                status: 'cancelled',
              });
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to cancel');
            }
          },
        },
      ]
    );
  }, [maintenanceId, updateStatusMutation]);

  const handleSaveNotes = useCallback(async () => {
    if (!maintenanceId) return;

    try {
      await updateMutation.mutateAsync({
        id: maintenanceId,
        input: { notes },
      });
      setEditingNotes(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save notes');
    }
  }, [maintenanceId, notes, updateMutation]);

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

    return (
      <View style={styles.actionsContainer}>
        {status === 'scheduled' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={handleStartWork}
              disabled={updateStatusMutation.isPending}
            >
              <Ionicons name="play" size={18} color={colors.textInverse} />
              <Text style={styles.primaryButtonText}>Start Work</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleCancel}
              disabled={updateStatusMutation.isPending}
            >
              <Text style={styles.dangerButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'in_progress' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.successButton]}
              onPress={handleComplete}
              disabled={updateStatusMutation.isPending}
            >
              <Ionicons name="checkmark" size={18} color={colors.textInverse} />
              <Text style={styles.primaryButtonText}>Mark Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleCancel}
              disabled={updateStatusMutation.isPending}
            >
              <Text style={styles.dangerButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {(status === 'completed' || status === 'cancelled') && (
          <View style={styles.closedStatus}>
            <Ionicons
              name={status === 'completed' ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={status === 'completed' ? colors.success : colors.textSecondary}
            />
            <Text style={styles.closedStatusText}>
              {status === 'completed' ? 'Completed' : 'Cancelled'}
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

          {isLoading || !maintenance ? (
            <View style={styles.loadingContainer}>
              <LoadingDots color={colors.electricBlue} size={10} />
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.content}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{maintenance.title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Badges */}
              <View style={styles.badgeRow}>
                <MaintenanceStatusBadge status={maintenance.status} />
                <MaintenancePriorityBadge priority={maintenance.priority} />
              </View>

              {/* Asset Link */}
              <TouchableOpacity
                style={styles.assetLink}
                onPress={handleNavigateToAsset}
                activeOpacity={0.7}
              >
                <Ionicons name="cube-outline" size={18} color={colors.electricBlue} />
                <Text style={styles.assetLinkText}>
                  View Asset
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.electricBlue} />
              </TouchableOpacity>

              {/* Details Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Details</Text>

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

              {/* Timestamps Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Timeline</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created</Text>
                  <Text style={styles.detailValue}>
                    {formatRelativeTime(maintenance.createdAt)}
                  </Text>
                </View>

                {maintenance.startedAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Started</Text>
                    <Text style={styles.detailValue}>
                      {formatRelativeTime(maintenance.startedAt)}
                    </Text>
                  </View>
                )}

                {maintenance.completedAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Completed</Text>
                    <Text style={styles.detailValue}>
                      {formatRelativeTime(maintenance.completedAt)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Cost Section */}
              {(maintenance.estimatedCost || maintenance.actualCost) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Cost</Text>

                  {maintenance.estimatedCost && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Estimated</Text>
                      <Text style={styles.detailValue}>
                        ${maintenance.estimatedCost.toFixed(2)}
                      </Text>
                    </View>
                  )}

                  {maintenance.actualCost && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Actual</Text>
                      <Text style={styles.detailValue}>
                        ${maintenance.actualCost.toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Notes Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  {!editingNotes && maintenance.status !== 'completed' && maintenance.status !== 'cancelled' && (
                    <TouchableOpacity onPress={handleEditNotes}>
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
                  <Text style={styles.notesText}>
                    {maintenance.notes || 'No notes'}
                  </Text>
                )}
              </View>

              {/* Status Actions */}
              {renderStatusActions()}
            </ScrollView>
          )}
        </View>
      </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  closeButton: {
    padding: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  assetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  assetLinkText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    textTransform: 'uppercase',
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontFamily: 'Lato_700Bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  detailRow: {
    marginBottom: spacing.sm,
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
    fontFamily: 'Lato_400Regular',
    color: colors.text,
  },
  notesText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
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
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    minHeight: 100,
  },
  notesButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  notesCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notesCancelText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textSecondary,
  },
  notesSave: {
    backgroundColor: colors.electricBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  notesSaveText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
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
    paddingVertical: spacing.base,
    borderRadius: borderRadius.md,
  },
  primaryButton: {
    backgroundColor: colors.electricBlue,
  },
  successButton: {
    backgroundColor: colors.success,
  },
  dangerButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
  },
  primaryButtonText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  dangerButtonText: {
    fontSize: fontSize.base,
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
});
