/**
 * useEntranceAnimation Hook
 *
 * Encapsulates entrance animation logic with:
 * - Preloading state management
 * - Dashboard and navigation visibility states
 * - Timer coordination and cleanup
 * - Reduced motion detection
 * - Automatic fallback timeout
 */
import { useState, useEffect, useRef } from 'react';

export interface EntranceAnimationOptions {
  preloadDelay?: number;
  entranceDelay?: number;
  navDelay?: number;
  maxLoadWait?: number;
}

export interface EntranceAnimationState {
  isPreloading: boolean;
  showDashboard: boolean;
  navVisible: boolean;
}

const DEFAULT_OPTIONS: Required<EntranceAnimationOptions> = {
  preloadDelay: 300,
  entranceDelay: 100,
  navDelay: 300,
  maxLoadWait: 5000,
};

/**
 * Custom hook for managing entrance animations
 *
 * @param trigger - Trigger condition (e.g., data loaded)
 * @param options - Animation timing options
 * @returns Animation state (isPreloading, showDashboard, navVisible)
 */
export function useEntranceAnimation(
  trigger: boolean,
  options?: EntranceAnimationOptions
): EntranceAnimationState {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Animation state
  const [isPreloading, setIsPreloading] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [navVisible, setNavVisible] = useState(false);

  // Refs for cleanup and coordination
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const isMountedRef = useRef(true);
  const isAnimatingRef = useRef(false);
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

  // Fallback timeout: Show dashboard after maxLoadWait even if data doesn't load
  useEffect(() => {
    const fallbackTimer = scheduleTimer(() => {
      if (isPreloading) {
        setIsPreloading(false);
        setShowDashboard(true);
        scheduleTimer(() => setNavVisible(true), opts.navDelay);
      }
    }, opts.maxLoadWait);

    return () => clearTimeout(fallbackTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Wait for trigger condition before animating
  useEffect(() => {
    // Skip if already animating or animation already completed
    if (!trigger || isAnimatingRef.current || !isPreloading) {
      return;
    }

    // Clear any existing timers before starting new animation
    clearAllTimers();

    // Mark animation as in progress
    isAnimatingRef.current = true;

    // Check if user prefers reduced motion
    if (prefersReducedMotion.current) {
      // Skip animations, show immediately
      setIsPreloading(false);
      setShowDashboard(true);
      setNavVisible(true);
      isAnimatingRef.current = false;
      return;
    }

    // Start entrance animation sequence
    scheduleTimer(() => {
      setIsPreloading(false);

      scheduleTimer(() => {
        setShowDashboard(true);

        scheduleTimer(() => {
          setNavVisible(true);
          // Mark animation as complete
          isAnimatingRef.current = false;
        }, opts.navDelay);
      }, opts.entranceDelay);
    }, opts.preloadDelay);

    // Cleanup function clears all timers
    return clearAllTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, isPreloading]);

  return {
    isPreloading,
    showDashboard,
    navVisible,
  };
}
