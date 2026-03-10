import { useRef, useEffect, useState } from 'react';
import { Animated } from 'react-native';

/**
 * Manages persistent backdrop opacity for modal chaining screens.
 *
 * Returns an Animated.Value for opacity, a `showBackdrop` flag for pointer events,
 * and a `mounted` flag that delays unmount until the fade-out animation completes
 * (avoids compositing an invisible BlurView on iOS).
 */
export function usePersistentBackdrop(isVisible: boolean) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setMounted(true);
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [isVisible, backdropOpacity]);

  return { backdropOpacity, showBackdrop: isVisible, mounted };
}
