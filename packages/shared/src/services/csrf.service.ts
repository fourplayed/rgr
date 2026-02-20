/**
 * CSRF Token Service
 *
 * Implements CSRF protection using double-submit cookie pattern:
 * 1. Token generated on page load
 * 2. Token stored in localStorage (for SPA)
 * 3. Token sent in request header
 * 4. Server validates token matches
 *
 * SECURITY NOTES:
 * - In production with sensitive operations, consider httpOnly cookies
 * - This implementation is designed for Supabase Edge Functions
 * - Tokens expire after 1 hour
 * - New token generated on each page load
 * - React Native: CSRF disabled (Supabase JWT auth is sufficient)
 */

interface CSRFToken {
  token: string;
  expiresAt: number;
}

const CSRF_STORAGE_KEY = 'rgr_csrf_token';
const TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour

/**
 * Detect if running in React Native environment
 */
function isReactNative(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator as { product?: string }).product === 'ReactNative'
  );
}

/**
 * Detect if browser APIs are available
 */
function hasBrowserAPIs(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as { window?: unknown }).window !== 'undefined' &&
    typeof (globalThis as { localStorage?: unknown }).localStorage !== 'undefined' &&
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  );
}

/**
 * Generate a cryptographically secure random token
 * Returns empty string in React Native (CSRF not needed with Supabase JWT auth)
 */
function generateToken(): string {
  if (isReactNative() || !hasBrowserAPIs()) {
    return ''; // CSRF not needed in React Native - Supabase JWT auth handles security
  }

  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * CSRF Token Service
 */
export const csrfService = {
  /**
   * Get current CSRF token, generating a new one if expired or missing
   * Returns empty string in React Native (CSRF not needed)
   */
  getToken(): string {
    // Skip CSRF in React Native - Supabase JWT auth is sufficient
    if (isReactNative() || !hasBrowserAPIs()) {
      return '';
    }

    try {
      const stored = localStorage.getItem(CSRF_STORAGE_KEY);

      if (stored) {
        const parsed: CSRFToken = JSON.parse(stored);

        // Check if token is still valid
        if (Date.now() < parsed.expiresAt) {
          return parsed.token;
        }
      }

      // Generate new token if missing or expired
      return this.generateNewToken();
    } catch (error) {
      console.error('CSRF token retrieval error:', error);
      return this.generateNewToken();
    }
  },

  /**
   * Generate and store a new CSRF token
   * Returns empty string in React Native (CSRF not needed)
   */
  generateNewToken(): string {
    // Skip CSRF in React Native - Supabase JWT auth is sufficient
    if (isReactNative() || !hasBrowserAPIs()) {
      return '';
    }

    const token = generateToken();
    const expiresAt = Date.now() + TOKEN_LIFETIME_MS;

    const csrfToken: CSRFToken = { token, expiresAt };

    try {
      localStorage.setItem(CSRF_STORAGE_KEY, JSON.stringify(csrfToken));
    } catch (error) {
      console.error('CSRF token storage error:', error);
    }

    return token;
  },

  /**
   * Clear the CSRF token (used on logout)
   * No-op in React Native
   */
  clearToken(): void {
    if (isReactNative() || !hasBrowserAPIs()) {
      return; // No-op in React Native
    }

    try {
      localStorage.removeItem(CSRF_STORAGE_KEY);
    } catch (error) {
      console.error('CSRF token clear error:', error);
    }
  },

  /**
   * Validate token format (client-side check only)
   * Server must perform actual validation
   */
  isValidTokenFormat(token: string): boolean {
    return /^[a-f0-9]{64}$/.test(token);
  },

  /**
   * Get headers object with CSRF token
   * Use this when making authenticated requests
   */
  getHeaders(): Record<string, string> {
    const token = this.getToken();
    if (!token) {
      return {};
    }
    return {
      'X-CSRF-Token': token,
    };
  },
};

export default csrfService;
