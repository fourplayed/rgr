/**
 * useFlipAnimation - Flip card animation state management
 */
import { useState, useCallback } from 'react';
import { FLIP_ANIMATION_DURATION_MS } from '../styles';

export interface UseFlipAnimationResult {
  showForgotPassword: boolean;
  isFlipAnimating: boolean;
  handleFlipToForgotPassword: () => void;
  handleFlipToLogin: () => void;
}

/**
 * Hook for managing flip animation state between login and forgot password cards
 */
export function useFlipAnimation(): UseFlipAnimationResult {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isFlipAnimating, setIsFlipAnimating] = useState(false);

  // Handle FLIP animation for form switching (links)
  const handleFlipToForgotPassword = useCallback(() => {
    if (isFlipAnimating) return;
    setIsFlipAnimating(true);
    setShowForgotPassword(true);
    setTimeout(() => setIsFlipAnimating(false), FLIP_ANIMATION_DURATION_MS);
  }, [isFlipAnimating]);

  const handleFlipToLogin = useCallback(() => {
    if (isFlipAnimating) return;
    setIsFlipAnimating(true);
    setShowForgotPassword(false);
    setTimeout(() => setIsFlipAnimating(false), FLIP_ANIMATION_DURATION_MS);
  }, [isFlipAnimating]);

  return {
    showForgotPassword,
    isFlipAnimating,
    handleFlipToForgotPassword,
    handleFlipToLogin,
  };
}
