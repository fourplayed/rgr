/**
 * useSwipeAnimation - Theme swipe animation state management
 * Updated to work with unified theme context
 */
import { useState, useCallback } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { THEME_SWIPE_DURATION_MS } from '../styles';

export type SwipePhase = 'idle' | 'swipe-out' | 'position-in' | 'swipe-in';
export type SwipeDirection = 'left' | 'right';

export interface UseSwipeAnimationResult {
  swipePhase: SwipePhase;
  swipeDirection: SwipeDirection;
  isThemeAnimating: boolean;
  handleThemeToggle: () => void;
}

/**
 * Hook for managing theme swipe animation state
 * Works with unified ThemeContext
 */
export function useSwipeAnimation(): UseSwipeAnimationResult {
  const { toggleTheme } = useTheme();
  const [swipePhase, setSwipePhase] = useState<SwipePhase>('idle');
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>('right');
  const [isThemeAnimating, setIsThemeAnimating] = useState(false);

  // Toggle theme with full-width swipe animation
  const handleThemeToggle = useCallback(() => {
    if (isThemeAnimating) return;

    setIsThemeAnimating(true);
    // Alternate swipe direction each time
    const newDir = swipeDirection === 'right' ? 'left' : 'right';
    setSwipeDirection(newDir);

    // Phase 1: Swipe out (card exits to one side)
    setSwipePhase('swipe-out');

    // Phase 2: Instantly position on opposite side (no transition) + toggle theme
    setTimeout(() => {
      toggleTheme(); // Use unified theme context
      setSwipePhase('position-in'); // Instant position, no animation
    }, THEME_SWIPE_DURATION_MS);

    // Phase 3: Animate swipe back to center
    setTimeout(() => {
      setSwipePhase('swipe-in');
    }, THEME_SWIPE_DURATION_MS + 20); // Small delay to ensure position is set

    // Phase 4: Reset to idle
    setTimeout(() => {
      setSwipePhase('idle');
      setIsThemeAnimating(false);
    }, THEME_SWIPE_DURATION_MS * 2 + 50);
  }, [swipeDirection, isThemeAnimating, toggleTheme]);

  return {
    swipePhase,
    swipeDirection,
    isThemeAnimating,
    handleThemeToggle,
  };
}
