/**
 * useThemeAnimation Hook
 *
 * Encapsulates theme transition animation logic with:
 * - Display theme state management
 * - Fade-out/fade-in coordination
 * - Dashboard and navigation visibility control
 * - Reduced motion detection
 * - Timer cleanup
 */
import { useState, useEffect, useRef } from 'react';

export interface ThemeAnimationOptions {
  fadeOutDuration?: number;
  fadeInDelay?: number;
  navDelay?: number;
}

export interface ThemeAnimationState {
  displayTheme: boolean;
}

const DEFAULT_OPTIONS: Required<ThemeAnimationOptions> = {
  fadeOutDuration: 400,
  fadeInDelay: 500,
  navDelay: 300,
};

/**
 * Custom hook for managing theme transition animations
 *
 * @param isDark - Current theme state (dark mode)
 * @param isPreloading - Whether entrance animation is still running
 * @param setShowDashboard - Callback to control dashboard visibility
 * @param setNavVisible - Callback to control navigation visibility
 * @param options - Animation timing options
 * @returns Theme animation state (displayTheme)
 */
export function useThemeAnimation(
  isDark: boolean,
  isPreloading: boolean,
  setShowDashboard: (visible: boolean) => void,
  setNavVisible: (visible: boolean) => void,
  options?: ThemeAnimationOptions
): ThemeAnimationState {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Local theme state - updates during fade-out so colors change when invisible
  const [displayTheme, setDisplayTheme] = useState(isDark);

  // Refs for cleanup and coordination
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const isMountedRef = useRef(true);
  const isAnimatingRef = useRef(false);
  const prevThemeRef = useRef(isDark);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  // Helper to schedule timer with tracking
  const scheduleTimer = (callback: () => void, delay: number): NodeJS.Timeout => {
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        callback();
      }
      // Remove this timer from tracked list
      timersRef.current = timersRef.current.filter(t => t !== timer);
    }, delay);
    timersRef.current.push(timer);
    return timer;
  };

  // Clear all tracked timers
  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // Track component mount status for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, []);

  // Animate dashboard when theme changes
  useEffect(() => {
    // Detect if this is actually a theme change (not just preloading state change)
    const themeChanged = prevThemeRef.current !== isDark;
    prevThemeRef.current = isDark;

    // Skip on initial mount or during entrance animation
    if (isPreloading || isAnimatingRef.current) {
      setDisplayTheme(isDark);
      return;
    }

    // If theme hasn't actually changed, don't animate
    if (!themeChanged) {
      return;
    }

    // Check if user prefers reduced motion
    if (prefersReducedMotion.current) {
      // Update theme immediately without animation
      setDisplayTheme(isDark);
      return;
    }

    // Clear any existing animation timers
    clearAllTimers();

    // Theme changed - fade out, switch theme, fade in
    setShowDashboard(false);
    setNavVisible(false);

    // Update theme colors after fade-out completes
    scheduleTimer(() => {
      setDisplayTheme(isDark);
    }, opts.fadeOutDuration);

    // Start fade-in after theme update
    scheduleTimer(() => {
      setShowDashboard(true);

      scheduleTimer(() => {
        setNavVisible(true);
      }, opts.navDelay);
    }, opts.fadeInDelay);

    // Cleanup function clears all timers
    return clearAllTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, isPreloading]);

  return {
    displayTheme,
  };
}
