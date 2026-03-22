/**
 * ThemeToggle - Login page theme switching button
 */
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export interface ThemeToggleProps {
  isDark: boolean;
}

export function ThemeToggle({ isDark }: ThemeToggleProps) {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group relative p-0 bg-transparent border-0 cursor-pointer"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-6 h-6 text-white/70 transition-all duration-500 ease-out group-hover:text-yellow-400 group-hover:scale-[1.15] group-hover:rotate-180" />
      ) : (
        <Moon className="w-6 h-6 text-[#0a1a4a] transition-all duration-500 ease-out group-hover:text-[#0a1433] group-hover:scale-[1.15] group-hover:rotate-[360deg]" />
      )}
    </button>
  );
}
