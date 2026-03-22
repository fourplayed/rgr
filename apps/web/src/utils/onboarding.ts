/**
 * Onboarding status helpers
 *
 * Tracks whether a user has completed the first-time welcome flow
 * using localStorage scoped by user ID.
 */

const KEY_PREFIX = 'rgr:onboarded:';

export function hasOnboarded(userId: string): boolean {
  try {
    return localStorage.getItem(`${KEY_PREFIX}${userId}`) === 'true';
  } catch {
    return false;
  }
}

export function markOnboarded(userId: string): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${userId}`, 'true');
  } catch {
    // localStorage unavailable — silently fail
  }
}
