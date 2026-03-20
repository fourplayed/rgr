/**
 * AnimatedMailIcon - Animated mail icon for forgot password button
 *
 * Features:
 * - Continuous slide-in animation every 6 seconds
 * - 360° rotation on button hover
 * - Respects prefers-reduced-motion
 * - GPU-accelerated animations
 * - Theme-aware
 */
import { useEffect, useState } from 'react';

export interface AnimatedMailIconProps {
  /** Whether the parent button is being hovered */
  isHovered?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Icon size (default: 24px) */
  size?: number;
}

/**
 * Animated Mail Icon Component
 *
 * Renders a mail envelope icon with:
 * - Periodic slide-in animation (every 6s)
 * - Smooth 360° rotation on hover
 * - Accessibility support for reduced motion
 */
export function AnimatedMailIcon({
  isHovered = false,
  className = '',
  size = 24,
}: AnimatedMailIconProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Trigger slide-in animation every 6 seconds
  useEffect(() => {
    // Initial animation after 500ms
    const initialTimer = setTimeout(() => {
      setShouldAnimate(true);
      setTimeout(() => setShouldAnimate(false), 1100); // Animation duration
    }, 500);

    // Repeat every 6 seconds
    const interval = setInterval(() => {
      setShouldAnimate(true);
      setTimeout(() => setShouldAnimate(false), 1100); // Animation duration
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
         * ANIMATED MAIL ICON STYLES
         * ============================================================ */

        :root {
          --mail-icon-slide-duration: 1.1s;
          --mail-icon-rotate-duration: 0.5s;
          --mail-icon-position-right: calc(50% - 95px);
        }

        /* Icon container - absolute positioning relative to button */
        .mail-icon {
          position: absolute;
          right: var(--mail-icon-position-right);
          top: 50%;
          margin-top: -12px;
          transition: transform var(--mail-icon-rotate-duration) cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: center;
          will-change: transform;
        }

        /* Spin then slide-out animation */
        @keyframes spinThenSlideOutMail {
          0% {
            transform: translateX(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          55% {
            transform: translateX(0) scale(1) rotate(360deg);
            opacity: 1;
          }
          70% {
            transform: translateX(10px) scale(1) rotate(360deg);
            opacity: 1;
          }
          100% {
            transform: translateX(70px) scale(0.8) rotate(360deg);
            opacity: 0;
          }
        }

        /* Apply animation when active */
        .mail-icon.slide-active {
          animation: spinThenSlideOutMail 1.1s cubic-bezier(0.4, 0.0, 1, 1) forwards;
        }

        /* Hover rotation - 360° spin */
        .mail-icon.rotate-active {
          transform: rotate(360deg);
        }

        /* Accessibility: Disable animations for reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .mail-icon {
            transition: none !important;
            animation: none !important;
          }

          .mail-icon.slide-active {
            animation: none !important;
          }

          .mail-icon.rotate-active {
            transform: none !important;
          }
        }

        /* Theme support - ensure visibility in both themes */
        .mail-icon svg {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
        }

        :root.dark .mail-icon svg {
          filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
        }
      `}</style>

      <svg
        className={`
          mail-icon
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
        {/* Mail envelope icon */}
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    </>
  );
}
