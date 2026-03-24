/**
 * ThemeToggle - Login page theme switching button
 *
 * Pure presentational component — receives state and callbacks as props.
 * The parent is responsible for providing theme context.
 */
import { Sun, Moon } from 'lucide-react';

export interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

const moonStyles = `
.moon-light-gray { color: #0a1a4a; }
.group:hover .moon-light-gray {
  color: #0a1433;
  transform: scale(1.15) rotate(360deg);
  filter: brightness(1.3) contrast(1.1);
  transition: all 500ms ease-out;
}
`;

export function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group relative p-0 bg-transparent border-0 cursor-pointer"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <style>{moonStyles}</style>
      {isDark ? (
        <Sun className="w-6 h-6 text-white/70 transition-all duration-500 ease-out group-hover:text-yellow-400 group-hover:scale-[1.15] group-hover:rotate-180" />
      ) : (
        <Moon className="w-6 h-6 moon-light-gray transition-all duration-500 ease-out" />
      )}
    </button>
  );
}
