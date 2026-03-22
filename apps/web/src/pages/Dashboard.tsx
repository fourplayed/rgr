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
import { FloatingSearch } from '@/components/dashboard/map/FloatingSearch';
import { DepotFilterPills } from '@/components/dashboard/map/DepotFilterPills';
import { FloatingStatPills } from '@/components/dashboard/map/FloatingStatPills';

export default function Dashboard() {
  const { state, actions } = useDashboardLogic();
  const { data: assets = [] } = useAssetLocations();
  const [focusAssetId, setFocusAssetId] = useState<string | null>(null);
  const [activeDepot, setActiveDepot] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({
    category: 'all',
    subtype: 'all',
    status: 'all',
    lastScannedDays: 'all',
  } as AssetFilters);
  const mapRef = useRef<FleetMapHandle>(null);
  const [showDepotLabels] = useState(true);

  const handleFocusComplete = useCallback(() => {
    setFocusAssetId(null);
  }, []);

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setFocusAssetId(null);
      return;
    }
    const q = query.toLowerCase();
    const match = assets.find(
      (a) =>
        a.assetNumber?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q)
    );
    if (match) {
      setFocusAssetId(match.id);
    }
  }, [assets]);

  const handleDepotChange = useCallback((depotCode: string | null) => {
    setActiveDepot(depotCode);
    setFilters((prev) => ({ ...prev, depot: depotCode ? [depotCode] : 'all' }));
  }, []);

  return (
    <DashboardPresenter state={state} actions={actions}>
      <div className="relative w-full h-full">
        {/* Map fills entire area */}
        <div className="absolute inset-0">
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
        {/* Floating overlays */}
        <FloatingSearch onSearch={handleSearch} />
        <DepotFilterPills activeDepot={activeDepot} onDepotChange={handleDepotChange} />
        <FloatingStatPills />
      </div>
    </DashboardPresenter>
  );
}
