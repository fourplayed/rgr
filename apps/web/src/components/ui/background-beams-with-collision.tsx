"use client";
import React, { useEffect, useRef, useState } from "react";

export const BackgroundBeamsWithCollision = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const beams = [
    { left: '10%', duration: 7, delay: 0 },
    { left: '25%', duration: 5, delay: 1 },
    { left: '40%', duration: 6, delay: 2 },
    { left: '55%', duration: 8, delay: 0.5 },
    { left: '70%', duration: 7, delay: 1.5 },
    { left: '85%', duration: 6, delay: 0 },
  ];

  return (
    <div
      ref={parentRef}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className || ""}`}
    >
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }
      `}</style>

      {beams.map((beam, index) => (
        <CollisionMechanism
          key={`beam-${index}`}
          beamOptions={beam}
          containerRef={containerRef}
          parentRef={parentRef}
        />
      ))}

      {children}
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 w-full"
      ></div>
    </div>
  );
};

const CollisionMechanism = React.forwardRef<
  HTMLDivElement,
  {
    beamOptions?: {
      left?: string;
      duration?: number;
      delay?: number;
    };
    containerRef: React.RefObject<HTMLDivElement>;
    parentRef: React.RefObject<HTMLDivElement>;
  }
>(({ beamOptions = {}, containerRef, parentRef }, _ref) => {
  const beamRef = useRef<HTMLDivElement>(null);
  const [collision, setCollision] = useState<{
    detected: boolean;
    coordinates: { x: number; y: number } | null;
  }>({
    detected: false,
    coordinates: null,
  });

  useEffect(() => {
    const checkCollision = () => {
      if (beamRef.current && containerRef.current && parentRef.current) {
        const beamRect = beamRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();

        if (beamRect.bottom >= containerRect.top && !collision.detected) {
          const relativeX = beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = containerRect.top - parentRect.top;

          setCollision({
            detected: true,
            coordinates: { x: relativeX, y: relativeY },
          });

          setTimeout(() => {
            setCollision({ detected: false, coordinates: null });
          }, 1000);
        }
      }
    };

    const interval = setInterval(checkCollision, 50);
    return () => clearInterval(interval);
  }, [collision.detected, containerRef, parentRef]);

  return (
    <>
      <div
        ref={beamRef}
        style={{
          left: beamOptions.left || '50%',
          animation: `fall ${beamOptions.duration || 6}s linear infinite`,
          animationDelay: `${beamOptions.delay || 0}s`,
        }}
        className="pointer-events-none absolute top-0 h-20 w-1 bg-gradient-to-b from-blue-500 via-purple-500 to-transparent"
      />
      {collision.detected && collision.coordinates && (
        <Explosion
          style={{
            left: `${collision.coordinates.x}px`,
            top: `${collision.coordinates.y}px`,
          }}
        />
      )}
    </>
  );
});

CollisionMechanism.displayName = "CollisionMechanism";

const Explosion = ({ ...props }: React.HTMLProps<HTMLDivElement>) => {
  return (
    <div {...props} className="pointer-events-none absolute z-50">
      <style>{`
        @keyframes explode {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--x), var(--y)) scale(0);
            opacity: 0;
          }
        }
      `}</style>
      <div className="relative">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          const x = Math.cos((angle * Math.PI) / 180) * 50;
          const y = Math.sin((angle * Math.PI) / 180) * 50;
          return (
            <span
              key={i}
              className="absolute h-2 w-2 rounded-full bg-gradient-to-b from-blue-400 to-purple-600"
              style={{
                animation: 'explode 0.8s ease-out forwards',
                // @ts-expect-error CSS custom properties not in CSSProperties type
                '--x': `${x}px`,
                '--y': `${y}px`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
