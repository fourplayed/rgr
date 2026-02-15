/**
 * Logo Component - Maintains aspect ratio and scales properly
 *
 * Usage:
 *   <Logo size="sm" />
 *   <Logo size="lg" className="custom-class" />
 *
 * Note: Uses splash_logo.png from /packages/web/public/ directory
 */
import React from 'react';

export interface LogoProps {
  /**
   * Logo variant - DEPRECATED: Now always uses splash_logo.png
   * Kept for backward compatibility
   */
  variant?: 'dark' | 'light' | 'auto';

  /**
   * Size preset - sets maximum dimensions while maintaining aspect ratio
   * - 'xs': 88px max dimension
   * - 'sm': 132px max dimension
   * - 'md': 175px max dimension (login page size - 10% larger)
   * - 'lg': 220px max dimension
   * - 'xl': 325px max dimension (sidebar size - 10% larger)
   * - 'custom': Use className for custom sizing
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Alt text for accessibility
   */
  alt?: string;

  /**
   * DEPRECATED: Theme detection no longer used
   * Kept for backward compatibility
   */
  isDark?: boolean;
}

const SIZE_CLASSES = {
  xs: 'h-[88px] w-auto',
  sm: 'h-[132px] w-auto',
  md: 'h-[175px] w-auto', // Login page size (10% larger)
  lg: 'h-[220px] w-auto',
  xl: 'w-[325px] h-auto', // Sidebar size - uses width instead (10% larger)
  custom: '', // No preset sizing
} as const;

export const Logo = React.memo<LogoProps>(({
  variant: _variant = 'dark',
  size = 'md',
  className = '',
  alt = 'RGR Fleet Manager',
  isDark = false,
}) => {
  // Use theme-specific logo
  // splash_logo3.png dimensions: same as logo_v3.png (576x288, aspect ratio 2:1)
  const logoSrc = isDark ? '/splash_logo.png' : '/splash_logo3.png';
  const sizeClass = SIZE_CLASSES[size];

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={`
        object-contain
        ${sizeClass}
        ${className}
      `.trim()}
      onError={(e) => {
        // Log error but don't try to fallback to non-existent files
        console.error(`Failed to load ${logoSrc}`);
        // Keep the img element visible with alt text
        const target = e.target as HTMLImageElement;
        target.style.opacity = '0.5';
      }}
      loading="eager" // Logo should load immediately
      decoding="async" // Allow async decoding for better performance
    />
  );
});

Logo.displayName = 'Logo';

export default Logo;
