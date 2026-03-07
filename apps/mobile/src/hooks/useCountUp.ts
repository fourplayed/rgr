import { useRef, useEffect, useState } from 'react';

/**
 * Animates a number from 0 to `target` over `durationMs`.
 * Returns the current displayed value as an integer.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    // Skip animation if target hasn't changed meaningfully
    if (target === prevTarget.current && display === target) return;
    prevTarget.current = target;

    if (target === 0) {
      setDisplay(0);
      return;
    }

    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic for a natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (target - startValue) * eased);
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return display;
}
