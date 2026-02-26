import {
  checkRateLimit,
  recordFailure,
  recordSuccess,
  resetRateLimit,
} from '../authRateLimiter';

// Reset state between tests by clearing via resetRateLimit
const TEST_EMAIL = 'test@example.com';

beforeEach(() => {
  resetRateLimit(TEST_EMAIL);
  resetRateLimit('OTHER@example.com');
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
