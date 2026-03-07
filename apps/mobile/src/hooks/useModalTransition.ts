import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages modal state transitions with callback-driven sequencing.
 *
 * - `transitionTo(B)`: closes current modal, waits for exit animation, then opens B
 * - `handleExitComplete`: wire to the active SheetModal's `onExitComplete`
 * - `isTransitioning`: true while waiting for the old modal to exit
 *
 * Safety: 500ms timeout prevents permanent stuck state if onExitComplete never fires.
 */
export function useModalTransition<T extends { type: string }>(initial: T) {
  const [modal, setModal] = useState<T>(initial);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingRef = useRef<T | null>(null);
  const generationRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
      pendingRef.current = null;
    };
  }, []);

  const clearSafetyTimeout = useCallback(() => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const mountPending = useCallback(() => {
    clearSafetyTimeout();
    const next = pendingRef.current;
    pendingRef.current = null;
    setIsTransitioning(false);
    if (next) {
      setModal(next);
    }
  }, [clearSafetyTimeout]);

  const closeModal = useCallback(() => {
    clearSafetyTimeout();
    pendingRef.current = null;
    setIsTransitioning(false);
    setModal(initial);
  }, [initial, clearSafetyTimeout]);

  const transitionTo = useCallback(
    (next: T) => {
      clearSafetyTimeout();
      generationRef.current += 1;

      if (modal.type === initial.type) {
        // Nothing currently open — mount directly
        setModal(next);
        return;
      }

      // Something is open — close it and wait for exit callback
      pendingRef.current = next;
      setIsTransitioning(true);
      setModal(initial);

      // Safety timeout: force-mount if onExitComplete doesn't fire
      const gen = generationRef.current;
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (generationRef.current === gen) {
          mountPending();
        }
      }, 500);
    },
    [initial, modal.type, clearSafetyTimeout, mountPending]
  );

  const handleExitComplete = useCallback(() => {
    if (!pendingRef.current) return;
    mountPending();
  }, [mountPending]);

  return {
    modal,
    closeModal,
    transitionTo,
    isTransitioning,
    handleExitComplete,
  } as const;
}
