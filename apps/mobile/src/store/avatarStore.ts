import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ionicons } from '@expo/vector-icons';

export type AvatarIconName = keyof typeof Ionicons.glyphMap;

export interface AvatarOption {
  id: string;
  icon: AvatarIconName;
  label: string;
}

const DEFAULT_AVATAR: AvatarOption = { id: 'person', icon: 'person', label: 'Person' };

export const AVATAR_OPTIONS: AvatarOption[] = [
  DEFAULT_AVATAR,
  { id: 'happy', icon: 'happy', label: 'Happy' },
  { id: 'rocket', icon: 'rocket', label: 'Rocket' },
  { id: 'star', icon: 'star', label: 'Star' },
  { id: 'heart', icon: 'heart', label: 'Heart' },
  { id: 'leaf', icon: 'leaf', label: 'Leaf' },
  { id: 'football', icon: 'football', label: 'Football' },
  { id: 'musical-notes', icon: 'musical-notes', label: 'Music' },
  { id: 'paw', icon: 'paw', label: 'Paw' },
  { id: 'flash', icon: 'flash', label: 'Flash' },
  { id: 'planet', icon: 'planet', label: 'Planet' },
  { id: 'game-controller', icon: 'game-controller', label: 'Gaming' },
];

interface AvatarState {
  _hasHydrated: boolean;
  selectedAvatarId: string;
  setAvatar: (avatarId: string) => void;
  getSelectedAvatar: () => AvatarOption;
}

export const useAvatarStore = create<AvatarState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      selectedAvatarId: 'person',

      setAvatar: (avatarId: string) => {
        set({ selectedAvatarId: avatarId });
      },

      getSelectedAvatar: (): AvatarOption => {
        const { selectedAvatarId } = get();
        const found = AVATAR_OPTIONS.find((opt) => opt.id === selectedAvatarId);
        return found ?? DEFAULT_AVATAR;
      },
    }),
    {
      name: 'rgr-avatar',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        selectedAvatarId: state.selectedAvatarId,
      }),
      onRehydrateStorage: () => () => {
        useAvatarStore.setState({ _hasHydrated: true });
      },
    }
  )
);
