import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages modal state transitions where one modal must fully unmount
 * before another opens. Replaces the fragile double-rAF pattern.
 *
 * Usage:
 *   const { modal, closeModal, transitionTo } = useModalTransition<MyModalState>({ type: 'none' });
 */
export function useModalTransition<T extends { type: string }>(initial: T) {
  const [modal, setModal] = useState<T>(initial);
  const pendingTransition = useRef<T | null>(null);
  const rafRef = useRef<{ outer: number | null; inner: number | null }>({ outer: null, inner: null });

  useEffect(() => {
    return () => {
      if (rafRef.current.outer != null) cancelAnimationFrame(rafRef.current.outer);
      if (rafRef.current.inner != null) cancelAnimationFrame(rafRef.current.inner);
      pendingTransition.current = null;
    };
  }, []);

  const closeModal = useCallback(() => setModal(initial), [initial]);

  const transitionTo = useCallback((next: T) => {
    // Cancel any in-flight transition
    if (rafRef.current.outer != null) cancelAnimationFrame(rafRef.current.outer);
    if (rafRef.current.inner != null) cancelAnimationFrame(rafRef.current.inner);

    pendingTransition.current = next;
    setModal(initial);
    // Double rAF ensures the current modal fully unmounts (native layer)
    // before the next one mounts, preventing visual glitches
    rafRef.current.outer = requestAnimationFrame(() => {
      rafRef.current.outer = null;
      rafRef.current.inner = requestAnimationFrame(() => {
        rafRef.current.inner = null;
        if (pendingTransition.current) {
          setModal(pendingTransition.current);
          pendingTransition.current = null;
        }
      });
    });
  }, [initial]);

  return { modal, closeModal, transitionTo } as const;
}
