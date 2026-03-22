/**
 * Dashboard page - Container component
 *
 * ARCHITECTURE: Container/Presenter + Dependency Injection
 * - Thin wrapper connecting useDashboardLogic() with DashboardPresenter
 * - Same pattern as Login.tsx
 */
import { useState, useCallback, useRef } from 'react';
import { useDashboardLogic } from './dashboard/useDashboardLogic';
import { DashboardPresenter } from './dashboard/DashboardPresenter';
import { FleetMapWithData } from '@/components/dashboard/map';
import type { FleetMapHandle, AssetFilters } from '@/components/dashboard/map';
import { useAssetLocations } from '@/hooks/useFleetData';
import { useDepots } from '@/hooks/useAssetData';

export default function Dashboard() {
  const { state, actions } = useDashboardLogic();
  const { data: assets = [] } = useAssetLocations();
  const { data: depots = [] } = useDepots();
  const [focusAssetId, setFocusAssetId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({
    category: 'all',
    subtype: 'all',
    status: 'all',
    lastScannedDays: 'all',
  } as AssetFilters);
  const mapRef = useRef<FleetMapHandle>(null);
  const [showDepotLabels, setShowDepotLabels] = useState(true);

  const handleFocusComplete = useCallback(() => {
    setFocusAssetId(null);
  }, []);

  return (
    <DashboardPresenter state={state} actions={actions}>
      <div className="relative w-full h-full">
        <div style={{ position: 'absolute', inset: 0 }}>
          <FleetMapWithData
            ref={mapRef}
            assets={assets}
            isDark={state.isDark}
            filters={filters}
            showDepotLabels={showDepotLabels}
            focusAssetId={focusAssetId}
            onFocusComplete={handleFocusComplete}
          />
        </div>
        {/* Floating overlays will be added in Task 5 */}
      </div>
    </DashboardPresenter>
  );
}
