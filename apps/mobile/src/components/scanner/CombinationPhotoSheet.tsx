import React, { useRef, useCallback, useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LoadingDots } from '../common/LoadingDots';
import { logger } from '../../utils/logger';
import { colors } from '../../theme/colors';
import { spacing, fontSize, borderRadius } from '../../theme/spacing';

interface CombinationPhotoSheetProps {
  visible: boolean;
  /** Asset numbers in the combination for display */
  assetNumbers: string[];
  onCapture: (photoUri: string) => void;
  onNotesChange: (notes: string) => void;
  onComplete: () => void;
  onSkip: () => void;
  onDismiss?: () => void;
}

function CombinationPhotoSheetComponent({
  visible,
  assetNumbers,
  onCapture,
  onNotesChange,
  onComplete,
  onSkip,
  onDismiss,
}: CombinationPhotoSheetProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setCapturedUri(null);
      setNotes('');
      setIsCapturing(false);
    }
  }, [visible]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        onCapture(photo.uri);
      }
    } catch (error) {
      logger.error('Failed to take photo', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
  }, []);

  const handleNotesChange = useCallback((text: string) => {
    setNotes(text);
    onNotesChange(text);
  }, [onNotesChange]);

  const handleComplete = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  // Format asset numbers for display
  const assetsDisplay = assetNumbers.join(' + ');

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleSkip} onDismiss={onDismiss}>
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
      <Modal visible={visible} animationType="slide" onRequestClose={handleSkip} onDismiss={onDismiss}>
        <View style={styles.container}>
          <SafeAreaView style={styles.centered}>
            <Text style={styles.messageText}>Camera permission is required</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip Photo</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleSkip} onDismiss={onDismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {capturedUri ? (
          // Preview + Notes Mode
          <SafeAreaView style={styles.previewContainer}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.headerButton} onPress={handleSkip}>
                <Ionicons name="close" size={28} color={colors.textInverse} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Combination Photo</Text>
                <Text style={styles.headerSubtitle}>{assetsDisplay}</Text>
              </View>
              <View style={styles.headerButton} />
            </View>

            <ScrollView
              style={styles.previewScroll}
              contentContainerStyle={styles.previewScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.previewImageContainer}>
                <Image
                  source={{ uri: capturedUri }}
                  style={styles.previewImage}
                  contentFit="contain"
                />
                <TouchableOpacity style={styles.retakeOverlay} onPress={handleRetake}>
                  <Ionicons name="refresh" size={20} color={colors.textInverse} />
                  <Text style={styles.retakeOverlayText}>Retake</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes about this combination..."
                  placeholderTextColor={colors.textSecondary}
                  value={notes}
                  onChangeText={handleNotesChange}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.doneButton]}
                onPress={handleComplete}
              >
                <Ionicons name="checkmark" size={24} color={colors.textInverse} />
                <Text style={styles.doneButtonText}>Done</Text>
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
                <TouchableOpacity style={styles.headerButton} onPress={handleSkip}>
                  <Ionicons name="close" size={28} color={colors.textInverse} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>Capture Combination</Text>
                  <Text style={styles.headerSubtitle}>{assetsDisplay}</Text>
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
                <Text style={styles.guideText}>Position combined assets in frame</Text>
              </View>

              <View style={styles.captureContainer}>
                <TouchableOpacity style={styles.skipPhotoButton} onPress={handleSkip}>
                  <Text style={styles.skipPhotoButtonText}>Skip Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureButton}
                  onPress={handleCapture}
                  activeOpacity={0.7}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <LoadingDots color={colors.textInverse} size={8} />
                  ) : (
                    <View style={styles.captureButtonInner} />
                  )}
                </TouchableOpacity>

                <View style={styles.captureButtonSpacer} />
              </View>
            </SafeAreaView>
          </CameraView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const CombinationPhotoSheet = memo(CombinationPhotoSheetComponent);

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
    backgroundColor: colors.primary,
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  skipButton: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonText: {
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
  headerSubtitle: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.electricBlue,
    marginTop: 2,
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
    marginTop: spacing.lg,
    fontSize: fontSize.sm,
    fontFamily: 'Lato_400Regular',
    color: colors.textInverse,
    opacity: 0.8,
    letterSpacing: 0.5,
  },

  // Capture controls
  captureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  skipPhotoButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipPhotoButtonText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    opacity: 0.7,
    textTransform: 'uppercase',
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
  captureButtonSpacer: {
    width: 60,
  },

  // Preview styles
  previewContainer: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    padding: spacing.base,
  },
  previewImageContainer: {
    aspectRatio: 4 / 3,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  previewImage: {
    flex: 1,
  },
  retakeOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  retakeOverlayText: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },

  // Notes section
  notesSection: {
    marginBottom: spacing.lg,
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    fontSize: fontSize.base,
    fontFamily: 'Lato_400Regular',
    color: colors.text,
    minHeight: 80,
  },

  // Preview actions
  previewActions: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  doneButton: {
    backgroundColor: colors.success,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  doneButtonText: {
    fontSize: fontSize.lg,
    fontFamily: 'Lato_700Bold',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
