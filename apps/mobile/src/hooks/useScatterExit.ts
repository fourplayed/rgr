import { useRef, useState, useCallback } from 'react';
import { Animated } from 'react-native';
import { SCATTER_EXIT } from '../theme/animation';

const MAX_SECTIONS = 8;

/**
 * Scatter-exit animation hook.
 *
 * Pre-allocates animated values for up to MAX_SECTIONS content sections.
 * When `scatter` is called, each section slides left/right (alternating)
 * and fades out with staggered timing.
 *
 * Follows the ScanSuccessFlash pre-allocated Animated.Value pattern.
 */
export function useScatterExit() {
  const [isScattering, setIsScattering] = useState(false);

  const items = useRef(
    Array.from({ length: MAX_SECTIONS }, () => ({
      opacity: new Animated.Value(1),
      translateX: new Animated.Value(0),
    }))
  ).current;

  const reset = useCallback(() => {
    for (const item of items) {
      item.opacity.setValue(1);
      item.translateX.setValue(0);
    }
    setIsScattering(false);
  }, [items]);

  const scatter = useCallback(
    (count: number, onComplete?: () => void) => {
      const n = Math.min(count, MAX_SECTIONS);
      setIsScattering(true);

      const animations = Array.from({ length: n }, (_, i) => {
        const direction = i % 2 === 0 ? -1 : 1;
        const item = items[i]!;
        return Animated.parallel([
          Animated.timing(item.opacity, {
            toValue: 0,
            duration: SCATTER_EXIT.duration,
            useNativeDriver: true,
          }),
          Animated.timing(item.translateX, {
            toValue: direction * SCATTER_EXIT.distance,
            duration: SCATTER_EXIT.duration,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.stagger(SCATTER_EXIT.staggerDelay, animations).start(({ finished }) => {
        if (finished) {
          setIsScattering(false);
          onComplete?.();
        }
      });
    },
    [items]
  );

  const getStyle = useCallback(
    (index: number) => {
      const item = items[Math.min(index, MAX_SECTIONS - 1)]!;
      return {
        opacity: item.opacity,
        transform: [{ translateX: item.translateX }],
      };
    },
    [items]
  );

  return { scatter, reset, getStyle, isScattering };
}
