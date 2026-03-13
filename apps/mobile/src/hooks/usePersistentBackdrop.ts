import { useRef, useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { BACKDROP_IN, SHEET_EXIT } from '../theme/animation';
import { useOverlayStore } from '../store/overlayStore';

interface PersistentBackdropOptions {
  /** Sync visibility to the global overlay store (default true).
   *  Set false for consumers that only animate from store state (e.g. HeaderBlurOverlay)
   *  to avoid double-counting. */
  syncOverlay?: boolean;
}

/**
 * Manages persistent backdrop opacity for modal chaining screens.
 *
 * Returns an Animated.Value for opacity, a `showBackdrop` flag for pointer events,
 * and a `mounted` flag that delays unmount until the fade-out animation completes
 * (avoids compositing an invisible BlurView on iOS).
 */
export function usePersistentBackdrop(isVisible: boolean, options?: PersistentBackdropOptions) {
  const { syncOverlay = true } = options ?? {};
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setMounted(true);
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: BACKDROP_IN.duration,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: SHEET_EXIT.duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [isVisible, backdropOpacity]);

  // Sync overlay ref count (write-only — uses getState to avoid re-renders)
  const overlayActiveRef = useRef(false);

  useEffect(() => {
    if (!syncOverlay) return;
    const store = useOverlayStore.getState();
    if (isVisible && !overlayActiveRef.current) {
      overlayActiveRef.current = true;
      store.incrementOverlay();
    } else if (!isVisible && overlayActiveRef.current) {
      overlayActiveRef.current = false;
      store.decrementOverlay();
    }
    return () => {
      if (syncOverlay && overlayActiveRef.current) {
        overlayActiveRef.current = false;
        useOverlayStore.getState().decrementOverlay();
      }
    };
  }, [isVisible, syncOverlay]);

  return { backdropOpacity, showBackdrop: isVisible, mounted };
}
