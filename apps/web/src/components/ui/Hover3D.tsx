import { useRef, useState, useCallback, type ReactNode, type CSSProperties } from 'react';

type AnimationState = 'idle' | 'rotate-x' | 'bounce';

interface Hover3DProps {
  children: ReactNode;
  /** Max rotation in degrees */
  maxRotation?: number;
  /** Perspective distance in px */
  perspective?: number;
  /** Scale on hover */
  scale?: number;
  /** Transition speed in ms */
  transitionMs?: number;
  /** Rotation animation duration in ms */
  rotationDurationMs?: number;
  /** Bounce animation duration in ms */
  bounceDurationMs?: number;
  className?: string;
  style?: CSSProperties;
}

export function Hover3D({
  children,
  maxRotation = 15,
  perspective = 800,
  scale = 1.02,
  transitionMs = 200,
  rotationDurationMs = 900,
  bounceDurationMs = 500,
  className = '',
  style,
}: Hover3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('rotateX(0deg) rotateY(0deg) scale(1)');
  const [isHovering, setIsHovering] = useState(false);
  const [animation, setAnimation] = useState<AnimationState>('idle');
  // Whether right mouse is currently held down
  const rightHeld = useRef(false);
  // Whether we should stop bouncing after the current iteration finishes
  const stopAfterIteration = useRef(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (animation !== 'idle') return;

      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateY = ((x - centerX) / centerX) * maxRotation;
      const rotateX = ((centerY - y) / centerY) * maxRotation;

      setTransform(`rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`);
    },
    [maxRotation, scale, animation]
  );

  const handleMouseEnter = useCallback(() => {
    if (animation !== 'idle') return;
    setIsHovering(true);
  }, [animation]);

  const handleMouseLeave = useCallback(() => {
    // If right mouse is released outside the element, flag to stop
    rightHeld.current = false;
    if (animation === 'bounce') {
      stopAfterIteration.current = true;
    }
    if (animation === 'idle') {
      setIsHovering(false);
      setTransform('rotateX(0deg) rotateY(0deg) scale(1)');
    }
  }, [animation]);

  const handleClick = useCallback(() => {
    if (animation !== 'idle') return;
    setIsHovering(false);
    setTransform('rotateX(0deg) rotateY(0deg) scale(1)');
    setAnimation('rotate-x');
  }, [animation]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Right mouse button = 2
      if (e.button !== 2) return;
      if (animation === 'rotate-x') return;
      rightHeld.current = true;
      stopAfterIteration.current = false;
      if (animation === 'idle') {
        setIsHovering(false);
        setTransform('rotateX(0deg) rotateY(0deg) scale(1)');
        setAnimation('bounce');
      }
    },
    [animation]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 2) return;
      rightHeld.current = false;
      if (animation === 'bounce') {
        stopAfterIteration.current = true;
      }
    },
    [animation]
  );

  const handleAnimationIteration = useCallback(() => {
    if (animation === 'bounce' && stopAfterIteration.current) {
      // Let the current iteration finish, then stop
      setAnimation('idle');
      stopAfterIteration.current = false;
    }
  }, [animation]);

  const handleAnimationEnd = useCallback(() => {
    if (animation === 'rotate-x') {
      setAnimation('idle');
    }
    // bounce with infinite won't fire animationend, but handle edge cases
    if (animation === 'bounce') {
      setAnimation('idle');
      stopAfterIteration.current = false;
    }
  }, [animation]);

  let animationCss: string | undefined;
  if (animation === 'rotate-x') {
    animationCss = `hover3d-shake ${rotationDurationMs}ms ease-in-out forwards`;
  } else if (animation === 'bounce') {
    animationCss = `hover3d-bounce ${bounceDurationMs}ms ease-in-out ${stopAfterIteration.current ? '1' : 'infinite'}`;
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        perspective: `${perspective}px`,
        ...style,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <style>{`
        @keyframes hover3d-shake {
          0%, 100% { transform: translateX(0); }
          10%      { transform: translateX(-10px) rotate(-1deg); }
          20%      { transform: translateX(10px) rotate(1deg); }
          30%      { transform: translateX(-10px) rotate(0deg); }
          40%      { transform: translateX(10px) rotate(1deg); }
          50%      { transform: translateX(-10px) rotate(-1deg); }
          60%      { transform: translateX(10px) rotate(0deg); }
          70%      { transform: translateX(-6px) rotate(-1deg); }
          80%      { transform: translateX(6px) rotate(1deg); }
          90%      { transform: translateX(-2px) rotate(0deg); }
        }
        @keyframes hover3d-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30%      { transform: translateY(-10%) scale(1.02); }
          50%      { transform: translateY(-6%) scale(1.01); }
          70%      { transform: translateY(0) scale(1); }
          85%      { transform: translateY(-2%) scale(1); }
        }
      `}</style>
      <div
        style={{
          transform: animation !== 'idle' ? undefined : transform,
          transition:
            animation !== 'idle'
              ? 'none'
              : isHovering
                ? `transform ${transitionMs}ms ease-out`
                : `transform ${transitionMs * 2}ms ease-out`,
          animation: animationCss,
          transformOrigin: undefined,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
        onAnimationEnd={handleAnimationEnd}
        onAnimationIteration={handleAnimationIteration}
      >
        {children}
      </div>
    </div>
  );
}
