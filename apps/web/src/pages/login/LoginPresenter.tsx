/**
 * LoginPresenter - Pure UI component for Login page
 *
 * DESIGN: Based on RGR logo color palette
 * - Vertical gradient background (light blue top -> dark navy bottom)
 * - Fixed height cards for login/forgot password
 * - Chrome/metallic accents matching logo aesthetic
 *
 * REFACTORED: Component extracted into smaller, focused components
 * - Components in ./components/ directory
 * - Custom hooks in ./hooks/ directory
 * - Shared styles in ./styles.ts
 *
 * ACCESSIBILITY: WCAG 2.1 Level AA Compliant
 * - Respects prefers-reduced-motion for animations (hooks handle this)
 * - WCAG AA contrast ratios (4.5:1 for normal text)
 * - Full keyboard navigation support
 * - Screen reader announcements for errors
 * - Required field indicators
 */
import { useState, useEffect, useMemo, type ComponentType } from 'react';
import type { LoginLogicState, LoginLogicActions } from './useLoginLogic';
import { LOGIN_CONSTANTS } from './types';
import { Logo } from '@/components/common';
import { CARD_HEIGHT } from './styles';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorContainer } from './components/ErrorContainer';
import { LoginFormCard } from './components/LoginFormCard';
import { ForgotPasswordCard } from './components/ForgotPasswordCard';
import { FlipCardContainer } from './components/FlipCardContainer';
import { useTheme } from '@/hooks/useTheme';
import { Hover3D } from '@/components/ui/Hover3D';
import { useFlipAnimation } from './hooks/useFlipAnimation';

/**
 * Props for button component - allows dependency injection
 */
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

export interface LoginPresenterProps {
  state: LoginLogicState;
  actions: LoginLogicActions;
  ButtonComponent: ComponentType<ButtonProps>;
  /** Called when the workflow log is done and it is safe to navigate away */
  onNavigationReady?: () => void;
}

/**
 * Main LoginPresenter - orchestrates login page UI
 */
export function LoginPresenter({
  state,
  actions,
  ButtonComponent,
  onNavigationReady,
}: LoginPresenterProps) {
  // Global theme state from unified context
  const { isDark, toggleTheme } = useTheme();

  // Flip animation for form switching
  const { showForgotPassword, handleFlipToForgotPassword, handleFlipToLogin } = useFlipAnimation();

  // Local state for forgot password errors
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);

  // Exit slide animation: when auth succeeds, slide the card + logo off-screen
  const [isExiting, setIsExiting] = useState(false);
  useEffect(() => {
    if (state.status === 'success') {
      setIsExiting(true);
    }
  }, [state.status]);

  // Collect all errors for display
  const allErrors = useMemo(() => {
    const errors: string[] = [];
    if (!showForgotPassword) {
      if (state.errors.general) errors.push(state.errors.general);
      if (state.errors.email) errors.push(state.errors.email);
      if (state.errors.password) errors.push(state.errors.password);
    } else {
      if (forgotPasswordError) errors.push(forgotPasswordError);
    }
    return errors;
  }, [showForgotPassword, state.errors, forgotPasswordError]);

  // Handle back to login - clear forgot password errors
  const handleBackToLogin = () => {
    setForgotPasswordError(null);
    handleFlipToLogin();
  };

  return (
    <div
      className="relative min-h-screen h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {/* Theme toggle button - positioned at top-right of screen */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </div>

      {/* Exit slide wrapper - slides logo + card + errors left on auth success */}
      <div
        style={{
          transform: isExiting ? 'translateX(-120vw)' : 'none',
          transition: 'transform 600ms ease-in',
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onTransitionEnd={(e) => {
          if (isExiting && e.target === e.currentTarget) {
            onNavigationReady?.();
          }
        }}
      >
        {/* Logo - single block for both themes */}
        <div
          className={`absolute flex justify-center z-20 pointer-events-none ${isDark ? 'w-full max-w-[400px]' : ''}`}
          style={{
            top: `calc(50% - ${CARD_HEIGHT / 2}px - 17px)`,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <Hover3D
            maxRotation={12}
            perspective={1000}
            scale={1.03}
            className="pointer-events-auto"
            style={{ display: 'inline-block' }}
          >
            <Logo
              variant="auto"
              size="custom"
              className="h-[185px] w-auto pointer-events-none"
              isDark={isDark}
              alt={LOGIN_CONSTANTS.UI.LOGO_LABEL}
            />
          </Hover3D>
        </div>

        {/* 3D Flip Container with cards */}
        <FlipCardContainer
          showBack={showForgotPassword}
          swipePhase="idle"
          swipeDirection="right"
          frontFace={
            <LoginFormCard
              state={state}
              actions={actions}
              onForgotPassword={handleFlipToForgotPassword}
              isDark={isDark}
            />
          }
          backFace={
            <ForgotPasswordCard
              ButtonComponent={ButtonComponent}
              onBack={handleBackToLogin}
              isDark={isDark}
              onError={setForgotPasswordError}
            />
          }
        />

        {/* Error container below card */}
        <ErrorContainer
          errors={allErrors}
          onDismiss={() => {
            if (showForgotPassword) {
              setForgotPasswordError(null);
            } else {
              actions.clearErrors();
            }
          }}
        />
      </div>
    </div>
  );
}

export default LoginPresenter;
