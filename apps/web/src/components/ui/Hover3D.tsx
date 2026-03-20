import { useRef, useCallback, type ReactNode, type CSSProperties } from 'react';
import { useSpring, animated } from '@react-spring/web';

interface Hover3DProps {
  children: ReactNode;
  /** Max rotation in degrees on hover */
  maxRotation?: number;
  /** Perspective distance in px */
  perspective?: number;
  /** Scale on hover */
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

export function Hover3D({
  children,
  maxRotation = 15,
  perspective = 800,
  scale = 1.02,
  className = '',
  style,
}: Hover3DProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [springs, api] = useSpring(() => ({
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    config: { mass: 1, tension: 170, friction: 26 },
  }));

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      api.start({
        rotateY: ((x - centerX) / centerX) * maxRotation,
        rotateX: ((centerY - y) / centerY) * maxRotation,
        scale,
        config: { tension: 300, friction: 20 },
      });
    },
    [api, maxRotation, scale]
  );

  const handleMouseLeave = useCallback(() => {
    api.start({
      rotateX: 0,
      rotateY: 0,
      scale: 1,
      config: { tension: 170, friction: 26 },
    });
  }, [api]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        perspective: `${perspective}px`,
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <animated.div
        style={{
          transform: springs.rotateX.to((rx) => {
            const ry = springs.rotateY.get();
            const s = springs.scale.get();
            return `translate3d(0, 0, 0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
          }),
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          willChange: 'transform',
        }}
      >
        {children}
      </animated.div>
    </div>
  );
}
