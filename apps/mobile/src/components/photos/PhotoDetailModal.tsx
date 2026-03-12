import React, { memo, useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Linking,
  Animated,
  Dimensions} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { usePhoto, useDeletePhoto, useSignedUrl } from '../../hooks/usePhotos';
import { useUserPermissions } from '../../contexts/UserPermissionsContext';
import { FreightAnalysisCard } from './FreightAnalysisCard';
import { AppText, LoadingDots, AlertSheet, ConfirmSheet } from '../common';
import { formatRelativeTime } from '@rgr/shared';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { FULLSCREEN_SPRING, SHEET_EXIT } from '../../theme/animation';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const formatPhotoType = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
};

interface PhotoDetailModalProps {
  visible: boolean;
  photoId: string | null;
  assetId: string;
  onClose: () => void;
}

function PhotoDetailModalComponent({ visible, photoId, assetId, onClose }: PhotoDetailModalProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      Animated.spring(translateY, { toValue: 0, ...FULLSCREEN_SPRING }).start();
    }
  }, [visible, translateY]);

  const handleAnimatedClose = useCallback(() => {
    Animated.timing(translateY, { toValue: SCREEN_HEIGHT, ...SHEET_EXIT }).start(() => {
      onClose();
    });
  }, [translateY, onClose]);

  const { data: photoData, isLoading, error } = usePhoto(photoId ?? undefined);
  const { data: thumbnailUrl } = useSignedUrl(photoData?.thumbnailPath ?? undefined);
  const { data: fullImageUrl, error: urlError } = useSignedUrl(photoData?.storagePath);
  const { mutateAsync: deletePhotoMutation, isPending: isDeleting } = useDeletePhoto();
  const { canAccessAdmin } = useUserPermissions();
  const [isFullImageLoaded, setIsFullImageLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [alertSheet, setAlertSheet] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  // Reset full image loaded state when photo changes
  useEffect(() => {
    setIsFullImageLoaded(false);
  }, [photoId]);

  const openInMaps = useCallback(() => {
    if (!photoData?.latitude || !photoData?.longitude) return;
    const url = Platform.select({
      ios: `maps:?q=${photoData.latitude},${photoData.longitude}`,
      android: `geo:${photoData.latitude},${photoData.longitude}`,
    });
    if (url) Linking.openURL(url);
  }, [photoData?.latitude, photoData?.longitude]);

  const handleDelete = useCallback(() => {
    if (!photoId) return;
    setShowDeleteConfirm(true);
  }, [photoId]);

  const handleConfirmDelete = useCallback(async () => {
    if (!photoId) return;
    setShowDeleteConfirm(false);
    try {
      await deletePhotoMutation({ photoId, assetId });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete photo';
      setAlertSheet({
        visible: true,
        title: 'Error',
        message,
      });
    }
  }, [photoId, assetId, deletePhotoMutation, onClose]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  return (
    <Modal visible={visible} animationType="none" onRequestClose={handleAnimatedClose}>
      <Animated.View style={[{ flex: 1 }, { transform: [{ translateY }] }]}>
        <View style={styles.container}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleAnimatedClose}
                accessibilityRole="button"
                accessibilityLabel="Close photo details"
              >
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
              <AppText style={styles.headerTitle}>Photo Details</AppText>
              {canAccessAdmin ? (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleDelete}
                  disabled={isDeleting || isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Delete photo"
                  accessibilityHint="Double tap to delete this photo"
                >
                  {isDeleting ? (
                    <LoadingDots color={colors.textInverse} size={6} />
                  ) : (
                    <Ionicons name="trash-outline" size={24} color={colors.error} />
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.headerButton} />
              )}
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <LoadingDots color={colors.textSecondary} size={12} />
              </View>
            ) : photoData ? (
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {/* Photo with progressive loading */}
                <View style={styles.imageContainer}>
                  {thumbnailUrl && !isFullImageLoaded && (
                    <Image
                      source={{ uri: thumbnailUrl }}
                      style={[styles.image, StyleSheet.absoluteFill]}
                      contentFit="contain"
                      blurRadius={2}
                    />
                  )}
                  {fullImageUrl ? (
                    <Image
                      source={{ uri: fullImageUrl }}
                      style={[styles.image, { opacity: isFullImageLoaded ? 1 : 0 }]}
                      contentFit="contain"
                      transition={300}
                      onLoadEnd={() => setIsFullImageLoaded(true)}
                    />
                  ) : !thumbnailUrl ? (
                    <View style={styles.imagePlaceholder}>
                      <LoadingDots color={colors.textSecondary} size={8} />
                      <AppText style={styles.imageLoadingText}>
                        {urlError ? 'Failed to load image' : 'Loading image...'}
                      </AppText>
                    </View>
                  ) : null}
                </View>

                {/* Photo metadata */}
                <View style={styles.metadataSection}>
                  <View style={styles.metadataRow}>
                    <View style={styles.metadataItem}>
                      <AppText style={styles.metadataLabel}>Type</AppText>
                      <AppText style={styles.metadataValue}>
                        {formatPhotoType(photoData.photoType)}
                      </AppText>
                    </View>
                    <View style={styles.metadataItem}>
                      <AppText style={styles.metadataLabel}>Captured</AppText>
                      <AppText style={styles.metadataValueSmall}>
                        {formatRelativeTime(photoData.createdAt)}
                      </AppText>
                    </View>
                  </View>

                  {(photoData.width || photoData.fileSize) && (
                    <View style={styles.metadataRow}>
                      {photoData.width && photoData.height && (
                        <View style={styles.metadataItem}>
                          <AppText style={styles.metadataLabel}>Resolution</AppText>
                          <AppText style={styles.metadataValue}>
                            {photoData.width} × {photoData.height}
                          </AppText>
                        </View>
                      )}
                      {photoData.fileSize && (
                        <View style={styles.metadataItem}>
                          <AppText style={styles.metadataLabel}>Size</AppText>
                          <AppText style={styles.metadataValue}>
                            {(photoData.fileSize / 1024 / 1024).toFixed(2)} MB
                          </AppText>
                        </View>
                      )}
                    </View>
                  )}

                  {/* GPS Location */}
                  {photoData.latitude != null && photoData.longitude != null && (
                    <TouchableOpacity
                      onPress={openInMaps}
                      style={styles.metadataRow}
                      accessibilityRole="link"
                      accessibilityLabel="Open location in maps"
                      accessibilityHint="Double tap to open this location in your maps app"
                    >
                      <View style={styles.metadataItem}>
                        <AppText style={styles.metadataLabel}>Location</AppText>
                        <View style={styles.locationValue}>
                          <AppText style={styles.metadataValueLink}>
                            {photoData.latitude.toFixed(5)}, {photoData.longitude.toFixed(5)}
                          </AppText>
                          <Ionicons name="open-outline" size={14} color={colors.electricBlue} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Analysis status */}
                  <View style={styles.analysisStatus}>
                    {photoData.isAnalyzed ? (
                      <View style={styles.statusBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        <AppText style={styles.statusText}>Analyzed</AppText>
                      </View>
                    ) : (
                      <View style={styles.statusBadge}>
                        <Ionicons name="hourglass-outline" size={16} color={colors.warning} />
                        <AppText style={styles.statusTextPending}>Pending Analysis</AppText>
                      </View>
                    )}
                  </View>
                </View>

                {/* Freight Analysis */}
                {photoData.freightAnalysis && (
                  <FreightAnalysisCard
                    analysis={photoData.freightAnalysis}
                    hazards={photoData.hazardAlerts}
                  />
                )}
              </ScrollView>
            ) : (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
                <AppText style={styles.errorText}>{error?.message || 'Photo not found'}</AppText>
                <AppText style={styles.errorSubtext}>
                  The photo may have been deleted or is unavailable.
                </AppText>
              </View>
            )}
          </SafeAreaView>
        </View>

        <ConfirmSheet
          visible={showDeleteConfirm}
          type="danger"
          title="Delete Photo"
          message="Are you sure you want to delete this photo? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          isLoading={isDeleting}
        />

        <AlertSheet
          visible={alertSheet.visible}
          type="error"
          title={alertSheet.title}
          message={alertSheet.message}
          onDismiss={() => setAlertSheet((prev) => ({ ...prev, visible: false }))}
        />
      </Animated.View>
    </Modal>
  );
}

export const PhotoDetailModal = memo(PhotoDetailModalComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.chrome,
  },
  safeArea: {
    flex: 1,
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
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.error,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.base,
    gap: spacing.lg,
  },
  imageContainer: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  imageLoadingText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metadataSection: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metadataItem: {
    flex: 1,
  },
  metadataLabel: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metadataValue: {
    fontSize: fontSize.base,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  metadataValueSmall: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  locationValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metadataValueLink: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.electricBlue,
  },
  analysisStatus: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.success,
    textTransform: 'uppercase',
  },
  statusTextPending: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.warning,
    textTransform: 'uppercase',
  },
});
