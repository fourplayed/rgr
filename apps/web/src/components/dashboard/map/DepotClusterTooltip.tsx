/**
 * DepotClusterTooltip - Glassmorphic tooltip for depot cluster clicks
 *
 * Features:
 * - Glassmorphic "Interactive" card style with depot-colored glow
 * - Shows depot name, asset counts by status, category breakdown
 * - Explore button to drill into depot assets
 * - Dismiss X button
 *
 * Design System:
 * - background: rgba(0, 0, 0, 0.55) with backdrop-filter: blur(24px)
 * - Border uses depot color at low opacity
 * - Box shadow with depot color glow
 * - Absolutely positioned above click point via translate(-50%, -110%)
 *
 * Usage:
 * Rendered as an overlay on the map canvas when a depot cluster is clicked
 */
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { DepotAsset } from './depotTypes';
import {
  FlipButton,
  FlipButtonFront,
  FlipButtonBack,
} from '@/components/animate-ui/components/buttons/flip';

export interface DepotClusterTooltipProps {
  depotName: string;
  depotColor: string;
  assets: DepotAsset[];
  position: { x: number; y: number };
  onExplore: () => void;
  onDismiss: () => void;
}

const STATUS_CONFIG = [
  { key: 'serviced', label: 'Serviced', color: '#39ffce' },
  { key: 'maintenance', label: 'Maintenance', color: '#ffe14d' },
  { key: 'out_of_service', label: 'Out of Service', color: '#ff5577' },
] as const;

export const DepotClusterTooltip = React.memo<DepotClusterTooltipProps>(
  ({ depotName, depotColor, assets, position, onExplore, onDismiss }) => {
    const statusCounts = useMemo(() => {
      const counts: Record<string, number> = { serviced: 0, maintenance: 0, out_of_service: 0 };
      for (const asset of assets) {
        const current = counts[asset.status];
        if (current !== undefined) {
          counts[asset.status] = current + 1;
        }
      }
      return counts;
    }, [assets]);

    const trailerCount = useMemo(
      () => assets.filter((a) => a.category === 'trailer').length,
      [assets]
    );

    const dollyCount = useMemo(() => assets.filter((a) => a.category === 'dolly').length, [assets]);

    return (
      <motion.div
        initial={{ opacity: 0, x: 30, scale: 0.92 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.95 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          left: position.x,
          top: position.y - 66,
          transform: 'translate(-50%, -100%)',
          zIndex: 100,
          width: 220,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${depotColor}33`,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          fontFamily: "'Lato', sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px 8px',
            borderBottom: 'none',
          }}
        >
          <span
            style={{
              color: depotColor,
              fontFamily: "'Lato', sans-serif",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textAlign: 'center',
              flex: 1,
            }}
          >
            {depotName}
          </span>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 2,
              color: 'rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1,
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Category counts — primary info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: 16,
            padding: '10px 12px 8px',
            fontFamily: "'Lato', sans-serif",
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
              {trailerCount}
            </span>
            <span
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginTop: 2,
              }}
            >
              Trailers
            </span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 20, alignSelf: 'center' }}>
            |
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
              {dollyCount}
            </span>
            <span
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 9,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginTop: 2,
              }}
            >
              Dollies
            </span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ margin: '0 12px', height: 1, background: 'rgba(255,255,255,0.08)' }} />

        {/* Status breakdown */}
        <div style={{ padding: '8px 12px 6px' }}>
          {STATUS_CONFIG.map(({ key, label, color }) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 5,
                fontFamily: "'Lato', sans-serif",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${color}99`,
                }}
              />
              <span style={{ flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
                {label}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 700 }}>
                {statusCounts[key]}
              </span>
            </div>
          ))}
        </div>

        {/* Explore button */}
        <div style={{ padding: '6px 12px 10px' }}>
          <FlipButton
            onClick={onExplore}
            className="w-full explore-flip-btn"
            style={{ pointerEvents: 'auto' }}
          >
            <FlipButtonFront
              className="w-full"
              style={{
                borderRadius: 10,
                border: `1px solid ${depotColor}55`,
                background: `${depotColor}40`,
                color: depotColor,
                fontFamily: "'Lato', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              EXPLORE
            </FlipButtonFront>
            <FlipButtonBack
              className="w-full explore-flip-back"
              style={{
                borderRadius: 10,
                border: `1px solid ${depotColor}`,
                background: depotColor,
                color: '#000000',
                fontFamily: "'Lato', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              EXPLORE
            </FlipButtonBack>
          </FlipButton>
          <style>{`
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .explore-flip-btn:hover .explore-flip-back::after {
              content: '';
              position: absolute;
              inset: 0;
              background: linear-gradient(
                90deg,
                transparent 0%,
                rgba(255,255,255,0.35) 50%,
                transparent 100%
              );
              animation: shimmer 1.2s ease-in-out infinite;
            }
          `}</style>
        </div>
      </motion.div>
    );
  }
);

DepotClusterTooltip.displayName = 'DepotClusterTooltip';

export default DepotClusterTooltip;
