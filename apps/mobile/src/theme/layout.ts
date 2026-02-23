/**
 * Layout constants for consistent screen positioning
 */

// Header component dimensions (synced with UserProfileHeader.tsx)
export const HEADER_STATUS_BAR_GAP = 20;
export const HEADER_ACCENT_LINE_HEIGHT = 6;
export const HEADER_ACCENT_LINE_GAP = 3;
export const HEADER_GRADIENT_HEIGHT = 45;

// Total header height (not including safe area)
export const HEADER_HEIGHT =
  HEADER_ACCENT_LINE_HEIGHT +
  HEADER_ACCENT_LINE_GAP +
  HEADER_GRADIENT_HEIGHT; // = 54px

// Standard content offset from screen top (below header gradient)
// 74px (header baseline) + 35px (breathing room) = 109px
export const CONTENT_TOP_OFFSET = 109;
