import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Returns an Animated.Value (opacity 0→1) for staggered list item entrances.
 * Each item fades in after `index * staggerMs` delay.
 *
 * Usage in FlatList renderItem:
 *   const opacity = useStaggeredEntrance(index);
 *   return <Animated.View style={{ opacity }}>{...}</Animated.View>;
 */
export function useStaggeredEntrance(index: number, staggerMs = 80): Animated.Value {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * staggerMs;
    const anim = Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      delay,
      useNativeDriver: true,
    });
    anim.start();

    return () => {
      anim.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- opacity is a stable ref, not a dependency
  }, [index, staggerMs]);

  return opacity;
}
