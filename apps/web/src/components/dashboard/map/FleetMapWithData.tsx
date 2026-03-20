/**
 * FleetMapWithData - Enhanced map component with real asset data and clustering
 *
 * Features:
 * - Uses real asset location data from Supabase
 * - Marker clustering for 100+ assets
 * - Filter by asset type, status, last scan date
 * - Asset details on marker click
 * - Unified pin markers via createPinElement
 * - Performance optimized for large datasets
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { createRoot } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AssetHoverCard } from './AssetHoverCard';
import { DepotHoverCard } from './DepotHoverCard';
import { createPinElement } from './createPinElement';
import { RGR_COLORS } from '@/styles/color-palette';
import type { DepotLocation } from '@/constants/fleetMap';
import type { AssetLocation } from '@/hooks/useFleetData';
import { useDepots } from '@/hooks/useAssetData';
import { isValidHexColor } from '@rgr/shared';
import type { Depot } from '@rgr/shared';

export interface FleetMapHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fitBounds: () => void;
  /** Convert [lng, lat] to pixel coordinates relative to the map container */
  project: (lngLat: [number, number]) => { x: number; y: number } | null;
}

// Validate and set Mapbox access token
const MAPBOX_TOKEN = import.meta.env['VITE_MAPBOX_TOKEN'] || '';
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}
// Disable Mapbox telemetry to prevent ERR_NAME_NOT_RESOLVED console spam
try {
  (mapboxgl as unknown as { config: { EVENTS_URL: string } }).config.EVENTS_URL = '';
} catch {
  /* read-only in newer versions */
}

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
  /** Fires on every map move/zoom so overlays can reproject */
  onViewChange?: () => void;
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
  serviced: '#10b981', // emerald-500
  maintenance: '#f59e0b', // amber-500
  out_of_service: '#ef4444', // red-500
};

/**
 * Light theme colors for better visibility
 */
const LIGHT_THEME_COLORS: Record<string, string> = {
  serviced: '#059669', // emerald-600
  maintenance: '#d97706', // amber-600
  out_of_service: '#dc2626', // red-600
};

const DEFAULT_DEPOT_COLOR = '#9ca3af';

/** Convert Depot records to DepotLocation format for map rendering */
function toDepotLocations(depots: Depot[]): DepotLocation[] {
  return depots
    .filter((d) => d.latitude != null && d.longitude != null)
    .map((d) => ({
      name: d.name,
      lng: d.longitude!,
      lat: d.latitude!,
      trailers: 0,
      dollies: 0,
      color: d.color || DEFAULT_DEPOT_COLOR,
    }));
}

/**
 * Simple clustering algorithm for nearby markers
 */
function clusterAssets(
  assets: AssetLocation[],
  zoom: number
): Array<{
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
      clusters.push({
        id: asset.id,
        lng: asset.longitude,
        lat: asset.latitude,
        count: 1,
        assets: [asset],
      });
    } else {
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
const FleetMapWithDataInner = forwardRef<FleetMapHandle, FleetMapWithDataProps>(
  (
    {
      assets,
      className = '',
      onAssetClick,
      onMapLoad,
      onViewChange,
      isDark = true,
      focusAssetId,
      onFocusComplete,
      enableFilters: _enableFilters = false,
      filters: externalFilters,
      showDepotLabels = true,
    },
    ref
  ) => {
    const { data: dbDepots = [] } = useDepots();
    const depotLocations = useMemo(() => toDepotLocations(dbDepots), [dbDepots]);

    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markers = useRef<mapboxgl.Marker[]>([]);
    const depotMarkers = useRef<mapboxgl.Marker[]>([]);
    const popupRoots = useRef<Array<{ root: ReturnType<typeof createRoot>; asset: AssetLocation }>>(
      []
    );
    const depotPopupRoots = useRef<
      Array<{ root: ReturnType<typeof createRoot>; depot: DepotLocation }>
    >([]);
    const currentStyleUrl = useRef<string | null>(null);
    const initialIsDark = useRef(isDark);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [currentZoom, setCurrentZoom] = useState(4.5);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable default object; externalFilters identity is controlled by parent
    const filters = useMemo(
      () =>
        externalFilters || {
          category: 'all' as const,
          subtype: 'all' as const,
          status: 'all' as const,
          lastScannedDays: 'all' as const,
        },
      [externalFilters]
    );

    // Filter assets based on current filters
    const filteredAssets = useMemo(() => {
      return assets.filter((asset) => {
        if (
          filters.category !== 'all' &&
          Array.isArray(filters.category) &&
          filters.category.length > 0
        ) {
          if (!filters.category.includes(asset.category as 'trailer' | 'dolly')) return false;
        }
        if (filters.subtype && filters.subtype !== 'all' && asset.subtype !== filters.subtype)
          return false;
        if (filters.depot !== 'all' && Array.isArray(filters.depot) && filters.depot.length > 0) {
          if (!asset.depot || !filters.depot.includes(asset.depot)) return false;
        }
        if (
          filters.status !== 'all' &&
          Array.isArray(filters.status) &&
          filters.status.length > 0
        ) {
          if (
            !filters.status.includes(asset.status as 'serviced' | 'maintenance' | 'out_of_service')
          )
            return false;
        }
        if (filters.lastScannedDays != null && filters.lastScannedDays !== 'all') {
          const daysSince = asset.lastUpdated
            ? Math.floor(
                (Date.now() - new Date(asset.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
              )
            : Infinity;
          if (daysSince > filters.lastScannedDays) return false;
        }
        return true;
      });
    }, [assets, filters]);

    // Expose zoom/fit controls via ref
    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => map.current?.zoomIn(),
        zoomOut: () => map.current?.zoomOut(),
        fitBounds: () => {
          if (!map.current) return;
          const bounds = new mapboxgl.LngLatBounds();
          depotLocations.forEach((depot) => bounds.extend([depot.lng, depot.lat]));
          filteredAssets.forEach((asset) => bounds.extend([asset.longitude, asset.latitude]));
          if (bounds.isEmpty()) return;
          map.current.fitBounds(bounds, { padding: 50 });
        },
        project: (lngLat: [number, number]) => {
          if (!map.current) return null;
          const pt = map.current.project(lngLat as mapboxgl.LngLatLike);
          return { x: pt.x, y: pt.y };
        },
      }),
      [filteredAssets, depotLocations]
    );

    // Cluster filtered assets
    const clusters = useMemo(() => {
      return clusterAssets(filteredAssets, currentZoom);
    }, [filteredAssets, currentZoom]);

    // Use ref to store latest callback
    const onAssetClickRef = useRef(onAssetClick);
    useEffect(() => {
      onAssetClickRef.current = onAssetClick;
    }, [onAssetClick]);

    // Store onViewChange in ref and fire on map move
    const onViewChangeRef = useRef(onViewChange);
    useEffect(() => {
      onViewChangeRef.current = onViewChange;
    }, [onViewChange]);

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
          ? import.meta.env['VITE_MAPBOX_STYLE_DARK'] || 'mapbox://styles/mapbox/dark-v11'
          : import.meta.env['VITE_MAPBOX_STYLE_LIGHT'] || 'mapbox://styles/mapbox/light-v11';

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
          onViewChangeRef.current?.();
        });

        // Track zoom level for clustering
        mapInstance.on('zoom', () => {
          if (isMounted) {
            setCurrentZoom(mapInstance.getZoom());
          }
        });

        // Notify parent on every move so overlays can reproject
        mapInstance.on('move', () => {
          if (isMounted) onViewChangeRef.current?.();
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

    // Add depot markers when map is loaded and depot data is available
    useEffect(() => {
      if (!map.current || !mapLoaded || depotLocations.length === 0) return;

      // Clear existing depot markers
      depotPopupRoots.current.forEach(({ root }) => root.unmount());
      depotPopupRoots.current = [];
      depotMarkers.current.forEach((marker) => marker.remove());
      depotMarkers.current = [];

      const mapInstance = map.current;

      // Per-depot z-index stacking
      const depotZIndex: Record<string, number> = {
        Perth: 16,
        Wubin: 14,
        Newman: 12,
        Hedland: 16,
        Karratha: 14,
        Carnarvon: 12,
      };

      depotLocations.forEach((depot: DepotLocation) => {
        const depotColor = isValidHexColor(depot.color) ? depot.color : DEFAULT_DEPOT_COLOR;
        const z = depotZIndex[depot.name] ?? 10;

        const el = createPinElement({
          color: depotColor,
          label: depot.name,
          stemHeight: 55,
          dotSize: 6,
          showRings: true,
          zIndex: z,
          labelStyle: 'depot',
        });

        // Create DepotHoverCard popup
        const popupContainer = document.createElement('div');
        const root = createRoot(popupContainer);
        root.render(
          <DepotHoverCard depot={depot} isDark={isDark} />
        );
        depotPopupRoots.current.push({ root, depot });

        const popup = new mapboxgl.Popup({
          offset: [0, -70],
          closeButton: false,
          closeOnClick: false,
          className: 'depot-hover-popup',
          maxWidth: 'none',
        }).setDOMContent(popupContainer);

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([depot.lng, depot.lat])
          .setPopup(popup)
          .addTo(mapInstance);

        // Show popup on hover
        el.addEventListener('mouseenter', () => mapInstance && popup.addTo(mapInstance));
        el.addEventListener('mouseleave', () => popup.remove());

        depotMarkers.current.push(marker);
      });
    }, [mapLoaded, depotLocations, isDark]);

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
        if (!representativeAsset) return;
        const statusColor = isDark
          ? STATUS_COLORS[representativeAsset.status] || '#6b7280'
          : LIGHT_THEME_COLORS[representativeAsset.status] || '#4b5563';

        let el: HTMLDivElement;

        if (isCluster) {
          // Cluster pin — count badge, no stem
          el = createPinElement({
            color: statusColor,
            stemHeight: 0,
            clusterCount: cluster.count,
            zIndex: 5,
          });
        } else {
          // Single asset pin — short stem, small dot
          el = createPinElement({
            color: statusColor,
            stemHeight: 20,
            dotSize: 4,
            showRings: false,
            zIndex: 5,
            labelStyle: 'asset',
          });
          el.addEventListener('click', () => handleAssetClick(representativeAsset.id));
        }

        // Create popup
        const popupContainer = document.createElement('div');
        const root = createRoot(popupContainer);

        if (isCluster) {
          root.render(
            <div
              className="p-3 rounded-lg backdrop-blur-sm border"
              style={{
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark
                  ? `${RGR_COLORS.bright.vibrant}33`
                  : `${RGR_COLORS.navy.light}33`,
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
          root.render(
            <AssetHoverCard
              asset={{ name: representativeAsset.assetNumber, status: representativeAsset.status }}
              isDark={isDark}
            />
          );
          popupRoots.current.push({ root, asset: representativeAsset });
        }

        const popupOffset = isCluster ? 14 : 28;
        const popup = new mapboxgl.Popup({
          offset: [0, -popupOffset],
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
        ? import.meta.env['VITE_MAPBOX_STYLE_DARK'] || 'mapbox://styles/mapbox/dark-v11'
        : import.meta.env['VITE_MAPBOX_STYLE_LIGHT'] || 'mapbox://styles/mapbox/light-v11';

      // Only call setStyle when the URL actually changes (skip on initial load)
      if (styleUrl !== currentStyleUrl.current) {
        currentStyleUrl.current = styleUrl;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mapbox GL typings lack `diff` option on setStyle
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

      // Update depot popup themes
      depotPopupRoots.current.forEach(({ root, depot }) => {
        root.render(
          <DepotHoverCard depot={depot} isDark={isDark} />
        );
      });
    }, [isDark, mapLoaded]);

    // Toggle depot marker visibility based on Flag button + location filters
    useEffect(() => {
      const selectedDepots = Array.isArray(filters.depot) ? filters.depot : [];
      const hasDepotFilter = selectedDepots.length > 0;

      depotMarkers.current.forEach((marker, i) => {
        const el = marker.getElement();
        const depotName = depotLocations[i]?.name ?? '';
        const visible = showDepotLabels && (!hasDepotFilter || selectedDepots.includes(depotName));
        el.style.display = visible ? '' : 'none';
      });
    }, [showDepotLabels, filters.depot, depotLocations]);

    // Focus on asset
    useEffect(() => {
      if (!map.current || !mapLoaded || !focusAssetId) return;

      const asset = assets.find(
        (a) => a.id === focusAssetId || a.assetNumber.toLowerCase() === focusAssetId.toLowerCase()
      );

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
      <div
        className={`relative w-full h-full ${className}`}
        role="application"
        aria-label="Fleet tracking map"
      >
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

        {/* Loading / no-token state */}
        {!mapLoaded && !mapError && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: RGR_COLORS.navy.darkest }}
          >
            <div className="text-center" style={{ color: RGR_COLORS.chrome.medium }}>
              {MAPBOX_TOKEN ? (
                <>
                  <div
                    className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3"
                    style={{ borderColor: RGR_COLORS.bright.vibrant, borderTopColor: 'transparent' }}
                  />
                  <p className="text-sm">Loading map...</p>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p className="text-sm opacity-60">Map unavailable</p>
                  <p className="text-xs opacity-40 mt-1">Set VITE_MAPBOX_TOKEN to enable</p>
                </>
              )}
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
        .pin-marker-el {
          z-index: 10;
        }
        .fleet-marker {
          z-index: 5;
        }
      `}</style>
      </div>
    );
  }
);

FleetMapWithDataInner.displayName = 'FleetMapWithData';

export const FleetMapWithData = React.memo(FleetMapWithDataInner);

export default FleetMapWithData;
