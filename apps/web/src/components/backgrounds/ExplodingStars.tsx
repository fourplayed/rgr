/**
 * ExplodingStars - Large stars that randomly explode with chain reactions
 *
 * Lifecycle per star:
 *   normal → warning (5s accelerating blue pulse + 6× speed toward nearest star) → exploding → dead → respawning → normal
 *
 * Chain reaction: when a star enters warning phase, any nearby stars within
 * BLAST_RADIUS also trigger (with a slight stagger). The rule applies recursively.
 */
import { useState, useEffect, useRef, useCallback, memo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type StarPhase = 'normal' | 'warning' | 'exploding' | 'dead' | 'respawning';

export interface StarPosition {
  x: number;
  y: number;
  size: number;
  withGlow: boolean;
}

interface Particle {
  angle: number;
  distance: number;
  size: number;
  brightness: number;
  duration: number;
}

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------
const BLAST_RADIUS = 500;
const WARNING_MS = 5000;
const EXPLOSION_MS = 800;
const DEAD_MS = 3000;
const RESPAWN_MS = 1500;
const MIN_TRIGGER_MS = 8000;
const MAX_TRIGGER_MS = 22000;
const FIRST_TRIGGER_MIN_MS = 3000;
const FIRST_TRIGGER_MAX_MS = 8000;
const PARTICLE_COUNT = 12;

function dist(a: StarPosition, b: StarPosition) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ---------------------------------------------------------------------------
// CSS Keyframes
// ---------------------------------------------------------------------------
const KEYFRAMES = `
  /* Normal: gentle breathing glow pulse */
  @keyframes explGlowPulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; filter: brightness(1); }
    50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.6; filter: brightness(1.4); }
  }

  /* Warning: accelerating blink over 5 seconds */
  @keyframes explWarningBlink {
    0%    { opacity: 0; }
    4%    { opacity: 1; }
    10%   { opacity: 0; }
    20%   { opacity: 0; }
    24%   { opacity: 1; }
    30%   { opacity: 0; }
    37%   { opacity: 0; }
    40%   { opacity: 1; }
    44%   { opacity: 0; }
    50%   { opacity: 0; }
    53%   { opacity: 1; }
    57%   { opacity: 0; }
    61%   { opacity: 0; }
    64%   { opacity: 1; }
    66%   { opacity: 0; }
    69%   { opacity: 0; }
    71%   { opacity: 1; }
    74%   { opacity: 0; }
    77%   { opacity: 1; }
    79%   { opacity: 0; }
    82%   { opacity: 1; }
    84%   { opacity: 0; }
    87%   { opacity: 1; }
    89%   { opacity: 0; }
    92%   { opacity: 1; }
    93%   { opacity: 0; }
    95%   { opacity: 1; }
    96%   { opacity: 0; }
    98%   { opacity: 1; }
    100%  { opacity: 1; }
  }

  /* Star core grows + brightens during warning */
  @keyframes explWarningGrow {
    0%   { transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
    100% { transform: translate(-50%, -50%) scale(2); filter: brightness(1.6); }
  }

  /* 500% extra speed during warning (6× total) — attracted toward nearest neighbor */
  @keyframes explSpeedBoost {
    0%   { transform: translate(0, 0); }
    100% { transform: translate(var(--attract-tx), var(--attract-ty)); }
  }

  /* Bright flash expanding outward on explosion */
  @keyframes explFlash {
    0%   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    40%  { transform: translate(-50%, -50%) scale(8); opacity: 0.7; }
    100% { transform: translate(-50%, -50%) scale(14); opacity: 0; }
  }

  /* Expanding shockwave ring */
  @keyframes explBlastRing {
    0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
  }

  /* Particle flying outward from center */
  @keyframes explParticle {
    0%   { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
    70%  { opacity: 0.4; }
    100% { transform: translate(-50%, -50%) translate(var(--expl-tx), var(--expl-ty)) scale(0.1); opacity: 0; }
  }

  /* Star fading back in after death */
  @keyframes explRespawn {
    0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    60%  { transform: translate(-50%, -50%) scale(1.3); opacity: 0.7; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }

  /* Container mirrors #stars3 positioning + animation */
  .expl-stars-layer {
    position: absolute;
    top: 300px;
    left: calc(105vw - 500px);
    width: 1px;
    height: 1px;
    pointer-events: none;
    overflow: visible;
    background: transparent;
    animation: animStarFast 198.9s linear infinite;
    z-index: 3;
  }

  @media (prefers-reduced-motion: reduce) {
    .expl-stars-layer,
    .expl-stars-layer * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export interface ExplodingStarsProps {
  positions: StarPosition[];
  color: string;
  glowColor: string;
  isDark: boolean;
}

export const ExplodingStars = memo(function ExplodingStars({
  positions,
  color,
  glowColor,
  isDark,
}: ExplodingStarsProps) {
  // Per-star phase ---------------------------------------------------------
  const [phases, setPhases] = useState<StarPhase[]>(() =>
    positions.map(() => 'normal'),
  );
  const phasesRef = useRef(phases);
  phasesRef.current = phases;

  // Synchronous guard prevents double-triggering from concurrent chains
  const busyRef = useRef(new Set<number>());

  // Timeout tracking -------------------------------------------------------
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const sched = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timersRef.current.delete(t);
      fn();
    }, ms);
    timersRef.current.add(t);
  }, []);

  const setOne = useCallback((i: number, p: StarPhase) => {
    setPhases((prev) => {
      const n = [...prev];
      n[i] = p;
      return n;
    });
  }, []);

  // Stable particle data (randomized once) ---------------------------------
  const particlesRef = useRef<Particle[][]>(
    positions.map(() =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        angle: (360 / PARTICLE_COUNT) * i + Math.random() * 24 - 12,
        distance: 25 + Math.random() * 55,
        size: 0.4 + Math.random() * 1.2,
        brightness: Math.random(),
        duration: 400 + Math.random() * 400,
      })),
    ),
  );

  // Per-star random pulse duration so they breathe out of sync
  const pulseDurations = useRef<number[]>(
    positions.map(() => 3000 + Math.random() * 3000),
  );

  // Per-star attraction vector toward nearest large star
  const attractVectors = useRef(
    positions.map((pos, i) => {
      let nearestDist = Infinity;
      let nearestIdx = -1;
      positions.forEach((other, j) => {
        if (j === i) return;
        const d = dist(pos, other);
        if (d < nearestDist) { nearestDist = d; nearestIdx = j; }
      });
      if (nearestIdx === -1) return { tx: 0, ty: 0 };
      const nearest = positions[nearestIdx];
      return { tx: (nearest.x - pos.x) * 0.7, ty: (nearest.y - pos.y) * 0.7 };
    }),
  );

  // Trigger full lifecycle for one star ------------------------------------
  const trigger = useCallback(
    (i: number) => {
      if (busyRef.current.has(i) || phasesRef.current[i] !== 'normal') return;
      busyRef.current.add(i);

      setOne(i, 'warning');

      // Chain reaction — nearby normal stars also trigger
      positions.forEach((_, j) => {
        if (j === i || busyRef.current.has(j)) return;
        if (dist(positions[i], positions[j]) <= BLAST_RADIUS) {
          sched(() => trigger(j), 300 + Math.random() * 700);
        }
      });

      sched(() => {
        setOne(i, 'exploding');
        sched(() => {
          setOne(i, 'dead');
          sched(() => {
            setOne(i, 'respawning');
            sched(() => {
              busyRef.current.delete(i);
              setOne(i, 'normal');
            }, RESPAWN_MS);
          }, DEAD_MS);
        }, EXPLOSION_MS);
      }, WARNING_MS);
    },
    [positions, setOne, sched],
  );

  // Random trigger loop ----------------------------------------------------
  useEffect(() => {
    let alive = true;

    function loop() {
      if (!alive) return;
      const delay = MIN_TRIGGER_MS + Math.random() * (MAX_TRIGGER_MS - MIN_TRIGGER_MS);
      sched(() => {
        if (!alive) return;
        const candidates: number[] = [];
        phasesRef.current.forEach((p, i) => {
          if (p === 'normal' && !busyRef.current.has(i)) candidates.push(i);
        });
        if (candidates.length > 0) {
          trigger(candidates[Math.floor(Math.random() * candidates.length)]);
        }
        loop();
      }, delay);
    }

    const firstDelay =
      FIRST_TRIGGER_MIN_MS + Math.random() * (FIRST_TRIGGER_MAX_MS - FIRST_TRIGGER_MIN_MS);
    sched(() => {
      if (!alive) return;
      const candidates: number[] = [];
      phasesRef.current.forEach((p, i) => {
        if (p === 'normal' && !busyRef.current.has(i)) candidates.push(i);
      });
      if (candidates.length > 0) {
        trigger(candidates[Math.floor(Math.random() * candidates.length)]);
      }
      loop();
    }, firstDelay);

    return () => { alive = false; };
  }, [trigger, sched]);

  // Render -----------------------------------------------------------------
  return (
    <>
      <style>{KEYFRAMES}</style>

      <div
        className="expl-stars-layer"
        style={!isDark ? { opacity: 1, filter: 'brightness(1.2)' } : undefined}
      >
        {positions.map((pos, i) => {
          const phase = phases[i];
          const d = pos.size * 2;

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: 0,
                height: 0,
                ...(phase === 'warning'
                  ? {
                      '--attract-tx': `${attractVectors.current[i].tx}px`,
                      '--attract-ty': `${attractVectors.current[i].ty}px`,
                      animation: `explSpeedBoost ${WARNING_MS}ms ease-in forwards`,
                    } as React.CSSProperties
                  : {}),
                ...(phase === 'exploding'
                  ? { transform: `translate(${attractVectors.current[i].tx}px, ${attractVectors.current[i].ty}px)` }
                  : {}),
              }}
            >
              {/* Star core + glow */}
              {phase !== 'dead' && phase !== 'exploding' && (
                <div
                  style={{
                    position: 'absolute',
                    width: d,
                    height: d,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: `0 0 ${pos.size * 18}px ${pos.size * 4.5}px ${glowColor}`,
                    transform: 'translate(-50%, -50%)',
                    ...(phase === 'normal'
                      ? { animation: `explGlowPulse ${pulseDurations.current[i]}ms ease-in-out infinite` }
                      : {}),
                    ...(phase === 'warning'
                      ? { animation: `explWarningGrow ${WARNING_MS}ms ease-in forwards` }
                      : {}),
                    ...(phase === 'respawning'
                      ? { animation: `explRespawn ${RESPAWN_MS}ms ease-out forwards` }
                      : {}),
                  }}
                />
              )}

              {/* Warning: deep-blue blink overlay */}
              {phase === 'warning' && (
                <div
                  style={{
                    position: 'absolute',
                    width: d * 12,
                    height: d * 12,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0,20,120,0.9) 0%, rgba(0,10,80,0.4) 40%, transparent 70%)',
                    transform: 'translate(-50%, -50%)',
                    animation: `explWarningBlink ${WARNING_MS}ms ease-in-out forwards`,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Explosion: flash + blast ring + particles */}
              {phase === 'exploding' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      width: d * 4,
                      height: d * 4,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(0,255,255,1) 0%, rgba(0,180,200,0.8) 25%, rgba(0,40,40,0.4) 55%, transparent 100%)',
                      animation: `explFlash ${EXPLOSION_MS}ms ease-out forwards`,
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      border: '2px solid rgba(0,255,255,0.5)',
                      animation: `explBlastRing ${EXPLOSION_MS}ms ease-out forwards`,
                      pointerEvents: 'none',
                    }}
                  />
                  {particlesRef.current[i].map((p, pi) => {
                    const rad = (p.angle * Math.PI) / 180;
                    const tx = Math.cos(rad) * p.distance;
                    const ty = Math.sin(rad) * p.distance;
                    const g = Math.round(p.brightness * 255);
                    const b = Math.round(p.brightness * 255);
                    const bg = `rgb(0, ${g}, ${b})`;
                    const glow = `0 0 4px 1px rgb(0, ${Math.round(p.brightness * 200)}, ${Math.round(p.brightness * 200)})`;

                    return (
                      <div
                        key={pi}
                        style={{
                          position: 'absolute',
                          width: p.size * 2,
                          height: p.size * 2,
                          borderRadius: '50%',
                          background: bg,
                          boxShadow: glow,
                          '--expl-tx': `${tx}px`,
                          '--expl-ty': `${ty}px`,
                          animation: `explParticle ${p.duration}ms ease-out forwards`,
                          animationDelay: `${pi * 15}ms`,
                          pointerEvents: 'none',
                        } as React.CSSProperties}
                      />
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
});
