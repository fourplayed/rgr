/**
 * DepotExplorePanel — Centered glassmorphic card for explore mode
 *
 * Floating card on the map viewport.
 * Matches the Interactive card design language with structured header layout.
 */
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ChevronLeft, ChevronRight, X, GripVertical,
  CheckCircle2, Wrench, XCircle,
} from 'lucide-react';
import type { DepotAsset } from './depotTypes';

// Mobile-matching status config (colors from AssetStatusColors in shared package)
const STATUS_CONFIG = [
  { key: 'serviced', label: 'Serviced', color: '#2bbb6e', Icon: CheckCircle2 },
  { key: 'maintenance', label: 'Maintenance', color: '#e8a020', Icon: Wrench },
  { key: 'out_of_service', label: 'Out of Service', color: '#d43050', Icon: XCircle },
] as const;

const STATUS_LABELS: Record<string, string> = {
  serviced: 'Serviced',
  maintenance: 'Maint.',
  out_of_service: 'OOS',
};

const CATEGORY_LABELS: Record<string, string> = {
  trailer: 'Trailer',
  dolly: 'Dolly',
};

/** Lucide equivalents of the mobile Ionicons status icons */
const STATUS_ICON_MAP: Record<string, typeof CheckCircle2> = {
  serviced: CheckCircle2,
  maintenance: Wrench,
  out_of_service: XCircle,
};

export interface DepotExplorePanelProps {
  assets: DepotAsset[];
  depotName: string;
  depotColor: string;
  activeAssetId: string | null;
  onAssetSelect: (asset: DepotAsset) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export const DepotExplorePanel = React.memo<DepotExplorePanelProps>(
  ({ assets, depotName, depotColor, activeAssetId, onAssetSelect, onPrev, onNext, onClose }) => {
    const statusCounts = useMemo(() => {
      const counts: Record<string, number> = { serviced: 0, maintenance: 0, out_of_service: 0 };
      for (const a of assets) {
        if (a.status in counts) counts[a.status] = (counts[a.status] ?? 0) + 1;
      }
      return counts;
    }, [assets]);

    const trailerCount = useMemo(() => assets.filter((a) => a.category === 'trailer').length, [assets]);
    const dollyCount = useMemo(() => assets.filter((a) => a.category === 'dolly').length, [assets]);
    const activeIdx = assets.findIndex((a) => a.id === activeAssetId);

    return (
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0}
        initial={{ opacity: 0, x: -30, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -20, scale: 0.95 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          left: '25%',
          top: '45%',
          x: '-50%',
          y: '-50%',
          zIndex: 200,
          width: 620,
          maxHeight: '80vh',
          fontFamily: "'Lato', sans-serif",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'visible',
          pointerEvents: 'auto',
          cursor: 'grab',
        }}
        whileDrag={{ cursor: 'grabbing' }}
      >
        {/* Card body */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            flex: 1,
            minHeight: 0,
          }}
        >
        {/* ── Header ── */}
        <div style={{ position: 'relative', padding: '16px 16px 14px' }}>
          {/* Top-left: Drag grip */}
          <div style={{ position: 'absolute', top: 16, left: 16 }}>
            <GripVertical className="size-4 text-white/40" />
          </div>

          {/* Top-right: Close only */}
          <div
            onPointerDownCapture={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: 12, right: 12, cursor: 'default' }}
          >
            <button
              onClick={onClose}
              aria-label="Close explore"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered: title only */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
            <h2
              style={{
                margin: 0,
                color: depotColor,
                fontFamily: "'Lato', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              {depotName}
            </h2>
          </div>
        </div>

        {/* ── Separator ── */}
        <div
          style={{
            margin: '0 16px',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent)',
          }}
        />

        {/* ── Status + TL/DL counts + Pagination row ── */}
        <div
          onPointerDownCapture={(e) => e.stopPropagation()}
          style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', cursor: 'default', position: 'relative' }}
        >
          {/* Status dots — left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {STATUS_CONFIG.map(({ key, color }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}60`, flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{statusCounts[key]}</span>
              </div>
            ))}
          </div>

          {/* TL/DL counts — centered with equal space on both sides */}
          <div style={{ position: 'absolute', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{trailerCount}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Trailers</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 16, fontWeight: 300, lineHeight: 1, userSelect: 'none', alignSelf: 'center' }}>|</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{dollyCount}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Dollies</span>
            </div>
          </div>
          {/* Spacer to push pagination right */}
          <div style={{ flex: 1 }} />
          {/* Pagination — right */}
          <NavButton onClick={onPrev} label="Previous" depotColor={depotColor}>
            <ChevronLeft size={16} />
          </NavButton>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'center', userSelect: 'none' }}>
            {activeIdx >= 0 ? `${activeIdx + 1} / ${assets.length}` : assets.length}
          </span>
          <NavButton onClick={onNext} label="Next" depotColor={depotColor}>
            <ChevronRight size={16} />
          </NavButton>
        </div>

        {/* ── Separator ── */}
        <div
          style={{
            margin: '0 16px',
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.08) 80%, transparent)',
          }}
        />

        {/* ── Asset grid ── */}
        <div
          onPointerDownCapture={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px 12px 14px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            alignContent: 'start',
            cursor: 'default',
          }}
          className="explore-asset-list"
        >
          {assets.map((asset) => {
            const isActive = asset.id === activeAssetId;
            const sc = STATUS_CONFIG.find((s) => s.key === asset.status);
            const statusColor = sc?.color || '#6b7280';
            const StatusIcon = STATUS_ICON_MAP[asset.status] || CheckCircle2;
            const statusLabel = STATUS_LABELS[asset.status] || asset.status;
            return (
              <button
                key={asset.id}
                onClick={() => onAssetSelect(asset)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: 12,
                  background: isActive ? `${statusColor}1A` : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                  borderLeft: `3px solid ${isActive ? statusColor : 'transparent'}`,
                  boxShadow: isActive ? `0 0 12px ${statusColor}15` : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderLeftColor = `${statusColor}66`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderLeftColor = 'transparent';
                  }
                }}
              >
                {/* Status icon (matching mobile Ionicons) */}
                <StatusIcon size={28} style={{ color: statusColor, flexShrink: 0, filter: `drop-shadow(0 0 4px ${statusColor}60)` }} />
                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Top row: asset number + status badge (tinted, matching mobile) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
                        fontWeight: 700,
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.85)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {asset.assetNumber}
                    </span>
                    {/* Status badge (tinted variant — matching mobile StatusBadge) */}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: statusColor,
                        background: `${statusColor}26`,
                        borderRadius: 4,
                        padding: '2px 6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  {/* Bottom row: category + depot badge (matching mobile DepotBadge) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.35)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {CATEGORY_LABELS[asset.category] || asset.category}
                    </span>
                    {/* Depot badge */}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: depotColor,
                        background: `${depotColor}26`,
                        borderRadius: 4,
                        padding: '2px 6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {depotName}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom scrollbar */}
        <style>{`
          .explore-asset-list::-webkit-scrollbar { width: 4px; }
          .explore-asset-list::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 2px; }
          .explore-asset-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
          .explore-asset-list { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) rgba(255,255,255,0.03); }
        `}</style>

        </div>
      </motion.div>
    );
  },
);

/** Neutral nav button */
const NavButton: React.FC<{
  onClick: () => void;
  label: string;
  depotColor: string;
  children: React.ReactNode;
}> = ({ onClick, label, children }) => (
  <button
    onClick={onClick}
    aria-label={label}
    style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      cursor: 'pointer',
      padding: '6px 12px',
      color: 'rgba(255,255,255,0.6)',
      display: 'flex',
      alignItems: 'center',
      fontSize: 14,
      fontWeight: 700,
      transition: 'background 0.15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
    }}
  >
    {children}
  </button>
);

DepotExplorePanel.displayName = 'DepotExplorePanel';
