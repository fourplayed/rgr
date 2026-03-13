import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages modal state transitions with callback-driven sequencing.
 *
 * Designed for @gorhom/bottom-sheet's BottomSheetModal lifecycle:
 * - `transitionTo(B)`: closes current modal A, waits for gorhom's onDismiss, then opens B
 * - `handleExitComplete`: wire to SheetModal's `onExitComplete` (fires after gorhom dismiss)
 * - `isTransitioning`: true while waiting for the old modal to exit
 *
 * Dismiss-source discrimination:
 * - Code-driven dismiss (A→B transition): `isTransitioningRef` is true → advance to B
 * - User swipe dismiss: `isTransitioningRef` is false → close modal entirely
 *
 * Safety: 1500ms timeout prevents permanent stuck state if onDismiss never fires.
 *
 * IMPORTANT: `initial` is captured by ref on first call — callers can pass inline
 * objects (e.g. `{ type: 'none' }`) without causing callback cascade recreations.
 */
export function useModalTransition<T extends { type: string }>(initial: T) {
  // Stabilize `initial` by ref so inline `{ type: 'none' }` objects don't cause
  // closeModal/transitionTo/handleExitComplete to recreate every render.
  // The initial value never changes for a given hook instance.
  const initialRef = useRef(initial);

  const [modal, setModal] = useState<T>(initial);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const pendingRef = useRef<T | null>(null);
  const isTransitioningRef = useRef(false);
  const generationRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
      pendingRef.current = null;
      isTransitioningRef.current = false;
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
    isTransitioningRef.current = false;
    setIsTransitioning(false);
    if (next) {
      setModal(next);
    }
  }, [clearSafetyTimeout]);

  const closeModal = useCallback(() => {
    clearSafetyTimeout();
    pendingRef.current = null;
    isTransitioningRef.current = false;
    setIsTransitioning(false);
    setModal(initialRef.current);
  }, [clearSafetyTimeout]);

  const transitionTo = useCallback(
    (next: T) => {
      clearSafetyTimeout();
      generationRef.current += 1;

      if (modal.type === initialRef.current.type) {
        // Nothing currently open — mount directly
        setModal(next);
        return;
      }

      // Something is open — close it and wait for exit callback
      pendingRef.current = next;
      isTransitioningRef.current = true;
      setIsTransitioning(true);
      setModal(initialRef.current);

      // Safety timeout: force-mount if onDismiss doesn't fire
      const gen = generationRef.current;
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        if (generationRef.current === gen) {
          if (__DEV__) {
            console.warn(
              '[useModalTransition] Safety timeout — onExitComplete not received within 1500ms'
            );
          }
          mountPending();
        }
      }, 1500);
    },
    [modal.type, clearSafetyTimeout, mountPending]
  );

  const handleExitComplete = useCallback(() => {
    if (isTransitioningRef.current && pendingRef.current) {
      // Code-driven dismiss (A→B transition) — advance to B
      mountPending();
    } else if (!isTransitioningRef.current) {
      // User swiped to dismiss — close entirely
      closeModal();
    }
  }, [mountPending, closeModal]);

  return {
    modal,
    closeModal,
    transitionTo,
    isTransitioning,
    handleExitComplete,
  } as const;
}
