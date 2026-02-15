/**
 * AnimatedSignInIcon - Animated arrow icon for sign-in button
 *
 * Features:
 * - Continuous slide-in animation every 6 seconds
 * - 360° rotation on button hover
 * - Respects prefers-reduced-motion
 * - GPU-accelerated animations
 * - Theme-aware
 */
import { useEffect, useState } from 'react';

export interface AnimatedSignInIconProps {
  /** Whether the parent button is being hovered */
  isHovered?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Icon size (default: 24px) */
  size?: number;
}

/**
 * Animated Sign In Icon Component
 *
 * Renders a right-pointing arrow with:
 * - Periodic slide-in animation (every 6s)
 * - Smooth 360° rotation on hover
 * - Accessibility support for reduced motion
 */
export function AnimatedSignInIcon({
  isHovered = false,
  className = '',
  size = 24,
}: AnimatedSignInIconProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Trigger slide-in animation every 6 seconds
  useEffect(() => {
    // Initial animation after 500ms
    const initialTimer = setTimeout(() => {
      setShouldAnimate(true);
      setTimeout(() => setShouldAnimate(false), 600); // Animation duration
    }, 500);

    // Repeat every 6 seconds
    const interval = setInterval(() => {
      setShouldAnimate(true);
      setTimeout(() => setShouldAnimate(false), 600); // Animation duration
    }, 6000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <style>{`
        /* ============================================================
         * ANIMATED SIGN-IN ICON STYLES
         * ============================================================ */

        :root {
          --icon-slide-duration: 0.6s;
          --icon-rotate-duration: 0.5s;
          --icon-position-left: calc(50% - 70px);
        }

        /* Icon container - absolute positioning relative to button */
        .sign-in-icon {
          position: absolute;
          left: var(--icon-position-left);
          transition: transform var(--icon-rotate-duration) cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: center;
          will-change: transform;
        }

        /* Slide-in animation - GPU accelerated */
        @keyframes slideInFromLeft {
          0% {
            transform: translateX(-100px) scale(0.8);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateX(0) scale(1);
            opacity: 1;
          }
        }

        /* Apply slide-in animation when active */
        .sign-in-icon.slide-active {
          animation: slideInFromLeft var(--icon-slide-duration) cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Hover rotation - 360° spin */
        .sign-in-icon.rotate-active {
          transform: rotate(360deg);
        }

        /* Accessibility: Disable animations for reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .sign-in-icon {
            transition: none !important;
            animation: none !important;
          }

          .sign-in-icon.slide-active {
            animation: none !important;
          }

          .sign-in-icon.rotate-active {
            transform: none !important;
          }
        }

        /* Theme support - ensure visibility in both themes */
        .sign-in-icon svg {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
        }

        :root.dark .sign-in-icon svg {
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
        }
      `}</style>

      <svg
        className={`
          sign-in-icon
          ${shouldAnimate ? 'slide-active' : ''}
          ${isHovered ? 'rotate-active' : ''}
          ${className}
        `}
        width={size}
        height={size}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
        role="img"
      >
        {/* Right-pointing arrow with login icon */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 7l5 5m0 0l-5 5m5-5H6"
        />
      </svg>
    </>
  );
}
