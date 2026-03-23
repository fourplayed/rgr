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
import { X, ZoomIn } from 'lucide-react';
import type { DepotAsset } from './depotTypes';

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
        if (asset.status in counts) {
          counts[asset.status]++;
        }
      }
      return counts;
    }, [assets]);

    const trailerCount = useMemo(
      () => assets.filter((a) => a.category === 'trailer').length,
      [assets],
    );

    const dollyCount = useMemo(
      () => assets.filter((a) => a.category === 'dolly').length,
      [assets],
    );

    const containerStyle: React.CSSProperties = {
      position: 'absolute',
      left: position.x,
      top: position.y,
      transform: 'translate(-50%, -110%)',
      zIndex: 2000,
      width: 220,
      background: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: `1px solid ${depotColor}33`,
      borderRadius: 16,
      boxShadow: `0 0 20px ${depotColor}40, 0 8px 32px rgba(0, 0, 0, 0.5)`,
      fontFamily: "'Lato', sans-serif",
      overflow: 'hidden',
    };

    return (
      <div style={containerStyle}>
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px 8px',
            borderBottom: `1px solid ${depotColor}22`,
          }}
        >
          <span
            style={{
              color: depotColor,
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {depotName}
          </span>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 0 2px 8px',
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            <X size={14} />
          </button>
        </div>

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
              {/* Colored dot */}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${color}99`,
                }}
              />
              {/* Label */}
              <span
                style={{
                  flex: 1,
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: 12,
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                {label}
              </span>
              {/* Count */}
              <span
                style={{
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                {statusCounts[key]}
              </span>
            </div>
          ))}
        </div>

        {/* Category split */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '6px 12px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 12,
            fontFamily: "'Lato', sans-serif",
            letterSpacing: '0.04em',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{trailerCount} TL</span>
          <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.3)' }}>|</span>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700 }}>{dollyCount} DL</span>
        </div>

        {/* Explore button */}
        <div style={{ padding: '6px 12px 10px' }}>
          <button
            onClick={onExplore}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '7px 0',
              borderRadius: 10,
              border: `1px solid ${depotColor}55`,
              background: `${depotColor}40`,
              color: depotColor,
              fontFamily: "'Lato', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = `${depotColor}60`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = `${depotColor}40`;
            }}
          >
            <ZoomIn size={14} />
            Explore
          </button>
        </div>
      </div>
    );
  },
);

DepotClusterTooltip.displayName = 'DepotClusterTooltip';

export default DepotClusterTooltip;
