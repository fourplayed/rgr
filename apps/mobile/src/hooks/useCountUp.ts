import { useRef, useEffect, useState } from 'react';

/**
 * Animates a number from its current value to `target` over `durationMs`.
 * Returns the current displayed value as an integer.
 *
 * When the target changes, animates from the previous displayed value to the
 * new target (showing the delta). When remounting with the same target,
 * snaps immediately to avoid a 0→N flash on tab switches.
 */
export function useCountUp(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number | null>(null);
  const prevTarget = useRef(target);
  const displayRef = useRef(target);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    // Skip animation if target hasn't changed
    if (target === prevTarget.current) return;

    const startValue = displayRef.current;
    prevTarget.current = target;

    if (target === 0) {
      setDisplay(0);
      displayRef.current = 0;
      return;
    }

    const startTime = Date.now();

    const animate = () => {
      if (!activeRef.current) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic for a natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (target - startValue) * eased);
      setDisplay(current);
      displayRef.current = current;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      activeRef.current = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return display;
}
