jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve();
      }),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const mockAsyncStorage = require('@react-native-async-storage/async-storage').default;
import { useAvatarStore, AVATAR_OPTIONS } from '../avatarStore';

describe('useAvatarStore', () => {
  beforeEach(async () => {
    await mockAsyncStorage.clear();
    useAvatarStore.setState({ selectedAvatarId: 'person', _hasHydrated: false });
  });

  it('default selectedAvatarId is "person"', () => {
    expect(useAvatarStore.getState().selectedAvatarId).toBe('person');
  });

  it('setAvatar("rocket") updates selectedAvatarId', () => {
    useAvatarStore.getState().setAvatar('rocket');
    expect(useAvatarStore.getState().selectedAvatarId).toBe('rocket');
  });

  it('getSelectedAvatar() returns matching AvatarOption', () => {
    useAvatarStore.getState().setAvatar('rocket');
    const avatar = useAvatarStore.getState().getSelectedAvatar();
    expect(avatar.id).toBe('rocket');
  });

  it('getSelectedAvatar() returns DEFAULT_AVATAR for unknown id', () => {
    useAvatarStore.setState({ selectedAvatarId: 'nonexistent-id' });
    const avatar = useAvatarStore.getState().getSelectedAvatar();
    expect(avatar.id).toBe('person');
    expect(avatar.icon).toBe('person');
    expect(avatar.label).toBe('Person');
  });

  it('AVATAR_OPTIONS contains expected entries', () => {
    expect(AVATAR_OPTIONS.length).toBeGreaterThan(0);
    const ids = AVATAR_OPTIONS.map((o) => o.id);
    expect(ids).toContain('person');
    AVATAR_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty('id');
      expect(option).toHaveProperty('icon');
      expect(option).toHaveProperty('label');
    });
  });

  it('set then get round-trips', () => {
    useAvatarStore.getState().setAvatar('rocket');
    const avatar = useAvatarStore.getState().getSelectedAvatar();
    expect(avatar.id).toBe('rocket');
    useAvatarStore.getState().setAvatar('person');
    const avatar2 = useAvatarStore.getState().getSelectedAvatar();
    expect(avatar2.id).toBe('person');
  });
});
