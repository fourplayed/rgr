/**
 * Dashboard styles - Glassmorphic nav and panel tokens
 */
/**
 * Glassmorphic nav bar styles for dark and light themes
 */
export const NAV_BAR_STYLES = {
  dark: {
    background: 'linear-gradient(to bottom, #080b3a, #050828)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  },
  light: {
    background: 'linear-gradient(to bottom, #0000cc, #000099)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.08)',
  },
} as const;

/**
 * Glassmorphic content panel styles for dashboard widgets
 */
export const CONTENT_PANEL_STYLES = {
  dark: {
    background: 'rgba(0, 0, 48, 0.45)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
  },
  light: {
    background: 'rgba(0, 0, 48, 0.45)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
  },
} as const;

/**
 * Nav link color tokens
 */
export const NAV_LINK_COLORS = {
  dark: {
    default: '#ffffff', // white
    hover: '#ffffff', // white
    active: '#ffffff', // white
  },
  light: {
    default: '#ffffff', // white
    hover: '#ffffff', // white
    active: '#ffffff', // white
  },
} as const;

/**
 * Nav button glassmorphic style tokens
 *
 * These define the button "pill" appearance for nav links inside the
 * near-black glassmorphic nav bar. Each state (default, hover, active)
 * has background, border, and shadow values that layer on top of the
 * dark nav bar surface to create depth.
 *
 * Design rationale:
 * - Default: subtle frosted surface, barely lifted off the bar
 * - Hover: soft cyan glow begins to bleed through edges
 * - Active: full cyan-tinted glass with inset glow and outer halo
 */
export const NAV_BUTTON_STYLES = {
  dark: {
    default: {
      background: 'rgba(255, 255, 255, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
    },
    hover: {
      background: 'rgba(255, 255, 255, 0.12)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
    },
    active: {
      background: 'rgba(255, 255, 255, 0.15)',
      border: '1px solid rgba(255, 255, 255, 0.22)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    },
  },
  light: {
    default: {
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    },
    hover: {
      background: 'rgba(255, 255, 255, 0.15)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
    },
    active: {
      background: 'rgba(255, 255, 255, 0.18)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    },
  },
} as const;
