/**
 * ThemeToggleIcon - Shared SVG icons for theme toggle
 * Extracts duplicate sun/moon SVGs from VisionTopNav
 */
import React from 'react';

export interface ThemeToggleIconProps {
  isDark: boolean;
  className?: string;
}

/** Sun icon for switching to light mode */
export const SunIcon = React.memo<{ className?: string }>(({ className = '' }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
));

SunIcon.displayName = 'SunIcon';

/** Moon icon for switching to dark mode - filled */
export const MoonIcon = React.memo<{ className?: string; style?: React.CSSProperties }>(({ className = '', style }) => (
  <svg
    className={className}
    style={style}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
));

MoonIcon.displayName = 'MoonIcon';

/** Combined theme toggle icon that renders sun or moon based on current theme */
export const ThemeToggleIcon = React.memo<ThemeToggleIconProps>(({ isDark, className = '' }) => {
  const darkModeClass = `w-6 h-6 text-white transition-all duration-500 ease-out group-hover:text-white group-hover:scale-125 group-hover:rotate-180 ${className}`;
  const lightModeClass = `w-6 h-6 transition-all duration-500 ease-out group-hover:scale-125 group-hover:rotate-12 ${className}`;

  return isDark ? <SunIcon className={darkModeClass} /> : <MoonIcon className={lightModeClass} style={{ color: '#cbd5e1' }} />;
});

ThemeToggleIcon.displayName = 'ThemeToggleIcon';

export default ThemeToggleIcon;
