/**
 * Consistent spacing scale for RGR Fleet
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * Border radius scale
 */
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

/**
 * Font sizes
 */
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  // Dashboard-specific
  userName: 28,
  statValue: 35,
  statLabel: 14,
} as const;

/**
 * Font weights
 */
export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

/**
 * Font families
 */
export const fontFamily = {
  regular: 'Lato_400Regular',
  italic: 'Lato_400Regular_Italic',
  light: 'Lato_300Light',
  lightItalic: 'Lato_300Light_Italic',
  bold: 'Lato_700Bold',
  boldItalic: 'Lato_700Bold_Italic',
  black: 'Lato_900Black',
  blackItalic: 'Lato_900Black_Italic',
  thin: 'Lato_100Thin',
  thinItalic: 'Lato_100Thin_Italic',
};
