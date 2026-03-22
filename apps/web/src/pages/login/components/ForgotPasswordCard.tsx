/**
 * ForgotPasswordCard - Forgot password form component
 */
import { useState, type ComponentType } from 'react';
import DOMPurify from 'dompurify';
import { validateEmail } from '../types';
import { CARD_STYLES } from '../styles';
import { ThemedInput } from './ThemedInput';
import { SuccessMessage } from './SuccessMessage';
import { LoadingSpinner } from './LoadingSpinner';
import { AnimatedMailIcon } from './AnimatedMailIcon';
import type { ButtonProps } from '../LoginPresenter';
import '../login.css';

export interface ForgotPasswordCardProps {
  ButtonComponent: ComponentType<ButtonProps>;
  onBack: () => void;
  isDark: boolean;
  onError: (error: string | null) => void;
}

/**
 * Forgot Password Form Card
 */
export function ForgotPasswordCard({
  ButtonComponent,
  onBack,
  isDark,
  onError,
}: ForgotPasswordCardProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const textColor = isDark ? 'text-slate-200' : 'text-white';
  const linkColor = 'text-white/90 hover:text-white';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);

    // Sanitize before validation/submission to prevent XSS
    const sanitizedEmail = DOMPurify.sanitize(email, { ALLOWED_TAGS: [] }).trim();

    const emailError = validateEmail(sanitizedEmail);
    if (emailError) {
      onError(emailError);
      return;
    }

    setIsLoading(true);

    // Simulate API call delay for password reset
    // In production, this would be replaced with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(false);
    setSubmitted(true);
  };

  return (
    <div
      style={{
        ...(isDark ? CARD_STYLES.dark : CARD_STYLES.light),
        justifyContent: 'flex-start',
        paddingTop: '220px',
      }}
    >
      <div style={{ marginTop: '15px' }}>
        <h1 className="text-center text-2xl font-bold text-white mb-1">Forgot your password?</h1>
        <p className={`text-center text-sm ${textColor} mb-4`}>
          No worries! We can reset it for you.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4" style={{ marginTop: '4px' }}>
          <SuccessMessage message="Check your email for a password reset link" />
          <p className={`text-sm ${textColor} text-center`}>
            If you don't see the email, check your spam folder.
          </p>
          <ButtonComponent type="button" variant="secondary" className="w-full" onClick={onBack}>
            Back to login
          </ButtonComponent>
        </div>
      ) : (
        <>
          <form
            id="forgot-password-form"
            onSubmit={handleSubmit}
            className="space-y-4"
            style={{ marginTop: '4px' }}
            noValidate
            aria-label="Password reset form"
          >
            <ThemedInput
              id="reset-email"
              name="email"
              label="EMAIL"
              type="email"
              autoComplete="email"
              required
              isDark={isDark}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
            />

            <div className="flex justify-start">
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className={`flex items-center gap-1 text-sm ${linkColor} font-medium transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label="Return to login form"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to login
              </button>
            </div>
          </form>

          {/* Send Reset Link button */}
          <div className="mt-6">
            <button
              type="submit"
              form="forgot-password-form"
              disabled={isLoading}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
              className={`
                chrome-button ${isDark ? 'chrome-button-dark' : 'chrome-button-light'}
                group w-full py-2 px-4 rounded-lg text-base text-white
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5 active:scale-y-75'}
                transition-all duration-300 ease-in-out
              `}
            >
              <span className="chrome-button-content flex items-center justify-center gap-2.5">
                {isLoading ? (
                  <span className="chrome-button-text flex items-center justify-center gap-2.5">
                    <LoadingSpinner />
                    Sending...
                  </span>
                ) : (
                  <span className="chrome-button-text flex items-center justify-center gap-2.5">
                    Send Email
                    <AnimatedMailIcon isHovered={isButtonHovered} size={24} />
                  </span>
                )}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
