/**
 * AssetDetailSlideout — Right-side Sheet, tab-based asset detail
 *
 * Uses base-ui Sheet for consistent animation.
 * In explore mode (noBackdrop), uses matching glassmorphic styling.
 */
import React from 'react';
import { Pencil, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useAsset } from '@/hooks/useAssetData';
import type { AssetDetailTab } from '@/pages/assets/types';
import { AssetOverviewTab } from './AssetOverviewTab';
import { AssetScanHistoryTab } from './AssetScanHistoryTab';
import { AssetMaintenanceTab } from './AssetMaintenanceTab';
import { AssetHazardsTab } from './AssetHazardsTab';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet';

export interface AssetDetailSlideoutProps {
  isDark: boolean;
  assetId: string;
  activeTab: AssetDetailTab;
  canEdit: boolean;
  canDelete: boolean;
  onTabChange: (tab: AssetDetailTab) => void;
  onClose: () => void;
  /** Skip the backdrop overlay (e.g. in explore mode where map must stay visible) */
  noBackdrop?: boolean;
}

const TABS: { key: AssetDetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'scans', label: 'Scans' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'hazards', label: 'Hazards' },
];

export const AssetDetailSlideout = React.memo<AssetDetailSlideoutProps>(
  ({ isDark, assetId, activeTab, canEdit, canDelete, onTabChange, onClose, noBackdrop = false }) => {
    const { data: asset, isLoading, isError } = useAsset(assetId);

    const borderColor = 'rgba(255,255,255,0.1)';

    return (
      <Sheet
        open
        modal={!noBackdrop}
        disablePointerDismissal={noBackdrop}
        onOpenChange={(open) => { if (!open) onClose(); }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          showOverlay={!noBackdrop}
          className={`!w-[420px] !max-w-[50vw] !border-l-0 flex flex-col !p-0 !gap-0 ${
            noBackdrop
              ? '!rounded-l-2xl !bg-transparent !backdrop-blur-none !shadow-none'
              : ''
          }`}
        >
          {/* Inner container with glassmorphic styling */}
          <div
            className="flex flex-col h-full overflow-hidden"
            style={
              noBackdrop
                ? {
                    background: 'rgba(0, 0, 0, 0.55)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '16px 0 0 16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    fontFamily: "'Lato', sans-serif",
                  }
                : {
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(40px) saturate(1.8)',
                    WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
                    fontFamily: "'Lato', sans-serif",
                    height: '100%',
                  }
            }
          >
            {/* Header */}
            <SheetHeader className="!p-0 !gap-0">
              <div
                className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor }}
              >
                <div>
                  <SheetTitle className="text-lg font-bold font-mono text-slate-200">
                    {isLoading ? (
                      <span className="inline-block h-6 w-24 rounded animate-pulse bg-slate-700" />
                    ) : (
                      asset?.assetNumber ?? 'Unknown'
                    )}
                  </SheetTitle>
                  <SheetDescription className="text-xs text-slate-400">
                    {isLoading
                      ? ''
                      : `${asset?.category ? asset.category.charAt(0).toUpperCase() + asset.category.slice(1) : ''}${asset?.depotName ? ` — ${asset.depotName}` : ''}`}
                  </SheetDescription>
                </div>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <button
                      onClick={() => onTabChange('overview')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Edit asset"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  <SheetClose
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    <span className="sr-only">Close</span>
                  </SheetClose>
                </div>
              </div>
            </SheetHeader>

            {/* Tab bar */}
            <div className="flex border-b" style={{ borderColor }}>
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors relative ${
                    activeTab === tab.key ? 'text-slate-200' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="asset-detail-tab"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                </div>
              ) : isError ? (
                <div className="text-center py-16 text-sm text-slate-400">
                  Failed to load asset details
                </div>
              ) : asset ? (
                <>
                  {activeTab === 'overview' && (
                    <AssetOverviewTab asset={asset} isDark={isDark} canEdit={canEdit} canDelete={canDelete} />
                  )}
                  {activeTab === 'scans' && <AssetScanHistoryTab assetId={assetId} isDark={isDark} />}
                  {activeTab === 'maintenance' && <AssetMaintenanceTab assetId={assetId} isDark={isDark} />}
                  {activeTab === 'hazards' && <AssetHazardsTab assetId={assetId} isDark={isDark} />}
                </>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }
);

AssetDetailSlideout.displayName = 'AssetDetailSlideout';
