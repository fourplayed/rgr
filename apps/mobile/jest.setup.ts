/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Shared mocks for mobile test suite.
 *
 * Per-file jest.mock() calls override these globals, so existing tests
 * (e.g. offlineMutationQueue.test.ts) with their own mocks are unaffected.
 *
 * IMPORTANT: Variables referenced inside jest.mock() factories must be
 * prefixed with `mock` (case insensitive) due to Jest's hoisting rules.
 */

// ── expo-secure-store ────────────────────────────────────────────────────────

const mockSecureStoreMap = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStoreMap.set(key, value);
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => {
    return Promise.resolve(mockSecureStoreMap.get(key) ?? null);
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockSecureStoreMap.delete(key);
    return Promise.resolve();
  }),
  __store: mockSecureStoreMap,
}));

// ── expo-location ────────────────────────────────────────────────────────────

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: -31.9505,
        longitude: 115.8605,
        accuracy: 10,
        altitude: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    })
  ),
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
}));

// ── @react-native-async-storage/async-storage ────────────────────────────────

let mockAsyncStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockAsyncStore[key] ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockAsyncStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockAsyncStore[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockAsyncStore = {};
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map((k) => [k, mockAsyncStore[k] ?? null]))
    ),
    multiSet: jest.fn((pairs: [string, string][]) => {
      pairs.forEach(([k, v]) => {
        mockAsyncStore[k] = v;
      });
      return Promise.resolve();
    }),
  },
}));

// Note: Logger is NOT mocked globally to avoid breaking existing tests
// (e.g. errorReporting.test.ts). Tests that need silence can mock locally.

// Note: afterEach is not available in setupFiles context.
// Individual test files handle their own cleanup.
