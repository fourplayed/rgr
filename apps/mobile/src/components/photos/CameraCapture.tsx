import React, { useRef, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Linking,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PhotoType } from '@rgr/shared';
import { usePhotoCapture } from '../../hooks/usePhotoCapture';
import { LoadingDots } from '../common/LoadingDots';
import { SheetHeader } from '../common/SheetHeader';
import { Button } from '../common/Button';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius, shadows, fontFamily as fonts } from '../../theme/spacing';

interface CameraCaptureProps {
  visible: boolean;
  assetId: string;
  photoType?: PhotoType;
  scanEventId?: string | null;
  locationDescription?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  onClose: () => void;
  onPhotoUploaded?: () => void;
  onDismiss?: () => void;
}

const getGuideText = (type: PhotoType): string => {
  switch (type) {
    case 'defect':
      return 'Position defect in frame';
    case 'freight':
    default:
      return 'Position freight in frame';
  }
};

function CameraCaptureComponent({
  visible,
  assetId,
  photoType = 'freight',
  scanEventId,
  locationDescription,
  latitude,
  longitude,
  onClose,
  onPhotoUploaded,
  onDismiss,
}: CameraCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Store location params in refs so the effect always reads the latest values
  // without re-triggering on every parent render
  const scanEventIdRef = useRef(scanEventId);
  const locationDescriptionRef = useRef(locationDescription);
  const latitudeRef = useRef(latitude);
  const longitudeRef = useRef(longitude);
  useEffect(() => {
    scanEventIdRef.current = scanEventId;
    locationDescriptionRef.current = locationDescription;
    latitudeRef.current = latitude;
    longitudeRef.current = longitude;
  }, [scanEventId, locationDescription, latitude, longitude]);

  const {
    capturedUri,
    isUploading,
    uploadError,
    takePhoto,
    retakePhoto,
    confirmAndUpload,
    startCapture,
    cancelCapture,
  } = usePhotoCapture();

  // Initialize capture state when modal opens
  useEffect(() => {
    if (visible) {
      startCapture({
        assetId,
        scanEventId: scanEventIdRef.current,
        locationDescription: locationDescriptionRef.current,
        latitude: latitudeRef.current,
        longitude: longitudeRef.current,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, assetId, startCapture]);

  const handleCapture = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await takePhoto(cameraRef);
  }, [takePhoto]);

  const handleRetake = useCallback(() => {
    retakePhoto();
  }, [retakePhoto]);

  const handleConfirm = useCallback(async () => {
    const success = await confirmAndUpload(photoType);
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPhotoUploaded?.();
      onClose();
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [confirmAndUpload, photoType, onPhotoUploaded, onClose]);

  const handleClose = useCallback(() => {
    cancelCapture();
    onClose();
  }, [cancelCapture, onClose]);

  const isDamage = photoType === 'defect';

  // Fade the Retake button in/out instead of showing it disabled
  const retakeOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(retakeOpacity, {
      toValue: isUploading ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isUploading, retakeOpacity]);

  // Permission checking state
  if (!permission) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleClose}
        onDismiss={onDismiss}
      >
        <View style={styles.container}>
          <SafeAreaView style={styles.centered}>
            <Ionicons
              name="camera-outline"
              size={48}
              color={colors.electricBlue}
              style={styles.checkingIcon}
            />
            <Text style={styles.messageText}>Checking Camera...</Text>
            <LoadingDots color={colors.textSecondary} size={8} />
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  // Permission denied state
  if (!permission.granted) {
    const permanentlyDenied = permission.canAskAgain === false;
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={handleClose}
        onDismiss={onDismiss}
      >
        <View style={styles.container}>
          <SafeAreaView style={styles.centered}>
            <View style={styles.permissionCard}>
              <Ionicons
                name="ban-outline"
                size={48}
                color={colors.error}
                style={styles.permissionIcon}
              />
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionBody}>
                {permanentlyDenied
                  ? 'Camera permission was denied. Please enable it in your device Settings to capture photos.'
                  : 'Camera permission is needed to capture photos. Enable it in your device Settings.'}
              </Text>
              <View style={styles.permissionButtonRow}>
                <TouchableOpacity
                  style={styles.permissionCancelButton}
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.permissionCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.permissionGrantButton}
                  onPress={permanentlyDenied ? () => Linking.openSettings() : requestPermission}
                  accessibilityRole="button"
                  accessibilityLabel={
                    permanentlyDenied ? 'Open device settings' : 'Grant camera permission'
                  }
                >
                  <Text style={styles.permissionGrantButtonText}>
                    {permanentlyDenied ? 'Open Settings' : 'Grant'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      onDismiss={onDismiss}
    >
      <View style={styles.container}>
        {capturedUri ? (
          // Preview Mode — split layout: photo on top, chrome card on bottom
          <SafeAreaView style={styles.previewContainer}>
            <View style={styles.previewImageContainer}>
              <Image
                source={{ uri: capturedUri }}
                style={styles.previewImage}
                contentFit="contain"
              />
            </View>

            <View style={styles.reviewCard}>
              <SheetHeader
                icon="checkmark"
                title="Review Photo"
                onClose={handleClose}
                backgroundColor={colors.violet}
              />

              <View style={styles.photoTypeRow}>
                <Ionicons
                  name={isDamage ? 'warning' : 'camera'}
                  size={18}
                  color={isDamage ? colors.defectYellow : colors.violet}
                />
                <Text style={styles.photoTypeText}>
                  {isDamage ? 'Defect Photo' : 'Freight Photo'}
                </Text>
              </View>

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

              <View style={styles.buttonRow}>
                <Animated.View style={[styles.flexOne, { opacity: retakeOpacity }]}>
                  <Button
                    variant="secondary"
                    onPress={handleRetake}
                    disabled={isUploading}
                    flex
                    icon="camera-reverse-outline"
                  >
                    Retake
                  </Button>
                </Animated.View>
                <Button
                  onPress={handleConfirm}
                  isLoading={isUploading}
                  flex
                  icon="checkmark"
                  color={colors.violet}
                >
                  Use Photo
                </Button>
              </View>
            </View>
          </SafeAreaView>
        ) : (
          // Camera Mode
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <SafeAreaView style={styles.cameraOverlay}>
              <View style={styles.cameraHeaderBand}>
                <View style={styles.header}>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close camera"
                  >
                    <Ionicons name="close" size={28} color={colors.textInverse} />
                  </TouchableOpacity>
                  <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Capture Photo</Text>
                    <Text style={styles.guideText}>{getGuideText(photoType)}</Text>
                  </View>
                  <View style={styles.headerButton} />
                </View>
              </View>

              <View style={styles.cameraGuide}>
                <View style={styles.guideFrame}>
                  <View
                    style={[
                      styles.guideCorner,
                      styles.guideTopLeft,
                      isDamage && { borderColor: colors.error },
                    ]}
                  />
                  <View
                    style={[
                      styles.guideCorner,
                      styles.guideTopRight,
                      isDamage && { borderColor: colors.error },
                    ]}
                  />
                  <View
                    style={[
                      styles.guideCorner,
                      styles.guideBottomLeft,
                      isDamage && { borderColor: colors.error },
                    ]}
                  />
                  <View
                    style={[
                      styles.guideCorner,
                      styles.guideBottomRight,
                      isDamage && { borderColor: colors.error },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.cameraCaptureBand}>
                <View style={styles.captureContainer}>
                  <TouchableOpacity
                    style={[styles.captureButton, isDamage && { borderColor: colors.error }]}
                    onPress={handleCapture}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Take photo"
                    accessibilityHint="Double tap to capture a photo"
                  >
                    <View
                      style={[
                        styles.captureButtonInner,
                        isDamage && { backgroundColor: colors.error },
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </CameraView>
        )}
      </View>
    </Modal>
  );
}

export const CameraCapture = memo(CameraCaptureComponent);

const GUIDE_SIZE = 280;
const CORNER_SIZE = 40;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  // Permission checking
  checkingIcon: {
    marginBottom: spacing.lg,
  },
  messageText: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },

  // Permission denied — frosted card
  permissionCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: spacing.xl,
    alignItems: 'center',
  },
  permissionIcon: {
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textInverse,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  permissionButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  permissionCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  permissionCancelButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.text,
    textTransform: 'uppercase',
  },
  permissionGrantButton: {
    flex: 1,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  permissionGrantButtonText: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
  },

  // Camera styles
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
  },
  cameraHeaderBand: {
    backgroundColor: 'rgba(0,0,48,0.6)',
    paddingBottom: spacing.lg,
  },
  cameraCaptureBand: {
    backgroundColor: 'rgba(0,0,48,0.6)',
    paddingTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Camera guide
  cameraGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideFrame: {
    width: GUIDE_SIZE,
    height: GUIDE_SIZE,
    position: 'relative',
  },
  guideCorner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.electricBlue,
  },
  guideTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  guideTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  guideBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  guideBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  guideText: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    fontFamily: fonts.regular,
    color: colors.textInverse,
    opacity: 0.8,
    letterSpacing: 0.5,
  },

  // Capture button
  captureContainer: {
    paddingBottom: spacing['3xl'],
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.textInverse,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.textInverse,
  },

  // Preview styles
  previewContainer: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  previewImageContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
  },

  // Review card (bottom chrome panel)
  reviewCard: {
    backgroundColor: colors.chrome,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
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
    paddingBottom: spacing.base,
  },
  flexOne: {
    flex: 1,
  },

  // Error banner (shared between review card and camera)
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
