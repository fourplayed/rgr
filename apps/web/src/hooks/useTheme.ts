/**
 * useTheme hook - Type-safe theme context access
 *
 * ARCHITECTURE: Theme System Hook
 * Provides type-safe access to theme context with helpful error messages
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isDark, toggleTheme, resolvedTheme } = useTheme();
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       Current theme: {resolvedTheme}
 *     </button>
 *   );
 * }
 * ```
 */
import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '@/contexts/ThemeContext';

/**
 * Access theme context
 *
 * @throws {Error} If used outside ThemeProvider
 * @returns {ThemeContextValue} Theme context value
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used within ThemeProvider. ' +
      'Wrap your app with <ThemeProvider> to use theme features.'
    );
  }

  return context;
}
