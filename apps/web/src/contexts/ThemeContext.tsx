/**
 * ThemeContext - Enhanced theme system with system preference detection
 *
 * ARCHITECTURE: Theme System Foundation
 * This context provides theme state management with:
 * - localStorage persistence
 * - System preference detection (prefers-color-scheme)
 * - Smooth transitions without FOUC (Flash of Unstyled Content)
 * - Type-safe theme tokens
 *
 * @see /docs/architecture/THEME_SYSTEM.md for full architecture
 */
import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Theme mode options
 * - 'light': Light theme
 * - 'dark': Dark theme
 * - 'system': Follow system preference
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Resolved theme (what's actually applied)
 * System preference resolves to either 'light' or 'dark'
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Theme context value provided to consumers
 */
export interface ThemeContextValue {
  /** Current theme mode (may be 'system') */
  theme: ThemeMode;

  /** Resolved theme (always 'light' or 'dark') */
  resolvedTheme: ResolvedTheme;

  /** Convenience flag for dark theme */
  isDark: boolean;

  /** Set specific theme mode */
  setTheme: (theme: ThemeMode) => void;

  /** Toggle between light and dark (ignores system) */
  toggleTheme: () => void;

  /** Whether system preference is available */
  systemPreferenceAvailable: boolean;

  /** Current system preference (if available) */
  systemPreference: ResolvedTheme | null;

  /** Whether theme transition animation is currently active */
  isTransitioning: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const THEME_STORAGE_KEY = 'rgr-theme-mode';
const THEME_CLASS_DARK = 'dark';

// =============================================================================
// CONTEXT
// =============================================================================

export const ThemeContext = createContext<ThemeContextValue | null>(null);

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get system color scheme preference
 */
function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  return mediaQuery.matches ? 'dark' : 'light';
}

/**
 * Check if system preference is available
 */
function isSystemPreferenceAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia !== undefined;
}

/**
 * Get stored theme preference from localStorage
 */
function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read theme from localStorage:', error);
  }

  return 'dark'; // Default fallback
}

/**
 * Store theme preference to localStorage
 */
function storeTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }
}

/**
 * Resolve theme mode to actual theme
 */
function resolveTheme(mode: ThemeMode, systemPreference: ResolvedTheme): ResolvedTheme {
  return mode === 'system' ? systemPreference : mode;
}

/**
 * Apply theme to DOM
 */
function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add(THEME_CLASS_DARK);
  } else {
    root.classList.remove(THEME_CLASS_DARK);
  }
}

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

export interface ThemeProviderProps {
  children: ReactNode;
  /** Default theme mode if no preference is stored */
  defaultTheme?: ThemeMode;
  /** Force a specific theme (disables user preference) */
  forcedTheme?: ResolvedTheme;
  /** Enable smooth transitions when switching themes */
  enableTransitions?: boolean;
}

/**
 * ThemeProvider - Manages theme state and DOM updates
 *
 * Features:
 * - localStorage persistence
 * - System preference detection and sync
 * - Smooth transitions
 * - FOUC prevention
 * - SSR-safe
 */
export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  forcedTheme,
}: ThemeProviderProps) {
  // Initialize system preference
  const [systemPreference, setSystemPreference] = useState<ResolvedTheme>(() =>
    getSystemPreference()
  );

  const systemPreferenceAvailable = isSystemPreferenceAvailable();

  // Initialize theme mode from storage or default
  const [theme, setThemeMode] = useState<ThemeMode>(() => {
    if (forcedTheme) return forcedTheme;
    return getStoredTheme() || defaultTheme;
  });

  // Track transition state
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Calculate resolved theme
  const resolvedTheme = forcedTheme || resolveTheme(theme, systemPreference);
  const isDark = resolvedTheme === 'dark';

  // Handle theme changes
  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      if (forcedTheme) {
        console.warn('Cannot change theme when forcedTheme is set');
        return;
      }

      setThemeMode(newTheme);
      storeTheme(newTheme);
    },
    [forcedTheme]
  );

  // Toggle between light and dark (ignores system)
  const toggleTheme = useCallback(() => {
    if (forcedTheme) {
      console.warn('Cannot toggle theme when forcedTheme is set');
      return;
    }

    // Start transition state
    setIsTransitioning(true);

    // Change theme immediately - CSS transitions will handle the smooth visual change
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);

    // End transition state after CSS transition completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 600); // Match CSS transition duration
  }, [forcedTheme, resolvedTheme, setTheme]);

  // Apply theme to DOM when resolved theme changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system preference changes
  useEffect(() => {
    if (!systemPreferenceAvailable || forcedTheme) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newPreference = e.matches ? 'dark' : 'light';
      setSystemPreference(newPreference);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [systemPreferenceAvailable, forcedTheme]);

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    isDark,
    setTheme,
    toggleTheme,
    systemPreferenceAvailable,
    systemPreference,
    isTransitioning,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
