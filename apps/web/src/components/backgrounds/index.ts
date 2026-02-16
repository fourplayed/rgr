/**
 * Shared background components barrel export
 * Used by login, dashboard, and other pages with animated backgrounds
 */
export { Stars } from './Stars';
export { PersistentBackground } from './PersistentBackground';
export {
  DEFAULT_SETTINGS,
  DARK_THEME_SETTINGS,
  NORD_SNOW_STORM,
  generateBackgroundGradient,
  getAnimationDuration,
  getAnimationTransform,
  getAfterPosition,
  type ThemeSettings,
} from './themeSettings';
