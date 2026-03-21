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

import { registerAssetIcons } from './assetMarkerIcons';
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

/**
 * Neon-bright pulse ring colors per status (more vivid for the expanding ring effect)
 */
const PULSE_COLORS: Record<string, string> = {
  serviced: '#39ffce',      // bright neon green
  maintenance: '#ffe14d',   // bright neon yellow-amber
  out_of_service: '#ff5577', // bright neon red-pink
};
const LIGHT_PULSE_COLORS: Record<string, string> = {
  serviced: '#00ffaa',      // bright neon green (light bg)
  maintenance: '#ffc400',   // bright neon amber (light bg)
  out_of_service: '#ff4466', // bright neon red (light bg)
};

/**
 * Category colors for dot fill (trailer vs dolly)
 */
const CATEGORY_COLORS: Record<string, string> = {
  trailer: '#00e5ff',   // neon cyan
  dolly:   '#e040fb',   // neon purple
};
const LIGHT_CATEGORY_COLORS: Record<string, string> = {
  trailer: '#00bcd4',   // neon cyan (slightly deeper for light bg)
  dolly:   '#d500f9',   // neon purple (slightly deeper for light bg)
};

const DEFAULT_DEPOT_COLOR = '#9ca3af';

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}


/** Brighten a hex color by mixing toward white. amount 0-1 (0 = unchanged, 1 = white) */
function brightenHex(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const br = Math.round(r + (255 - r) * amount);
  const bg = Math.round(g + (255 - g) * amount);
  const bb = Math.round(b + (255 - b) * amount);
  return `#${br.toString(16).padStart(2, '0')}${bg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
}

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
    const depotPulseAnimFrame = useRef<number | null>(null);
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
          ? import.meta.env['VITE_MAPBOX_STYLE_DARK'] || 'mapbox://styles/mapbox/standard'
          : import.meta.env['VITE_MAPBOX_STYLE_LIGHT'] || 'mapbox://styles/mapbox/standard';

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
        const roots = [...depotPopupRoots.current];
        depotPopupRoots.current = [];
        const popupRoot = hoverPopupRoot.current;
        hoverPopupRoot.current = null;
        // Defer unmounts to avoid "synchronously unmount during render" warning
        queueMicrotask(() => {
          roots.forEach(({ root }) => root.unmount());
          popupRoot?.unmount();
        });
        depotMarkers.current.forEach((marker) => marker.remove());
        depotMarkers.current = [];
        hoverPopup.current?.remove();
        hoverPopup.current = null;
        if (depotPulseAnimFrame.current) {
          cancelAnimationFrame(depotPulseAnimFrame.current);
          depotPulseAnimFrame.current = null;
        }
        if (depotRadiusPulseRef.current) {
          cancelAnimationFrame(depotRadiusPulseRef.current);
          depotRadiusPulseRef.current = null;
        }
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onMapLoad]);

    // Count assets per depot (for badge on pin label)
    const depotAssetCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      for (const asset of filteredAssets) {
        if (asset.depot) counts[asset.depot] = (counts[asset.depot] || 0) + 1;
      }
      return counts;
    }, [filteredAssets]);

    // Group asset numbers by depot (for hover card)
    const depotAssetNumbers = useMemo(() => {
      const groups: Record<string, string[]> = {};
      for (const asset of filteredAssets) {
        if (asset.depot) {
          if (!groups[asset.depot]) groups[asset.depot] = [];
          groups[asset.depot].push(asset.assetNumber);
        }
      }
      return groups;
    }, [filteredAssets]);

    // Add depot markers when map is loaded and depot data is available
    useEffect(() => {
      if (!map.current || !mapLoaded || depotLocations.length === 0) return;

      // Clear existing depot markers
      const oldRoots = [...depotPopupRoots.current];
      depotPopupRoots.current = [];
      queueMicrotask(() => oldRoots.forEach(({ root }) => root.unmount()));
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
        const count = depotAssetCounts[depot.name] || 0;
        const assetNums = depotAssetNumbers[depot.name] || [];

        // Render PinContainer (React 3D pin) into a DOM element for Mapbox
        const el = document.createElement('div');
        el.style.cssText = `z-index:${z}; pointer-events:none;`;
        const pinRoot = createRoot(el);
        const depotName = depot.name;
        pinRoot.render(
          <PinContainer
            title={depotName}
            color={depotColor}
            assetCount={count}
            assetNumbers={assetNums}
            onHoverChange={(h) => h ? startDepotPulse.current?.(depotName) : stopDepotPulse.current?.()}
          />
        );
        depotPopupRoots.current.push({ root: pinRoot, depot });

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center', offset: [0, -14] })
          .setLngLat([depot.lng, depot.lat])
          .addTo(mapInstance);

        depotMarkers.current.push(marker);
      });
    }, [mapLoaded, depotLocations, isDark, depotAssetCounts, depotAssetNumbers]);

    // Keep badge counts in sync with filtered data
    useEffect(() => {
      depotPopupRoots.current.forEach(({ root, depot }) => {
        const depotColor = isValidHexColor(depot.color) ? depot.color : DEFAULT_DEPOT_COLOR;
        const count = depotAssetCounts[depot.name] || 0;
        const assetNums = depotAssetNumbers[depot.name] || [];
        const depotName = depot.name;
        root.render(
          <PinContainer
            title={depotName}
            color={depotColor}
            assetCount={count}
            assetNumbers={assetNums}
            onHoverChange={(h) => h ? startDepotPulse.current?.(depotName) : stopDepotPulse.current?.()}
          />
        );
      });
    }, [depotAssetCounts, depotAssetNumbers]);

    // Compute max asset radius in meters per depot (for pulse wave)
    const depotRadiusData = useMemo(() => {
      const data: Array<{ depot: DepotLocation; radiusM: number; color: string }> = [];
      for (const depot of depotLocations) {
        const depotColor = isValidHexColor(depot.color) ? depot.color : DEFAULT_DEPOT_COLOR;
        const depotAssets = filteredAssets.filter((a) => a.depot === depot.name);
        if (depotAssets.length === 0) continue;

        let maxDist = 5; // min 5km
        for (const asset of depotAssets) {
          const d = haversineKm(depot.lat, depot.lng, asset.latitude, asset.longitude);
          if (d > maxDist) maxDist = d;
        }
        data.push({ depot, radiusM: maxDist * 1100, color: depotColor }); // km * 1.1 padding * 1000 = meters
      }
      return data;
    }, [filteredAssets, depotLocations]);

    // Depot radius pulse ref (started/stopped on depot hover)
    const depotRadiusPulseRef = useRef<number | null>(null);

    // Stable refs for depot pulse start/stop — callable from both Mapbox hitbox and PinContainer DOM hover
    const startDepotPulse = useRef<((depotName: string) => void) | null>(null);
    const stopDepotPulse = useRef<(() => void) | null>(null);

    // Depot pulse rings — hover-triggered pulsating circles flat on the map
    useEffect(() => {
      if (!map.current || !mapLoaded || depotLocations.length === 0) return;
      const mapInstance = map.current;

      const setupDepotPulse = () => {
      const emptyGeo: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

      // GeoJSON source for all depot points (used by hitbox layer)
      const depotPointsGeoJson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: 'FeatureCollection',
        features: depotLocations.map((depot) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [depot.lng, depot.lat] },
          properties: { color: isValidHexColor(depot.color) ? depot.color : DEFAULT_DEPOT_COLOR },
        })),
      };

      if (!mapInstance.getSource('depot-points')) {
        mapInstance.addSource('depot-points', { type: 'geojson', data: depotPointsGeoJson });
      } else {
        (mapInstance.getSource('depot-points') as mapboxgl.GeoJSONSource).setData(depotPointsGeoJson);
      }

      // Invisible hitbox for depot hover detection
      if (!mapInstance.getLayer('depot-hitbox-layer')) {
        mapInstance.addLayer({
          id: 'depot-hitbox-layer',
          type: 'circle',
          source: 'depot-points',
          slot: 'top',
          paint: {
            'circle-radius': 24,
            'circle-color': 'transparent',
            'circle-opacity': 0,
          },
        });
      }

      // Single-point source for the hovered depot pulse
      if (!mapInstance.getSource('depot-pulse')) {
        mapInstance.addSource('depot-pulse', { type: 'geojson', data: emptyGeo });
      }

      const beforeLayer = mapInstance.getLayer('asset-dots-layer') ? 'asset-dots-layer' : undefined;

      // Two staggered small pulse rings (base of pin)
      for (const layerId of ['depot-pulse-ring-1', 'depot-pulse-ring-2']) {
        if (!mapInstance.getLayer(layerId)) {
          mapInstance.addLayer({
            id: layerId,
            type: 'circle',
            source: 'depot-pulse',
            slot: 'top',
            paint: {
              'circle-pitch-alignment': 'map',
              'circle-radius': 8,
              'circle-color': ['coalesce', ['get', 'color'], '#9ca3af'],
              'circle-opacity': 0,
              'circle-stroke-width': 2,
              'circle-stroke-color': ['coalesce', ['get', 'color'], '#9ca3af'],
              'circle-stroke-opacity': 0,
            },
          }, beforeLayer);
        }
      }

      // Two staggered radius wave rings (expand to asset boundary)
      for (const layerId of ['depot-radius-wave-1', 'depot-radius-wave-2']) {
        if (!mapInstance.getLayer(layerId)) {
          mapInstance.addLayer({
            id: layerId,
            type: 'circle',
            source: 'depot-pulse',
            slot: 'top',
            paint: {
              'circle-pitch-alignment': 'map',
              'circle-radius': 1,
              'circle-color': ['coalesce', ['get', 'color'], '#9ca3af'],
              'circle-opacity': 0,
              'circle-stroke-width': 2,
              'circle-stroke-color': ['coalesce', ['get', 'color'], '#9ca3af'],
              'circle-stroke-opacity': 0,
            },
          }, beforeLayer);
        }
      }

      /** Convert meters to pixels at a given lat/zoom */
      const metersToPixels = (meters: number, lat: number, zoom: number) => {
        const metersPerPixel = (156543.03392 * Math.cos(lat * Math.PI / 180)) / Math.pow(2, zoom);
        return meters / metersPerPixel;
      };

      // Shared start/stop pulse logic — callable from Mapbox hitbox OR PinContainer DOM hover
      const triggerPulseForDepot = (depotName: string) => {
        const depotData = depotRadiusData.find((d) => d.depot.name === depotName);
        if (!depotData) return;

        const { depot, radiusM, color: rawColor } = depotData;
        const coords: [number, number] = [depot.lng, depot.lat];
        const color = brightenHex(rawColor, 0.8);
        const depotLat = depot.lat;

        const pulseSource = mapInstance.getSource('depot-pulse') as mapboxgl.GeoJSONSource | undefined;
        if (pulseSource) {
          pulseSource.setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: coords },
              properties: { color },
            }],
          });
        }

        // Start both animations
        if (depotPulseAnimFrame.current) cancelAnimationFrame(depotPulseAnimFrame.current);
        if (depotRadiusPulseRef.current) cancelAnimationFrame(depotRadiusPulseRef.current);
        const startTime = performance.now();

        // Small base pulse
        const baseDuration = 2500;
        const baseMaxRadius = 75;
        const baseMinRadius = 8;

        const animateBase = () => {
          const now = performance.now();
          for (let i = 0; i < 2; i++) {
            const lid = `depot-pulse-ring-${i + 1}`;
            if (!mapInstance.getLayer(lid)) continue;
            const t = (((now - startTime) / baseDuration + i * 0.5) % 1);
            const radius = baseMinRadius + t * (baseMaxRadius - baseMinRadius);
            const fadeOut = 1 - t;

            mapInstance.setPaintProperty(lid, 'circle-radius', radius);
            mapInstance.setPaintProperty(lid, 'circle-stroke-opacity', fadeOut * 0.6);
            mapInstance.setPaintProperty(lid, 'circle-stroke-width', 2 - t * 1.2);
            const fillOpacity = fadeOut * t * 0.35;
            mapInstance.setPaintProperty(lid, 'circle-opacity', fillOpacity);
          }
          depotPulseAnimFrame.current = requestAnimationFrame(animateBase);
        };
        depotPulseAnimFrame.current = requestAnimationFrame(animateBase);

        // Radius wave expanding to asset boundary
        const waveDuration = 3000;
        const animateWave = () => {
          if (!map.current) return;
          const now = performance.now();
          const zoom = mapInstance.getZoom();
          const maxRadiusPx = metersToPixels(radiusM, depotLat, zoom);

          for (let i = 0; i < 2; i++) {
            const lid = `depot-radius-wave-${i + 1}`;
            if (!mapInstance.getLayer(lid)) continue;
            const t = (((now - startTime) / waveDuration + i * 0.5) % 1);
            const radius = t * maxRadiusPx;
            const fadeOut = 1 - t;

            mapInstance.setPaintProperty(lid, 'circle-radius', radius);
            mapInstance.setPaintProperty(lid, 'circle-stroke-opacity', fadeOut * 0.85);
            mapInstance.setPaintProperty(lid, 'circle-stroke-width', 3 - t * 1.5);
            mapInstance.setPaintProperty(lid, 'circle-opacity', fadeOut * t * 0.3);
          }
          depotRadiusPulseRef.current = requestAnimationFrame(animateWave);
        };
        depotRadiusPulseRef.current = requestAnimationFrame(animateWave);
      };

      const clearPulse = () => {
        if (depotPulseAnimFrame.current) {
          cancelAnimationFrame(depotPulseAnimFrame.current);
          depotPulseAnimFrame.current = null;
        }
        if (depotRadiusPulseRef.current) {
          cancelAnimationFrame(depotRadiusPulseRef.current);
          depotRadiusPulseRef.current = null;
        }
        const pulseSource = mapInstance.getSource('depot-pulse') as mapboxgl.GeoJSONSource | undefined;
        if (pulseSource) {
          pulseSource.setData(emptyGeo);
        }
      };

      // Expose to PinContainer DOM hover via refs
      startDepotPulse.current = triggerPulseForDepot;
      stopDepotPulse.current = clearPulse;

      // Mapbox hitbox handlers — resolve depot name from coordinates
      const onDepotEnter = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }) => {
        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;
        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const match = depotRadiusData.find(
          (d) => Math.abs(d.depot.lng - coords[0]) < 0.001 && Math.abs(d.depot.lat - coords[1]) < 0.001
        );
        if (match) triggerPulseForDepot(match.depot.name);
      };

      const onDepotLeave = () => clearPulse();

      mapInstance.on('mouseenter', 'depot-hitbox-layer', onDepotEnter);
      mapInstance.on('mouseleave', 'depot-hitbox-layer', onDepotLeave);

      return () => {
        if (depotPulseAnimFrame.current) {
          cancelAnimationFrame(depotPulseAnimFrame.current);
          depotPulseAnimFrame.current = null;
        }
        if (depotRadiusPulseRef.current) {
          cancelAnimationFrame(depotRadiusPulseRef.current);
          depotRadiusPulseRef.current = null;
        }
        mapInstance.off('mouseenter', 'depot-hitbox-layer', onDepotEnter);
        mapInstance.off('mouseleave', 'depot-hitbox-layer', onDepotLeave);
      };
      }; // end setupDepotPulse

      return setupDepotPulse();
    }, [mapLoaded, depotLocations, depotRadiusData, isDark]);

    // Build GeoJSON FeatureCollection from filtered assets (exclude depot-counted assets)
    const assetGeoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => ({
      type: 'FeatureCollection',
      features: filteredAssets
        .filter((asset) => !asset.depot)
        .map((asset) => ({
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

    // Helper: add the asset-dots source + circle layer + flag layer to the current map
    const addAssetLayer = useCallback((mapInstance: mapboxgl.Map, dark: boolean) => {
      console.log('[FleetMap] addAssetLayer called', { dark, features: assetGeoJson.features.length });
      // Register flag icon for symbol layer
      registerAssetIcons(mapInstance, dark);

      const statusColors = dark ? STATUS_COLORS : LIGHT_THEME_COLORS;
      const categoryColors = dark ? CATEGORY_COLORS : LIGHT_CATEGORY_COLORS;
      const defaultFill = dark ? '#6b7280' : '#4b5563';
      const defaultStroke = dark ? '#6b7280' : '#4b5563';

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
          slot: 'top',

          paint: {
            'circle-pitch-alignment': 'map',
            'circle-radius': [
              'match',
              ['get', 'category'],
              'trailer', 7,
              'dolly', 5.5,
              6,
            ],
            'circle-color': [
              'match',
              ['get', 'category'],
              'trailer', categoryColors['trailer'],
              'dolly', categoryColors['dolly'],
              defaultFill,
            ],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': [
              'match',
              ['get', 'category'],
              'trailer', categoryColors['trailer'],
              'dolly', categoryColors['dolly'],
              defaultStroke,
            ],
            'circle-opacity': 1,
          },
        });
      }

      // Flag pennant extending upward from each dot
      if (!mapInstance.getLayer('asset-flags-layer')) {
        mapInstance.addLayer({
          id: 'asset-flags-layer',
          type: 'symbol',
          source: 'asset-dots',
          slot: 'top',

          layout: {
            'icon-image': [
              'match',
              ['get', 'category'],
              'trailer', 'trailer-pin',
              'dolly', 'dolly-pin',
              'trailer-pin',
            ],
            'icon-size': 0.9,
            'icon-anchor': 'bottom',
            'icon-offset': [0, -4],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-pitch-alignment': 'viewport',
            'icon-rotation-alignment': 'viewport',
          },
        });
      }

      // Invisible circle hitbox layer on top for mouse events (large radius for easy targeting)
      if (!mapInstance.getLayer('asset-hitbox-layer')) {
        mapInstance.addLayer({
          id: 'asset-hitbox-layer',
          type: 'circle',
          source: 'asset-dots',
          slot: 'top',
          paint: {
            'circle-radius': 20,
            'circle-color': 'transparent',
            'circle-opacity': 0,
          },
        });
      }

      // Hover pin layer — shows tall needle for hovered asset
      const emptyGeoJson: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
      if (!mapInstance.getSource('asset-hover-pin')) {
        mapInstance.addSource('asset-hover-pin', { type: 'geojson', data: emptyGeoJson });
      }
      if (!mapInstance.getLayer('asset-hover-pin-layer')) {
        mapInstance.addLayer({
          id: 'asset-hover-pin-layer',
          type: 'symbol',
          source: 'asset-hover-pin',
          slot: 'top',
          layout: {
            'icon-image': [
              'match',
              ['get', 'category'],
              'trailer', 'trailer-pin-hover',
              'dolly', 'dolly-pin-hover',
              'trailer-pin-hover',
            ],
            'icon-size': 0.9,
            'icon-anchor': 'bottom',
            'icon-offset': [0, -4],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-pitch-alignment': 'viewport',
            'icon-rotation-alignment': 'viewport',
          },
        });
      }

      // Pulse ring layer for hovered asset
      if (!mapInstance.getSource('asset-pulse')) {
        mapInstance.addSource('asset-pulse', { type: 'geojson', data: emptyGeoJson });
      }
      if (!mapInstance.getLayer('asset-pulse-layer')) {
        mapInstance.addLayer({
          id: 'asset-pulse-layer',
          type: 'circle',
          source: 'asset-pulse',
          slot: 'top',
          paint: {
            'circle-pitch-alignment': 'map',
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

      const applyAssetData = () => {
        console.log('[FleetMap] applyAssetData called', {
          featureCount: assetGeoJson.features.length,
          styleLoaded: mapInstance.isStyleLoaded(),
          hasSource: !!mapInstance.getSource('asset-dots'),
          hasLayer: !!mapInstance.getLayer('asset-dots-layer'),
        });
        // If source already exists, just update the data
        const existingSource = mapInstance.getSource('asset-dots') as mapboxgl.GeoJSONSource | undefined;
        if (existingSource) {
          existingSource.setData(assetGeoJson);

          // Update paint properties for theme change
          if (mapInstance.getLayer('asset-dots-layer')) {
            const categoryColors = isDark ? CATEGORY_COLORS : LIGHT_CATEGORY_COLORS;
            const defaultFill = isDark ? '#6b7280' : '#4b5563';
            const defaultStroke = isDark ? '#6b7280' : '#4b5563';

            mapInstance.setPaintProperty('asset-dots-layer', 'circle-color', [
              'match',
              ['get', 'category'],
              'trailer', categoryColors['trailer'],
              'dolly', categoryColors['dolly'],
              defaultFill,
            ]);
            mapInstance.setPaintProperty('asset-dots-layer', 'circle-stroke-color', [
              'match',
              ['get', 'category'],
              'trailer', categoryColors['trailer'],
              'dolly', categoryColors['dolly'],
              defaultStroke,
            ]);
          }

          // Re-register flag icon with updated theme colors
          registerAssetIcons(mapInstance, isDark);
        } else {
          // First time: create source + layer
          addAssetLayer(mapInstance, isDark);
        }
      };

      applyAssetData();
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
        const pulseColor = (isDark ? PULSE_COLORS : LIGHT_PULSE_COLORS)[props['status'] as string] || '#6b7280';

        hoverPopupRoot.current?.render(
          <AssetHoverCard
            asset={{ name: props['assetNumber'] as string, status: props['status'] as string }}
            isDark={isDark}
          />
        );

        hoverPopup.current!
          .setLngLat(coords)
          .addTo(mapInstance);

        // Show tall hover pin for this feature (start at zero size for grow animation)
        const hoverPinSource = mapInstance.getSource('asset-hover-pin') as mapboxgl.GeoJSONSource | undefined;
        if (hoverPinSource) {
          mapInstance.setLayoutProperty('asset-hover-pin-layer', 'icon-size', 0.01);
          hoverPinSource.setData({
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: coords },
              properties: { category: props['category'] as string },
            }],
          });
        }

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

        // Animate pulse ring + smooth hover pin grow-in
        if (pulseAnimFrame.current) cancelAnimationFrame(pulseAnimFrame.current);
        const startTime = performance.now();
        const pinGrowDuration = 250; // ms for the pin to reach full size
        const targetPinSize = 0.9;
        const animate = () => {
          const now = performance.now();
          const elapsed = (now - startTime) % 1500;
          const t = elapsed / 1500;
          const radius = 10 + t * 40;
          const opacity = 1 - t;

          if (mapInstance.getLayer('asset-pulse-layer')) {
            mapInstance.setPaintProperty('asset-pulse-layer', 'circle-radius', radius);
            mapInstance.setPaintProperty('asset-pulse-layer', 'circle-stroke-opacity', opacity * 0.8);
            mapInstance.setPaintProperty('asset-pulse-layer', 'circle-stroke-color', 'rgba(255,255,255,0.9)');
            // Fill the circle — blooms in then fades out
            const fillOpacity = opacity * t * 0.4;
            mapInstance.setPaintProperty('asset-pulse-layer', 'circle-color', 'rgba(255,255,255,0.9)');
            mapInstance.setPaintProperty('asset-pulse-layer', 'circle-opacity', fillOpacity);
          }

          // Ease-out grow animation for hover pin
          const growElapsed = now - startTime;
          if (growElapsed < pinGrowDuration && mapInstance.getLayer('asset-hover-pin-layer')) {
            const gt = Math.min(growElapsed / pinGrowDuration, 1);
            // Ease-out cubic: decelerates into final position
            const eased = 1 - Math.pow(1 - gt, 3);
            mapInstance.setLayoutProperty('asset-hover-pin-layer', 'icon-size', eased * targetPinSize);
          } else if (growElapsed >= pinGrowDuration && growElapsed < pinGrowDuration + 20) {
            // Snap to final size once
            mapInstance.setLayoutProperty('asset-hover-pin-layer', 'icon-size', targetPinSize);
          }

          pulseAnimFrame.current = requestAnimationFrame(animate);
        };
        pulseAnimFrame.current = requestAnimationFrame(animate);
      };

      const onMouseLeave = () => {
        mapInstance.getCanvas().style.cursor = '';
        hoverPopup.current?.remove();

        // Clear hover pin
        const hoverPinSource = mapInstance.getSource('asset-hover-pin') as mapboxgl.GeoJSONSource | undefined;
        if (hoverPinSource) {
          hoverPinSource.setData({ type: 'FeatureCollection', features: [] });
        }

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

      mapInstance.on('click', 'asset-hitbox-layer', onClick);
      mapInstance.on('mouseenter', 'asset-hitbox-layer', onMouseEnter);
      mapInstance.on('mouseleave', 'asset-hitbox-layer', onMouseLeave);

      return () => {
        if (pulseAnimFrame.current) {
          cancelAnimationFrame(pulseAnimFrame.current);
          pulseAnimFrame.current = null;
        }
        mapInstance.off('click', 'asset-hitbox-layer', onClick);
        mapInstance.off('mouseenter', 'asset-hitbox-layer', onMouseEnter);
        mapInstance.off('mouseleave', 'asset-hitbox-layer', onMouseLeave);
      };
    }, [mapLoaded, isDark, handleAssetClick]);

    // Update theme
    useEffect(() => {
      if (!map.current || !mapLoaded) return;

      const mapInstance = map.current;

      const styleUrl = isDark
        ? import.meta.env['VITE_MAPBOX_STYLE_DARK'] || 'mapbox://styles/mapbox/standard'
        : import.meta.env['VITE_MAPBOX_STYLE_LIGHT'] || 'mapbox://styles/mapbox/standard';

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
