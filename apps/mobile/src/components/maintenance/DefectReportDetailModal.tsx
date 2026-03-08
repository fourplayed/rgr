import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { LoadingDots, AlertSheet, SheetModal } from '../common';
import { IconCircle } from '../common/IconCircle';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows, fontFamily as fonts } from '../../theme/spacing';
import { sheetLayout } from '../../theme/sheetLayout';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { useDefectReport } from '../../hooks/useDefectData';
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
  /** Called when user taps Dismiss — parent handles confirmation flow. */
  onDismissPress?: (defectId: string) => void;
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
  onDismissPress,
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
  const defectPhoto = scanEventPhotos?.find((p) => p.photoType === 'damage') ?? null;
  const {
    data: defectPhotoUrl,
    isLoading: isPhotoLoading,
    error: photoError,
  } = useSignedUrl(defectPhoto?.thumbnailPath ?? defectPhoto?.storagePath ?? undefined);

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
    if (!defectId || !onDismissPress) return;
    onDismissPress(defectId);
  }, [defectId, onDismissPress]);

  const renderStatusActions = () => {
    if (!defect || !canMarkMaintenance) return null;

    const status = defect.status;

    if (status === 'reported') {
      return (
        <View style={styles.actionsContainer}>
          <Button
            onPress={handleAccept}
            disabled={!onAcceptPress}
            flex
            color={colors.defectYellow}
          >
            Create Task
          </Button>
          <Button
            variant="secondary"
            onPress={handleDismiss}
            disabled={!onDismissPress}
            flex
            textColor={colors.error}
            style={{ borderColor: colors.error, backgroundColor: colors.error + '15', ...shadows.md }}
          >
            Dismiss
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
        <View style={styles.headerContent}>
          <IconCircle icon="warning" color={colors.defectYellow} />
          <Text style={styles.headerTitle}>
            Defect Report{asset?.assetNumber ? `: ${formatAssetNumber(asset.assetNumber)}` : ''}
          </Text>
          {!isLoading && defect && (
            <Text style={styles.headerSubtitle}>
              {formatRelativeTime(defect.createdAt)}{defect.reporterName ? ` by ${defect.reporterName}` : ''}
            </Text>
          )}
        </View>

        {isLoading || !defect ? (
          <>
            <View style={styles.loadingContainer}>
              <LoadingDots color={colors.textSecondary} size={10} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.divider} />

            {defect.description && (
              <View style={styles.infoRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{defect.description}</Text>
              </View>
            )}

            <ScrollView
              style={sheetLayout.scroll}
              contentContainerStyle={[sheetLayout.scrollContent, { paddingTop: spacing.base, paddingBottom: sheetBottomPadding, gap: spacing.md }]}
              bounces={true}
              showsVerticalScrollIndicator={false}
            >
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
              {variant === 'full' && (defect.acceptedAt || defect.resolvedAt) && (
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
  headerSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: spacing['3xl'],
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  infoRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
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
