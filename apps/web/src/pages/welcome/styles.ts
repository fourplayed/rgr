/**
 * Shared styles for the Welcome/Onboarding page
 */

export const GLASS_CARD = {
  dark: {
    background: 'rgba(0, 0, 0, 0.35)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
  },
  light: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
  },
} as const;

/** Stagger interval between section entrance animations (ms) */
export const STAGGER_MS = 150;

/** Shared entrance easing — matches dashboard dashContentFadeUp */
export const ENTRANCE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
