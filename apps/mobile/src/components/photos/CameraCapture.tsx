import React, { useRef, useCallback, useEffect, useState, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { PhotoType } from '@rgr/shared';
import { usePhotoCapture } from '../../hooks/usePhotoCapture';
import { LoadingDots } from '../common/LoadingDots';
import { colors } from '../../theme/colors';
import {
  spacing,
  fontSize,
  lineHeight,
  borderRadius,
  shadows,
  fontFamily as fonts,
} from '../../theme/spacing';
import { FULLSCREEN_SPRING, SHEET_EXIT } from '../../theme/animation';
import { AppText } from '../common';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface CameraCaptureProps {
  visible: boolean;
  assetId: string;
  photoType?: PhotoType;
  scanEventId?: string | null;
  locationDescription?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  onClose: () => void;
  /** Called with the captured photo URI (parent dispatches CAMERA_CAPTURED) */
  onCapturedUri?: (uri: string) => void;
  /** @deprecated Use onCapturedUri instead — kept for backward compat during migration */
  onPhotoCaptured?: () => void;
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
  onCapturedUri,
  onPhotoCaptured,
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

  const { takePhoto, startCapture, cancelCapture } = usePhotoCapture();

  // Full-screen spring entrance
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (!visible) return;
    slideY.setValue(SCREEN_HEIGHT);
    const anim = Animated.spring(slideY, { toValue: 0, ...FULLSCREEN_SPRING });
    anim.start();
    return () => anim.stop();
  }, [visible, slideY]);

  const handleAnimatedClose = useCallback(() => {
    Animated.timing(slideY, { toValue: SCREEN_HEIGHT, ...SHEET_EXIT }).start(() => {
      cancelCapture();
      onClose();
    });
  }, [slideY, cancelCapture, onClose]);

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
    const uri = await takePhoto(cameraRef);
    if (uri) {
      // Slide camera down before signaling parent (mirrors handleAnimatedClose)
      Animated.timing(slideY, { toValue: SCREEN_HEIGHT, ...SHEET_EXIT }).start(() => {
        if (onCapturedUri) {
          onCapturedUri(uri);
        } else {
          onPhotoCaptured?.();
        }
      });
    }
  }, [takePhoto, onCapturedUri, onPhotoCaptured, slideY]);

  const handleClose = handleAnimatedClose;

  const [torchOn, setTorchOn] = useState(false);

  // Pulse guide corners — only while the camera Modal is visible.
  // Stopping the loop when invisible is critical: Animated.loop holds an
  // InteractionManager handle that blocks runAfterInteractions in other
  // components (e.g. SheetModal deferring present() after camera closes).
  const guideOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!visible) {
      guideOpacity.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(guideOpacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(guideOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [visible, guideOpacity]);

  // Permission checking state
  if (!permission) {
    return (
      <Modal
        visible={visible}
        animationType="none"
        onRequestClose={handleClose}
        onDismiss={onDismiss}
      >
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateY: slideY }] }]}>
          <SafeAreaProvider>
            <View style={styles.container}>
              <SafeAreaView style={styles.centered}>
                <Ionicons
                  name="camera-outline"
                  size={48}
                  color={colors.electricBlue}
                  style={styles.checkingIcon}
                />
                <AppText style={styles.messageText}>Checking Camera...</AppText>
                <LoadingDots color={colors.textSecondary} size={8} />
              </SafeAreaView>
            </View>
          </SafeAreaProvider>
        </Animated.View>
      </Modal>
    );
  }

  // Permission denied state
  if (!permission.granted) {
    const permanentlyDenied = permission.canAskAgain === false;
    return (
      <Modal
        visible={visible}
        animationType="none"
        onRequestClose={handleClose}
        onDismiss={onDismiss}
      >
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateY: slideY }] }]}>
          <SafeAreaProvider>
            <View style={styles.container}>
              <SafeAreaView style={styles.centered}>
                <View style={styles.permissionCard}>
                  <Ionicons
                    name="ban-outline"
                    size={48}
                    color={colors.error}
                    style={styles.permissionIcon}
                  />
                  <AppText style={styles.permissionTitle}>Camera Access Required</AppText>
                  <AppText style={styles.permissionBody}>
                    {permanentlyDenied
                      ? 'Camera permission was denied. Please enable it in your device Settings to capture photos.'
                      : 'Camera permission is needed to capture photos. Enable it in your device Settings.'}
                  </AppText>
                  <View style={styles.permissionButtonRow}>
                    <TouchableOpacity
                      style={styles.permissionCancelButton}
                      onPress={handleClose}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel"
                    >
                      <AppText style={styles.permissionCancelButtonText}>Cancel</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.permissionGrantButton}
                      onPress={permanentlyDenied ? () => Linking.openSettings() : requestPermission}
                      accessibilityRole="button"
                      accessibilityLabel={
                        permanentlyDenied ? 'Open device settings' : 'Grant camera permission'
                      }
                    >
                      <AppText style={styles.permissionGrantButtonText}>
                        {permanentlyDenied ? 'Open Settings' : 'Grant'}
                      </AppText>
                    </TouchableOpacity>
                  </View>
                </View>
              </SafeAreaView>
            </View>
          </SafeAreaProvider>
        </Animated.View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
      onDismiss={onDismiss}
    >
      <Animated.View style={[{ flex: 1 }, { transform: [{ translateY: slideY }] }]}>
        <SafeAreaProvider>
          <View style={styles.container}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" enableTorch={torchOn}>
              <SafeAreaView style={styles.cameraOverlay}>
                <View style={styles.topBar}>
                  <TouchableOpacity
                    style={styles.topBarButton}
                    onPress={() => setTorchOn((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={torchOn ? 'Turn off torch' : 'Turn on torch'}
                  >
                    <Ionicons
                      name={torchOn ? 'flashlight' : 'flashlight-outline'}
                      size={22}
                      color={torchOn ? colors.warning : colors.textInverse}
                    />
                  </TouchableOpacity>
                  <View style={styles.topBarTitleCenter}>
                    <AppText style={styles.topBarTitleText}>Capture Photo</AppText>
                    <AppText style={styles.topBarSubtitleText}>{getGuideText(photoType)}</AppText>
                  </View>
                  <TouchableOpacity
                    style={styles.topBarButton}
                    onPress={handleClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close camera"
                  >
                    <Ionicons name="close" size={24} color={colors.textInverse} />
                  </TouchableOpacity>
                </View>

                <View style={styles.cameraGuide}>
                  <Animated.View style={[styles.guideFrame, { opacity: guideOpacity }]}>
                    <View style={[styles.guideCorner, styles.guideTopLeft]} />
                    <View style={[styles.guideCorner, styles.guideTopRight]} />
                    <View style={[styles.guideCorner, styles.guideBottomLeft]} />
                    <View style={[styles.guideCorner, styles.guideBottomRight]} />
                  </Animated.View>
                </View>

                <View style={styles.cameraCaptureBand}>
                  <View style={styles.captureContainer}>
                    <TouchableOpacity
                      style={styles.captureButton}
                      onPress={handleCapture}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Take photo"
                      accessibilityHint="Double tap to capture a photo"
                    >
                      <View style={[styles.captureButtonInner]} />
                    </TouchableOpacity>
                  </View>
                </View>
              </SafeAreaView>
            </CameraView>
          </View>
        </SafeAreaProvider>
      </Animated.View>
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
    lineHeight: lineHeight.snug,
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  topBarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitleCenter: {
    flex: 1,
    alignItems: 'center',
  },
  topBarTitleText: {
    fontSize: fontSize.sm,
    fontFamily: fonts.bold,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  topBarSubtitleText: {
    fontSize: fontSize.xs,
    fontFamily: fonts.regular,
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  cameraCaptureBand: {
    paddingTop: spacing.xl,
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
    borderColor: colors.electricBlue,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.electricBlue,
  },
});
