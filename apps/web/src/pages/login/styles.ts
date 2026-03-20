/**
 * Shared styles for login page components
 * Extracted from inline styles to improve maintainability
 */

// Animation durations
export const FLIP_ANIMATION_DURATION_MS = 400; // Flip animation for form switching
export const THEME_SWIPE_DURATION_MS = 250; // Fast swipe for theme change

// Logo positioning - relative to center of viewport, above the card
export const LOGO_TOP_OFFSET = 158;

// Fixed card height for both forms
export const CARD_HEIGHT = 565;

/**
 * Card styles for light and dark themes
 */
export const CARD_STYLES = {
  // Card styling - Light (chrome glassmorphism)
  light: {
    background:
      'linear-gradient(160deg, rgba(120,130,145,0.48) 0%, rgba(100,110,125,0.38) 50%, rgba(110,120,135,0.43) 100%)',
    backdropFilter: 'blur(100px)',
    WebkitBackdropFilter: 'blur(100px)',
    borderRadius: '0',
    border: 'none',
    boxShadow: 'none',
    padding: '210px 2rem 2.5rem 2rem',
    height: `${CARD_HEIGHT}px`,
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-start' as const,
    position: 'relative' as const,
    transition: 'all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
    maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
    WebkitMaskImage:
      'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
    fontFamily: "'Lato', sans-serif",
  },
  // Card styling - Dark (glassmorphism with black)
  dark: {
    background: 'rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(100px)',
    WebkitBackdropFilter: 'blur(100px)',
    borderRadius: '0',
    border: 'none',
    boxShadow: 'none',
    padding: '210px 2rem 2.5rem 2rem',
    height: `${CARD_HEIGHT}px`,
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'flex-start' as const,
    position: 'relative' as const,
    transition: 'all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)',
    maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
    WebkitMaskImage:
      'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
    fontFamily: "'Lato', sans-serif",
  },
} as const;

/**
 * Input styles for themed inputs
 */
export const INPUT_STYLES = {
  // Light theme - simple border like dark theme (no fancy focus effects)
  light: {
    backgroundColor: 'rgba(120, 130, 145, 0.35)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    color: '#ffffff', // white
    outline: 'none',
  },
  // Removed lightFocus - no longer used
  dark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.38)',
    color: '#f8fafc',
    outline: 'none',
  },
} as const;
