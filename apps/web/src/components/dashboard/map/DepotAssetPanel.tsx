import React from 'react';
import { motion } from 'motion/react';
import type { DepotAsset } from './depotTypes';

const STATUS_COLORS: Record<string, string> = {
  serviced: '#39ffce',
  maintenance: '#ffe14d',
  out_of_service: '#ff5577',
};

const STATUS_LABELS: Record<string, string> = {
  serviced: 'Serviced',
  maintenance: 'Maint.',
  out_of_service: 'OOS',
};

interface DepotAssetPanelProps {
  assets: DepotAsset[];
  depotName: string;
  depotColor: string;
  isDark?: boolean;
  onAssetClick?: (asset: DepotAsset) => void;
  onClose?: () => void;
  /** If true, show only the compact preview (header + status bar, no list) */
  compact?: boolean;
}

export const DepotAssetPanel: React.FC<DepotAssetPanelProps> = ({
  assets,
  depotName,
  depotColor,
  isDark = true,
  onAssetClick,
  onClose,
  compact = false,
}) => {
  const count = assets.length;

  // Count by status
  const statusCounts = { serviced: 0, maintenance: 0, out_of_service: 0 };
  for (const a of assets) {
    if (a.status in statusCounts) statusCounts[a.status as keyof typeof statusCounts]++;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: isDark
          ? 'linear-gradient(to bottom, rgb(0, 0, 40), rgb(10, 38, 84))'
          : 'linear-gradient(to bottom, #ffffff, #f8fafc)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${isDark ? depotColor + '40' : 'rgba(107,114,128,0.25)'}`,
        borderRadius: 12,
        minWidth: compact ? 160 : 200,
        maxWidth: compact ? 200 : 260,
        boxShadow: isDark
          ? `0 8px 24px rgba(0,0,0,0.4), 0 0 12px ${depotColor}33`
          : '0 4px 16px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        pointerEvents: 'auto' as const,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '6px 10px' : '8px 12px',
          borderBottom: `1px solid ${isDark ? depotColor + '25' : 'rgba(107,114,128,0.12)'}`,
        }}
      >
        <span
          style={{
            fontSize: compact ? 11 : 12,
            fontWeight: 700,
            color: isDark ? 'rgba(255,255,255,0.8)' : '#1f2937',
            fontFamily: "'Lato', sans-serif",
          }}
        >
          {depotName}
          <span style={{ fontWeight: 500, opacity: 0.6, marginLeft: 6 }}>
            {count} asset{count !== 1 ? 's' : ''}
          </span>
        </span>
        {!compact && onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: '0 2px',
            }}
            aria-label="Close panel"
          >
            ×
          </button>
        )}
      </div>

      {/* Status summary bar */}
      <div style={{ padding: compact ? '6px 10px' : '8px 12px' }}>
        <div
          style={{
            display: 'flex',
            height: 4,
            borderRadius: 2,
            overflow: 'hidden',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          }}
        >
          {(['serviced', 'maintenance', 'out_of_service'] as const).map((status) => {
            const c = statusCounts[status];
            if (c === 0) return null;
            return (
              <div
                key={status}
                style={{
                  flex: c,
                  background: STATUS_COLORS[status],
                  transition: 'flex 0.3s ease',
                }}
              />
            );
          })}
        </div>
        {/* Status labels */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {(['serviced', 'maintenance', 'out_of_service'] as const).map((status) => {
            const c = statusCounts[status];
            if (c === 0) return null;
            return (
              <span
                key={status}
                style={{
                  fontSize: 9,
                  color: isDark ? STATUS_COLORS[status] : STATUS_COLORS[status],
                  fontWeight: 600,
                  opacity: isDark ? 0.8 : 1,
                }}
              >
                {c} {STATUS_LABELS[status]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Asset list (only in full mode) */}
      {!compact && (
        <div
          className="depot-asset-list"
          style={{
            maxHeight: 224,
            overflowY: 'auto',
            padding: '2px 4px 4px',
          }}
        >
          {assets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onAssetClick?.(asset)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                padding: '4px 8px',
                border: 'none',
                borderRadius: 6,
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = isDark
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.04)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
              aria-label={`${asset.assetNumber}, ${STATUS_LABELS[asset.status] || asset.status}, click to fly to`}
            >
              {/* Category letter */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: depotColor,
                  width: 14,
                  flexShrink: 0,
                }}
              >
                {asset.category === 'trailer' ? 'T' : 'D'}
              </span>
              {/* Asset number */}
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: isDark ? 'rgba(255,255,255,0.9)' : '#1f2937',
                  flex: 1,
                }}
              >
                {asset.assetNumber}
              </span>
              {/* Status dot */}
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: STATUS_COLORS[asset.status] || '#6b7280',
                  flexShrink: 0,
                  boxShadow: isDark ? `0 0 4px ${STATUS_COLORS[asset.status] || '#6b7280'}50` : 'none',
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style>{`
        .depot-asset-list::-webkit-scrollbar {
          width: 4px;
        }
        .depot-asset-list::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 2px;
        }
        .depot-asset-list::-webkit-scrollbar-thumb {
          background: ${depotColor}66;
          border-radius: 2px;
        }
        .depot-asset-list {
          scrollbar-width: thin;
          scrollbar-color: ${depotColor}66 rgba(255,255,255,0.05);
        }
      `}</style>
    </motion.div>
  );
};
