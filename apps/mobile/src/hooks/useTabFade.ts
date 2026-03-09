import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { TAB_FADE } from '../theme/animation';

export function useTabFade(activeTab: string) {
  const opacity = useRef(new Animated.Value(1)).current;
  const prevTab = useRef(activeTab);

  useEffect(() => {
    if (prevTab.current !== activeTab) {
      prevTab.current = activeTab;
      // Fade out, then fade in
      Animated.timing(opacity, { toValue: 0, ...TAB_FADE }).start(() => {
        Animated.timing(opacity, { toValue: 1, ...TAB_FADE }).start();
      });
    }
  }, [activeTab, opacity]);

  return { opacity };
}
