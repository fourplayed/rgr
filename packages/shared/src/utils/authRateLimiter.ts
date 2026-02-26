/**
 * Client-side auth rate limiter
 *
 * Prevents brute-force login attempts by tracking failures per email
 * and enforcing exponential backoff lockouts.
 */

const MAX_ATTEMPTS = 5;
const INITIAL_LOCKOUT_SECONDS = 5;
const MAX_LOCKOUT_SECONDS = 300;

interface RateLimitEntry {
  failures: number;
  lockoutUntil: number; // timestamp in ms
  lockoutSeconds: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Check if an auth attempt is allowed for the given email.
 */
export function checkRateLimit(email: string): RateLimitResult {
  const key = normalizeEmail(email);
  const entry = rateLimitMap.get(key);

  if (!entry) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  const now = Date.now();
  if (entry.failures >= MAX_ATTEMPTS && now < entry.lockoutUntil) {
    const retryAfterSeconds = Math.ceil((entry.lockoutUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  // Lockout has expired — allow the attempt
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Record a failed auth attempt. Increments failure count and
 * doubles the lockout duration (up to MAX_LOCKOUT_SECONDS).
 */
export function recordFailure(email: string): void {
  const key = normalizeEmail(email);
  const entry = rateLimitMap.get(key);

  if (!entry) {
    rateLimitMap.set(key, {
      failures: 1,
      lockoutUntil: 0,
      lockoutSeconds: INITIAL_LOCKOUT_SECONDS,
    });
    return;
  }

  const newFailures = entry.failures + 1;
  const newLockoutSeconds = Math.min(entry.lockoutSeconds * 2, MAX_LOCKOUT_SECONDS);

  rateLimitMap.set(key, {
    failures: newFailures,
    lockoutUntil: newFailures >= MAX_ATTEMPTS ? Date.now() + newLockoutSeconds * 1000 : 0,
    lockoutSeconds: newLockoutSeconds,
  });
}

/**
 * Record a successful auth attempt. Clears all state for the email.
 */
export function recordSuccess(email: string): void {
  const key = normalizeEmail(email);
  rateLimitMap.delete(key);
}

/**
 * Manually reset rate limit state for an email.
 */
export function resetRateLimit(email: string): void {
  const key = normalizeEmail(email);
  rateLimitMap.delete(key);
}
