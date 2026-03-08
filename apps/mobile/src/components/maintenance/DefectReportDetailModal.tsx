import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { LoadingDots, AlertSheet, SheetModal } from '../common';
import { SheetHeader } from '../common/SheetHeader';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows, fontFamily as fonts } from '../../theme/spacing';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { useDefectReport, useDeleteDefectReport } from '../../hooks/useDefectData';
import { useAsset } from '../../hooks/useAssetData';
import { useMaintenance } from '../../hooks/useMaintenanceData';
import { useScanEventPhotos, useSignedUrl } from '../../hooks/usePhotos';
import { useUserPermissions } from '../../contexts/UserPermissionsContext';
import { useScatterExit } from '../../hooks/useScatterExit';

interface DefectReportDetailModalProps {
  visible: boolean;
  defectId: string | null;
  onClose: () => void;
  /** 'compact' hides timeline, defect photo, linked task, notes, and asset nav link. Default 'full'. */
  variant?: 'full' | 'compact';
  /** Called when mechanic taps Accept — parent opens CreateMaintenanceModal. */
  onAcceptPress?: (context: {
    defectId: string;
    assetId: string;
    assetNumber?: string;
    title: string;
    description?: string | null;
  }) => void;
  /** Called when user taps "View Task" on a linked maintenance record. */
  onViewTaskPress?: (maintenanceId: string) => void;
  /** Called after dismiss is confirmed, deleted, and scatter animation completes. */
  onDismissConfirmed?: (defectId: string) => void;
  /** Called after the modal's dismiss animation completes. */
  onDismiss?: () => void;
  /** Render inline (no native Modal) — use when already inside a Modal. */
  inline?: boolean;
  /** When false, skip backdrop (ModalShell provides it). */
  backdrop?: boolean;
  /** Fires after exit animation completes. */
  onExitComplete?: () => void;
}

export function DefectReportDetailModal({
  visible,
  defectId,
  onClose,
  variant = 'full',
  onAcceptPress,
  onViewTaskPress,
  onDismissConfirmed,
  onDismiss,
  inline,
  backdrop,
  onExitComplete,
}: DefectReportDetailModalProps) {
  const { canMarkMaintenance } = useUserPermissions();
  const sheetBottomPadding = useSheetBottomPadding();
  const { data: defect, isLoading } = useDefectReport(defectId);
  const { data: asset } = useAsset(defect?.assetId);
  const { data: linkedMaintenance } = useMaintenance(defect?.maintenanceRecordId ?? null);

  // Defect photo data
  const { data: scanEventPhotos } = useScanEventPhotos(defect?.scanEventId ?? null);
  const defectPhoto = scanEventPhotos?.find((p) => p.photoType === 'defect') ?? null;
  const {
    data: defectPhotoUrl,
    isLoading: isPhotoLoading,
    error: photoError,
  } = useSignedUrl(defectPhoto?.thumbnailPath ?? defectPhoto?.storagePath ?? undefined);

  // Dismiss delete mutation
  const { mutateAsync: deleteDefect } = useDeleteDefectReport();

  // Scatter exit animation
  const { getStyle, scatter, reset, isScattering } = useScatterExit();

  // Reset scatter state when modal opens
  useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  // Alert sheet
  const [alertSheet, setAlertSheet] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const handleAccept = useCallback(() => {
    if (!defect || !onAcceptPress) return;
    onAcceptPress({
      defectId: defect.id,
      assetId: defect.assetId,
      ...(asset?.assetNumber ? { assetNumber: asset.assetNumber } : {}),
      title: defect.title,
      description: defect.description,
    });
  }, [defect, asset, onAcceptPress]);

  const handleViewLinkedTask = useCallback(() => {
    if (!defect?.maintenanceRecordId || !onViewTaskPress) return;
    onViewTaskPress(defect.maintenanceRecordId);
  }, [defect, onViewTaskPress]);

  const handleDismiss = useCallback(() => {
    if (!defectId) return;
    Alert.alert(
      'Dismiss Defect Report',
      'Are you sure? This will permanently delete this defect report.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDefect(defectId);
              scatter(7, () => onDismissConfirmed?.(defectId));
            } catch (err: unknown) {
              setAlertSheet({
                visible: true,
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to dismiss defect report',
              });
            }
          },
        },
      ],
    );
  }, [defectId, deleteDefect, scatter, onDismissConfirmed]);

  const renderStatusActions = () => {
    if (!defect || !canMarkMaintenance) return null;

    const status = defect.status;

    if (status === 'reported') {
      return (
        <View style={styles.actionsContainer}>
          <Button
            variant="danger"
            onPress={handleDismiss}
            disabled={isScattering}
            flex
          >
            Dismiss
          </Button>
          <Button
            onPress={handleAccept}
            disabled={!onAcceptPress || isScattering}
            flex
            color={colors.defectYellow}
          >
            Create Task
          </Button>
        </View>
      );
    }

    if (status === 'accepted' || status === 'resolved') {
      return (
        <View style={styles.actionsContainer}>
          <View style={styles.closedStatus}>
            <Ionicons
              name={status === 'accepted' ? 'construct' : 'checkmark-circle'}
              size={20}
              color={status === 'accepted' ? colors.info : colors.success}
            />
            <Text style={styles.closedStatusText}>
              {status === 'accepted' ? 'Maintenance Task Created' : 'Resolved'}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <SheetModal visible={visible} onClose={onClose} onDismiss={onDismiss} inline={!!inline} backdrop={backdrop} onExitComplete={onExitComplete}>
      <View style={sheetLayout.containerTall}>
        <SheetHeader
          icon="warning"
          title="Defect Report"
          onClose={onClose}
          backgroundColor={colors.defectYellow}
          titleStyle={{
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        />

        {isLoading || !defect ? (
          <View style={styles.loadingContainer}>
            <LoadingDots color={colors.textSecondary} size={10} />
          </View>
        ) : (
          <ScrollView
            style={sheetLayout.scroll}
            contentContainerStyle={[sheetLayout.scrollContent, { paddingTop: spacing.lg, paddingBottom: sheetBottomPadding, gap: spacing.md }]}
            bounces={true}
            showsVerticalScrollIndicator={false}
          >
            {/* Asset info + reporter */}
            <Animated.View style={getStyle(0)}>
              {asset?.assetNumber && (
                <Text style={styles.assetNumberText}>{formatAssetNumber(asset.assetNumber)}</Text>
              )}
              {defect.reporterName && (
                <Text style={styles.reporterText}>
                  {formatRelativeTime(defect.createdAt)} by {defect.reporterName}
                </Text>
              )}
            </Animated.View>

            {/* Description */}
            {defect.description && (
              <Animated.View style={getStyle(1)}>
                <View style={styles.sectionGroup}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{defect.description}</Text>
                </View>
              </Animated.View>
            )}

            {/* Defect Photo (hidden in compact mode) */}
            {variant === 'full' && defectPhoto && (
              <Animated.View style={getStyle(2)}>
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
              </Animated.View>
            )}

            {/* Linked Maintenance Task (hidden in compact mode) */}
            {variant === 'full' && defect.maintenanceRecordId && (
              <Animated.View style={getStyle(3)}>
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
              </Animated.View>
            )}

            {/* Timeline (hidden in compact mode) */}
            {variant === 'full' && (defect.acceptedAt || defect.resolvedAt) && (
              <Animated.View style={getStyle(4)}>
                <View style={styles.sectionGroup}>
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
                </View>
              </Animated.View>
            )}

            {/* Notes (hidden in compact mode) */}
            {variant === 'full' && defect.notes && (
              <Animated.View style={getStyle(5)}>
                <View style={styles.sectionGroup}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <View style={styles.sectionCard}>
                    <Text style={styles.detailValue}>{defect.notes}</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Status Actions */}
            <Animated.View style={getStyle(6)}>
              {renderStatusActions()}
            </Animated.View>
          </ScrollView>
        )}
      </View>

      {/* Alert Sheet */}
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
  assetNumberText: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  reporterText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
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
  linkedTaskLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkedTaskLinkText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
    textTransform: 'uppercase',
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
