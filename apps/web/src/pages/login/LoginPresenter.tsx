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
import { useState, type ComponentType } from 'react';
import type { LoginLogicState, LoginLogicActions } from './useLoginLogic';
import { LOGIN_CONSTANTS } from './types';
import { Logo } from '@/components/common';
import { BACKGROUND_STYLES, CARD_HEIGHT, THEME_SWIPE_DURATION_MS } from './styles';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorContainer } from './components/ErrorContainer';
import { LoginFormCard } from './components/LoginFormCard';
import { ForgotPasswordCard } from './components/ForgotPasswordCard';
import { FlipCardContainer } from './components/FlipCardContainer';
import { Stars } from './components/Stars';
import { DebugToolbar } from './components/DebugToolbar';
import { useTheme } from '@/hooks/useTheme';
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
}

/**
 * Main LoginPresenter - orchestrates login page UI
 * Reduced from 773 lines to ~150 lines through component extraction
 */
export function LoginPresenter({
  state,
  actions,
  ButtonComponent,
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

  // Local state for custom gradient colors - Light theme
  const [lightTopColor, setLightTopColor] = useState('#0091ff');
  const [lightUpperMiddleColor, setLightUpperMiddleColor] = useState('#0040ff');
  const [lightLowerMiddleColor, setLightLowerMiddleColor] = useState('#0000ff');
  const [lightBottomColor, setLightBottomColor] = useState('#0091ff');

  // Local state for custom gradient colors - Dark theme
  const [darkTopColor, setDarkTopColor] = useState('#000433');
  const [darkUpperMiddleColor, setDarkUpperMiddleColor] = useState('#000970');
  const [darkLowerMiddleColor, setDarkLowerMiddleColor] = useState('#000970');
  const [darkBottomColor, setDarkBottomColor] = useState('#080a21');

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

  // Dynamic background style with custom colors for both themes
  const backgroundStyle = isDark
    ? {
        ...BACKGROUND_STYLES.dark,
        background: `linear-gradient(to bottom, ${darkTopColor} 0%, ${darkUpperMiddleColor} 33%, ${darkLowerMiddleColor} 66%, ${darkBottomColor} 100%)`,
      }
    : {
        ...BACKGROUND_STYLES.light,
        background: `linear-gradient(to bottom, ${lightTopColor} 0%, ${lightUpperMiddleColor} 33%, ${lightLowerMiddleColor} 66%, ${lightBottomColor} 100%)`,
      };

  return (
    <div
      className="relative min-h-screen h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden theme-bg-transition"
      style={backgroundStyle}
    >
      <style>{`
        .theme-bg-transition {
          transition: background 1.2s cubic-bezier(0.4, 0.0, 0.2, 1);
        }
      `}</style>

      {/* Starfield background for both themes */}
      <Stars isDark={isDark} />

      {/* Theme toggle button - positioned at top-right of screen */}
      <div className="absolute top-6 right-6 z-30">
        <ThemeToggle isDark={isDark} onToggle={handleThemeToggle} />
      </div>

      {/* Debug Toolbar - bottom panel with console and gradient customizer */}
      <DebugToolbar
        isDark={isDark}
        topColor={isDark ? darkTopColor : lightTopColor}
        upperMiddleColor={isDark ? darkUpperMiddleColor : lightUpperMiddleColor}
        lowerMiddleColor={isDark ? darkLowerMiddleColor : lightLowerMiddleColor}
        bottomColor={isDark ? darkBottomColor : lightBottomColor}
        onTopColorChange={isDark ? setDarkTopColor : setLightTopColor}
        onUpperMiddleColorChange={isDark ? setDarkUpperMiddleColor : setLightUpperMiddleColor}
        onLowerMiddleColorChange={isDark ? setDarkLowerMiddleColor : setLightLowerMiddleColor}
        onBottomColorChange={isDark ? setDarkBottomColor : setLightBottomColor}
        defaultColors={
          isDark
            ? { top: '#000433', upperMiddle: '#000970', lowerMiddle: '#000970', bottom: '#080a21' }
            : { top: '#0091ff', upperMiddle: '#0040ff', lowerMiddle: '#0000ff', bottom: '#0091ff' }
        }
      />

      {/* Dark theme logo */}
      {isDark && (
        <div
          className="absolute flex justify-center w-full max-w-[400px] z-20 pointer-events-none"
          style={{
            top: `calc(50% - ${CARD_HEIGHT / 2}px - 180px)`,
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
          <Logo
            variant="auto"
            size="custom"
            className="h-[525.53px] w-auto"
            isDark={true}
            alt={LOGIN_CONSTANTS.UI.LOGO_LABEL}
          />
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
          <Logo
            variant="auto"
            size="custom"
            className="h-[185px] w-auto"
            isDark={false}
            alt={LOGIN_CONSTANTS.UI.LOGO_LABEL}
          />
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
  );
}

export default LoginPresenter;
