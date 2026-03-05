import { useRef, useCallback } from 'react';

/**
 * Prevents double-submit by guarding an async handler with a ref-based lock.
 * The ref flip is synchronous, so it blocks the second tap even before React re-renders.
 */
export function useSubmitGuard() {
  const ref = useRef(false);
  const guard = useCallback(async (fn: () => Promise<void>) => {
    if (ref.current) return;
    ref.current = true;
    try {
      await fn();
    } finally {
      ref.current = false;
    }
  }, []);
  return guard;
}
