/**
 * DecommissionConfirmDialog — Confirmation dialog for soft-deleting an asset
 */
import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { Asset } from '@rgr/shared';
import { useDeleteAsset } from '@/hooks/useAssetData';

interface DecommissionConfirmDialogProps {
  asset: Asset;
  isDark: boolean;
  onClose: () => void;
}

export const DecommissionConfirmDialog = React.memo<DecommissionConfirmDialogProps>(
  ({ asset, isDark, onClose }) => {
    const deleteAsset = useDeleteAsset();
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
      setError(null);
      try {
        await deleteAsset.mutateAsync(asset.id);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to decommission asset');
      }
    };

    const overlayBg = 'rgba(0, 0, 0, 0.6)';
    const modalBg = isDark ? 'rgba(15, 23, 42, 0.97)' : 'rgba(30, 30, 80, 0.97)';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.15)';
    const textColor = isDark ? 'text-slate-200' : 'text-white';
    const mutedColor = isDark ? 'text-slate-400' : 'text-white/60';

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: overlayBg, backdropFilter: 'blur(4px)' }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-sm rounded-xl overflow-hidden"
          style={{
            background: modalBg,
            border: `1px solid ${borderColor}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>

            <h3 className={`text-lg font-bold mb-2 ${textColor}`}>
              Decommission Asset
            </h3>
            <p className={`text-sm mb-1 ${mutedColor}`}>
              Are you sure you want to decommission
            </p>
            <p className={`text-sm font-mono font-bold mb-4 ${textColor}`}>
              {asset.assetNumber}
            </p>
            <p className={`text-xs ${mutedColor}`}>
              This will mark the asset as decommissioned and remove it from active listings.
              This action can be reversed by a superuser.
            </p>

            {error && (
              <p className="text-sm text-red-400 mt-3">{error}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className={`flex-1 px-4 py-2 rounded-lg text-sm ${textColor} hover:bg-white/10 transition-colors border`}
                style={{ borderColor }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={deleteAsset.isPending}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
              >
                {deleteAsset.isPending ? 'Processing...' : 'Decommission'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DecommissionConfirmDialog.displayName = 'DecommissionConfirmDialog';
