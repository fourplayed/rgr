/**
 * AssetDetailSlideout — Right-side detail panel, tab-based
 */
import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

    const bg = isDark ? 'rgba(6, 11, 40, 0.85)' : 'rgba(0, 0, 100, 0.85)';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)';
    const textColor = isDark ? 'text-slate-200' : 'text-white';
    const mutedColor = isDark ? 'text-slate-400' : 'text-white/60';

    return (
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 400, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="flex-shrink-0 overflow-hidden rounded-xl flex flex-col"
        style={{
          background: bg,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${borderColor}`,
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
                  {asset?.depotName ?? 'No depot assigned'}
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg ${mutedColor} hover:text-white hover:bg-white/10 transition-colors`}
          >
            <X className="w-5 h-5" />
          </button>
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
    );
  }
);

AssetDetailSlideout.displayName = 'AssetDetailSlideout';
