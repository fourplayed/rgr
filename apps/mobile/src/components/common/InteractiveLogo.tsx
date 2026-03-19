import { useCallback } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';

const LOGO_WIDTH = 360;
const LOGO_HEIGHT = 180;

// Spring configs
const SNAP_BACK_SPRING = { damping: 12, stiffness: 150, mass: 0.8 };
const SCALE_SPRING = { damping: 10, stiffness: 200, mass: 0.5 };
const TILT_SPRING = { damping: 8, stiffness: 120, mass: 0.6 };

// Constraints
const MAX_DRAG = 80;
const MAX_TILT_DEG = 15;
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.6;
const SWIPE_VELOCITY_THRESHOLD = 800;

/**
 * Interactive logo with touch interactions + Lottie lightning overlay:
 * - Tilt to touch (pan maps to 3D rotation)
 * - Spring drag (drag & spring back)
 * - Spin on swipe (fast horizontal swipe = 360° spin)
 * - Pinch to scale (two-finger zoom with spring snap-back)
 * - Long press scale pulse (hold for haptic + bounce)
 * - Double-tap easter egg (pulse + haptic)
 * - Looping lightning bolt animation overlaid on the logo
 */
export function InteractiveLogo() {
  // --- Shared values ---
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const spinY = useSharedValue(0);
  const scale = useSharedValue(1);
  const pinchScale = useSharedValue(1);
  const savedPinchScale = useSharedValue(1);

  // --- Haptic helpers (must run on JS thread) ---
  const hapticLight = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const hapticMedium = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const hapticHeavy = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const hapticNotification = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  // --- Gestures ---

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(hapticLight)();
    })
    .onUpdate((event) => {
      const clampedX = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, event.translationX));
      const clampedY = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, event.translationY));

      translateX.value = clampedX;
      translateY.value = clampedY;

      rotateX.value = interpolate(clampedY, [-MAX_DRAG, MAX_DRAG], [MAX_TILT_DEG, -MAX_TILT_DEG]);
      rotateY.value = interpolate(clampedX, [-MAX_DRAG, MAX_DRAG], [-MAX_TILT_DEG, MAX_TILT_DEG]);
    })
    .onEnd((event) => {
      if (Math.abs(event.velocityX) > SWIPE_VELOCITY_THRESHOLD) {
        runOnJS(hapticMedium)();
        const direction = event.velocityX > 0 ? 1 : -1;
        spinY.value = withSequence(
          withTiming(spinY.value + direction * 360, {
            duration: 600,
            easing: Easing.out(Easing.cubic),
          })
        );
      }

      translateX.value = withSpring(0, SNAP_BACK_SPRING);
      translateY.value = withSpring(0, SNAP_BACK_SPRING);
      rotateX.value = withSpring(0, TILT_SPRING);
      rotateY.value = withSpring(0, TILT_SPRING);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedPinchScale.value = pinchScale.value;
    })
    .onUpdate((event) => {
      const newScale = savedPinchScale.value * event.scale;
      pinchScale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    })
    .onEnd(() => {
      runOnJS(hapticLight)();
      pinchScale.value = withSpring(1, SCALE_SPRING);
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(400)
    .onStart(() => {
      runOnJS(hapticHeavy)();
      scale.value = withSequence(
        withTiming(1.1, { duration: 300, easing: Easing.out(Easing.cubic) }),
        withSpring(1, SCALE_SPRING)
      );
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      runOnJS(hapticNotification)();
      scale.value = withSequence(
        withSpring(1.15, { damping: 4, stiffness: 300, mass: 0.4 }),
        withSpring(1, SCALE_SPRING)
      );
    });

  const tapGestures = Gesture.Exclusive(doubleTapGesture, longPressGesture);
  const dragGestures = Gesture.Simultaneous(panGesture, pinchGesture);
  const composedGesture = Gesture.Simultaneous(dragGestures, tapGestures);

  // --- Animated styles ---

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { perspective: 800 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value + spinY.value}deg` },
      { scale: scale.value * pinchScale.value },
    ],
  }));

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.lightningOverlay} pointerEvents="none">
            <LottieView
              source={require('../../assets/lightning.json')}
              autoPlay
              loop
              speed={1}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT + 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
  lightningOverlay: {
    position: 'absolute',
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
});
