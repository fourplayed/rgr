import { useRef, useEffect, useCallback } from 'react';
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

const MAX_ENTRANCE_SECTIONS = 8;

/**
 * Batch variant: pre-allocates staggered opacity values for N sections.
 * Returns `getEntryStyle(index)` whose `.opacity` is an Animated.Value
 * that can be composed with other animated styles via `Animated.multiply`.
 *
 * Pass count=0 while loading, then the real count when data arrives —
 * the entrance will play once on the 0→N transition.
 */
export function useStaggeredEntrances(count: number, staggerMs = 80) {
  const opacities = useRef(
    Array.from({ length: MAX_ENTRANCE_SECTIONS }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (count === 0) return;
    const n = Math.min(count, MAX_ENTRANCE_SECTIONS);

    for (let i = 0; i < n; i++) opacities[i]!.setValue(0);

    const anims = Array.from({ length: n }, (_, i) =>
      Animated.timing(opacities[i]!, {
        toValue: 1,
        duration: 300,
        delay: i * staggerMs,
        useNativeDriver: true,
      })
    );

    Animated.parallel(anims).start();

    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- opacities is a stable ref
  }, [count, staggerMs]);

  const getEntryStyle = useCallback(
    (index: number) => ({
      opacity: opacities[Math.min(index, MAX_ENTRANCE_SECTIONS - 1)]!,
    }),
    [opacities]
  );

  return { getEntryStyle };
}
