/**
 * AssetDetailSlideout — Right-side detail panel, tab-based
 */
import React from 'react';
import { X, Pencil } from 'lucide-react';
import { motion } from 'motion/react';
import { useAsset } from '@/hooks/useAssetData';
import type { AssetDetailTab } from '@/pages/assets/types';
import { AssetOverviewTab } from './AssetOverviewTab';
import { AssetScanHistoryTab } from './AssetScanHistoryTab';
import { AssetMaintenanceTab } from './AssetMaintenanceTab';
import { AssetHazardsTab } from './AssetHazardsTab';

export interface AssetDetailSlideoutProps {
  isDark: boolean;
  assetId: string;
  activeTab: AssetDetailTab;
  canEdit: boolean;
  canDelete: boolean;
  onTabChange: (tab: AssetDetailTab) => void;
  onClose: () => void;
}

const TABS: { key: AssetDetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'scans', label: 'Scans' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'hazards', label: 'Hazards' },
];

export const AssetDetailSlideout = React.memo<AssetDetailSlideoutProps>(
  ({ isDark, assetId, activeTab, canEdit, canDelete, onTabChange, onClose }) => {
    const { data: asset, isLoading, isError } = useAsset(assetId);

    const bg = isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.7)';
    const borderColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)';
    const textColor = isDark ? 'text-slate-200' : 'text-white';
    const mutedColor = isDark ? 'text-slate-400' : 'text-white/60';

    return (
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0, 0, 0, 0.2)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />

        {/* Slideout panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed right-0 bottom-0 z-50 w-full max-w-md flex flex-col"
          style={{
            top: '80px',
            background: bg,
            backdropFilter: 'blur(40px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
            border: 'none',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            borderRadius: 0,
          }}
        >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b`} style={{ borderColor }}>
          <div>
            {isLoading ? (
              <div className={`h-6 w-24 rounded animate-pulse ${isDark ? 'bg-slate-700' : 'bg-white/20'}`} />
            ) : (
              <>
                <h2 className={`text-lg font-bold font-mono ${textColor}`}>
                  {asset?.assetNumber ?? 'Unknown'}
                </h2>
                <p className={`text-xs ${mutedColor}`}>
                  {asset?.category ? (asset.category.charAt(0).toUpperCase() + asset.category.slice(1)) : ''}{asset?.depotName ? ` — ${asset.depotName}` : ''}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => onTabChange('overview')}
                className={`p-1.5 rounded-lg ${mutedColor} hover:text-white hover:bg-white/10 transition-colors`}
                aria-label="Edit asset"
                data-edit-trigger
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg ${mutedColor} hover:text-white hover:bg-white/10 transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className={`flex border-b`} style={{ borderColor }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex-1 px-3 py-2.5 text-xs font-medium transition-colors relative ${
                activeTab === tab.key
                  ? textColor
                  : `${mutedColor} hover:text-white`
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
            <div className={`text-center py-16 text-sm ${mutedColor}`}>
              Failed to load asset details
            </div>
          ) : asset ? (
            <>
              {activeTab === 'overview' && (
                <AssetOverviewTab
                  asset={asset}
                  isDark={isDark}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              )}
              {activeTab === 'scans' && (
                <AssetScanHistoryTab assetId={assetId} isDark={isDark} />
              )}
              {activeTab === 'maintenance' && (
                <AssetMaintenanceTab assetId={assetId} isDark={isDark} />
              )}
              {activeTab === 'hazards' && (
                <AssetHazardsTab assetId={assetId} isDark={isDark} />
              )}
            </>
          ) : null}
        </div>
      </motion.div>
      </>
    );
  }
);

AssetDetailSlideout.displayName = 'AssetDetailSlideout';
