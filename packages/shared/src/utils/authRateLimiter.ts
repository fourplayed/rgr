/**
 * Client-side auth rate limiter
 *
 * Prevents brute-force login attempts by tracking failures per email
 * and enforcing exponential backoff lockouts.
 *
 * Supports an injectable storage adapter so rate limit state survives
 * app restarts (load-at-init, sync-read pattern).
 */

const MAX_ATTEMPTS = 5;
const INITIAL_LOCKOUT_SECONDS = 5;
const MAX_LOCKOUT_SECONDS = 300;
const STORAGE_KEY = 'auth_rate_limit_state';

interface RateLimitEntry {
  failures: number;
  lockoutUntil: number; // timestamp in ms
  lockoutSeconds: number;
}

export interface RateLimiterStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

let storageAdapter: RateLimiterStorage | null = null;

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Initialize the rate limiter with an optional persistent storage adapter.
 */
export function initRateLimiter({ storage }: { storage: RateLimiterStorage }): void {
  storageAdapter = storage;
}

/**
 * Load persisted rate limit state from storage into the in-memory Map.
 * Prunes expired entries during load. Safe to call at startup (fire-and-forget).
 */
export async function loadPersistedState(): Promise<void> {
  if (!storageAdapter) return;

  try {
    const raw = await storageAdapter.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed: Record<string, RateLimitEntry> = JSON.parse(raw);
    const now = Date.now();

    for (const [key, entry] of Object.entries(parsed)) {
      // Prune entries whose lockout has expired and have max failures
      // (they would be allowed on next check anyway)
      if (entry.failures >= MAX_ATTEMPTS && entry.lockoutUntil > 0 && now >= entry.lockoutUntil) {
        continue; // skip expired lockouts
      }
      rateLimitMap.set(key, entry);
    }
  } catch {
    // Corrupt JSON or storage error — start fresh
  }
}

/**
 * Persist current rate limit state to storage (fire-and-forget).
 */
function persistState(): void {
  if (!storageAdapter) return;

  try {
    const obj: Record<string, RateLimitEntry> = {};
    for (const [key, entry] of rateLimitMap.entries()) {
      obj[key] = entry;
    }
    // Fire-and-forget — don't await
    storageAdapter.setItem(STORAGE_KEY, JSON.stringify(obj)).catch(() => {});
  } catch {
    // Serialization error — ignore
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const MAX_MAP_ENTRIES = 50;

function pruneExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (entry.lockoutUntil > 0 && now >= entry.lockoutUntil + MAX_LOCKOUT_SECONDS * 1000) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Check if an auth attempt is allowed for the given email.
 */
export function checkRateLimit(email: string): RateLimitResult {
  // Prune stale entries to prevent unbounded map growth
  if (rateLimitMap.size > MAX_MAP_ENTRIES) {
    pruneExpiredEntries();
  }

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
    persistState();
    return;
  }

  const newFailures = entry.failures + 1;
  const newLockoutSeconds = newFailures >= MAX_ATTEMPTS
    ? (entry.failures >= MAX_ATTEMPTS
        ? Math.min(entry.lockoutSeconds * 2, MAX_LOCKOUT_SECONDS)
        : INITIAL_LOCKOUT_SECONDS)
    : entry.lockoutSeconds;

  rateLimitMap.set(key, {
    failures: newFailures,
    lockoutUntil: newFailures >= MAX_ATTEMPTS ? Date.now() + newLockoutSeconds * 1000 : 0,
    lockoutSeconds: newLockoutSeconds,
  });
  persistState();
}

/**
 * Record a successful auth attempt. Clears all state for the email.
 */
export function recordSuccess(email: string): void {
  const key = normalizeEmail(email);
  rateLimitMap.delete(key);
  persistState();
}

/**
 * Manually reset rate limit state for an email.
 */
export function resetRateLimit(email: string): void {
  const key = normalizeEmail(email);
  rateLimitMap.delete(key);
  persistState();
}
