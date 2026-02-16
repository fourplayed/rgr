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

import React, { useEffect, useRef, useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AssetHoverCard } from './AssetHoverCard';
import { RGR_COLORS } from '@/styles/color-palette';
import { DEPOT_LOCATIONS, DEPOT_COLOR, DEPOT_COLORS, type DepotLocation } from '@/constants/fleetMap';
import type { AssetLocation } from '@/hooks/useFleetData';

export interface FleetMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitBounds: () => void;
}

// Validate and set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}
// Disable Mapbox telemetry to prevent ERR_NAME_NOT_RESOLVED console spam
try { (mapboxgl as any).config.EVENTS_URL = ''; } catch { /* read-only in newer versions */ }

/**
 * Asset filter options
 */
export interface AssetFilters {
  category?: Array<'trailer' | 'dolly'> | 'all';
  subtype?: string | 'all';
  status?: Array<'serviced' | 'maintenance' | 'out_of_service'> | 'all';
  depot?: string[] | 'all';
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
  filters?: AssetFilters;
  showDepotLabels?: boolean;
}

/**
 * Status colors for markers
 */
const STATUS_COLORS: Record<string, string> = {
  serviced: '#10b981',      // emerald-500
  maintenance: '#f59e0b', // amber-500
  out_of_service: '#ef4444', // red-500
};

/**
 * Light theme colors for better visibility
 */
const LIGHT_THEME_COLORS: Record<string, string> = {
  serviced: '#059669',      // emerald-600
  maintenance: '#d97706', // amber-600
  out_of_service: '#dc2626', // red-600
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
const FleetMapWithDataInner = forwardRef<FleetMapHandle, FleetMapWithDataProps>(({
  assets,
  className = '',
  onAssetClick,
  onMapLoad,
  isDark = true,
  focusAssetId,
  onFocusComplete,
  enableFilters = false,
  filters: externalFilters,
  showDepotLabels = true,
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const depotMarkers = useRef<mapboxgl.Marker[]>([]);
  const popupRoots = useRef<Array<{ root: ReturnType<typeof createRoot>; asset: AssetLocation }>>([]);
  const depotPopupRoots = useRef<Array<{ root: ReturnType<typeof createRoot>; depot: DepotLocation }>>([]);
  const currentStyleUrl = useRef<string | null>(null);
  const initialIsDark = useRef(isDark);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(4.5);

  const filters = externalFilters || { category: 'all' as const, subtype: 'all' as const, status: 'all' as const, lastScannedDays: 'all' as const };

  // Filter assets based on current filters
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (filters.category !== 'all' && Array.isArray(filters.category) && filters.category.length > 0) {
        if (!filters.category.includes(asset.category as 'trailer' | 'dolly')) return false;
      }
      if (filters.subtype && filters.subtype !== 'all' && asset.subtype !== filters.subtype) return false;
      if (filters.depot !== 'all' && Array.isArray(filters.depot) && filters.depot.length > 0) {
        if (!asset.depot || !filters.depot.includes(asset.depot)) return false;
      }
      if (filters.status !== 'all' && Array.isArray(filters.status) && filters.status.length > 0) {
        if (!filters.status.includes(asset.status as 'serviced' | 'maintenance' | 'out_of_service')) return false;
      }
      if (filters.lastScannedDays != null && filters.lastScannedDays !== 'all') {
        const daysSince = asset.lastUpdated
          ? Math.floor((Date.now() - new Date(asset.lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
          : Infinity;
        if (daysSince > filters.lastScannedDays) return false;
      }
      return true;
    });
  }, [assets, filters]);

  // Expose zoom/fit controls via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => map.current?.zoomIn(),
    zoomOut: () => map.current?.zoomOut(),
    fitBounds: () => {
      if (!map.current) return;
      const bounds = new mapboxgl.LngLatBounds();
      DEPOT_LOCATIONS.forEach((depot) => bounds.extend([depot.lng, depot.lat]));
      filteredAssets.forEach((asset) => bounds.extend([asset.longitude, asset.latitude]));
      if (bounds.isEmpty()) return;
      map.current.fitBounds(bounds, { padding: 50 });
    },
  }), [filteredAssets]);

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
      const styleUrl = initialIsDark.current
        ? import.meta.env.VITE_MAPBOX_STYLE_DARK || 'mapbox://styles/mapbox/dark-v11'
        : import.meta.env.VITE_MAPBOX_STYLE_LIGHT || 'mapbox://styles/mapbox/light-v11';

      currentStyleUrl.current = styleUrl;

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

        // Per-depot layout: stem height, anchor side, z-index
        // 'west' = right edge of label sits on pole, label extends left
        // 'east' = left edge of label sits on pole, label extends right
        const depotLayout: Record<string, { stem: number; anchor: 'west' | 'east' | 'center'; z: number }> = {
          Perth:     { stem: 45, anchor: 'east',   z: 16 },
          Wubin:     { stem: 85, anchor: 'east',   z: 14 },
          Newman:    { stem: 45, anchor: 'east',   z: 12 },
          Hedland:   { stem: 48, anchor: 'east',   z: 16 },
          Karratha:  { stem: 88, anchor: 'east',   z: 14 },
          Carnarvon: { stem: 45, anchor: 'east',   z: 12 },
        };

        // Add depot markers with text labels
        DEPOT_LOCATIONS.forEach((depot: DepotLocation) => {
          const depotColor = DEPOT_COLORS[depot.name] || DEPOT_COLOR;
          const tipTextColor = depot.name === 'Newman' ? '#6366f1' : depotColor;
          const layout = depotLayout[depot.name] ?? { stem: 68, anchor: 'center', z: 10 };

          // Translate label so the correct edge sits on the pole
          const offsetX = layout.anchor === 'west' ? '-100%' : layout.anchor === 'east' ? '0%' : '-50%';

          // Tooltip on opposite side of beam from label, anchored to the pole
          const tipOnRight = layout.anchor === 'west';  // label left → tooltip right
          const tipOrigin = tipOnRight ? 'transform-origin: left center;' : 'transform-origin: right center;';
          const tipHidden = tipOnRight ? 'transform: rotateY(-90deg);' : 'transform: rotateY(90deg);';
          const tipRadius = tipOnRight ? 'border-radius: 0 8px 8px 0;' : 'border-radius: 8px 0 0 8px;';
          // Position tooltip at beam center: right-side starts at left:50%, left-side ends at beam via right + calc
          const tipPosition = tipOnRight
            ? 'left: 50%;'
            : 'right: calc(50% - 1px);';  // -1px to overlap the beam edge

          const el = document.createElement('div');
          el.className = 'depot-marker';
          el.style.cssText = `margin: 0; padding: 0; line-height: 0; z-index: ${layout.z};`;
          el.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; position: relative; margin: 0; padding: 0; perspective: 400px;">
              <div style="width: 2px; height: ${layout.stem}px; background: linear-gradient(to bottom, ${depotColor}cc, ${depotColor}44 70%, transparent); pointer-events: none;"></div>
              <div style="position: absolute; top: 0; width: 4px; height: ${layout.stem}px; background: linear-gradient(to bottom, ${depotColor}25, ${depotColor}0a 60%, transparent); filter: blur(2px); pointer-events: none; left: 50%; transform: translateX(-50%);"></div>
              <div class="depot-label-wrap" style="position: absolute; top: -7px; left: 50%; transform: translateX(${offsetX}); display: inline-flex; align-items: center; pointer-events: auto; cursor: pointer;">
                <span class="depot-label" style="position: relative; z-index: 1; color: white; font-family: 'Lato', sans-serif; font-size: 14px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.6); background: ${depotColor}cc; border: 1px solid ${depotColor}; padding: 8px 10px 12px 10px; border-radius: 8px; backdrop-filter: blur(4px);">${depot.name}</span>
              </div>
              <div class="depot-tooltip" style="position: absolute; top: -7px; ${tipPosition} ${tipOrigin} ${tipHidden} line-height: 1.4; white-space: nowrap; color: white; font-family: 'Lato', sans-serif; font-size: 12px; font-weight: 600; background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: none; padding: 0; ${tipRadius} opacity: 0; transition: opacity 0.3s ease, transform 0.3s ease; pointer-events: none; overflow: hidden;">
                <div style="display: grid; grid-template-columns: auto auto; line-height: 1;">
                  <div style="padding: 8px 10px; border-right: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); color: ${tipTextColor};">TL</div>
                  <div style="padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.1); color: ${tipTextColor}; font-weight: 800;">${depot.trailers}</div>
                  <div style="padding: 8px 10px; border-right: 1px solid rgba(255,255,255,0.1); color: ${tipTextColor};">DL</div>
                  <div style="padding: 8px 10px; color: ${tipTextColor}; font-weight: 800;">${depot.dollies}</div>
                </div>
              </div>
              <div style="width: 5px; height: 5px; border-radius: 50%; background-color: ${depotColor}; box-shadow: 0 0 6px ${depotColor}, 0 0 12px ${depotColor}80; cursor: pointer; flex-shrink: 0;"></div>
            </div>
          `;

          const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([depot.lng, depot.lat])
            .addTo(mapInstance);

          depotMarkers.current.push(marker);
        });
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
      depotPopupRoots.current.forEach(({ root }) => root.unmount());
      depotPopupRoots.current = [];
      depotMarkers.current.forEach((marker) => marker.remove());
      depotMarkers.current = [];
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMapLoad]);

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
        ? (STATUS_COLORS[representativeAsset.status] || '#6b7280')
        : (LIGHT_THEME_COLORS[representativeAsset.status] || '#4b5563');

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
      el.addEventListener('mouseenter', () => map.current && popup.addTo(map.current));
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

    // Only call setStyle when the URL actually changes (skip on initial load)
    if (styleUrl !== currentStyleUrl.current) {
      currentStyleUrl.current = styleUrl;
      map.current.setStyle(styleUrl, { diff: false } as any);
    }

    // Update popup themes
    popupRoots.current.forEach(({ root, asset }) => {
      root.render(
        <AssetHoverCard
          asset={{ name: asset.assetNumber, status: asset.status }}
          isDark={isDark}
        />
      );
    });

    // Depot text labels don't need theme updates (white on both themes)
  }, [isDark, mapLoaded]);

  // Toggle depot marker visibility based on Flag button + location filters
  useEffect(() => {
    const selectedDepots = Array.isArray(filters.depot) ? filters.depot : [];
    const hasDepotFilter = selectedDepots.length > 0;

    depotMarkers.current.forEach((marker, i) => {
      const el = marker.getElement();
      const depotName = DEPOT_LOCATIONS[i]?.name;
      const visible = showDepotLabels && (!hasDepotFilter || selectedDepots.includes(depotName));
      el.style.display = visible ? '' : 'none';
    });
  }, [showDepotLabels, filters.depot]);

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
        .depot-hover-popup {
          z-index: 1000 !important;
        }
        .depot-hover-popup .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }
        .depot-hover-popup .mapboxgl-popup-tip {
          display: none !important;
        }
        .depot-marker {
          z-index: 10;
        }
        .depot-label-wrap:hover ~ .depot-tooltip,
        .depot-tooltip:hover {
          opacity: 1 !important;
          transform: rotateY(0deg) !important;
          pointer-events: auto !important;
        }
        .fleet-marker {
          z-index: 5;
        }
      `}</style>
    </div>
  );
});

FleetMapWithDataInner.displayName = 'FleetMapWithData';

export const FleetMapWithData = React.memo(FleetMapWithDataInner);

export default FleetMapWithData;
