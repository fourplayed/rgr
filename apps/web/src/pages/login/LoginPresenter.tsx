/**
 * LoginPresenter - Pure UI component for Login page
 *
 * DESIGN: Based on RGR logo color palette
 * - Vertical gradient background (light blue top → dark navy bottom)
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
import { useState, useEffect, type ComponentType } from 'react';
import type { LoginLogicState, LoginLogicActions } from './useLoginLogic';
import { LOGIN_CONSTANTS } from './types';
import { Logo } from '@/components/common';
import { CARD_HEIGHT, THEME_SWIPE_DURATION_MS } from './styles';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorContainer } from './components/ErrorContainer';
import { LoginFormCard } from './components/LoginFormCard';
import { ForgotPasswordCard } from './components/ForgotPasswordCard';
import { FlipCardContainer } from './components/FlipCardContainer';
import { useTheme } from '@/hooks/useTheme';
import { Hover3D } from '@/components/ui/Hover3D';
import { useFlipAnimation } from './hooks/useFlipAnimation';
import { useSwipeAnimation } from './hooks/useSwipeAnimation';

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
 * Reduced from 773 lines to ~150 lines through component extraction
 */
export function LoginPresenter({
  state,
  actions,
  ButtonComponent,
  onNavigationReady,
}: LoginPresenterProps) {
  // Global theme state from unified context
  const { isDark } = useTheme();

  // Flip animation for form switching
  const {
    showForgotPassword,
    handleFlipToForgotPassword,
    handleFlipToLogin,
  } = useFlipAnimation();

  // Swipe animation for theme changes (integrated with unified theme context)
  const {
    swipePhase,
    swipeDirection,
    handleThemeToggle,
  } = useSwipeAnimation();

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
  const allErrors: string[] = [];
  if (!showForgotPassword) {
    if (state.errors.general) allErrors.push(state.errors.general);
    if (state.errors.email) allErrors.push(state.errors.email);
    if (state.errors.password) allErrors.push(state.errors.password);
  } else {
    if (forgotPasswordError) allErrors.push(forgotPasswordError);
  }

  // Handle forgot password link click - clear errors on flip
  const handleForgotPasswordClick = () => {
    handleFlipToForgotPassword();
  };

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
        <ThemeToggle isDark={isDark} onToggle={handleThemeToggle} />
      </div>

      {/* Exit slide wrapper — slides logo + card + errors left on auth success */}
      <div
        style={{
          transform: isExiting ? 'translateX(-120vw)' : 'none',
          transition: 'transform 600ms ease-in',
          // Fill the full viewport so absolutely-positioned children stay put
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onTransitionEnd={(e) => {
          // Only fire on the wrapper's own transform transition
          if (isExiting && e.target === e.currentTarget) {
            onNavigationReady?.();
          }
        }}
      >
        {/* Dark theme logo */}
        {isDark && (
          <div
            className="absolute flex justify-center w-full max-w-[400px] z-20 pointer-events-none"
            style={{
              top: `calc(50% - ${CARD_HEIGHT / 2}px - 17px)`,
              left: '50%',
              transform: (() => {
                const baseTransform = 'translateX(-50%)';
                if (swipePhase === 'idle' || swipePhase === 'swipe-in') {
                  return baseTransform;
                }
                if (swipePhase === 'swipe-out') {
                  return `${baseTransform} translateY(-120vh)`;
                }
                if (swipePhase === 'position-in') {
                  return `${baseTransform} translateY(-120vh)`;
                }
                return baseTransform;
              })(),
              transition: swipePhase === 'position-in'
                ? 'none'
                : `transform ${THEME_SWIPE_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
            }}
          >
            <Hover3D maxRotation={12} perspective={1000} scale={1.03} className="pointer-events-auto" style={{ display: 'inline-block' }}>
              <Logo
                variant="auto"
                size="custom"
                className="h-[185px] w-auto pointer-events-none"
                isDark={true}
                alt={LOGIN_CONSTANTS.UI.LOGO_LABEL}
              />
            </Hover3D>
          </div>
        )}

        {/* Light theme logo - original dimensions */}
        {!isDark && (
          <div
            className="absolute flex justify-center z-20 pointer-events-none"
            style={{
              top: `calc(50% - ${CARD_HEIGHT / 2}px - 17px)`,
              left: '50%',
              transform: (() => {
                const baseTransform = 'translateX(-50%)';
                if (swipePhase === 'idle' || swipePhase === 'swipe-in') {
                  return baseTransform;
                }
                if (swipePhase === 'swipe-out') {
                  return `${baseTransform} translateY(-120vh)`;
                }
                if (swipePhase === 'position-in') {
                  return `${baseTransform} translateY(-120vh)`;
                }
                return baseTransform;
              })(),
              transition: swipePhase === 'position-in'
                ? 'none'
                : `transform ${THEME_SWIPE_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`,
            }}
          >
            <Hover3D maxRotation={12} perspective={1000} scale={1.03} className="pointer-events-auto" style={{ display: 'inline-block' }}>
              <Logo
                variant="auto"
                size="custom"
                className="h-[185px] w-auto pointer-events-none"
                isDark={false}
                alt={LOGIN_CONSTANTS.UI.LOGO_LABEL}
              />
            </Hover3D>
          </div>
        )}

        {/* 3D Flip Container with cards */}
        <FlipCardContainer
          showBack={showForgotPassword}
          swipePhase={swipePhase}
          swipeDirection={swipeDirection}
          frontFace={
            <LoginFormCard
              state={state}
              actions={actions}
              ButtonComponent={ButtonComponent}
              onForgotPassword={handleForgotPasswordClick}
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
        <ErrorContainer errors={allErrors} isDark={isDark} />
      </div>
    </div>
  );
}

export default LoginPresenter;
