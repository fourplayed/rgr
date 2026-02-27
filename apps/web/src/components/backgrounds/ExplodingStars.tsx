/**
 * ExplodingStars - Large stars with ambient lightning tendrils and proximity shocks
 *
 * Each star has small lightning tendrils crackling off it at all times.
 * When two stars are within SHOCK_RADIUS (150px), a shock bolt arcs between them
 * and triggers the chain reaction explosion sequence.
 *
 * Lifecycle per star:
 *   normal → warning → exploding → dead → respawning → normal
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

interface AmbientTendril {
  path: string;
  opacity: number;
}

interface ShockBolt {
  id: number;
  path: string;
  branches: string[];
}

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------
const SHOCK_RADIUS = 150;
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
const TENDRIL_COUNT = 4;          // tendrils per star
const TENDRIL_REFRESH_MS = 150;   // how often tendrils re-jag
const SHOCK_BOLT_MS = 400;        // how long a shock bolt stays visible

function dist(a: StarPosition, b: StarPosition) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ---------------------------------------------------------------------------
// Lightning path generation
// ---------------------------------------------------------------------------
function generateLightningPath(
  x1: number, y1: number,
  x2: number, y2: number,
  segments: number = 10,
  jitter: number = 0.15,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return `M ${x1} ${y1}`;

  const perpX = -dy / len;
  const perpY = dx / len;

  const points: string[] = [`M ${x1} ${y1}`];

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const midX = x1 + dx * t;
    const midY = y1 + dy * t;
    const maxOffset = len * jitter * Math.sin(t * Math.PI);
    const offset = (Math.random() - 0.5) * 2 * maxOffset;
    points.push(`L ${midX + perpX * offset} ${midY + perpY * offset}`);
  }

  points.push(`L ${x2} ${y2}`);
  return points.join(' ');
}

function generateBranches(
  x1: number, y1: number,
  x2: number, y2: number,
): string[] {
  const branches: string[] = [];
  const count = 1 + Math.floor(Math.random() * 2);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  for (let b = 0; b < count; b++) {
    const t = 0.25 + Math.random() * 0.5;
    const startX = x1 + dx * t;
    const startY = y1 + dy * t;
    const branchLen = len * (0.2 + Math.random() * 0.25);
    const baseAngle = Math.atan2(dy, dx);
    const branchAngle = baseAngle + (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.8);
    const endX = startX + Math.cos(branchAngle) * branchLen;
    const endY = startY + Math.sin(branchAngle) * branchLen;
    branches.push(generateLightningPath(startX, startY, endX, endY, 4, 0.2));
  }

  return branches;
}

/**
 * Generate small ambient tendrils radiating from a star position
 */
function generateTendrils(x: number, y: number, count: number): AmbientTendril[] {
  const tendrils: AmbientTendril[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const length = 20 + Math.random() * 40;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    tendrils.push({
      path: generateLightningPath(x, y, endX, endY, 4, 0.25),
      opacity: 0.3 + Math.random() * 0.7,
    });
  }
  return tendrils;
}

// ---------------------------------------------------------------------------
// CSS Keyframes
// ---------------------------------------------------------------------------
const KEYFRAMES = `
  /* Normal: fade to transparent, then back */
  @keyframes explGlowPulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    50% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
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

  /* Star core grows during warning — flickers transparent to violet */
  @keyframes explWarningGrow {
    0%   { transform: translate(-50%, -50%) scale(1); opacity: 0; }
    10%  { opacity: 1; filter: brightness(1.5) hue-rotate(270deg); }
    20%  { opacity: 0; }
    30%  { opacity: 1; filter: brightness(1.5) hue-rotate(270deg); }
    40%  { opacity: 0; }
    50%  { transform: translate(-50%, -50%) scale(1.3); opacity: 1; filter: brightness(1.5) hue-rotate(270deg); }
    55%  { opacity: 0; }
    60%  { opacity: 1; filter: brightness(1.5) hue-rotate(270deg); }
    65%  { opacity: 0; }
    70%  { opacity: 1; filter: brightness(1.5) hue-rotate(270deg); }
    75%  { opacity: 0; }
    80%  { opacity: 1; filter: brightness(1.8) hue-rotate(270deg); }
    85%  { opacity: 0; }
    88%  { opacity: 1; filter: brightness(1.8) hue-rotate(270deg); }
    91%  { opacity: 0; }
    94%  { opacity: 1; filter: brightness(2) hue-rotate(270deg); }
    97%  { opacity: 0; }
    100% { transform: translate(-50%, -50%) scale(2); opacity: 1; filter: brightness(2) hue-rotate(270deg); }
  }

  @keyframes explSpeedBoost {
    0%   { transform: translate(0, 0); }
    100% { transform: translate(var(--attract-tx), var(--attract-ty)); }
  }

  @keyframes explFlash {
    0%   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    40%  { transform: translate(-50%, -50%) scale(16); opacity: 0.7; }
    100% { transform: translate(-50%, -50%) scale(28); opacity: 0; }
  }

  @keyframes explBlastRing {
    0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.8; }
    100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
  }

  @keyframes explParticle {
    0%   { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
    70%  { opacity: 0.4; }
    100% { transform: translate(-50%, -50%) translate(var(--expl-tx), var(--expl-ty)) scale(0.1); opacity: 0; }
  }

  @keyframes explRespawn {
    0%   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    60%  { transform: translate(-50%, -50%) scale(1.3); opacity: 0.7; }
    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  }

  /* Shock bolt flash */
  @keyframes shockFlash {
    0%   { opacity: 1; }
    10%  { opacity: 0.4; }
    20%  { opacity: 1; }
    40%  { opacity: 0.6; }
    50%  { opacity: 0.9; }
    100% { opacity: 0; }
  }

  .expl-stars-layer {
    position: absolute;
    top: 300px;
    left: calc(105vw - 500px);
    width: 1px;
    height: 1px;
    pointer-events: none;
    overflow: visible;
    background: transparent;
    animation: animStarFast 248.6s linear infinite;
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
  // Page Visibility — pause all updates when tab is hidden ----------------
  const isVisibleRef = useRef(document.visibilityState === 'visible');

  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Per-star phase ---------------------------------------------------------
  const [phases, setPhases] = useState<StarPhase[]>(() =>
    positions.map(() => 'normal'),
  );
  const phasesRef = useRef(phases);
  phasesRef.current = phases;

  // Ambient tendrils — regenerate rapidly for crackle effect ----------------
  const [tendrils, setTendrils] = useState<AmbientTendril[][]>(() =>
    positions.map((pos) => generateTendrils(pos.x, pos.y, TENDRIL_COUNT)),
  );

  // Shock bolts between nearby stars ---------------------------------------
  const [shockBolts, setShockBolts] = useState<ShockBolt[]>([]);
  const shockIdRef = useRef(0);

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

  // Pre-compute proximity pairs (static — positions don't move relative) ----
  const proximityPairs = useRef<Array<[number, number]>>([]);
  useEffect(() => {
    const pairs: Array<[number, number]> = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const posI = positions[i];
        const posJ = positions[j];
        if (posI && posJ && dist(posI, posJ) <= SHOCK_RADIUS) {
          pairs.push([i, j]);
        }
      }
    }
    proximityPairs.current = pairs;
  }, [positions]);

  // Ambient tendril refresh loop -------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isVisibleRef.current) return;
      setTendrils(
        positions.map((pos, i) => {
          // Only show tendrils for alive stars
          const phase = phasesRef.current[i];
          if (phase === 'dead' || phase === 'exploding') return [];
          return generateTendrils(pos.x, pos.y, TENDRIL_COUNT);
        }),
      );
    }, TENDRIL_REFRESH_MS);
    return () => clearInterval(interval);
  }, [positions]);

  // Spawn a shock bolt between two stars -----------------------------------
  const spawnShock = useCallback((fromIdx: number, toIdx: number) => {
    const from = positions[fromIdx];
    const to = positions[toIdx];
    if (!from || !to) return;
    const id = ++shockIdRef.current;

    const bolt: ShockBolt = {
      id,
      path: generateLightningPath(from.x, from.y, to.x, to.y, 8, 0.2),
      branches: generateBranches(from.x, from.y, to.x, to.y),
    };

    setShockBolts((prev) => [...prev, bolt]);

    sched(() => {
      setShockBolts((prev) => prev.filter((b) => b.id !== id));
    }, SHOCK_BOLT_MS);
  }, [positions, sched]);

  // Stable particle data (randomized once) ---------------------------------
  const particlesRef = useRef<Particle[][]>(
    positions.map(() =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        angle: (360 / PARTICLE_COUNT) * i + Math.random() * 24 - 12,
        distance: 50 + Math.random() * 110,
        size: 0.4 + Math.random() * 1.2,
        brightness: Math.random(),
        duration: 400 + Math.random() * 400,
      })),
    ),
  );

  const pulseDurations = useRef<number[]>(
    positions.map(() => 3750 + Math.random() * 3750),
  );

  const attractVectors = useRef(
    positions.map((pos, i) => {
      let nearestDist = Infinity;
      let nearestIdx = -1;
      positions.forEach((other, j) => {
        if (j === i) return;
        const d = dist(pos, other);
        if (d < nearestDist) { nearestDist = d; nearestIdx = j; }
      });
      const nearest = nearestIdx === -1 ? undefined : positions[nearestIdx];
      if (!nearest) return { tx: 0, ty: 0 };
      return { tx: (nearest.x - pos.x) * 0.7, ty: (nearest.y - pos.y) * 0.7 };
    }),
  );

  // Trigger full lifecycle for one star ------------------------------------
  const trigger = useCallback(
    (i: number) => {
      if (busyRef.current.has(i) || phasesRef.current[i] !== 'normal') return;
      busyRef.current.add(i);

      setOne(i, 'warning');

      // Chain reaction — nearby stars get shocked + triggered
      positions.forEach((_, j) => {
        if (j === i || busyRef.current.has(j)) return;
        const posI = positions[i];
        const posJ = positions[j];
        if (posI && posJ && dist(posI, posJ) <= BLAST_RADIUS) {
          const chainDelay = 300 + Math.random() * 700;
          // Shock bolt
          sched(() => spawnShock(i, j), chainDelay * 0.3);
          sched(() => trigger(j), chainDelay);
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
    [positions, setOne, sched, spawnShock],
  );

  // Proximity shock — stars within 150px zap each other periodically -------
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isVisibleRef.current) return;
      const pairs = proximityPairs.current;
      for (const [i, j] of pairs) {
        const pi = phasesRef.current[i];
        const pj = phasesRef.current[j];
        // Both alive? Random chance to zap
        if ((pi === 'normal' || pi === 'warning') && (pj === 'normal' || pj === 'warning')) {
          if (Math.random() < 0.3) {
            spawnShock(i, j);
          }
          // If one is normal and other is normal, chance to trigger chain
          if (pi === 'normal' && pj === 'normal' && !busyRef.current.has(i) && !busyRef.current.has(j)) {
            if (Math.random() < 0.02) {
              spawnShock(i, j);
              sched(() => trigger(i), 200);
            }
          }
        }
      }
    }, 800);
    return () => clearInterval(interval);
  }, [spawnShock, trigger, sched]);

  // Random trigger loop ----------------------------------------------------
  useEffect(() => {
    let alive = true;

    function loop() {
      if (!alive) return;
      const delay = MIN_TRIGGER_MS + Math.random() * (MAX_TRIGGER_MS - MIN_TRIGGER_MS);
      sched(() => {
        if (!alive) return;
        // Skip trigger when tab is hidden — just reschedule
        if (!isVisibleRef.current) { loop(); return; }
        const candidates: number[] = [];
        phasesRef.current.forEach((p, i) => {
          if (p === 'normal' && !busyRef.current.has(i)) candidates.push(i);
        });
        if (candidates.length > 0) {
          const idx = candidates[Math.floor(Math.random() * candidates.length)];
          if (idx !== undefined) trigger(idx);
        }
        loop();
      }, delay);
    }

    const firstDelay =
      FIRST_TRIGGER_MIN_MS + Math.random() * (FIRST_TRIGGER_MAX_MS - FIRST_TRIGGER_MIN_MS);
    sched(() => {
      if (!alive) return;
      if (!isVisibleRef.current) { loop(); return; }
      const candidates: number[] = [];
      phasesRef.current.forEach((p, i) => {
        if (p === 'normal' && !busyRef.current.has(i)) candidates.push(i);
      });
      if (candidates.length > 0) {
        const idx = candidates[Math.floor(Math.random() * candidates.length)];
        if (idx !== undefined) trigger(idx);
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
        {/* SVG layer for all lightning */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          {/* Ambient tendrils on each star */}
          {tendrils.map((starTendrils, i) =>
            starTendrils.map((t, ti) => (
              <g key={`t-${i}-${ti}`} opacity={t.opacity}>
                <path
                  d={t.path}
                  fill="none"
                  stroke="rgba(200,100,255,0.8)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d={t.path}
                  fill="none"
                  stroke="rgba(150,40,255,0.3)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </g>
            )),
          )}

          {/* Shock bolts between nearby stars */}
          {shockBolts.map((bolt) => (
            <g
              key={bolt.id}
              style={{
                animation: `shockFlash ${SHOCK_BOLT_MS}ms ease-out forwards`,
              }}
            >
              {/* Core — bright neon violet */}
              <path
                d={bolt.path}
                fill="none"
                stroke="rgba(220,160,255,1)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Mid glow */}
              <path
                d={bolt.path}
                fill="none"
                stroke="rgba(160,40,255,0.7)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Wide glow */}
              <path
                d={bolt.path}
                fill="none"
                stroke="rgba(120,0,200,0.25)"
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Branches */}
              {bolt.branches.map((bp, bi) => (
                <g key={bi}>
                  <path
                    d={bp}
                    fill="none"
                    stroke="rgba(220,160,255,0.8)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d={bp}
                    fill="none"
                    stroke="rgba(150,40,255,0.4)"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                </g>
              ))}
            </g>
          ))}
        </svg>

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
                      '--attract-tx': `${attractVectors.current[i]!.tx}px`,
                      '--attract-ty': `${attractVectors.current[i]!.ty}px`,
                      animation: `explSpeedBoost ${WARNING_MS}ms ease-in forwards`,
                    } as React.CSSProperties
                  : {}),
                ...(phase === 'exploding'
                  ? { transform: `translate(${attractVectors.current[i]!.tx}px, ${attractVectors.current[i]!.ty}px)` }
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
                      ? { animation: `explGlowPulse ${pulseDurations.current[i]!}ms ease-in-out infinite` }
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

              {/* Warning: blue blink overlay */}
              {phase === 'warning' && (
                <div
                  style={{
                    position: 'absolute',
                    width: d * 12,
                    height: d * 12,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(180,0,255,1) 0%, rgba(100,0,180,0.5) 40%, transparent 70%)',
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
                      background: 'radial-gradient(circle, rgba(160,0,255,0.9) 0%, rgba(75,0,130,0.7) 25%, rgba(20,0,30,0.4) 55%, transparent 100%)',
                      animation: `explFlash ${EXPLOSION_MS}ms ease-out forwards`,
                      pointerEvents: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      width: 160,
                      height: 160,
                      borderRadius: '50%',
                      border: '2px solid rgba(140,0,220,0.5)',
                      animation: `explBlastRing ${EXPLOSION_MS}ms ease-out forwards`,
                      pointerEvents: 'none',
                    }}
                  />
                  {particlesRef.current[i]!.map((p, pi) => {
                    const rad = (p.angle * Math.PI) / 180;
                    const tx = Math.cos(rad) * p.distance;
                    const ty = Math.sin(rad) * p.distance;
                    const r = Math.round(40 + p.brightness * 120);
                    const g = Math.round(p.brightness * 20);
                    const b = Math.round(60 + p.brightness * 130);
                    const bg = `rgb(${r}, ${g}, ${b})`;
                    const glow = `0 0 4px 1px rgb(${Math.round(60 + p.brightness * 80)}, 0, ${Math.round(80 + p.brightness * 120)})`;

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
