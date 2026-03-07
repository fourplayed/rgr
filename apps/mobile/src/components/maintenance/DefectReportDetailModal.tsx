import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
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
import { useDefectReport, useDeleteDefectReport } from '../../hooks/useDefectData';
import { useAsset } from '../../hooks/useAssetData';
import { useMaintenance } from '../../hooks/useMaintenanceData';
import { useScanEventPhotos, useSignedUrl } from '../../hooks/usePhotos';
import { useUserPermissions } from '../../contexts/UserPermissionsContext';

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
  /** Called after the modal's dismiss animation completes. */
  onDismiss?: () => void;
  /** Render inline (no native Modal) — use when already inside a Modal. */
  inline?: boolean;
}

export function DefectReportDetailModal({
  visible,
  defectId,
  onClose,
  variant = 'full',
  onAcceptPress,
  onViewTaskPress,
  onDismiss,
  inline,
}: DefectReportDetailModalProps) {
  const router = useRouter();
  const { canMarkMaintenance } = useUserPermissions();
  const { data: defect, isLoading } = useDefectReport(defectId);
  const { data: asset } = useAsset(defect?.assetId);
  const { data: linkedMaintenance } = useMaintenance(defect?.maintenanceRecordId ?? null);
  const deleteMutation = useDeleteDefectReport();
  const { mutateAsync: deleteDefect } = deleteMutation;

  // Defect photo data
  const { data: scanEventPhotos } = useScanEventPhotos(defect?.scanEventId ?? null);
  const defectPhoto = scanEventPhotos?.find((p) => p.photoType === 'damage') ?? null;
  const {
    data: defectPhotoUrl,
    isLoading: isPhotoLoading,
    error: photoError,
  } = useSignedUrl(defectPhoto?.thumbnailPath ?? defectPhoto?.storagePath ?? undefined);

  // Dismiss flow
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);

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
    onClose();
  }, [defect, asset, onAcceptPress, onClose]);

  const handleViewLinkedTask = useCallback(() => {
    if (!defect?.maintenanceRecordId || !onViewTaskPress) return;
    onViewTaskPress(defect.maintenanceRecordId);
    onClose();
  }, [defect, onViewTaskPress, onClose]);

  const handleDismiss = useCallback(() => {
    setShowDismissConfirm(true);
  }, []);

  const handleConfirmDismiss = useCallback(async () => {
    if (!defectId) return;

    setShowDismissConfirm(false);
    try {
      await deleteDefect(defectId);
      onClose();
    } catch (err: unknown) {
      setAlertSheet({
        visible: true,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to dismiss defect',
      });
    }
  }, [defectId, deleteDefect, onClose]);

  const handleNavigateToAsset = useCallback(() => {
    if (defect?.assetId) {
      onClose();
      router.push(`/assets/${defect.assetId}`);
    }
  }, [defect, router, onClose]);

  const renderStatusActions = () => {
    if (!defect || !canMarkMaintenance) return null;

    const status = defect.status;

    if (status === 'reported') {
      return (
        <View style={styles.actionsContainer}>
          <Button
            onPress={handleAccept}
            disabled={!onAcceptPress || deleteMutation.isPending}
            flex
            icon="construct-outline"
            color={colors.warning}
          >
            Schedule Maintenance
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

  if (!visible) return null;

  return (
    <SheetModal visible={visible} onClose={onClose} onDismiss={onDismiss} inline={!!inline}>
        <View style={styles.sheet}>
          {isLoading || !defect ? (
            <>
              <SheetHeader
                icon="warning"
                title="Defect Report"
                onClose={onClose}
                backgroundColor={colors.defectYellow}
                disabled
              />
              <View style={styles.loadingContainer}>
                <LoadingDots color={colors.textSecondary} size={10} />
              </View>
            </>
          ) : (
            <>
              <SheetHeader
                icon="warning"
                title="Defect Report"
                onClose={onClose}
                backgroundColor={colors.defectYellow}
              />

              {/* Asset number + Dismiss link row */}
              <View style={styles.subHeaderRow}>
                {asset?.assetNumber ? (
                  <Text style={styles.assetNumberText}>{formatAssetNumber(asset.assetNumber)}</Text>
                ) : <View />}
                {defect.status === 'reported' && canMarkMaintenance && (
                  <TouchableOpacity
                    style={styles.dismissLink}
                    onPress={handleDismiss}
                    disabled={deleteMutation.isPending}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text style={styles.dismissLinkText}>Dismiss</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Description — pinned below header */}
              {defect.description && (
                <View style={styles.descriptionRow}>
                  <Text style={styles.detailValue}>{defect.description}</Text>
                </View>
              )}

              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                bounces={true}
                showsVerticalScrollIndicator={false}
              >
                {/* Asset Link */}
                <View style={styles.badgeRow}>
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
              </ScrollView>

              {/* Status Actions pinned in footer */}
              {(() => {
                const statusActions = renderStatusActions();
                return statusActions && (
                  <SheetFooter>
                    {statusActions}
                  </SheetFooter>
                );
              })()}
            </>
          )}
        </View>

      {/* Dismiss Confirmation */}
      <ConfirmSheet
        visible={showDismissConfirm}
        type="danger"
        title="Dismiss Defect Report"
        message="Are you sure you want to dismiss this defect report? This will permanently delete it."
        confirmLabel="Dismiss"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDismiss}
        onCancel={() => setShowDismissConfirm(false)}
        isLoading={deleteMutation.isPending}
      />

      {/* Alert Sheet */}
      <AlertSheet
        visible={alertSheet.visible}
        type="error"
        title={alertSheet.title}
        message={alertSheet.message}
        onDismiss={() => setAlertSheet(prev => ({ ...prev, visible: false }))}
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
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  assetNumberText: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
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
  sectionTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
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
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
  },
  descriptionRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  dismissLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dismissLinkText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.error,
    textTransform: 'uppercase',
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
