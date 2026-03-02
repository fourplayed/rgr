import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TutorialKey = 'scan' | 'count';

interface TutorialState {
  _hasHydrated: boolean;
  seen: Record<TutorialKey, boolean>;
  markSeen: (key: TutorialKey) => void;
  hasSeen: (key: TutorialKey) => boolean;
  resetAll: () => void;
}

const defaultSeen: Record<TutorialKey, boolean> = {
  scan: false,
  count: false,
};

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      seen: { ...defaultSeen },

      markSeen: (key) =>
        set((state) => ({
          seen: { ...state.seen, [key]: true },
        })),

      hasSeen: (key) => get().seen[key],

      resetAll: () => set({ seen: { ...defaultSeen } }),
    }),
    {
      name: 'rgr-tutorials',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted, _version) => {
        // Placeholder for future tutorial additions
        return persisted as TutorialState;
      },
      partialize: (state) => ({
        seen: state.seen,
      }),
      onRehydrateStorage: () => () => {
        useTutorialStore.setState({ _hasHydrated: true });
      },
    }
  )
);
