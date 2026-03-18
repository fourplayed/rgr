import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Smooth fade+slide entrance for sheet modal content.
 * Returns an animated style to apply to a wrapping Animated.View.
 *
 * Triggers on false→true edge of `visible`. Resets on close so
 * the next open plays the animation fresh.
 *
 * ⚠️ Do not use inside BottomSheetScrollView — the Animated.View wrapper
 * breaks gorhom's native keyboard scroll measurement. Use only for
 * non-scrollable sheet content.
 *
 * @param visible - whether the sheet is currently visible
 * @param delay - ms before animation starts (default 150)
 * @param duration - animation duration in ms (default 300)
 */
export function useSheetEntrance(visible: boolean, delay = 150, duration = 300) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible && !wasVisible.current) {
      // false→true edge: play entrance
      opacity.setValue(0);
      translateY.setValue(6);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!visible && wasVisible.current) {
      // true→false edge: reset for next open
      opacity.setValue(0);
      translateY.setValue(6);
    }
    wasVisible.current = visible;
  }, [visible, delay, duration, opacity, translateY]);

  return {
    opacity,
    transform: [{ translateY }],
  } as const;
}
