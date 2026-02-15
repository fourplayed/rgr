/**
 * useLoginLogic - Custom hook containing all Login page business logic
 *
 * ARCHITECTURE: Separated from UI for testability
 * - No heavy dependencies
 * - Pure business logic and state management
 * - Can be tested in isolation
 *
 * SECURITY MEASURES:
 * 1. Input Sanitization - DOMPurify removes HTML/XSS from email input
 * 2. CSRF Protection - Token generated and validated on server
 * 3. Server-side Rate Limiting - IP-based rate limiting via Edge Function
 * 4. Client-side validation (user feedback only)
 *
 * SECURITY FIXES IMPLEMENTED (2026-01-05):
 * ✅ CSRF tokens generated and validated server-side
 * ✅ Server-side rate limiting (IP-based, 5 attempts/30s)
 * ✅ Passwords no longer sanitized (prevents stripping valid characters)
 * ✅ Input validation on both client and server
 * ✅ Client-side rate limiting REMOVED (now server-side only)
 */
import { useState, useCallback, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { validateEmail, validatePassword } from './types';
import type { LoginStatus, LoginFormData, LoginFormErrors } from './types';
import DOMPurify from 'dompurify';

// Rate limiting removed - now handled server-side via Edge Function

/**
 * Sanitize email input to prevent XSS attacks
 * Uses DOMPurify for robust sanitization
 *
 * SECURITY: Removes all HTML tags, scripts, and dangerous protocols
 * NOTE: Backend also validates - this is defense in depth for user feedback
 */
function sanitizeEmail(input: string): string {
  // DOMPurify configuration for text-only output
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
  });
  return sanitized.trim();
}

export interface LoginLogicState {
  formData: LoginFormData;
  errors: LoginFormErrors;
  status: LoginStatus;
  isValid: boolean;
}

export interface LoginLogicActions {
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setRememberMe: (rememberMe: boolean) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  clearErrors: () => void;
}

export interface UseLoginLogicResult {
  state: LoginLogicState;
  actions: LoginLogicActions;
}

/**
 * Dependencies that can be injected for testing
 */
export interface LoginLogicDeps {
  navigate?: ReturnType<typeof useNavigate>;
  login?: (email: string, password: string) => Promise<void>;
}

// Rate limiting storage functions removed - now handled server-side

/**
 * Hook containing all Login page logic - testable without heavy dependencies
 */
export function useLoginLogic(deps?: LoginLogicDeps): UseLoginLogicResult {
  const defaultNavigate = useNavigate();
  const { login: defaultLogin } = useAuthStore();

  // Use injected dependencies or defaults
  const navigate = deps?.navigate ?? defaultNavigate;
  const login = deps?.login ?? defaultLogin;

  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  // Error state
  const [errors, setErrors] = useState<LoginFormErrors>({
    email: null,
    password: null,
    general: null,
  });

  // Status state
  const [status, setStatus] = useState<LoginStatus>('idle');

  // Rate limiting removed - now handled server-side via Edge Function

  // Actions
  const setEmail = useCallback((email: string) => {
    // SECURITY: Sanitize email input to prevent XSS
    const sanitized = sanitizeEmail(email);
    setFormData((prev) => ({ ...prev, email: sanitized }));
    // Clear email error when user types
    setErrors((prev) => ({ ...prev, email: null, general: null }));
  }, []);

  const setPassword = useCallback((password: string) => {
    // SECURITY FIX: Do NOT sanitize passwords - may strip valid special characters
    // Backend must hash passwords securely (bcrypt/argon2)
    // Passwords should never be sanitized, only hashed
    setFormData((prev) => ({ ...prev, password }));
    // Clear password error when user types
    setErrors((prev) => ({ ...prev, password: null, general: null }));
  }, []);

  const setRememberMe = useCallback((rememberMe: boolean) => {
    setFormData((prev) => ({ ...prev, rememberMe }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({
      email: null,
      password: null,
      general: null,
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate form
      const emailError = validateEmail(formData.email);
      const passwordError = validatePassword(formData.password);

      if (emailError || passwordError) {
        setErrors({
          email: emailError,
          password: passwordError,
          general: null,
        });
        return;
      }

      // Clear errors and set loading
      setErrors({ email: null, password: null, general: null });
      setStatus('loading');

      try {
        await login(formData.email, formData.password);
        setStatus('success');
        navigate('/');
      } catch (err) {
        setStatus('error');

        // Error message comes from server (includes rate limiting info)
        const errorMessage = err instanceof Error ? err.message : 'Invalid email or password';
        setErrors((prev) => ({
          ...prev,
          general: errorMessage,
        }));
      }
    },
    [formData.email, formData.password, login, navigate]
  );

  // Computed values
  const isValid = useMemo(() => {
    return (
      formData.email.length > 0 &&
      formData.password.length > 0 &&
      status !== 'loading'
    );
  }, [formData.email, formData.password, status]);

  return {
    state: {
      formData,
      errors,
      status,
      isValid,
    },
    actions: {
      setEmail,
      setPassword,
      setRememberMe,
      handleSubmit,
      clearErrors,
    },
  };
}
