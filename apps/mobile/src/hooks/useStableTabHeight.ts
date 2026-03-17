import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Tracks the maximum tab content height across tab switches to prevent
 * gorhom dynamic-sizing sheets from collapsing when switching to shorter tabs.
 *
 * @param resetKey - When this value changes, the tracked height resets (e.g. isCreating flag)
 * @returns { minHeight, onLayout } — apply minHeight to the tab content wrapper, onLayout to its View
 */
export function useStableTabHeight(resetKey: unknown) {
  const maxRef = useRef(0);
  const [minHeight, setMinHeight] = useState(0);

  // Synchronous ref reset (avoids one-frame stale minHeight)
  const prevKeyRef = useRef(resetKey);
  if (prevKeyRef.current !== resetKey) {
    prevKeyRef.current = resetKey;
    maxRef.current = 0;
  }

  // State reset deferred to effect (setState during render risks loops)
  useEffect(() => {
    setMinHeight(0);
  }, [resetKey]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > maxRef.current) {
      maxRef.current = h;
      setMinHeight(h);
    }
  }, []);

  return { minHeight, onLayout };
}
