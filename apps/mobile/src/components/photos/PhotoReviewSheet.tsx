import React, { useCallback, useRef, useEffect, memo } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PhotoType } from '@rgr/shared';
import { usePhotoCapture, type UploadStep } from '../../hooks/usePhotoCapture';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
import { SheetModal, BottomSheetScrollView } from '../common/SheetModal';
import { SheetHeader } from '../common/SheetHeader';
import { sheetLayout } from '../../theme/sheetLayout';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, fontFamily as fonts } from '../../theme/spacing';
import { AppText } from '../common';

interface PhotoReviewSheetProps {
  visible: boolean;
  photoType: PhotoType;
  onClose: () => void;
  onConfirmed: () => void;
  onRetake: () => void;
  onExitComplete?: () => void;
  /** Render without backdrop (parent provides persistent backdrop). */
  noBackdrop?: boolean;
}

function PhotoReviewSheetComponent({
  visible,
  photoType,
  onClose,
  onConfirmed,
  onRetake,
  onExitComplete,
  noBackdrop = false,
}: PhotoReviewSheetProps) {
  const {
    capturedUri,
    isUploading,
    uploadError,
    confirmAndUpload,
    retakePhoto,
    cancelCapture,
    uploadStep,
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
      // Brief pause so user sees the "complete" state before sheet closes
      await new Promise((resolve) => setTimeout(resolve, 700));
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
    <SheetModal visible={visible} onClose={handleClose} onExitComplete={onExitComplete} noBackdrop={noBackdrop} snapPoint="77%">
      <View style={sheetLayout.container}>
        <SheetHeader
          icon="camera"
          title="Review Photo"
          onClose={handleClose}
          backgroundColor={colors.electricBlue}
        />

        <BottomSheetScrollView
          style={sheetLayout.scroll}
          contentContainerStyle={[sheetLayout.scrollContent, { paddingTop: spacing.md, paddingBottom: bottomPad }]}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {displayUri && (
            <View style={styles.photoContainer}>
              <Image source={{ uri: displayUri}} style={styles.photo} contentFit="contain" />
              {uploadStep && <UploadProgressOverlay step={uploadStep} />}
            </View>
          )}

          {isDamage && (
            <View style={styles.photoTypeRow}>
              <Ionicons name="warning" size={18} color={colors.defectYellow} />
              <AppText style={styles.photoTypeText}>Defect Photo</AppText>
            </View>
          )}

          {uploadError && (
            <View style={styles.errorContainer}>
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <View>
                  <AppText style={styles.errorTitle}>Upload Failed</AppText>
                  <AppText style={styles.errorText}>{uploadError}</AppText>
                </View>
              </View>
            </View>
          )}

          <View style={styles.buttonRow}>
            <Animated.View style={[styles.flexOne, { opacity: retakeOpacity }]}>
              <Button onPress={handleRetake} disabled={isUploading} flex color={colors.electricBlue}>
                Recapture
              </Button>
            </Animated.View>
            <Button onPress={handleConfirm} isLoading={isUploading} flex color={colors.success}>
              Use Photo
            </Button>
          </View>
        </BottomSheetScrollView>
      </View>
    </SheetModal>
  );
}

export const PhotoReviewSheet = memo(PhotoReviewSheetComponent);

// ── Upload progress overlay ──────────────────────────────────────────────────

const UPLOAD_STEPS = [
  { key: 'validating', label: 'Validating photo' },
  { key: 'thumbnail', label: 'Generating thumbnail' },
  { key: 'uploading', label: 'Uploading to cloud' },
] as const;

const STEP_KEYS = UPLOAD_STEPS.map((s) => s.key);

function UploadProgressOverlay({ step }: { step: NonNullable<UploadStep> }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const currentIndex = step === 'complete' ? STEP_KEYS.length : STEP_KEYS.indexOf(step);

  return (
    <Animated.View style={[overlayStyles.container, { opacity }]}>
      <View style={overlayStyles.card}>
        {UPLOAD_STEPS.map((s, i) => {
          const isComplete = step === 'complete' || i < currentIndex;
          const isCurrent = step !== 'complete' && i === currentIndex;

          return (
            <View key={s.key} style={overlayStyles.row}>
              {isComplete ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              ) : isCurrent ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="ellipse-outline" size={22} color="rgba(255,255,255,0.3)" />
              )}
              <AppText
                style={[
                  overlayStyles.label,
                  isComplete && overlayStyles.labelComplete,
                  isCurrent && overlayStyles.labelCurrent,
                ]}
              >
                {s.label}
              </AppText>
            </View>
          );
        })}
        {step === 'complete' && (
          <View style={overlayStyles.doneRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <AppText style={overlayStyles.doneText}>Photo saved</AppText>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 28,
  },
  label: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  labelComplete: {
    color: colors.success,
    fontFamily: fonts.bold,
  },
  labelCurrent: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  doneText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.success,
  },
});

const styles = StyleSheet.create({
  photoContainer: {
    aspectRatio: 3 / 4,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  photo: {
    flex: 1,
  },
photoTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
    marginTop: spacing.lg,
  },
  flexOne: {
    flex: 1,
  },
  errorContainer: {
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
