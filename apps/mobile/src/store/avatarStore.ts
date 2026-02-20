import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ionicons } from '@expo/vector-icons';

const AVATAR_STORAGE_KEY = '@rgr_avatar_id';

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
  selectedAvatarId: string;
  isLoading: boolean;
  loadAvatar: () => Promise<void>;
  setAvatar: (avatarId: string) => Promise<void>;
  getSelectedAvatar: () => AvatarOption;
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  selectedAvatarId: 'person',
  isLoading: true,

  loadAvatar: async () => {
    try {
      const storedAvatarId = await AsyncStorage.getItem(AVATAR_STORAGE_KEY);
      if (storedAvatarId && AVATAR_OPTIONS.some(opt => opt.id === storedAvatarId)) {
        set({ selectedAvatarId: storedAvatarId, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setAvatar: async (avatarId: string) => {
    try {
      await AsyncStorage.setItem(AVATAR_STORAGE_KEY, avatarId);
      set({ selectedAvatarId: avatarId });
    } catch {
      // Silently fail, keep current selection
    }
  },

  getSelectedAvatar: (): AvatarOption => {
    const { selectedAvatarId } = get();
    const found = AVATAR_OPTIONS.find(opt => opt.id === selectedAvatarId);
    return found ?? DEFAULT_AVATAR;
  },
}));
