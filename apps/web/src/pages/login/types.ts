/**
 * Login page types and constants
 * Extracted for code splitting and testability
 */

// Constants block - SAFLA pattern
export const LOGIN_CONSTANTS = {
  TIMING: {
    DEBOUNCE_MS: 300,
  },
  LIMITS: {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    MAX_EMAIL_LENGTH: 255,
  },
  RATE_LIMITING: {
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 30000, // 30 seconds
  },
  DEFAULTS: {
    DEMO_EMAIL_HINT: 'admin@company.com',
  },
  UI: {
    TITLE: 'RGR Fleet Manager',
    SUBTITLE: 'Sign in to manage your fleet',
    REMEMBER_ME_LABEL: 'Remember me',
    FORGOT_PASSWORD_LABEL: 'Forgot password?',
    SUBMIT_BUTTON_TEXT: 'Sign in',
    LOADING_TEXT: 'Signing in...',
    LOGO_LABEL: 'RGR Fleet Manager Logo',
    FORM_LABEL: 'Login form',
  },
  ARIA: {
    ERROR_ALERT_ROLE: 'alert' as const,
    LIVE_REGION: 'polite' as const,
  },
} as const;

export type LoginStatus = 'idle' | 'loading' | 'success' | 'error';

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginFormErrors {
  email: string | null;
  password: string | null;
  general: string | null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  if (email.length > LOGIN_CONSTANTS.LIMITS.MAX_EMAIL_LENGTH) {
    return `Email must be less than ${LOGIN_CONSTANTS.LIMITS.MAX_EMAIL_LENGTH} characters`;
  }
  return null;
}

/**
 * Validate password - enforces min/max length for security
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < LOGIN_CONSTANTS.LIMITS.PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${LOGIN_CONSTANTS.LIMITS.PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > LOGIN_CONSTANTS.LIMITS.PASSWORD_MAX_LENGTH) {
    return `Password must be less than ${LOGIN_CONSTANTS.LIMITS.PASSWORD_MAX_LENGTH} characters`;
  }
  return null;
}
