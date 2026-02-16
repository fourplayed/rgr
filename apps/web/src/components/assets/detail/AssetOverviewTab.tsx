/**
 * AssetOverviewTab — Info grid, location, QR code, edit/decommission actions
 */
import React, { useState } from 'react';
import { MapPin, QrCode, Calendar, Truck, Hash, User, Building } from 'lucide-react';
import type { AssetWithRelations, AssetStatus } from '@rgr/shared';
import { AssetStatusLabels, AssetStatusColors, AssetCategoryLabels } from '@rgr/shared';
import { EditAssetForm } from '../forms/EditAssetForm';
import { DecommissionConfirmDialog } from '../forms/DecommissionConfirmDialog';

interface AssetOverviewTabProps {
  asset: AssetWithRelations;
  isDark: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const AssetOverviewTab = React.memo<AssetOverviewTabProps>(
  ({ asset, isDark, canEdit, canDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [showDecommission, setShowDecommission] = useState(false);

    const textColor = isDark ? 'text-slate-200' : 'text-white';
    const mutedColor = isDark ? 'text-slate-400' : 'text-white/60';
    const labelColor = isDark ? 'text-slate-500' : 'text-white/50';
    const sectionBorder = isDark ? 'border-slate-700/30' : 'border-white/10';

    if (isEditing) {
      return (
        <EditAssetForm
          asset={asset}
          isDark={isDark}
          onClose={() => setIsEditing(false)}
        />
      );
    }

    const statusColor = AssetStatusColors[asset.status as AssetStatus] ?? '#6b7280';

    return (
      <div className="p-5 space-y-5">
        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              background: `${statusColor}20`,
              color: statusColor,
              border: `1px solid ${statusColor}40`,
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
            {AssetStatusLabels[asset.status as AssetStatus] ?? asset.status}
          </span>
          <span className={`text-xs ${mutedColor}`}>
            {AssetCategoryLabels[asset.category] ?? asset.category}
          </span>
        </div>

        {/* Info grid */}
        <div className="space-y-3">
          <InfoRow icon={Hash} label="Asset #" value={asset.assetNumber} isDark={isDark} mono />
          <InfoRow icon={Truck} label="Make / Model" value={[asset.make, asset.model].filter(Boolean).join(' ') || null} isDark={isDark} />
          {asset.yearManufactured && (
            <InfoRow icon={Calendar} label="Year" value={String(asset.yearManufactured)} isDark={isDark} />
          )}
          {asset.registrationNumber && (
            <InfoRow icon={Hash} label="Rego" value={asset.registrationNumber} isDark={isDark} mono />
          )}
          {asset.registrationExpiry && (
            <InfoRow
              icon={Calendar}
              label="Rego Expiry"
              value={new Date(asset.registrationExpiry).toLocaleDateString()}
              isDark={isDark}
            />
          )}
          <InfoRow icon={Building} label="Depot" value={asset.depotName ? `${asset.depotName} (${asset.depotCode})` : null} isDark={isDark} />
          <InfoRow icon={User} label="Driver" value={asset.driverName} isDark={isDark} />
        </div>

        {/* Location */}
        {asset.lastLatitude && asset.lastLongitude && (
          <div className={`pt-4 border-t ${sectionBorder}`}>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className={`w-4 h-4 ${mutedColor}`} />
              <span className={`text-xs font-medium uppercase tracking-wider ${labelColor}`}>
                Last Known Location
              </span>
            </div>
            <p className={`text-sm font-mono ${textColor}`}>
              {asset.lastLatitude.toFixed(6)}, {asset.lastLongitude.toFixed(6)}
            </p>
            {asset.lastLocationUpdatedAt && (
              <p className={`text-xs mt-1 ${mutedColor}`}>
                Updated {new Date(asset.lastLocationUpdatedAt).toLocaleString()}
              </p>
            )}
            {asset.lastScannerName && (
              <p className={`text-xs ${mutedColor}`}>
                By {asset.lastScannerName}
              </p>
            )}
          </div>
        )}

        {/* QR code */}
        {asset.qrCodeData && (
          <div className={`pt-4 border-t ${sectionBorder}`}>
            <div className="flex items-center gap-2 mb-2">
              <QrCode className={`w-4 h-4 ${mutedColor}`} />
              <span className={`text-xs font-medium uppercase tracking-wider ${labelColor}`}>
                QR Code
              </span>
            </div>
            <p className={`text-xs font-mono break-all ${mutedColor}`}>
              {asset.qrCodeData}
            </p>
          </div>
        )}

        {/* Notes */}
        {asset.notes && (
          <div className={`pt-4 border-t ${sectionBorder}`}>
            <span className={`text-xs font-medium uppercase tracking-wider ${labelColor}`}>
              Notes
            </span>
            <p className={`text-sm mt-1 ${textColor}`}>{asset.notes}</p>
          </div>
        )}

        {/* Actions */}
        {(canEdit || canDelete) && (
          <div className={`pt-4 border-t ${sectionBorder} flex gap-2`}>
            {canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Edit
              </button>
            )}
            {canDelete && asset.status !== 'decommissioned' && (
              <button
                onClick={() => setShowDecommission(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-colors"
              >
                Decommission
              </button>
            )}
          </div>
        )}

        {/* Decommission dialog */}
        {showDecommission && (
          <DecommissionConfirmDialog
            asset={asset}
            isDark={isDark}
            onClose={() => setShowDecommission(false)}
          />
        )}
      </div>
    );
  }
);

AssetOverviewTab.displayName = 'AssetOverviewTab';

// ── InfoRow ──

function InfoRow({
  icon: Icon,
  label,
  value,
  isDark,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  isDark: boolean;
  mono?: boolean;
}) {
  const textColor = isDark ? 'text-slate-200' : 'text-white';
  const mutedColor = isDark ? 'text-slate-500' : 'text-white/40';
  const labelColor = isDark ? 'text-slate-400' : 'text-white/60';

  return (
    <div className="flex items-start gap-3">
      <Icon className={`w-4 h-4 mt-0.5 ${mutedColor}`} />
      <div className="flex-1 min-w-0">
        <span className={`text-xs ${labelColor}`}>{label}</span>
        <p className={`text-sm ${mono ? 'font-mono' : ''} ${value ? textColor : mutedColor}`}>
          {value || '\u2014'}
        </p>
      </div>
    </div>
  );
}
