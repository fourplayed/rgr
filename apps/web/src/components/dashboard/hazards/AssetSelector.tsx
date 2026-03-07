/**
 * AssetSelector - Dropdown component for selecting an asset to associate with photos
 * Vision UI glassmorphism design with dark/light theme support
 *
 * Features:
 * - Searchable dropdown
 * - Shows asset number, category, and status
 * - Loading state
 * - Error handling
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Search, Truck, X, Loader2, AlertCircle } from 'lucide-react';
import { listServicedAssets } from '@rgr/shared';
import type { ServicedAssetOption } from '@rgr/shared';
import { RGR_COLORS } from '@/styles/color-palette';

export interface AssetSelectorProps {
  value: string | null;
  onChange: (assetId: string | null) => void;
  className?: string;
  isDark?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

// ============================================================================
// Component
// ============================================================================

export const AssetSelector = React.memo<AssetSelectorProps>(({
  value,
  onChange,
  className = '',
  isDark = true,
  disabled = false,
  placeholder = 'Select an asset...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assets, setAssets] = useState<ServicedAssetOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme colors
  const textPrimary = isDark ? '#ffffff' : '#1e293b';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';
  const bgColor = isDark
    ? 'linear-gradient(to bottom, rgba(0, 0, 40, 0.8) 0%, rgba(10, 38, 84, 0.8) 100%)'
    : 'linear-gradient(to bottom, rgba(209, 213, 219, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)';
  const borderColor = isDark ? `${RGR_COLORS.chrome.light}33` : 'rgba(107, 114, 128, 0.5)';
  const hoverBg = isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';

  // Fetch assets on mount
  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      setError(null);

      const result = await listServicedAssets(100);

      if (result.success) {
        setAssets(result.data);
      } else {
        console.error('Failed to fetch assets:', result.error);
        setError('Failed to load assets');
        // Use mock data for development/testing fallback
        setAssets([
          { id: '910472f2-2185-483a-ad70-87e55f46e2fe', assetNumber: 'TL001', category: 'trailer', subtype: 'flattop', status: 'serviced' },
          { id: '937e0b87-8c68-43d3-8244-abcd0ad68be9', assetNumber: 'TL002', category: 'trailer', subtype: 'dropdeck', status: 'serviced' },
          { id: '94cf231d-9804-4f1b-a01d-82d02f17b645', assetNumber: 'TL004', category: 'trailer', subtype: 'skel_trailer', status: 'serviced' },
          { id: 'e3e92532-032c-4a8e-825d-bc8af25102b0', assetNumber: 'TL005', category: 'trailer', subtype: 'extendable_flattop', status: 'serviced' },
          { id: 'e6858fe1-edab-4ada-abe7-65f853bc5a2d', assetNumber: 'DL001', category: 'dolly', subtype: null, status: 'serviced' },
        ]);
      }

      setIsLoading(false);
    };

    fetchAssets();
  }, []);

  // Filter assets based on search
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(
      (asset) =>
        asset.assetNumber.toLowerCase().includes(query) ||
        asset.category.toLowerCase().includes(query) ||
        (asset.subtype && asset.subtype.toLowerCase().includes(query))
    );
  }, [assets, searchQuery]);

  // Get selected asset
  const selectedAsset = useMemo(
    () => assets.find((a) => a.id === value),
    [assets, value]
  );

  // Handle selection
  const handleSelect = useCallback((assetId: string) => {
    onChange(assetId);
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);

  // Handle clear
  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchQuery('');
  }, [onChange]);

  // Format category display
  const formatCategory = (category: string, subtype: string | null) => {
    const cat = category.charAt(0).toUpperCase() + category.slice(1);
    if (!subtype) return cat;
    const sub = subtype.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `${cat} - ${sub}`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Label */}
      <label
        className="block text-sm font-medium mb-1.5"
        style={{ color: textPrimary }}
      >
        Assign to Asset
      </label>

      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg
          border transition-all duration-200
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-blue-500'}
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        `}
        style={{
          background: bgColor,
          borderColor: isOpen ? '#3b82f6' : borderColor,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: textMuted }} />
          ) : (
            <Truck className="w-4 h-4 flex-shrink-0" style={{ color: textMuted }} />
          )}
          <span
            className="truncate text-sm"
            style={{ color: selectedAsset ? textPrimary : textMuted }}
          >
            {isLoading
              ? 'Loading assets...'
              : selectedAsset
                ? `${selectedAsset.assetNumber} - ${formatCategory(selectedAsset.category, selectedAsset.subtype)}`
                : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as unknown as React.MouseEvent);
                }
              }}
              className="p-0.5 rounded hover:bg-red-500/20 transition-colors cursor-pointer"
              aria-label="Clear selection"
            >
              <X className="w-3.5 h-3.5" style={{ color: textMuted }} />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: textMuted }}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg border overflow-hidden shadow-xl"
          style={{
            background: bgColor,
            borderColor,
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-b" style={{ borderColor }}>
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: textMuted }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md text-sm bg-transparent border focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{
                  color: textPrimary,
                  borderColor,
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Asset List */}
          <div className="max-h-48 overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm" style={{ color: '#ef4444' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {filteredAssets.length === 0 && !error && (
              <div className="p-3 text-sm text-center" style={{ color: textMuted }}>
                {searchQuery ? 'No matching assets found' : 'No assets available'}
              </div>
            )}

            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => handleSelect(asset.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-left text-sm
                  transition-colors duration-150
                  ${value === asset.id ? 'bg-blue-500/20' : ''}
                `}
                style={{
                  color: textPrimary,
                }}
                onMouseEnter={(e) => {
                  if (value !== asset.id) {
                    e.currentTarget.style.background = hoverBg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== asset.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Truck className="w-4 h-4 flex-shrink-0" style={{ color: textMuted }} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{asset.assetNumber}</div>
                  <div className="text-xs truncate" style={{ color: textMuted }}>
                    {formatCategory(asset.category, asset.subtype)}
                  </div>
                </div>
                {value === asset.id && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: '#3b82f6' }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Optional hint */}
          <div
            className="px-3 py-2 text-xs border-t"
            style={{ borderColor, color: textMuted }}
          >
            Assign this photo to an asset for tracking
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
});

AssetSelector.displayName = 'AssetSelector';

export default AssetSelector;
