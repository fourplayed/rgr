/**
 * FleetMapWithData - Enhanced map component with real asset data and clustering
 *
 * Features:
 * - Uses real asset location data from Supabase
 * - Marker clustering for 100+ assets
 * - Filter by asset type, status, last scan date
 * - Asset details on marker click
 * - Performance optimized for large datasets
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ZoomIn, ZoomOut, Maximize2, Filter } from 'lucide-react';
import { AssetHoverCard } from './AssetHoverCard';
import { RGR_COLORS } from '@/styles/color-palette';
import type { AssetLocation } from '@/hooks/useFleetData';

// Validate and set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

/**
 * Asset filter options
 */
export interface AssetFilters {
  category?: 'trailer' | 'dolly' | 'all';
  status?: 'active' | 'maintenance' | 'out_of_service' | 'all';
  lastScannedDays?: number | 'all';
}

/**
 * Props for FleetMapWithData
 */
export interface FleetMapWithDataProps {
  assets: AssetLocation[];
  className?: string;
  onAssetClick?: (assetId: string) => void;
  onMapLoad?: () => void;
  isDark?: boolean;
  focusAssetId?: string | null;
  onFocusComplete?: (found: boolean) => void;
  enableFilters?: boolean;
}

/**
 * Status colors for markers
 */
const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',      // emerald-500
  maintenance: '#f59e0b', // amber-500
  out_of_service: '#ef4444', // red-500
  decommissioned: '#6b7280', // gray-500
};

/**
 * Light theme colors for better visibility
 */
const LIGHT_THEME_COLORS: Record<string, string> = {
  active: '#059669',      // emerald-600
  maintenance: '#d97706', // amber-600
  out_of_service: '#dc2626', // red-600
  decommissioned: '#4b5563', // gray-600
};

/**
 * Simple clustering algorithm for nearby markers
 */
function clusterAssets(assets: AssetLocation[], zoom: number): Array<{
  id: string;
  lng: number;
  lat: number;
  count: number;
  assets: AssetLocation[];
}> {
  // Clustering threshold based on zoom level (degrees)
  const threshold = zoom > 8 ? 0.05 : zoom > 6 ? 0.2 : 0.5;

  const clusters: Array<{
    id: string;
    lng: number;
    lat: number;
    count: number;
    assets: AssetLocation[];
  }> = [];

  const used = new Set<string>();

  assets.forEach((asset) => {
    if (used.has(asset.id)) return;

    const nearby = assets.filter((other) => {
      if (used.has(other.id)) return false;
      const distance = Math.sqrt(
        Math.pow(asset.longitude - other.longitude, 2) +
        Math.pow(asset.latitude - other.latitude, 2)
      );
      return distance < threshold;
    });

    nearby.forEach((a) => used.add(a.id));

    if (nearby.length === 1) {
      // Single asset - no cluster
      clusters.push({
        id: asset.id,
        lng: asset.longitude,
        lat: asset.latitude,
        count: 1,
        assets: [asset],
      });
    } else {
      // Multiple assets - create cluster
      const avgLng = nearby.reduce((sum, a) => sum + a.longitude, 0) / nearby.length;
      const avgLat = nearby.reduce((sum, a) => sum + a.latitude, 0) / nearby.length;
      clusters.push({
        id: `cluster-${asset.id}`,
        lng: avgLng,
        lat: avgLat,
        count: nearby.length,
        assets: nearby,
      });
    }
  });

  return clusters;
}

/**
 * FleetMapWithData component
 */
export const FleetMapWithData = React.memo<FleetMapWithDataProps>(({
  assets,
  className = '',
  onAssetClick,
  onMapLoad,
  isDark = true,
  focusAssetId,
  onFocusComplete,
  enableFilters = false,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const popupRoots = useRef<Array<{ root: ReturnType<typeof createRoot>; asset: AssetLocation }>>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(4.5);
  const [filters, setFilters] = useState<AssetFilters>({
    category: 'all',
    status: 'all',
    lastScannedDays: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Filter assets based on current filters
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (filters.category !== 'all' && asset.category !== filters.category) return false;
      if (filters.status !== 'all' && asset.status !== filters.status) return false;
      if (filters.lastScannedDays !== 'all') {
        const daysSince = asset.lastUpdated
          ? Math.floor((Date.now() - new Date(asset.lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;
        if (daysSince > filters.lastScannedDays) return false;
      }
      return true;
    });
  }, [assets, filters]);

  // Cluster filtered assets
  const clusters = useMemo(() => {
    return clusterAssets(filteredAssets, currentZoom);
  }, [filteredAssets, currentZoom]);

  // Use ref to store latest callback
  const onAssetClickRef = useRef(onAssetClick);
  useEffect(() => {
    onAssetClickRef.current = onAssetClick;
  }, [onAssetClick]);

  // Stable reference to asset click handler
  const handleAssetClick = useCallback((assetId: string) => {
    onAssetClickRef.current?.(assetId);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainer.current || map.current) return;

    let isMounted = true;

    try {
      const styleUrl = isDark
        ? import.meta.env.VITE_MAPBOX_STYLE_DARK || 'mapbox://styles/mapbox/dark-v11'
        : import.meta.env.VITE_MAPBOX_STYLE_LIGHT || 'mapbox://styles/mapbox/light-v11';

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: styleUrl,
        center: [122, -25], // Center of WA
        zoom: 4.5,
        attributionControl: false,
      });

      const mapInstance = map.current;

      mapInstance.on('error', (e: mapboxgl.ErrorEvent) => {
        if (isMounted) {
          setMapError(e.error?.message || 'Failed to load map');
          console.error('Mapbox error:', e.error);
        }
      });

      mapInstance.on('load', () => {
        if (!isMounted) return;
        setMapLoaded(true);
        onMapLoad?.();

        // Add navigation controls
        mapInstance.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          'top-right'
        );
      });

      // Track zoom level for clustering
      mapInstance.on('zoom', () => {
        if (isMounted) {
          setCurrentZoom(mapInstance.getZoom());
        }
      });
    } catch (error) {
      if (isMounted) {
        setMapError(error instanceof Error ? error.message : 'Failed to initialize map');
        console.error('MapBox initialization error:', error);
      }
    }

    return () => {
      isMounted = false;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isDark, onMapLoad]);

  // Update markers when clusters change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Clear popup roots
    popupRoots.current.forEach(({ root }) => root.unmount());
    popupRoots.current = [];

    // Add new markers
    clusters.forEach((cluster) => {
      const isCluster = cluster.count > 1;
      const representativeAsset = cluster.assets[0];
      const statusColor = isDark
        ? (STATUS_COLORS[representativeAsset.status] || STATUS_COLORS.decommissioned)
        : (LIGHT_THEME_COLORS[representativeAsset.status] || LIGHT_THEME_COLORS.decommissioned);

      const el = document.createElement('div');
      el.className = 'fleet-marker';

      if (isCluster) {
        // Cluster marker
        el.innerHTML = `
          <div class="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-transform hover:scale-125"
               style="background-color: ${statusColor}; box-shadow: 0 0 12px ${statusColor}80;">
            <span class="text-white text-xs font-bold">${cluster.count}</span>
          </div>
        `;
      } else {
        // Single asset marker
        el.innerHTML = `
          <div class="w-3 h-3 rounded-full shadow-lg cursor-pointer transition-transform hover:scale-150"
               style="background-color: ${statusColor}; box-shadow: 0 0 8px ${statusColor}80;">
          </div>
        `;
        el.addEventListener('click', () => handleAssetClick(representativeAsset.id));
      }

      // Create popup
      const popupContainer = document.createElement('div');
      const root = createRoot(popupContainer);

      if (isCluster) {
        // Cluster popup - show count and assets
        root.render(
          <div
            className="p-3 rounded-lg backdrop-blur-sm border"
            style={{
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: isDark ? `${RGR_COLORS.bright.vibrant}33` : `${RGR_COLORS.navy.light}33`,
              color: isDark ? RGR_COLORS.chrome.light : RGR_COLORS.navy.base,
            }}
          >
            <div className="text-sm font-semibold mb-2">{cluster.count} Assets</div>
            <div className="text-xs space-y-1">
              {cluster.assets.slice(0, 5).map((asset) => (
                <div key={asset.id}>
                  {asset.assetNumber} - {asset.status}
                </div>
              ))}
              {cluster.count > 5 && <div>+ {cluster.count - 5} more</div>}
            </div>
          </div>
        );
      } else {
        // Single asset popup
        root.render(
          <AssetHoverCard
            asset={{ name: representativeAsset.assetNumber, status: representativeAsset.status }}
            isDark={isDark}
          />
        );
        popupRoots.current.push({ root, asset: representativeAsset });
      }

      const popup = new mapboxgl.Popup({
        offset: [0, -20],
        closeButton: false,
        closeOnClick: false,
        className: 'asset-hover-popup',
        maxWidth: 'none',
      }).setDOMContent(popupContainer);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([cluster.lng, cluster.lat])
        .setPopup(popup)
        .addTo(map.current!);

      // Show popup on hover
      el.addEventListener('mouseenter', () => popup.addTo(map.current!));
      el.addEventListener('mouseleave', () => popup.remove());

      markers.current.push(marker);
    });
  }, [clusters, mapLoaded, isDark, handleAssetClick]);

  // Update theme
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const styleUrl = isDark
      ? import.meta.env.VITE_MAPBOX_STYLE_DARK || 'mapbox://styles/mapbox/dark-v11'
      : import.meta.env.VITE_MAPBOX_STYLE_LIGHT || 'mapbox://styles/mapbox/light-v11';

    map.current.setStyle(styleUrl);

    // Update popup themes
    popupRoots.current.forEach(({ root, asset }) => {
      root.render(
        <AssetHoverCard
          asset={{ name: asset.assetNumber, status: asset.status }}
          isDark={isDark}
        />
      );
    });
  }, [isDark, mapLoaded]);

  // Focus on asset
  useEffect(() => {
    if (!map.current || !mapLoaded || !focusAssetId) return;

    const asset = assets.find((a) => a.id === focusAssetId || a.assetNumber.toLowerCase() === focusAssetId.toLowerCase());

    if (asset) {
      map.current.flyTo({
        center: [asset.longitude, asset.latitude],
        zoom: 10,
        duration: 1500,
        essential: true,
      });
      onFocusComplete?.(true);
    } else {
      onFocusComplete?.(false);
    }
  }, [focusAssetId, mapLoaded, assets, onFocusComplete]);

  const handleZoomIn = () => map.current?.zoomIn();
  const handleZoomOut = () => map.current?.zoomOut();
  const handleFitBounds = () => {
    if (!map.current || filteredAssets.length === 0) return;
    const bounds = new mapboxgl.LngLatBounds();
    filteredAssets.forEach((asset) => bounds.extend([asset.longitude, asset.latitude]));
    map.current.fitBounds(bounds, { padding: 50 });
  };

  return (
    <div className={`relative w-full h-full ${className}`} role="application" aria-label="Fleet tracking map">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Loading state */}
      {!mapLoaded && !mapError && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: `${RGR_COLORS.navy.darkest}CC` }}
        >
          <div className="text-center" style={{ color: RGR_COLORS.chrome.medium }}>
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: RGR_COLORS.bright.vibrant, borderTopColor: 'transparent' }}
            />
            <p className="text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {mapError && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: RGR_COLORS.navy.darkest }}
        >
          <div className="text-center max-w-md px-6">
            <p className="text-sm" style={{ color: RGR_COLORS.semantic.error }}>
              {mapError}
            </p>
          </div>
        </div>
      )}

      {/* Map controls */}
      {MAPBOX_TOKEN && mapLoaded && (
        <>
          <div className="absolute bottom-4 right-4 flex flex-row gap-2 z-10">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-2.5 rounded-xl backdrop-blur-sm border transition-colors"
              style={{
                backgroundColor: `${RGR_COLORS.navy.base}CC`,
                borderColor: `${RGR_COLORS.bright.vibrant}33`,
                color: RGR_COLORS.chrome.light,
              }}
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-2.5 rounded-xl backdrop-blur-sm border transition-colors"
              style={{
                backgroundColor: `${RGR_COLORS.navy.base}CC`,
                borderColor: `${RGR_COLORS.bright.vibrant}33`,
                color: RGR_COLORS.chrome.light,
              }}
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleFitBounds}
              className="p-2.5 rounded-xl backdrop-blur-sm border transition-colors"
              style={{
                backgroundColor: `${RGR_COLORS.navy.base}CC`,
                borderColor: `${RGR_COLORS.bright.vibrant}33`,
                color: RGR_COLORS.chrome.light,
              }}
              aria-label="Fit all assets"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Filter button (if enabled) */}
          {enableFilters && (
            <div className="absolute top-4 right-4 z-10">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="p-2.5 rounded-xl backdrop-blur-sm border transition-colors"
                style={{
                  backgroundColor: `${RGR_COLORS.navy.base}CC`,
                  borderColor: `${RGR_COLORS.bright.vibrant}33`,
                  color: RGR_COLORS.chrome.light,
                }}
                aria-label="Toggle filters"
              >
                <Filter className="w-4 h-4" />
              </button>

              {/* Filter panel */}
              {showFilters && (
                <div
                  className="absolute top-12 right-0 p-4 rounded-xl backdrop-blur-sm border min-w-[200px]"
                  style={{
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: `${RGR_COLORS.bright.vibrant}33`,
                  }}
                >
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: RGR_COLORS.chrome.light }}>
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value as any })}
                        className="w-full px-2 py-1 rounded text-sm"
                        style={{
                          backgroundColor: isDark ? RGR_COLORS.navy.darkest : 'white',
                          color: isDark ? RGR_COLORS.chrome.light : RGR_COLORS.navy.base,
                          border: `1px solid ${RGR_COLORS.bright.vibrant}33`,
                        }}
                      >
                        <option value="all">All</option>
                        <option value="trailer">Trailers</option>
                        <option value="dolly">Dollies</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: RGR_COLORS.chrome.light }}>
                        Status
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                        className="w-full px-2 py-1 rounded text-sm"
                        style={{
                          backgroundColor: isDark ? RGR_COLORS.navy.darkest : 'white',
                          color: isDark ? RGR_COLORS.chrome.light : RGR_COLORS.navy.base,
                          border: `1px solid ${RGR_COLORS.bright.vibrant}33`,
                        }}
                      >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="out_of_service">Out of Service</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
        .asset-hover-popup {
          z-index: 1000 !important;
        }
      `}</style>
    </div>
  );
});

FleetMapWithData.displayName = 'FleetMapWithData';

export default FleetMapWithData;
