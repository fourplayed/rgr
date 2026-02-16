/**
 * AssetsMap — Map view wrapper around FleetMapWithData
 */
import React, { useRef } from 'react';
import { FleetMapWithData } from '@/components/dashboard/map';
import type { FleetMapHandle } from '@/components/dashboard/map';
import { useAssetLocations } from '@/hooks/useFleetData';

export interface AssetsMapProps {
  isDark: boolean;
  selectedAssetId: string | null;
  onSelectAsset: (id: string) => void;
}

export const AssetsMap = React.memo<AssetsMapProps>(
  ({ isDark, selectedAssetId, onSelectAsset }) => {
    const { data: assets = [] } = useAssetLocations();
    const mapRef = useRef<FleetMapHandle>(null);

    return (
      <div className="relative w-full" style={{ height: '700px' }}>
        <FleetMapWithData
          ref={mapRef}
          assets={assets}
          isDark={isDark}
          focusAssetId={selectedAssetId}
          onAssetClick={onSelectAsset}
        />
      </div>
    );
  }
);

AssetsMap.displayName = 'AssetsMap';
