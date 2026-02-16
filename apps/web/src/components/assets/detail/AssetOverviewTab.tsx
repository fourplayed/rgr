/**
 * AssetOverviewTab — Info grid, location, QR code, edit/retire actions
 */
import React, { useState } from 'react';
import { MapPin, QrCode, Download, Printer } from 'lucide-react';
import type { AssetWithRelations } from '@rgr/shared';
import { EditAssetForm } from '../forms/EditAssetForm';

interface AssetOverviewTabProps {
  asset: AssetWithRelations;
  isDark: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const AssetOverviewTab = React.memo<AssetOverviewTabProps>(
  ({ asset, isDark, canEdit, canDelete }) => {
    const [isEditing, setIsEditing] = useState(false);

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

    return (
      <div className="p-5 space-y-5">
        {/* Info grid */}
        <div className="space-y-3">
          <InfoRow label="Asset #" value={asset.assetNumber} isDark={isDark} mono />
          <InfoRow label="Make / Model" value={[asset.make, asset.model].filter(Boolean).join(' ') || null} isDark={isDark} />
          {asset.yearManufactured && (
            <InfoRow label="Year" value={String(asset.yearManufactured)} isDark={isDark} />
          )}
          {asset.registrationNumber && (
            <InfoRow label="Rego" value={asset.registrationNumber} isDark={isDark} mono />
          )}
          {asset.registrationExpiry && (
            <InfoRow
              label="Rego Expiry"
              value={new Date(asset.registrationExpiry).toLocaleDateString()}
              isDark={isDark}
            />
          )}
          <InfoRow label="Depot" value={asset.depotName ? `${asset.depotName} (${asset.depotCode})` : null} isDark={isDark} />
          <InfoRow label="Driver" value={asset.driverName} isDark={isDark} />
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
        {asset.qrCodeData && (() => {
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(asset.qrCodeData)}&bgcolor=000000&color=ffffff`;
          const printQR = () => {
            const win = window.open('', '_blank', 'width=400,height=500');
            if (!win) return;
            const esc = (s: string) =>
              s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const safeNumber = esc(asset.assetNumber);
            const safeCategory = esc(asset.category.charAt(0).toUpperCase() + asset.category.slice(1));
            const safeDepot = asset.depotName ? ' — ' + esc(asset.depotName) : '';
            const safeId = esc(asset.id);
            win.document.write(`
              <html><head><title>QR — ${safeNumber}</title>
              <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff;font-family:'Lato',sans-serif}
              img{width:250px;height:250px;image-rendering:pixelated}
              h2{margin:20px 0 4px;font-size:24px;letter-spacing:0.05em}
              p{margin:2px 0;color:#666;font-size:12px}
              </style></head><body>
              <img src="${qrUrl}" />
              <h2>${safeNumber}</h2>
              <p>${safeCategory}${safeDepot}</p>
              <p style="font-family:monospace;font-size:10px;margin-top:8px;color:#999">${safeId}</p>
              <script>window.onload=()=>{window.print()}</script>
              </body></html>
            `);
            win.document.close();
          };
          return (
            <div className={`pt-4 border-t ${sectionBorder}`}>
              <div className="flex items-center gap-2 mb-3">
                <QrCode className={`w-4 h-4 ${mutedColor}`} />
                <span className={`text-xs font-medium uppercase tracking-wider ${labelColor}`}>
                  QR Code
                </span>
              </div>
              <div className="space-y-3">
                <p className={`text-xs font-mono break-all ${mutedColor}`}>
                  {asset.qrCodeData}
                </p>
                {/* Asset UUID */}
                <div>
                  <span className={`text-xs ${labelColor}`}>UUID</span>
                  <p className={`text-xs font-mono break-all ${mutedColor}`}>{asset.id}</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={qrUrl}
                    download={`QR-${asset.assetNumber}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10 ${mutedColor}`}
                    style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={printQR}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10 ${mutedColor}`}
                    style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Notes */}
        {asset.notes && (
          <div className={`pt-4 border-t ${sectionBorder}`}>
            <span className={`text-xs font-medium uppercase tracking-wider ${labelColor}`}>
              Notes
            </span>
            <p className={`text-sm mt-1 ${textColor}`}>{asset.notes}</p>
          </div>
        )}

      </div>
    );
  }
);

AssetOverviewTab.displayName = 'AssetOverviewTab';

// ── InfoRow ──

function InfoRow({
  label,
  value,
  isDark,
  mono,
}: {
  label: string;
  value: string | null;
  isDark: boolean;
  mono?: boolean;
}) {
  const textColor = isDark ? 'text-slate-200' : 'text-white';
  const mutedColor = isDark ? 'text-slate-500' : 'text-white/40';
  const labelColor = isDark ? 'text-slate-400' : 'text-white/60';

  return (
    <div className="min-w-0">
      <span className={`text-xs ${labelColor}`}>{label}</span>
      <p className={`text-sm ${mono ? 'font-mono' : ''} ${value ? textColor : mutedColor}`}>
        {value || '\u2014'}
      </p>
    </div>
  );
}
