import React, { useCallback, useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PhotoType } from '@rgr/shared';
import { usePhotoCapture } from '../../hooks/usePhotoCapture';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { SheetModal } from '../common/SheetModal';
import { SheetHeader } from '../common/SheetHeader';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';

interface PhotoReviewSheetProps {
  visible: boolean;
  photoType: PhotoType;
  onClose: () => void;
  onConfirmed: () => void;
  onRetake: () => void;
  onDismiss?: () => void;
  /** Render inline (no native Modal) — use when already inside a Modal. */
  inline?: boolean;
}

function PhotoReviewSheetComponent({
  visible,
  photoType,
  onClose,
  onConfirmed,
  onRetake,
  onDismiss,
  inline,
}: PhotoReviewSheetProps) {
  const {
    capturedUri,
    isUploading,
    uploadError,
    confirmAndUpload,
    retakePhoto,
    cancelCapture,
  } = usePhotoCapture();

  const bottomPad = useSheetBottomPadding();
  const isDamage = photoType === 'defect';

  // Keep a stable URI for display during exit animation
  const stableUri = useRef(capturedUri);
  if (capturedUri) stableUri.current = capturedUri;

  const handleConfirm = useCallback(async () => {
    const success = await confirmAndUpload(photoType);
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onConfirmed();
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [confirmAndUpload, photoType, onConfirmed]);

  const handleRetake = useCallback(() => {
    retakePhoto();
    onRetake();
  }, [retakePhoto, onRetake]);

  const handleClose = useCallback(() => {
    cancelCapture();
    onClose();
  }, [cancelCapture, onClose]);

  // Fade the Retake button in/out while uploading
  const retakeOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(retakeOpacity, {
      toValue: isUploading ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isUploading, retakeOpacity]);

  const displayUri = stableUri.current;

  return (
    <SheetModal visible={visible} onClose={handleClose} onDismiss={onDismiss} inline={!!inline}>
      <View style={styles.container}>
        <SheetHeader
          icon="checkmark"
          title="Review Photo"
          onClose={handleClose}
          backgroundColor={colors.success}
        />

        <Text style={styles.capturedLabel}>Captured Photo</Text>
        {displayUri && (
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: displayUri }}
              style={styles.photo}
              contentFit="contain"
            />
          </View>
        )}

        {isDamage && (
          <View style={styles.photoTypeRow}>
            <Ionicons name="warning" size={18} color={colors.defectYellow} />
            <Text style={styles.photoTypeText}>Defect Photo</Text>
          </View>
        )}

        {uploadError && (
          <View style={styles.errorContainer}>
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <View>
                <Text style={styles.errorTitle}>Upload Failed</Text>
                <Text style={styles.errorText}>{uploadError}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.buttonRow, { paddingBottom: bottomPad }]}>
          <Animated.View style={[styles.flexOne, { opacity: retakeOpacity }]}>
            <Button
              variant="danger"
              onPress={handleRetake}
              disabled={isUploading}
              flex
            >
              Recapture
            </Button>
          </Animated.View>
          <Button
            onPress={handleConfirm}
            isLoading={isUploading}
            flex
            color={colors.success}
          >
            Use Photo
          </Button>
        </View>
      </View>
    </SheetModal>
  );
}

export const PhotoReviewSheet = memo(PhotoReviewSheetComponent);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  photoContainer: {
    height: 360,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  photo: {
    flex: 1,
  },
  capturedLabel: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.base,
  },
  photoTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  photoTypeText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  flexOne: {
    flex: 1,
  },
  errorContainer: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: borderRadius.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorTitle: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.error,
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.text,
    opacity: 0.8,
  },
});
