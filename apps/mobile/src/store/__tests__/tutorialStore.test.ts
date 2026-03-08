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
import { useTutorialStore } from '../tutorialStore';

describe('useTutorialStore', () => {
  beforeEach(async () => {
    await mockAsyncStorage.clear();
    useTutorialStore.setState({ seen: { scan: false }, _hasHydrated: false });
  });

  it('default seen has scan=false', () => {
    const { seen } = useTutorialStore.getState();
    expect(seen.scan).toBe(false);
  });

  it('markSeen("scan") sets true', () => {
    useTutorialStore.getState().markSeen('scan');
    expect(useTutorialStore.getState().seen.scan).toBe(true);
  });

  it('hasSeen returns false initially and true after markSeen', () => {
    expect(useTutorialStore.getState().hasSeen('scan')).toBe(false);
    useTutorialStore.getState().markSeen('scan');
    expect(useTutorialStore.getState().hasSeen('scan')).toBe(true);
  });

  it('resetAll restores defaults', () => {
    useTutorialStore.getState().markSeen('scan');
    useTutorialStore.getState().resetAll();
    expect(useTutorialStore.getState().seen.scan).toBe(false);
  });

  it('markSeen then resetAll clears flag', () => {
    useTutorialStore.getState().markSeen('scan');
    expect(useTutorialStore.getState().seen.scan).toBe(true);
    useTutorialStore.getState().resetAll();
    expect(useTutorialStore.getState().seen.scan).toBe(false);
  });

  it('initial _hasHydrated is false', () => {
    expect(useTutorialStore.getState()._hasHydrated).toBe(false);
  });

  it('persistence: markSeen writes value to AsyncStorage', async () => {
    useTutorialStore.getState().markSeen('scan');
    // Allow persistence middleware to flush
    await new Promise((r) => setTimeout(r, 50));
    const stored = await mockAsyncStorage.getItem('rgr-tutorials');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.state.seen.scan).toBe(true);
  });
});
