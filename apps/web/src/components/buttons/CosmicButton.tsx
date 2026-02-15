/**
 * CosmicButton - Spectacular cosmic-themed button component
 *
 * Features:
 * - Nebula core with swirling galaxy gradients
 * - Aurora borealis energy fields
 * - Orbital constellation particles
 * - Gravitational lens warping effect
 * - Hyperspace tunnel depth
 * - Quantum shimmer effects
 * - Stellar rings with comet trails
 * - Meteor shower particles
 *
 * Accessibility:
 * - Full keyboard navigation support
 * - Screen reader friendly with proper ARIA labels
 * - Respects prefers-reduced-motion
 * - Visible focus indicators (WCAG 2.1 compliant)
 *
 * Performance:
 * - Uses CSS transforms/opacity for animations (GPU accelerated)
 * - Efficient layering with proper z-index
 * - Minimal repaints
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export interface CosmicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export const CosmicButton = forwardRef<HTMLButtonElement, CosmicButtonProps>(
  ({ isLoading = false, children, variant: _variant = 'primary', className = '', ...props }, ref) => {
    return (
      <>
        <style>{`
          /* ============================================================
           * COSMIC ENERGY GATEWAY BUTTON
           * A spectacular button featuring:
           * - Nebula core with swirling galaxy gradients
           * - Aurora borealis energy fields
           * - Orbital constellation particles
           * - Gravitational lens warping
           * - Hyperspace tunnel depth
           * - Quantum shimmer effects
           * - Stellar rings with comet trails
           * ============================================================ */

          .cosmic-gateway {
            position: relative;
            border: none;
            transform-style: preserve-3d;
            perspective: 1000px;
            isolation: isolate;
            overflow: visible;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          /* ====== LAYER 1: Nebula Core (Base Background) ====== */
          .cosmic-gateway::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 0.75rem;
            background:
              radial-gradient(ellipse at 30% 40%, rgba(139, 92, 246, 0.9) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 60%, rgba(59, 130, 246, 0.8) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.6) 0%, transparent 60%),
              linear-gradient(135deg, #1e3a8a 0%, #312e81 25%, #1e40af 50%, #1e3a8a 75%, #0f172a 100%);
            background-size: 300% 300%, 250% 250%, 200% 200%, 100% 100%;
            animation: nebulaDrift 12s ease-in-out infinite;
            z-index: 1;
          }

          /* ====== LAYER 2: Aurora Energy Field ====== */
          .cosmic-gateway::after {
            content: '';
            position: absolute;
            inset: -20%;
            border-radius: 0.75rem;
            background:
              linear-gradient(120deg,
                transparent 0%,
                rgba(16, 185, 129, 0.4) 30%,
                rgba(59, 130, 246, 0.5) 50%,
                rgba(139, 92, 246, 0.4) 70%,
                transparent 100%);
            filter: blur(20px);
            animation: auroraFlow 8s ease-in-out infinite;
            opacity: 0;
            transition: opacity 0.5s ease;
            z-index: 0;
          }

          .cosmic-gateway:hover::after {
            opacity: 1;
          }

          /* ====== LAYER 3: Hyperspace Tunnel (Glow) ====== */
          .cosmic-gateway-glow {
            position: absolute;
            inset: -4px;
            border-radius: 0.875rem;
            background: transparent;
            animation: hyperspaceDepth 3s ease-in-out infinite;
            z-index: -1;
            pointer-events: none;
          }

          /* ====== LAYER 4: Stellar Orbital Ring ====== */
          .cosmic-gateway-ring {
            position: absolute;
            inset: -6px;
            border-radius: 1rem;
            border: 2px solid transparent;
            border-image: conic-gradient(
              from 0deg,
              transparent 0%,
              rgba(96, 165, 250, 0.8) 15%,
              transparent 30%,
              transparent 70%,
              rgba(139, 92, 246, 0.8) 85%,
              transparent 100%
            ) 1;
            animation: stellarRing 4s linear infinite;
            z-index: 0;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.4s ease;
          }

          .cosmic-gateway:hover .cosmic-gateway-ring {
            opacity: 1;
          }

          /* ====== LAYER 5: Quantum Shimmer Layers ====== */
          .quantum-shimmer-1,
          .quantum-shimmer-2 {
            position: absolute;
            top: 50%;
            left: 0;
            width: 30%;
            height: 200%;
            pointer-events: none;
            z-index: 3;
          }

          .quantum-shimmer-1 {
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(255, 255, 255, 0.3) 50%,
              transparent 100%
            );
            animation: quantumShimmer1 3s ease-in-out infinite;
            animation-delay: 0s;
          }

          .quantum-shimmer-2 {
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(139, 92, 246, 0.4) 50%,
              transparent 100%
            );
            animation: quantumShimmer2 4s ease-in-out infinite;
            animation-delay: 1s;
          }

          /* ====== LAYER 6: Constellation Particles ====== */
          .constellation-particle {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 6px;
            height: 6px;
            margin: -3px 0 0 -3px;
            background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(96, 165, 250, 0.8) 50%, transparent 100%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 4;
            animation: starPulse 2s ease-in-out infinite;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
          }

          .constellation-particle.orbit-1 {
            animation: orbitConstellation 6s linear infinite, starPulse 2s ease-in-out infinite;
            animation-delay: 0s, 0s;
          }

          .constellation-particle.orbit-2 {
            animation: orbitConstellation 6s linear infinite, starPulse 2s ease-in-out infinite;
            animation-delay: -1.5s, 0.5s;
          }

          .constellation-particle.orbit-3 {
            animation: orbitConstellation 6s linear infinite, starPulse 2s ease-in-out infinite;
            animation-delay: -3s, 1s;
          }

          .constellation-particle.orbit-4 {
            animation: orbitConstellation 6s linear infinite, starPulse 2s ease-in-out infinite;
            animation-delay: -4.5s, 1.5s;
          }

          .constellation-particle.orbit-outer-1 {
            animation: orbitReverse 8s linear infinite, starPulse 2s ease-in-out infinite;
            animation-delay: 0s, 0.2s;
            width: 4px;
            height: 4px;
            margin: -2px 0 0 -2px;
          }

          .constellation-particle.orbit-outer-2 {
            animation: orbitReverse 8s linear infinite, starPulse 2s ease-in-out infinite;
            animation-delay: -2.6s, 0.7s;
            width: 4px;
            height: 4px;
            margin: -2px 0 0 -2px;
          }

          .constellation-particle.orbit-outer-3 {
            animation: orbitReverse 8s linear infinite, starPulse 2s ease-in-out infinite;
            animation-delay: -5.3s, 1.2s;
            width: 4px;
            height: 4px;
            margin: -2px 0 0 -2px;
          }

          /* ====== LAYER 7: Comet Trails ====== */
          .comet-trail {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 3px;
            height: 20px;
            background: linear-gradient(to bottom,
              rgba(255, 255, 255, 1) 0%,
              rgba(96, 165, 250, 0.6) 50%,
              transparent 100%);
            border-radius: 50%;
            pointer-events: none;
            z-index: 3;
            animation: cometTrail 5s ease-in-out infinite;
            opacity: 0;
            filter: blur(1px);
          }

          .comet-trail.trail-1 {
            animation-delay: 0s;
          }

          .comet-trail.trail-2 {
            animation-delay: 1.6s;
          }

          .comet-trail.trail-3 {
            animation-delay: 3.3s;
          }

          .cosmic-gateway:hover .comet-trail {
            opacity: 1;
          }

          /* ====== LAYER 8: Meteor Shower ====== */
          .meteor {
            position: absolute;
            width: 2px;
            height: 2px;
            background: white;
            border-radius: 50%;
            pointer-events: none;
            z-index: 2;
            box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
          }

          .meteor.meteor-1 {
            top: 10%;
            left: 20%;
            animation: meteorShower 2s ease-in-out infinite;
            animation-delay: 0s;
          }

          .meteor.meteor-2 {
            top: 30%;
            left: 70%;
            animation: meteorShower 2.5s ease-in-out infinite;
            animation-delay: 0.8s;
          }

          .meteor.meteor-3 {
            top: 60%;
            left: 40%;
            animation: meteorShower 2.2s ease-in-out infinite;
            animation-delay: 1.6s;
          }

          .meteor.meteor-4 {
            top: 80%;
            left: 80%;
            animation: meteorShower 2.8s ease-in-out infinite;
            animation-delay: 0.4s;
          }

          /* ====== Button Content Layer ====== */
          .cosmic-gateway-content {
            position: relative;
            z-index: 5;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            font-weight: 700;
            font-size: 1.125rem;
            color: white;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(96, 165, 250, 0.5);
            pointer-events: none;
          }

          /* ====== Hover State: Gravitational Warp ====== */
          .cosmic-gateway:hover {
            animation: gravitationalWarp 2s ease-in-out infinite;
            transform: translateY(-6px) scale(1.02);
            filter: brightness(1.2);
          }

          /* ====== Active State: Hyperspace Jump ====== */
          .cosmic-gateway:active {
            transform: translateY(-2px) scale(0.98) perspective(800px) rotateX(5deg);
            filter: brightness(1.4);
            transition: all 0.15s ease;
          }

          /* ====== Disabled State ====== */
          .cosmic-gateway:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            animation: none;
            transform: none;
            filter: grayscale(0.4);
          }

          .cosmic-gateway:disabled::after,
          .cosmic-gateway:disabled .cosmic-gateway-ring,
          .cosmic-gateway:disabled .comet-trail {
            opacity: 0;
          }

          /* ====== Loading State: Energy Charge ====== */
          .cosmic-gateway.loading .cosmic-gateway-glow {
            animation: hyperspaceDepth 1.5s ease-in-out infinite, energyCharge 1.5s ease-in-out infinite;
          }

          /* ====== Accessibility: Focus State ====== */
          .cosmic-gateway:focus-visible {
            outline: 3px solid rgba(96, 165, 250, 0.8);
            outline-offset: 4px;
          }

          /* ====== Reduced Motion Support ====== */
          @media (prefers-reduced-motion: reduce) {
            .cosmic-gateway,
            .cosmic-gateway::before,
            .cosmic-gateway::after,
            .cosmic-gateway-glow,
            .cosmic-gateway-ring,
            .quantum-shimmer-1,
            .quantum-shimmer-2,
            .constellation-particle,
            .comet-trail,
            .meteor {
              animation: none !important;
            }

            .cosmic-gateway:hover {
              transform: translateY(-2px);
            }

            .cosmic-gateway:active {
              transform: translateY(0);
            }
          }
        `}</style>

        <button
          ref={ref}
          className={`
            cosmic-gateway
            ${isLoading ? 'loading' : ''}
            ${className}
          `}
          {...props}
        >
          {/* Hyperspace Glow Layer */}
          <div className="cosmic-gateway-glow" aria-hidden="true"></div>

          {/* Stellar Ring */}
          <div className="cosmic-gateway-ring" aria-hidden="true"></div>

          {/* Quantum Shimmer Layers */}
          <div className="quantum-shimmer-1" aria-hidden="true"></div>
          <div className="quantum-shimmer-2" aria-hidden="true"></div>

          {/* Constellation Particles - Inner Orbit */}
          <span className="constellation-particle orbit-1" aria-hidden="true"></span>
          <span className="constellation-particle orbit-2" aria-hidden="true"></span>
          <span className="constellation-particle orbit-3" aria-hidden="true"></span>
          <span className="constellation-particle orbit-4" aria-hidden="true"></span>

          {/* Constellation Particles - Outer Orbit */}
          <span className="constellation-particle orbit-outer-1" aria-hidden="true"></span>
          <span className="constellation-particle orbit-outer-2" aria-hidden="true"></span>
          <span className="constellation-particle orbit-outer-3" aria-hidden="true"></span>

          {/* Comet Trails */}
          <span className="comet-trail trail-1" aria-hidden="true"></span>
          <span className="comet-trail trail-2" aria-hidden="true"></span>
          <span className="comet-trail trail-3" aria-hidden="true"></span>

          {/* Meteor Shower */}
          <span className="meteor meteor-1" aria-hidden="true"></span>
          <span className="meteor meteor-2" aria-hidden="true"></span>
          <span className="meteor meteor-3" aria-hidden="true"></span>
          <span className="meteor meteor-4" aria-hidden="true"></span>

          {/* Button Content */}
          <span className="cosmic-gateway-content">
            {children}
          </span>
        </button>
      </>
    );
  }
);

CosmicButton.displayName = 'CosmicButton';
