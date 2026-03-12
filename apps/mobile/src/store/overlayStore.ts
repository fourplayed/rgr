import { create } from 'zustand';

interface OverlayState {
  overlayCount: number;
  incrementOverlay: () => void;
  decrementOverlay: () => void;
}

export const useOverlayStore = create<OverlayState>()((set) => ({
  overlayCount: 0,
  incrementOverlay: () => set((s) => ({ overlayCount: s.overlayCount + 1 })),
  decrementOverlay: () => set((s) => ({ overlayCount: Math.max(0, s.overlayCount - 1) })),
}));

export const useIsOverlayActive = () => useOverlayStore((s) => s.overlayCount > 0);
