import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { TAB_FADE } from '../theme/animation';

export function useTabFade(activeTab: string) {
  const opacity = useRef(new Animated.Value(1)).current;
  const prevTab = useRef(activeTab);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (prevTab.current !== activeTab) {
      prevTab.current = activeTab;

      // Stop any in-flight animation before starting a new one
      animRef.current?.stop();

      const fadeOut = Animated.timing(opacity, { toValue: 0, ...TAB_FADE });
      animRef.current = fadeOut;
      fadeOut.start(({ finished }) => {
        if (!finished) return; // interrupted by unmount or new tab change
        const fadeIn = Animated.timing(opacity, { toValue: 1, ...TAB_FADE });
        animRef.current = fadeIn;
        fadeIn.start();
      });
    }

    return () => {
      animRef.current?.stop();
      animRef.current = null;
    };
  }, [activeTab, opacity]);

  return { opacity };
}
