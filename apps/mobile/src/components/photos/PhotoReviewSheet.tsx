import React, { useCallback, useRef, useEffect, memo } from 'react';
import { View, StyleSheet, Animated, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PhotoType } from '@rgr/shared';
import { usePhotoCapture, type UploadStep } from '../../hooks/usePhotoCapture';
import { useSheetEntrance } from '../../hooks/useSheetEntrance';
import { SheetModal } from '../common/SheetModal';
import { useSheetBottomPadding } from '../../hooks/useSheetBottomPadding';
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

  // Keep a stable URI for display during exit animation
  const stableUri = useRef(capturedUri);
  if (capturedUri) stableUri.current = capturedUri;

  const entranceStyle = useSheetEntrance(visible);
  const bottomPadding = useSheetBottomPadding();

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
    <SheetModal
      visible={visible}
      onClose={handleClose}
      onExitComplete={onExitComplete}
      noBackdrop={noBackdrop}
      compact
    >
      <View style={sheetLayout.containerCompact}>
        <SheetHeader
          icon="camera"
          title="Review Photo"
          onClose={handleClose}
          backgroundColor={colors.electricBlue}
        />

        <View
          style={{
            flex: 1,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: bottomPadding,
          }}
        >
          <Animated.View style={entranceStyle}>
            {displayUri && (
              <View style={styles.photoContainer}>
                <Image source={{ uri: displayUri }} style={styles.photo} contentFit="contain" />
                {uploadStep && <UploadProgressOverlay step={uploadStep} />}
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
          </Animated.View>

          <View style={styles.buttonRow}>
            <Animated.View style={[styles.flexOne, { opacity: retakeOpacity }]}>
              <Button
                onPress={handleRetake}
                disabled={isUploading}
                flex
                color={colors.electricBlue}
              >
                Recapture
              </Button>
            </Animated.View>
            <Button onPress={handleConfirm} isLoading={isUploading} flex color={colors.success}>
              Use Photo
            </Button>
          </View>
        </View>
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

const STEP_PROGRESS: Record<string, number> = {
  validating: 0.33,
  thumbnail: 0.66,
  uploading: 1.0,
  complete: 1.0,
};

function UploadProgressOverlay({ step }: { step: NonNullable<UploadStep> }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const completeScale = useRef(new Animated.Value(0)).current;
  const progressScaleX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  // Animate progress bar on step change
  useEffect(() => {
    const target = STEP_PROGRESS[step] ?? 0;
    Animated.timing(progressScaleX, {
      toValue: target,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [step, progressScaleX]);

  // Spring scale on complete checkmark
  useEffect(() => {
    if (step === 'complete') {
      Animated.spring(completeScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [step, completeScale]);

  const currentIndex = step === 'complete' ? STEP_KEYS.length : STEP_KEYS.indexOf(step);

  return (
    <Animated.View style={[overlayStyles.container, { opacity }]}>
      {Platform.OS === 'ios' && (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
      )}
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
            <Animated.View style={{ transform: [{ scale: completeScale }] }}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            </Animated.View>
            <AppText style={overlayStyles.doneText}>Photo saved</AppText>
          </View>
        )}
        <View style={overlayStyles.progressTrack}>
          <Animated.View
            style={[overlayStyles.progressFill, { transform: [{ scaleX: progressScaleX }] }]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const overlayStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    height: 32,
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
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    width: '100%',
    backgroundColor: colors.success,
    borderRadius: 2,
    transformOrigin: 'left',
  },
});

const styles = StyleSheet.create({
  photoContainer: {
    height: Dimensions.get('window').height * 0.45,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  photo: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
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
