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

/**
 * Sanitize input to prevent XSS attacks
 * Uses DOMPurify with no allowed tags (email input only)
 */
function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim();
}

export interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

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

  const titleColor = isDark ? 'text-white' : 'text-white';
  const subtitleColor = isDark ? 'text-slate-200' : 'text-white';
  const linkColor = isDark ? 'text-white/90 hover:text-white' : 'text-white/90 hover:text-white';

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitize input immediately to prevent XSS
    const sanitizedValue = sanitizeInput(e.target.value);
    setEmail(sanitizedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);

    // Validate email format using shared validator
    const emailError = validateEmail(email);
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
        <h1 className={`text-center text-2xl font-bold ${titleColor} mb-1`}>
          Forgot your password?
        </h1>
        <p className={`text-center text-sm ${subtitleColor} mb-4`}>
          No worries! We can reset it for you.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4" style={{ marginTop: '4px' }}>
          <SuccessMessage message="Check your email for a password reset link" />
          <p className={`text-sm ${subtitleColor} text-center`}>
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
              onChange={handleEmailChange}
              placeholder="Enter your email"
              disabled={isLoading}
            />

            <div className="flex justify-start">
              <button
                type="button"
                onClick={onBack}
                disabled={isLoading}
                className={`flex items-center gap-1 text-sm ${linkColor} font-medium transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

          {/* Send Reset Link button - at bottom of form */}
          <div className="mt-6">
            <style>{`
              .chrome-button-forgot {
                position: relative;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
              }

              /* Light theme button - darker blue closer to #0000CC */
              .chrome-button-forgot-light {
                background: linear-gradient(135deg, #0000CC 0%, #0000AA 50%, #000088 100%);
                background-size: 200% 200%;
                background-position: 0% 50%;
                border: none;
              }

              .chrome-button-forgot-light::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(135deg, #0000FF 0%, #0000CC 50%, #0000AA 100%);
                background-size: 200% 200%;
                background-position: 0% 50%;
                opacity: 0;
                transition: opacity 0.3s ease;
              }

              .chrome-button-forgot-light:hover::before {
                opacity: 1;
                animation: gradientMove 6s ease infinite;
              }

              .chrome-button-forgot-light::after {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
                transform: translateX(-100%);
              }

              .chrome-button-forgot-light:hover::after {
                animation: shimmerSweep 2s ease-in-out infinite;
              }

              /* Dark theme button */
              .chrome-button-forgot-dark {
                background: #1e3a8a;
                border: none;
              }

              .chrome-button-forgot-dark::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%);
                background-size: 200% 200%;
                background-position: 0% 50%;
                opacity: 0;
                transition: opacity 0.3s ease;
              }

              .chrome-button-forgot-dark:hover::before {
                opacity: 1;
                animation: gradientMove 6s ease infinite;
              }

              .chrome-button-forgot-dark::after {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
                transform: translateX(-100%);
              }

              .chrome-button-forgot-dark:hover::after {
                animation: shimmerSweep 2s ease-in-out infinite;
              }

              .chrome-button-forgot-content {
                position: relative;
                z-index: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
              }

              .chrome-button-forgot-text {
                transition: font-size 0.3s ease;
              }

              .chrome-button-forgot:hover .chrome-button-forgot-text {
                font-size: 1.15rem;
              }

              @media (prefers-reduced-motion: reduce) {
                .chrome-button-forgot,
                .chrome-button-forgot::before,
                .chrome-button-forgot::after,
                .chrome-button-forgot-text {
                  animation: none !important;
                  transition-duration: 0.01ms !important;
                }
              }
            `}</style>
            <button
              type="submit"
              form="forgot-password-form"
              disabled={isLoading}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
              className={`
                chrome-button-forgot ${isDark ? 'chrome-button-forgot-dark' : 'chrome-button-forgot-light'}
                group w-full py-2 px-4 rounded-lg text-lg font-semibold text-white
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:scale-y-75'}
                transition-all duration-300 ease-in-out
              `}
            >
              <span className="chrome-button-forgot-content flex items-center justify-center gap-2.5">
                {!isLoading && <AnimatedMailIcon isHovered={isButtonHovered} size={24} />}
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2.5">
                    <LoadingSpinner />
                    Sending...
                  </span>
                ) : (
                  'Send Email'
                )}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
