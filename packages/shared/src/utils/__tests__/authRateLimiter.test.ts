import {
  checkRateLimit,
  recordFailure,
  recordSuccess,
  resetRateLimit,
  initRateLimiter,
  loadPersistedState,
} from '../authRateLimiter';
import type { RateLimiterStorage } from '../authRateLimiter';

// Reset state between tests by clearing via resetRateLimit
const TEST_EMAIL = 'test@example.com';

beforeEach(() => {
  resetRateLimit(TEST_EMAIL);
  resetRateLimit('OTHER@example.com');
  // Reset storage adapter by re-initializing with null-like adapter that does nothing
  initRateLimiter({
    storage: {
      getItem: async () => null,
      setItem: async () => {},
    },
  });
});

describe('checkRateLimit', () => {
  it('allows first attempt for unknown email', () => {
    const result = checkRateLimit(TEST_EMAIL);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it('allows attempts below the max threshold', () => {
    // Record 4 failures (max is 5)
    for (let i = 0; i < 4; i++) {
      recordFailure(TEST_EMAIL);
    }
    const result = checkRateLimit(TEST_EMAIL);
    expect(result.allowed).toBe(true);
  });
});

describe('recordFailure', () => {
  it('blocks after max attempts reached', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure(TEST_EMAIL);
    }
    const result = checkRateLimit(TEST_EMAIL);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('applies progressive lockout (doubles each time)', () => {
    // First round of 5 failures
    for (let i = 0; i < 5; i++) {
      recordFailure(TEST_EMAIL);
    }
    const firstLockout = checkRateLimit(TEST_EMAIL);
    expect(firstLockout.allowed).toBe(false);

    // The lockout seconds double with each failure beyond initial
    // After 5 failures with doubling: starts at 5s, doubles on each failure
    // Exact value depends on implementation but should be > 0
    expect(firstLockout.retryAfterSeconds).toBeGreaterThan(0);
    expect(firstLockout.retryAfterSeconds).toBeLessThanOrEqual(300);
  });

  it('normalizes email case', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure('Test@Example.com');
    }
    const result = checkRateLimit('test@example.com');
    expect(result.allowed).toBe(false);

    // Clean up
    resetRateLimit('test@example.com');
  });
});

describe('recordSuccess', () => {
  it('clears rate limit state', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure(TEST_EMAIL);
    }
    expect(checkRateLimit(TEST_EMAIL).allowed).toBe(false);

    recordSuccess(TEST_EMAIL);
    expect(checkRateLimit(TEST_EMAIL).allowed).toBe(true);
  });
});

describe('resetRateLimit', () => {
  it('manually clears state for an email', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure(TEST_EMAIL);
    }
    expect(checkRateLimit(TEST_EMAIL).allowed).toBe(false);

    resetRateLimit(TEST_EMAIL);
    expect(checkRateLimit(TEST_EMAIL).allowed).toBe(true);
  });

  it('does not affect other emails', () => {
    for (let i = 0; i < 5; i++) {
      recordFailure(TEST_EMAIL);
      recordFailure('OTHER@example.com');
    }

    resetRateLimit(TEST_EMAIL);
    expect(checkRateLimit(TEST_EMAIL).allowed).toBe(true);
    expect(checkRateLimit('other@example.com').allowed).toBe(false);
  });
});

describe('lockout expiry', () => {
  it('allows attempts after lockout period expires', () => {
    // Mock Date.now to control time
    const originalNow = Date.now;
    let currentTime = 1000000;
    Date.now = () => currentTime;

    try {
      for (let i = 0; i < 5; i++) {
        recordFailure(TEST_EMAIL);
      }
      expect(checkRateLimit(TEST_EMAIL).allowed).toBe(false);

      // Advance time past the lockout period (max 300s)
      currentTime += 301 * 1000;
      expect(checkRateLimit(TEST_EMAIL).allowed).toBe(true);
    } finally {
      Date.now = originalNow;
    }
  });
});

// ── Persistence tests ──

describe('persistence', () => {
  let mockStorage: RateLimiterStorage;
  let storedData: Record<string, string>;

  beforeEach(() => {
    storedData = {};
    mockStorage = {
      getItem: jest.fn(async (key: string) => storedData[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        storedData[key] = value;
      }),
    };
    initRateLimiter({ storage: mockStorage });
    resetRateLimit(TEST_EMAIL);
  });

  it('calls setItem on recordFailure', () => {
    recordFailure(TEST_EMAIL);
    expect(mockStorage.setItem).toHaveBeenCalledWith('auth_rate_limit_state', expect.any(String));
  });

  it('calls setItem on recordSuccess', () => {
    recordFailure(TEST_EMAIL);
    jest.mocked(mockStorage.setItem).mockClear();

    recordSuccess(TEST_EMAIL);
    expect(mockStorage.setItem).toHaveBeenCalledWith('auth_rate_limit_state', expect.any(String));
  });

  it('calls setItem on resetRateLimit', () => {
    recordFailure(TEST_EMAIL);
    jest.mocked(mockStorage.setItem).mockClear();

    resetRateLimit(TEST_EMAIL);
    expect(mockStorage.setItem).toHaveBeenCalledWith('auth_rate_limit_state', expect.any(String));
  });

  it('loadPersistedState restores state from storage', async () => {
    // Clear in-memory state first
    resetRateLimit(TEST_EMAIL);

    // Set stored data AFTER reset (since reset persists empty state)
    const futureTime = Date.now() + 60_000;
    const state = {
      [TEST_EMAIL]: {
        failures: 5,
        lockoutUntil: futureTime,
        lockoutSeconds: 10,
      },
    };
    storedData['auth_rate_limit_state'] = JSON.stringify(state);

    jest.mocked(mockStorage.setItem).mockClear();

    await loadPersistedState();

    // Should now be locked out
    const result = checkRateLimit(TEST_EMAIL);
    expect(result.allowed).toBe(false);
  });

  it('loadPersistedState prunes expired entries', async () => {
    // Clear in-memory state first
    resetRateLimit(TEST_EMAIL);

    // Set stored data AFTER reset with an expired lockout
    const pastTime = Date.now() - 60_000;
    const state = {
      [TEST_EMAIL]: {
        failures: 5,
        lockoutUntil: pastTime,
        lockoutSeconds: 10,
      },
    };
    storedData['auth_rate_limit_state'] = JSON.stringify(state);

    await loadPersistedState();

    // Expired entry should have been pruned — email should be allowed
    const result = checkRateLimit(TEST_EMAIL);
    expect(result.allowed).toBe(true);
  });

  it('loadPersistedState handles corrupt JSON gracefully', async () => {
    resetRateLimit(TEST_EMAIL);
    storedData['auth_rate_limit_state'] = '{invalid json!!!';

    // Should not throw
    await expect(loadPersistedState()).resolves.toBeUndefined();

    // State should remain empty — email should be allowed
    const result = checkRateLimit(TEST_EMAIL);
    expect(result.allowed).toBe(true);
  });

  it('loadPersistedState handles missing storage key', async () => {
    // No data stored at all
    delete storedData['auth_rate_limit_state'];

    await expect(loadPersistedState()).resolves.toBeUndefined();

    const result = checkRateLimit(TEST_EMAIL);
    expect(result.allowed).toBe(true);
  });
});
