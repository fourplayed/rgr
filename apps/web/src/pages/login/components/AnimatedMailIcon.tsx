/**
 * AnimatedMailIcon - Animated mail icon for forgot password button
 *
 * Features:
 * - Continuous slide-in animation every 6 seconds
 * - 360 rotation on button hover
 * - Respects prefers-reduced-motion
 * - GPU-accelerated animations
 * - Theme-aware
 */
import { useEffect, useState, useRef } from 'react';
import '../login.css';

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
 */
export function AnimatedMailIcon({
  isHovered = false,
  className = '',
  size = 24,
}: AnimatedMailIconProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timers = timersRef.current;

    const startAnimation = () => {
      setShouldAnimate(true);
      timers.push(setTimeout(() => setShouldAnimate(false), 1100));
    };

    timers.push(setTimeout(startAnimation, 500));
    const interval = setInterval(startAnimation, 6000);

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
      timers.length = 0;
    };
  }, []);

  return (
    <svg
      className={`
        animated-icon animated-icon--mail
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
  );
}
