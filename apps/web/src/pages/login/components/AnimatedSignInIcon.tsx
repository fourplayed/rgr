/**
 * AnimatedSignInIcon - Animated arrow icon for sign-in button
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
 */
export function AnimatedSignInIcon({
  isHovered = false,
  className = '',
  size = 24,
}: AnimatedSignInIconProps) {
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
        animated-icon animated-icon--sign-in
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
  );
}
