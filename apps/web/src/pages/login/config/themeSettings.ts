/**
 * Theme Settings Configuration
 * Defines background gradients, star behavior, and color schemes for login page
 */

export const NORD_SNOW_STORM = {
  nord4: '#D8DEE9',
  nord5: '#E5E9F0',
  nord6: '#ECEFF4',
} as const;

export interface ThemeSettings {
  backgroundColors: string[];
  backgroundLocations: number[];
  starColor: string;
  starSpeed: number;
  starDirection: 'left' | 'right' | 'up' | 'down';
  textColor: string;
}

export const DEFAULT_SETTINGS: ThemeSettings = {
  backgroundColors: [
    '#75b8ff', // Sky blue top
    '#5c8dff', // Medium blue at 60%
    '#1f62ff', // Deep blue at 100%
  ],
  backgroundLocations: [0, 0.6, 1], // White 0%, light grey 60%, vibrant blue 100%
  starColor: NORD_SNOW_STORM.nord4,
  starSpeed: 1.0,
  starDirection: 'left',
  textColor: '#ffffff',
};

export const DARK_THEME_SETTINGS: ThemeSettings = {
  backgroundColors: [
    '#010409', // Top - nearly black
    '#0d1117', // Dark grey at 50%
    '#172554', // Navy blue at 100%
  ],
  backgroundLocations: [0, 0.5, 1],
  starColor: 'rgba(255, 255, 255, 0.4)',
  starSpeed: 1.0,
  starDirection: 'left',
  textColor: '#ffffff',
};

/**
 * Generate CSS gradient string from theme settings
 */
export function generateBackgroundGradient(settings: ThemeSettings): string {
  const stops = settings.backgroundColors
    .map((color, i) => `${color} ${(settings.backgroundLocations[i] ?? 0) * 100}%`)
    .join(', ');

  return `linear-gradient(to bottom, ${stops})`;
}

/**
 * Get animation duration based on star speed
 */
export function getAnimationDuration(baseSpeed: number, speedMultiplier: number): number {
  return baseSpeed / speedMultiplier;
}

/**
 * Get animation direction transform
 */
export function getAnimationTransform(direction: ThemeSettings['starDirection']): string {
  switch (direction) {
    case 'left':
      return 'translateX(-4000px)';
    case 'right':
      return 'translateX(4000px)';
    case 'up':
      return 'translateY(-4000px)';
    case 'down':
      return 'translateY(4000px)';
    default:
      return 'translateX(-4000px)';
  }
}

/**
 * Get ::after positioning based on direction
 */
export function getAfterPosition(direction: ThemeSettings['starDirection']): {
  [key: string]: string;
} {
  switch (direction) {
    case 'left':
      return { left: '4000px' };
    case 'right':
      return { right: '4000px' };
    case 'up':
      return { top: '4000px' };
    case 'down':
      return { bottom: '4000px' };
    default:
      return { left: '4000px' };
  }
}
