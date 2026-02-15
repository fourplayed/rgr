/**
 * FlipCardContainer - 3D flip animation wrapper for login/forgot password cards
 */
import type { ReactNode } from 'react';
import { CARD_HEIGHT, FLIP_ANIMATION_DURATION_MS, THEME_SWIPE_DURATION_MS } from '../styles';

export interface FlipCardContainerProps {
  showBack: boolean;
  frontFace: ReactNode;
  backFace: ReactNode;
  swipePhase: 'idle' | 'swipe-out' | 'position-in' | 'swipe-in';
  swipeDirection: 'left' | 'right';
}

/**
 * 3D Flip Container with perspective for card switching animation
 * Also handles theme swipe animation
 */
export function FlipCardContainer({
  showBack,
  frontFace,
  backFace,
  swipePhase,
  swipeDirection,
}: FlipCardContainerProps) {
  return (
    <div
      className="w-full max-w-[400px] relative z-10"
      style={{
        minHeight: `${CARD_HEIGHT}px`,
        perspective: '1200px',
        perspectiveOrigin: 'center center',
        marginTop: '-90px',
      }}
    >
      {/* Card Container - handles both flip (form switch) and swipe (theme) animations */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          // Calculate swipe transform based on phase and direction
          transform: (() => {
            const flipRotation = `rotateY(${showBack ? '180deg' : '0deg'})`;

            if (swipePhase === 'idle' || swipePhase === 'swipe-in') {
              // At center
              return flipRotation;
            }

            // Full-width swipe: 120vw to ensure card goes completely off-screen
            if (swipePhase === 'swipe-out') {
              const exitX = swipeDirection === 'right' ? '120vw' : '-120vw';
              return `${flipRotation} translateX(${exitX})`;
            }

            // Instant position on opposite side before swipe-in
            if (swipePhase === 'position-in') {
              const entryX = swipeDirection === 'right' ? '-120vw' : '120vw';
              return `${flipRotation} translateX(${entryX})`;
            }

            return flipRotation;
          })(),
          // Control transition based on phase
          transition: (() => {
            if (swipePhase === 'position-in') {
              // No transition for instant positioning
              return 'none';
            }
            if (swipePhase === 'swipe-out' || swipePhase === 'swipe-in') {
              // Fast smooth swipe
              return `transform ${THEME_SWIPE_DURATION_MS}ms cubic-bezier(0.25, 0.1, 0.25, 1)`;
            }
            // Normal flip transition
            return `transform ${FLIP_ANIMATION_DURATION_MS}ms cubic-bezier(0.23, 1, 0.32, 1)`;
          })(),
        }}
      >
        {/* Front Face - Login Card */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          {frontFace}
        </div>

        {/* Back Face - Forgot Password Card */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {backFace}
        </div>
      </div>
    </div>
  );
}
