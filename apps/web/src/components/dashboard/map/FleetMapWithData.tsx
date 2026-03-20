/**
 * FleetMapWithData - Enhanced map component with real asset data and clustering
 *
 * Features:
 * - Uses real asset location data from Supabase
 * - GeoJSON source + circle layer for asset dots (canvas-rendered, performant)
 * - Filter by asset type, status, last scan date
 * - Asset details on marker click with hover popup
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
import { PinContainer } from '@/components/ui/PinContainer';

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
 * FleetMapWithData component
 */
const FleetMapWithDataInner = forwardRef<FleetMapHandle, FleetMapWithDataProps>(
  (
    {
      assets,
      className = '',
      onAssetClick,
      onMapLoad,
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

    const depotMarkers = useRef<mapboxgl.Marker[]>([]);
    const hoverPopup = useRef<mapboxgl.Popup | null>(null);
    const hoverPopupRoot = useRef<ReturnType<typeof createRoot> | null>(null);
    const pulseAnimFrame = useRef<number | null>(null);
    const depotPopupRoots = useRef<
      Array<{ root: ReturnType<typeof createRoot>; depot: DepotLocation }>
    >([]);
    const currentStyleUrl = useRef<string | null>(null);
    const initialIsDark = useRef(isDark);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);


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
      }),
      [filteredAssets, depotLocations]
    );

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
        // Clean up hover popup
        hoverPopup.current?.remove();
        hoverPopup.current = null;
        hoverPopupRoot.current?.unmount();
        hoverPopupRoot.current = null;
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

        // Render PinContainer (React 3D pin) into a DOM element for Mapbox
        const el = document.createElement('div');
        el.style.cssText = `z-index:${z}; pointer-events:none;`;
        const pinRoot = createRoot(el);
        pinRoot.render(
          <PinContainer title={depot.name} color={depotColor} />
        );
        depotPopupRoots.current.push({ root: pinRoot, depot });

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center', offset: [0, -14] })
          .setLngLat([depot.lng, depot.lat])
          .addTo(mapInstance);

        depotMarkers.current.push(marker);
      });
    }, [mapLoaded, depotLocations, isDark]);

    // Build GeoJSON FeatureCollection from filtered assets
    const assetGeoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => ({
      type: 'FeatureCollection',
      features: filteredAssets.map((asset) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [asset.longitude, asset.latitude],
        },
        properties: {
          id: asset.id,
          assetNumber: asset.assetNumber,
          status: asset.status,
          category: asset.category,
          subtype: asset.subtype,
          depot: asset.depot ?? '',
          lastUpdated: asset.lastUpdated ?? '',
        },
      })),
    }), [filteredAssets]);

    // Helper: add the asset-dots source + layer to the current map
    const addAssetLayer = useCallback((mapInstance: mapboxgl.Map, dark: boolean) => {
      const colors = dark ? STATUS_COLORS : LIGHT_THEME_COLORS;
      const defaultColor = dark ? '#6b7280' : '#4b5563';

      if (!mapInstance.getSource('asset-dots')) {
        mapInstance.addSource('asset-dots', {
          type: 'geojson',
          data: assetGeoJson,
        });
      }

      if (!mapInstance.getLayer('asset-dots-layer')) {
        mapInstance.addLayer({
          id: 'asset-dots-layer',
          type: 'circle',
          source: 'asset-dots',
          paint: {
            'circle-radius': 6,
            'circle-color': [
              'match',
              ['get', 'status'],
              'serviced', colors['serviced'],
              'maintenance', colors['maintenance'],
              'out_of_service', colors['out_of_service'],
              defaultColor,
            ],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': dark
              ? 'rgba(255,255,255,0.35)'
              : 'rgba(0,0,0,0.25)',
          },
        });
      }

      // Pulse ring layer for hovered asset
      const emptyGeoJson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
      if (!mapInstance.getSource('asset-pulse')) {
        mapInstance.addSource('asset-pulse', { type: 'geojson', data: emptyGeoJson });
      }
      if (!mapInstance.getLayer('asset-pulse-layer')) {
        mapInstance.addLayer({
          id: 'asset-pulse-layer',
          type: 'circle',
          source: 'asset-pulse',
          paint: {
            'circle-radius': 20,
            'circle-color': 'transparent',
            'circle-stroke-width': 2,
            'circle-stroke-color': dark
              ? 'rgba(255,255,255,0.6)'
              : 'rgba(0,0,0,0.4)',
            'circle-stroke-opacity': 0.8,
          },
        }, 'asset-dots-layer'); // render below dots
      }
    }, [assetGeoJson]);

    // Update asset dots source + layer when data or theme changes
    useEffect(() => {
      if (!map.current || !mapLoaded) return;

      const mapInstance = map.current;

      // If source already exists, just update the data
      const existingSource = mapInstance.getSource('asset-dots') as mapboxgl.GeoJSONSource | undefined;
      if (existingSource) {
        existingSource.setData(assetGeoJson);

        // Update paint properties for theme change
        if (mapInstance.getLayer('asset-dots-layer')) {
          const colors = isDark ? STATUS_COLORS : LIGHT_THEME_COLORS;
          const defaultColor = isDark ? '#6b7280' : '#4b5563';

          mapInstance.setPaintProperty('asset-dots-layer', 'circle-color', [
            'match',
            ['get', 'status'],
            'serviced', colors['serviced'],
            'maintenance', colors['maintenance'],
            'out_of_service', colors['out_of_service'],
            defaultColor,
          ]);
          mapInstance.setPaintProperty(
            'asset-dots-layer',
            'circle-stroke-color',
            isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'
          );
        }
      } else {
        // First time: create source + layer
        addAssetLayer(mapInstance, isDark);
      }
    }, [assetGeoJson, mapLoaded, isDark, addAssetLayer]);

    // Interactive handlers for the circle layer (click, hover)
    useEffect(() => {
      if (!map.current || !mapLoaded) return;

      const mapInstance = map.current;

      // Lazily create a single reusable popup + React root for hover
      if (!hoverPopup.current) {
        const popupContainer = document.createElement('div');
        hoverPopup.current = new mapboxgl.Popup({
          offset: [0, -10],
          closeButton: false,
          closeOnClick: false,
          className: 'asset-hover-popup',
          maxWidth: 'none',
        }).setDOMContent(popupContainer);
        hoverPopupRoot.current = createRoot(popupContainer);
      }

      const onClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;

        const assetId = feature.properties?.['id'] as string;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

        handleAssetClick(assetId);
        mapInstance.flyTo({
          center: coords,
          zoom: 14,
          duration: 1500,
          essential: true,
        });
      };

      const onMouseEnter = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) => {
        mapInstance.getCanvas().style.cursor = 'pointer';

        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;

        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const props = feature.properties!;
        const statusColor = (isDark ? STATUS_COLORS : LIGHT_THEME_COLORS)[props['status'] as string] || '#6b7280';

        hoverPopupRoot.current?.render(
          <AssetHoverCard
            asset={{ name: props['assetNumber'] as string, status: props['status'] as string }}
            isDark={isDark}
          />
        );

        hoverPopup.current!
          .setLngLat(coords)
          .addTo(mapInstance);

        // Set pulse source to hovered feature
        const pulseSource = mapInstance.getSource('asset-pulse') as mapboxgl.GeoJSONSource | undefined;
        if (pulseSource) {
          pulseSource.setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: coords },
              properties: {},
            }],
          });
        }

        // Animate pulse ring
        if (pulseAnimFrame.current) cancelAnimationFrame(pulseAnimFrame.current);
        const startTime = performance.now();
        const animate = () => {
          const elapsed = (performance.now() - startTime) % 1500;
          const t = elapsed / 1500;
          const radius = 10 + t * 40;
          const opacity = 1 - t;

          if (mapInstance.getLayer('asset-pulse-layer')) {
            mapInstance.setPaintProperty('asset-pulse-layer', 'circle-radius', radius);
            mapInstance.setPaintProperty('asset-pulse-layer', 'circle-stroke-opacity', opacity * 0.8);
            mapInstance.setPaintProperty('asset-pulse-layer', 'circle-stroke-color', statusColor);
          }
          pulseAnimFrame.current = requestAnimationFrame(animate);
        };
        pulseAnimFrame.current = requestAnimationFrame(animate);
      };

      const onMouseLeave = () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.current?.remove();

        // Stop pulse animation and clear source
        if (pulseAnimFrame.current) {
          cancelAnimationFrame(pulseAnimFrame.current);
          pulseAnimFrame.current = null;
        }
        const pulseSource = mapInstance.getSource('asset-pulse') as mapboxgl.GeoJSONSource | undefined;
        if (pulseSource) {
          pulseSource.setData({ type: 'FeatureCollection', features: [] });
        }
      };

      mapInstance.on('click', 'asset-dots-layer', onClick);
      mapInstance.on('mouseenter', 'asset-dots-layer', onMouseEnter);
      mapInstance.on('mouseleave', 'asset-dots-layer', onMouseLeave);

      return () => {
        if (pulseAnimFrame.current) {
          cancelAnimationFrame(pulseAnimFrame.current);
          pulseAnimFrame.current = null;
        }
        mapInstance.off('click', 'asset-dots-layer', onClick);
        mapInstance.off('mouseenter', 'asset-dots-layer', onMouseEnter);
        mapInstance.off('mouseleave', 'asset-dots-layer', onMouseLeave);
      };
    }, [mapLoaded, isDark, handleAssetClick]);

    // Update theme
    useEffect(() => {
      if (!map.current || !mapLoaded) return;

      const mapInstance = map.current;

      const styleUrl = isDark
        ? import.meta.env['VITE_MAPBOX_STYLE_DARK'] || 'mapbox://styles/mapbox/dark-v11'
        : import.meta.env['VITE_MAPBOX_STYLE_LIGHT'] || 'mapbox://styles/mapbox/light-v11';

      // Only call setStyle when the URL actually changes (skip on initial load)
      if (styleUrl !== currentStyleUrl.current) {
        currentStyleUrl.current = styleUrl;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mapbox GL typings lack `diff` option on setStyle
        mapInstance.setStyle(styleUrl, { diff: false } as any);

        // Re-add GeoJSON layer after the new style finishes loading
        const onStyleLoad = () => {
          addAssetLayer(mapInstance, isDark);
          mapInstance.off('style.load', onStyleLoad);
        };
        mapInstance.on('style.load', onStyleLoad);
      }

    }, [isDark, mapLoaded, addAssetLayer]);

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
        .mapboxgl-marker {
          pointer-events: none !important;
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
