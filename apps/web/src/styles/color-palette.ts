/**
 * RGR Fleet Manager Color Palette
 * Navy / Blue / Chrome aesthetic for the RGR dashboard UI
 *
 * This palette is the single source of truth for brand colors used across
 * the application. All dashboard components import from this file.
 *
 * Usage:
 *   import { RGR_COLORS } from '@/styles/color-palette';
 *
 * Color groups:
 *   - navy:     Deep background tones (darkest to lightest)
 *   - chrome:   Metallic silver/grey text and UI accents
 *   - bright:   Vivid blues for interactive elements and charts
 *   - semantic: Status colors for success, warning, error, and info
 */

// ---------------------------------------------------------------------------
// Main palette object
// ---------------------------------------------------------------------------

export const RGR_COLORS = {
  /**
   * Navy tones - used for backgrounds, panels, overlays
   * Ranges from near-black to a medium navy blue
   */
  navy: {
    /** Deepest background - loading overlays, map error states (#0a0e23) */
    darkest: '#0a0e23',
    /** Standard dark background - cards, panels, nav bar (#0a2654) */
    base: '#0a2654',
    /** Lighter navy - borders, secondary backgrounds (#1e3a8a) */
    light: '#1e3a8a',
  },

  /**
   * Chrome tones - metallic silvers for text and subtle UI elements
   * Evokes a polished, industrial dashboard feel
   */
  chrome: {
    /** Muted chrome - secondary text, icons, dividers (#94a3b8) */
    medium: '#94a3b8',
    /** Light chrome - primary body text in dark mode, border tints (#cbd5e1) */
    light: '#cbd5e1',
    /** Bright chrome - headings, highlighted text, badge overlays (#ebebeb) */
    highlight: '#ebebeb',
  },

  /**
   * Bright blues - used for interactive elements, buttons, chart series
   */
  bright: {
    /** Primary vibrant blue - buttons, active indicators, chart primary (#3b82f6) */
    vibrant: '#3b82f6',
    /** Sky blue - chart secondary series, secondary accents (#38bdf8) */
    sky: '#38bdf8',
  },

  /**
   * Semantic colors - status indicators, alerts, chart annotations
   */
  semantic: {
    /** Success green - positive states, accuracy indicators (#22c55e) */
    success: '#22c55e',
    /** Warning amber - pending items, medium confidence (#f59e0b) */
    warning: '#f59e0b',
    /** Error red - critical alerts, failures, destructive actions (#ef4444) */
    error: '#ef4444',
    /** Info blue - informational badges, tips (matches bright.vibrant) (#3b82f6) */
    info: '#3b82f6',
  },
} as const;

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

/** Full palette type */
export type RGRColors = typeof RGR_COLORS;

/** Individual group types for narrower usage */
export type NavyColors = typeof RGR_COLORS.navy;
export type ChromeColors = typeof RGR_COLORS.chrome;
export type BrightColors = typeof RGR_COLORS.bright;
export type SemanticColors = typeof RGR_COLORS.semantic;
