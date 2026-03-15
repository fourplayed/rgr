import React, { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { BottomSheetScrollView } from '../common/SheetModal';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { formatRelativeTime, formatAssetNumber } from '@rgr/shared';
import { AppText, LoadingDots, AlertSheet, SheetModal } from '../common';
import { SheetHeader } from '../common/SheetHeader';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import {
  spacing,
  fontSize,
  borderRadius,
  fontFamily as fonts,
  shadows,
  lineHeight,
} from '../../theme/spacing';
import { sheetLayout } from '../../theme/sheetLayout';
import { SheetFooter } from '../common/SheetFooter';
import { useDefectReport, useDeleteDefectReport } from '../../hooks/useDefectData';
import { useAsset } from '../../hooks/useAssetData';
import { useMaintenance } from '../../hooks/useMaintenanceData';
import { useScanEventPhotos, useSignedUrl } from '../../hooks/usePhotos';
import { useUserPermissions } from '../../contexts/UserPermissionsContext';
import { useScatterExit } from '../../hooks/useScatterExit';
import { useStaggeredEntrances } from '../../hooks/useStaggeredEntrance';
import { DefectStatusBadge, DEFECT_STATUS_CONFIG } from './DefectStatusBadge';

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
    assetNumber: string | null;
    title: string;
    description: string | null;
  }) => void;
  /** Called when user taps "View Task" on a linked maintenance record. */
  onViewTaskPress?: (maintenanceId: string) => void;
  /** Called after dismiss is confirmed, deleted, and scatter animation completes. */
  onDismissConfirmed?: (defectId: string) => void;
  /** Render without backdrop (parent provides persistent backdrop for chaining). */
  noBackdrop?: boolean;
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
  noBackdrop,
  onExitComplete,
}: DefectReportDetailModalProps) {
  const { canMarkMaintenance } = useUserPermissions();
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

  // Scatter exit animation
  const { scatter, getStyle, reset, isScattering } = useScatterExit();

  // Staggered entrance animation
  const { getEntryStyle } = useStaggeredEntrances(!isLoading && !!defect ? 7 : 0);

  // Compose scatter-exit opacity with entrance opacity via multiply
  const getAnimatedStyle = (index: number) => ({
    opacity: Animated.multiply(getStyle(index).opacity, getEntryStyle(index).opacity),
    transform: [...(getEntryStyle(index).transform ?? []), ...getStyle(index).transform],
  });

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
      assetNumber: asset?.assetNumber ?? null,
      title: defect.title,
      description: defect.description ?? null,
    });
  }, [defect, asset, onAcceptPress]);

  const handleViewLinkedTask = useCallback(() => {
    if (!defect?.maintenanceRecordId || !onViewTaskPress) return;
    onViewTaskPress(defect.maintenanceRecordId);
  }, [defect, onViewTaskPress]);

  // Dismiss flow: confirm → delete → scatter → callback
  const { mutateAsync: deleteDefect, isPending: isDeleting } = useDeleteDefectReport();

  const handleDismissPress = useCallback(() => {
    if (!defect) return;
    Alert.alert(
      'Dismiss Defect Report?',
      'This will permanently delete this defect report. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDefect(defect.id);
              scatter(7, () => {
                onDismissConfirmed?.(defect.id);
              });
            } catch {
              setAlertSheet({
                visible: true,
                title: 'Error',
                message: 'Failed to dismiss defect report. Please try again.',
              });
            }
          },
        },
      ]
    );
  }, [defect, deleteDefect, scatter, onDismissConfirmed]);

  const renderStatusActions = () => {
    if (!defect || !canMarkMaintenance) return null;

    const status = defect.status;

    if (status === 'reported') {
      return (
        <View style={styles.actionsContainer}>
          <Button
            onPress={handleDismissPress}
            disabled={isScattering}
            isLoading={isDeleting}
            flex
            variant="danger"
          >
            Dismiss
          </Button>
          <Button
            onPress={handleAccept}
            disabled={!onAcceptPress || isScattering}
            flex
            color={colors.success}
            style={styles.ctaButton}
          >
            Create Task
          </Button>
        </View>
      );
    }

    if (status === 'task_created' || status === 'resolved') {
      return (
        <View style={styles.actionsContainer}>
          <View style={styles.closedStatus}>
            <Ionicons
              name={DEFECT_STATUS_CONFIG[status]?.icon ?? 'checkmark-circle'}
              size={20}
              color={DEFECT_STATUS_CONFIG[status]?.color ?? colors.textSecondary}
            />
            <AppText style={styles.closedStatusText}>
              {status === 'task_created' ? 'Maintenance Task Created' : 'Resolved'}
            </AppText>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      onExitComplete={onExitComplete}
      noBackdrop={noBackdrop}
      snapPoint={['75%', '92%']}
    >
      <View style={sheetLayout.container}>
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
          <BottomSheetScrollView
            style={sheetLayout.scroll}
            contentContainerStyle={[
              sheetLayout.scrollContent,
              { paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
            ]}
            bounces={true}
            showsVerticalScrollIndicator={false}
          >
            {/* Info Row: Asset Number + Badge */}
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
                  {defect.reporterName && (
                    <AppText style={styles.createdByText} numberOfLines={1}>
                      {formatRelativeTime(defect.createdAt)} by {defect.reporterName}
                    </AppText>
                  )}
                </View>
                <View style={styles.badgeRow}>
                  <View style={styles.badgeWrap}>
                    <DefectStatusBadge status={defect.status} />
                  </View>
                </View>
              </View>
            </Animated.View>

            <View style={styles.divider} />

            {/* Description */}
            {defect.description && (
              <Animated.View style={getAnimatedStyle(1)}>
                <AppText style={styles.detailLabel}>Description</AppText>
                <AppText style={styles.descriptionText}>{defect.description}</AppText>
              </Animated.View>
            )}

            {/* Defect Photo (hidden in compact mode) */}
            {variant === 'full' && defectPhoto && (
              <Animated.View style={getAnimatedStyle(2)}>
                <View style={styles.sectionGroup}>
                  <AppText style={styles.sectionTitle}>Defect Photo</AppText>
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
              <Animated.View style={getAnimatedStyle(3)}>
                <View style={styles.sectionGroup}>
                  <AppText style={styles.sectionTitle}>Linked Maintenance Task</AppText>
                  <TouchableOpacity
                    style={styles.linkedTaskRow}
                    onPress={handleViewLinkedTask}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      {linkedMaintenance && (
                        <AppText style={styles.detailValue}>{linkedMaintenance.title}</AppText>
                      )}
                      <AppText style={styles.linkedTaskHint}>Tap to view task details</AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.electricBlue} />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}

            {/* Timeline (hidden in compact mode) */}
            {variant === 'full' && (defect.acceptedAt || defect.resolvedAt) && (
              <Animated.View style={getAnimatedStyle(4)}>
                <View style={styles.sectionGroup}>
                  <AppText style={styles.sectionTitle}>Timeline</AppText>
                  <View style={styles.timelineContainer}>
                    {defect.acceptedAt && (
                      <View style={styles.timelineItem}>
                        <View style={styles.timelineDotWrap}>
                          <View style={[styles.timelineDot, { backgroundColor: colors.success }]} />
                          {defect.resolvedAt && <View style={styles.timelineLine} />}
                        </View>
                        <View style={styles.timelineContent}>
                          <AppText style={styles.timelineLabel}>Accepted</AppText>
                          <AppText style={styles.timelineValue}>
                            {formatRelativeTime(defect.acceptedAt)}
                          </AppText>
                        </View>
                      </View>
                    )}
                    {defect.resolvedAt && (
                      <View style={styles.timelineItem}>
                        <View style={styles.timelineDotWrap}>
                          <View style={[styles.timelineDot, { backgroundColor: colors.info }]} />
                        </View>
                        <View style={styles.timelineContent}>
                          <AppText style={styles.timelineLabel}>Resolved</AppText>
                          <AppText style={styles.timelineValue}>
                            {formatRelativeTime(defect.resolvedAt)}
                          </AppText>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Notes (hidden in compact mode) */}
            {variant === 'full' && defect.notes && (
              <Animated.View style={getAnimatedStyle(5)}>
                <View style={styles.sectionGroup}>
                  <AppText style={styles.sectionTitle}>Notes</AppText>
                  <View style={styles.notesCardSubdued}>
                    <AppText style={styles.notesText}>{defect.notes}</AppText>
                  </View>
                </View>
              </Animated.View>
            )}
          </BottomSheetScrollView>
        )}

        {!isLoading && defect && renderStatusActions() && (
          <SheetFooter>
            <Animated.View style={getAnimatedStyle(6)}>{renderStatusActions()}</Animated.View>
          </SheetFooter>
        )}
      </View>

      {/* Error alert */}
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
  divider: {
    height: 1,
    backgroundColor: colors.border,
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
  assetIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  assetNumberText: {
    fontSize: fontSize.xl,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  createdByText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  badgeRow: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  badgeWrap: {
    alignSelf: 'flex-end',
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
  descriptionText: {
    fontSize: fontSize.base,
    fontFamily: fonts.regular,
    color: colors.text,
    lineHeight: lineHeight.relaxed,
  },
  linkedTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    backgroundColor: 'rgba(0, 168, 255, 0.06)',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.electricBlue,
  },
  linkedTaskHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
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
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    aspectRatio: 4 / 3,
    shadowColor: '#000030',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  defectPhoto: {
    flex: 1,
  },
  defectPhotoPlaceholder: {
    aspectRatio: 4 / 3,
    backgroundColor: '#2A2A3A',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaButton: {
    ...shadows.lg,
  },
  defectPhotoErrorText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  notesText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    lineHeight: lineHeight.body,
  },
  notesCardSubdued: {
    backgroundColor: colors.chrome,
    borderRadius: borderRadius.md,
    padding: spacing.base,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.base,
  },
  timelineDotWrap: {
    alignItems: 'center',
    width: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.xs,
  },
  timelineLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineValue: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: 2,
  },
});
