import { useRef, useEffect, useState } from 'react';
import { Animated } from 'react-native';
import { TAB_FADE } from '../theme/animation';

/**
 * Cross-fade between tabs without a flash.
 *
 * Returns `{ opacity, visibleTab }` — render content based on `visibleTab`
 * (not the raw activeTab) so the old content stays visible during fade-out.
 * The swap happens at opacity 0, then fades back in.
 */
export function useTabFade<T extends string>(activeTab: T) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [visibleTab, setVisibleTab] = useState(activeTab);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visibleTab === activeTab) return;

    // Stop any in-flight animation
    animRef.current?.stop();

    // Fade out old content, swap, fade in new content
    const fadeOut = Animated.timing(opacity, { toValue: 0, ...TAB_FADE });
    animRef.current = fadeOut;
    fadeOut.start(({ finished }) => {
      if (!finished) return;
      // Swap content at opacity 0 — no flash
      setVisibleTab(activeTab);
      const fadeIn = Animated.timing(opacity, { toValue: 1, ...TAB_FADE });
      animRef.current = fadeIn;
      fadeIn.start();
    });

    return () => {
      animRef.current?.stop();
      animRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visibleTab intentionally excluded to avoid re-triggering
  }, [activeTab, opacity]);

  return { opacity, visibleTab };
}
