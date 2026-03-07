import { useCallback, useRef, useState } from 'react';

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

  const closeModal = useCallback(() => setModal(initial), [initial]);

  const transitionTo = useCallback((next: T) => {
    pendingTransition.current = next;
    setModal(initial);
    // Double rAF ensures the current modal fully unmounts (native layer)
    // before the next one mounts, preventing visual glitches
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (pendingTransition.current) {
          setModal(pendingTransition.current);
          pendingTransition.current = null;
        }
      });
    });
  }, [initial]);

  return { modal, closeModal, transitionTo } as const;
}
