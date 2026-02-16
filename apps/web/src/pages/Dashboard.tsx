/**
 * Dashboard page - Container component
 *
 * ARCHITECTURE: Container/Presenter + Dependency Injection
 * - Thin wrapper connecting useDashboardLogic() with DashboardPresenter
 * - Same pattern as Login.tsx
 */
import { useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useDashboardLogic } from './dashboard/useDashboardLogic';
import { DashboardPresenter } from './dashboard/DashboardPresenter';
import { FleetMapWithData, SearchFilterBar } from '@/components/dashboard/map';
import type { FleetMapHandle, AssetFilters } from '@/components/dashboard/map';
import { useAssetLocations } from '@/hooks/useFleetData';
import { StatCards } from '@/components/dashboard/stats/StatCards';

export default function Dashboard() {
  const { state, actions } = useDashboardLogic();
  const { data: assets = [] } = useAssetLocations();
  const [focusAssetId, setFocusAssetId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({
    category: 'all',
    subtype: 'all',
    status: 'all',
    lastScannedDays: 'all',
  } as AssetFilters);
  const mapRef = useRef<FleetMapHandle>(null);
  const [showDepotLabels, setShowDepotLabels] = useState(true);
  const location = useLocation();
  const fromLogin = location.state?.fromLogin === true;

  const handleSearch = useCallback((query: string) => {
    setFocusAssetId(query || null);
  }, []);

  const handleFocusComplete = useCallback(() => {
    setFocusAssetId(null);
  }, []);

  return (
    <DashboardPresenter state={state} actions={actions}>
      {/* Stat cards row */}
      <div
        style={{
          width: 'calc(100% - 48px)',
          maxWidth: '1360px',
          position: 'fixed',
          top: '86px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '20px 0',
          ...(fromLogin ? { opacity: 0, animation: 'dashContentFadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1) 500ms forwards' } : {}),
        }}
      >
        <StatCards isDark={state.isDark} />
      </div>
      {/* Search/Filter bar — standalone row between stat cards and map */}
      <SearchFilterBar
        isDark={state.isDark}
        assets={assets}
        onSearch={handleSearch}
        filters={filters}
        onFiltersChange={setFilters}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onFitBounds={() => mapRef.current?.fitBounds()}
        showDepotLabels={showDepotLabels}
        onToggleDepotLabels={() => setShowDepotLabels((v) => !v)}
      />
      {/* Map container */}
      <div
        style={{
          width: 'calc(100% - 48px)',
          maxWidth: '1360px',
          border: 'none',
          position: 'fixed',
          top: '342px',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          overflow: 'hidden',
          borderRadius: '0 0 12px 12px',
          ...(fromLogin ? { opacity: 0, animation: 'dashMapReveal 900ms cubic-bezier(0.16, 1, 0.3, 1) 700ms forwards' } : {}),
        }}
      >
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
    </DashboardPresenter>
  );
}
