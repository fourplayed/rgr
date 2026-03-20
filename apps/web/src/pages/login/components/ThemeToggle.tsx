/**
 * ThemeToggle - Theme switching button component
 */
import { SunIcon, MoonIcon } from '@/components/common';

export interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

/**
 * Theme toggle button - styled with visible background box
 * Uses shared SunIcon/MoonIcon with login-specific styling
 */
export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group relative p-0 bg-transparent border-0"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <SunIcon className="w-6 h-6 text-white/70 transition-all duration-500 ease-out group-hover:text-yellow-400 group-hover:scale-[1.15] group-hover:rotate-180" />
      ) : (
        <>
          <style>{`
            .moon-light-gray { color: #0a1a4a; }
            .group:hover .moon-light-gray {
              color: #0a1433;
              transform: scale(1.15) rotate(360deg);
              filter: brightness(1.3) contrast(1.1);
            }
          `}</style>
          <MoonIcon className="w-6 h-6 moon-light-gray transition-all duration-500 ease-out" />
        </>
      )}
    </button>
  );
}
