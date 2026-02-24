import React, { useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePhotoCapture } from '../../hooks/usePhotoCapture';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface CameraCaptureProps {
  visible: boolean;
  assetId: string;
  scanEventId?: string | null;
  locationDescription?: string | null;
  onClose: () => void;
  onPhotoUploaded?: () => void;
}

function CameraCaptureComponent({
  visible,
  assetId,
  scanEventId,
  locationDescription,
  onClose,
  onPhotoUploaded,
}: CameraCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

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
  React.useEffect(() => {
    if (visible) {
      startCapture(assetId, scanEventId, locationDescription);
    }
  }, [visible, assetId, scanEventId, locationDescription, startCapture]);

  const handleCapture = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await takePhoto(cameraRef);
  }, [takePhoto]);

  const handleRetake = useCallback(() => {
    retakePhoto();
  }, [retakePhoto]);

  const handleConfirm = useCallback(async () => {
    const success = await confirmAndUpload('freight');
    if (success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onPhotoUploaded?.();
      onClose();
      Alert.alert('Success', 'Photo uploaded successfully');
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [confirmAndUpload, onPhotoUploaded, onClose]);

  const handleClose = useCallback(() => {
    cancelCapture();
    onClose();
  }, [cancelCapture, onClose]);

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.container}>
          <SafeAreaView style={styles.centered}>
            <Text style={styles.messageText}>Checking camera permission...</Text>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.container}>
          <SafeAreaView style={styles.centered}>
            <Text style={styles.messageText}>Camera permission is required</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {capturedUri ? (
          // Preview Mode
          <SafeAreaView style={styles.previewContainer}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
                <Ionicons name="close" size={28} color={colors.textInverse} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Review Photo</Text>
              <View style={styles.headerButton} />
            </View>

            <View style={styles.previewImageContainer}>
              <Image
                source={{ uri: capturedUri }}
                style={styles.previewImage}
                contentFit="contain"
              />
            </View>

            {uploadError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{uploadError}</Text>
              </View>
            )}

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.retakeButton]}
                onPress={handleRetake}
                disabled={isUploading}
              >
                <Ionicons name="refresh" size={24} color={colors.text} />
                <Text style={styles.retakeButtonText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={handleConfirm}
                disabled={isUploading}
              >
                {isUploading ? (
                  <LoadingDots color={colors.textInverse} size={8} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={24} color={colors.textInverse} />
                    <Text style={styles.confirmButtonText}>Use Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        ) : (
          // Camera Mode
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          >
            <SafeAreaView style={styles.cameraOverlay}>
              <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
                  <Ionicons name="close" size={28} color={colors.textInverse} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>Capture Photo</Text>
                  <Text style={styles.guideText}>Position freight in frame</Text>
                </View>
                <View style={styles.headerButton} />
              </View>

              <View style={styles.cameraGuide}>
                <View style={styles.guideFrame}>
                  <View style={[styles.guideCorner, styles.guideTopLeft]} />
                  <View style={[styles.guideCorner, styles.guideTopRight]} />
                  <View style={[styles.guideCorner, styles.guideBottomLeft]} />
                  <View style={[styles.guideCorner, styles.guideBottomRight]} />
                </View>
              </View>

              <View style={styles.captureContainer}>
                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={handleCapture}
                  activeOpacity={0.7}
                >
                  <View style={styles.captureButtonInner} />
                </TouchableOpacity>
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
  messageText: {
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  permissionButton: {
    backgroundColor: '#0000FF',
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  permissionButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  closeButton: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },

  // Camera styles
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 48, 0.3)',
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
    fontFamily: 'Lato_700Bold',
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
    fontFamily: 'Lato_400Regular',
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
    margin: spacing.base,
  },
  previewImage: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  errorContainer: {
    marginHorizontal: spacing.base,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.error,
    textAlign: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  retakeButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.text,
    textTransform: 'uppercase',
  },
  confirmButton: {
    backgroundColor: '#0000FF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 6,
  },
  confirmButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
