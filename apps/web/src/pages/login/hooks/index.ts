/**
 * Hooks index - exports all login page custom hooks
 * Note: useTheme is now imported from @/hooks/useTheme (unified theme system)
 */
export { useFlipAnimation, type UseFlipAnimationResult } from './useFlipAnimation';
export {
  useSwipeAnimation,
  type UseSwipeAnimationResult,
  type SwipePhase,
  type SwipeDirection,
} from './useSwipeAnimation';
