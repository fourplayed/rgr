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
 * Background gradient styles for light and dark themes
 */
export const BACKGROUND_STYLES = {
  // Light theme - Four-color gradient
  light: {
    background: `linear-gradient(
      to bottom,
      #85c0ff 0%,      /* Light blue top */
      #0040ff 33%,     /* Vibrant blue upper-middle */
      #0040ff 66%,     /* Vibrant blue lower-middle */
      #85c0ff 100%     /* Light blue bottom */
    )`,
    minHeight: '100vh',
    transition: 'background 1.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
  // Dark theme - Four-color gradient
  dark: {
    background: `linear-gradient(
      to bottom,
      #000433 0%,      /* Dark blue top */
      #000970 33%,     /* Medium dark blue upper-middle */
      #000970 66%,     /* Medium dark blue lower-middle */
      #080a21 100%     /* Dark blue-gray bottom */
    )`,
    minHeight: '100vh',
    transition: 'background 1.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
} as const;

/**
 * Card styles for light and dark themes
 */
export const CARD_STYLES = {
  // Card styling - Light (glassmorphism with white)
  light: {
    background: 'rgba(255, 255, 255, 0.15)',
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
    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
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
    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
  },
} as const;

/**
 * Input styles for themed inputs
 */
export const INPUT_STYLES = {
  // Light theme - simple border like dark theme (no fancy focus effects)
  light: {
    backgroundColor: 'rgba(209, 213, 219, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    color: '#ffffff', // white
    outline: 'none',
  },
  // Removed lightFocus - no longer used
  dark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(235, 235, 235, 0.15)',
    color: '#f8fafc',
    outline: 'none',
  },
} as const;

/**
 * Button styles for submit buttons
 */
export const BUTTON_STYLES = {
  // Dark theme - Chrome colors
  dark: {
    base: {
      backgroundColor: '#6b7280',
      backgroundImage: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
    },
    hover: {
      backgroundColor: '#9ca3af',
      backgroundImage: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
      transform: 'translateY(-2px)',
    },
  },
  // Light theme - Logo navy blue
  light: {
    base: {
      background: 'linear-gradient(135deg, #0a1433 0%, #1e3a8a 50%, #1e3a8a 100%)',
      backgroundSize: '200% 200%',
      backgroundPosition: '0% 50%',
      boxShadow: [
        '0 4px 12px -2px rgba(10, 20, 51, 0.3)',
        'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      ].join(', '),
    },
    hover: {
      transform: 'translateY(-2px) scale(1.02)',
      backgroundPosition: '100% 50%',
      boxShadow: [
        '0 15px 35px -5px rgba(10, 20, 51, 0.65)',
        '0 8px 20px -3px rgba(30, 58, 138, 0.5)',
        'inset 0 1px 0 0 rgba(255, 255, 255, 0.25)',
        '0 0 20px rgba(30, 58, 138, 0.6)',
      ].join(', '),
    },
  },
} as const;

/**
 * Text color styles
 */
export const TEXT_COLORS = {
  light: {
    primary: '#0c4a6e',     // sky-900
    secondary: '#075985',   // sky-800
    muted: '#0284c7',       // sky-600
    link: '#0284c7',        // sky-600
    linkHover: '#0369a1',   // sky-700
  },
  dark: {
    primary: '#f8fafc',     // slate-50
    secondary: '#e2e8f0',   // slate-200
    muted: '#94a3b8',       // slate-400
    link: '#60a5fa',        // blue-400
    linkHover: '#93c5fd',   // blue-300
  },
} as const;
