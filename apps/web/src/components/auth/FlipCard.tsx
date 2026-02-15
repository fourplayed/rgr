/**
 * FlipCard Component
 *
 * A 3D flipping card container used for login/forgot password transitions.
 * Uses CSS 3D transforms for a smooth flip animation.
 */
import { type ReactNode } from 'react';

export interface FlipCardProps {
  /** Whether to show the back face (flipped state) */
  isFlipped: boolean;
  /** Content for the front face (login form) */
  frontContent: ReactNode;
  /** Content for the back face (forgot password form) */
  backContent: ReactNode;
  /** Optional additional class names */
  className?: string;
}

/**
 * CSS for flip card animation
 * Injected into head on first render
 */
const FLIP_CARD_STYLES = `
  .flip-card-container {
    perspective: 1200px;
    width: 100%;
    max-width: 420px;
  }

  .flip-card-inner {
    position: relative;
    width: 100%;
    transition: transform 0.6s ease-in-out;
    transform-style: preserve-3d;
  }

  .flip-card-inner.flipped {
    transform: rotateY(180deg);
  }

  .flip-card-face {
    position: absolute;
    width: 100%;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .flip-card-front {
    transform: rotateY(0deg);
  }

  .flip-card-back {
    transform: rotateY(180deg);
  }

  /* Ensure proper stacking during animation */
  .flip-card-inner:not(.flipped) .flip-card-front {
    position: relative;
  }

  .flip-card-inner.flipped .flip-card-back {
    position: relative;
  }

  .flip-card-inner:not(.flipped) .flip-card-back {
    visibility: hidden;
  }

  .flip-card-inner.flipped .flip-card-front {
    visibility: hidden;
  }
`;

// Inject styles once
let stylesInjected = false;

function injectStyles(): void {
  if (typeof document === 'undefined' || stylesInjected) return;

  const styleElement = document.createElement('style');
  styleElement.id = 'flip-card-styles';
  styleElement.textContent = FLIP_CARD_STYLES;
  document.head.appendChild(styleElement);
  stylesInjected = true;
}

export function FlipCard({
  isFlipped,
  frontContent,
  backContent,
  className = '',
}: FlipCardProps): JSX.Element {
  // Inject styles on first render
  if (typeof document !== 'undefined' && !stylesInjected) {
    injectStyles();
  }

  return (
    <div className={`flip-card-container ${className}`}>
      <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* Front Face - Login Form */}
        <div className="flip-card-face flip-card-front" aria-hidden={isFlipped}>
          {frontContent}
        </div>

        {/* Back Face - Forgot Password Form */}
        <div className="flip-card-face flip-card-back" aria-hidden={!isFlipped}>
          {backContent}
        </div>
      </div>
    </div>
  );
}

export default FlipCard;
