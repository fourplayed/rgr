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

/** Shared route animation state — written by FleetMapWithData, read by FilterSidebar */
export const routeAnimState = {
  totalDistanceKm: 0,
  /** Current distance covered by the dot (km) — live counting */
  currentDistanceKm: 0,
  /** Whether animation is active */
  active: false,
  /** Whether on return leg */
  returning: false,
};
import { PinContainer } from '@/components/ui/PinContainer';

import { registerAssetIcons } from './assetMarkerIcons';
import { RGR_COLORS } from '@/styles/color-palette';
import type { DepotLocation } from '@/constants/fleetMap';
import type { AssetLocation } from '@/hooks/useFleetData';
import { useDepots } from '@/hooks/useAssetData';
import { isValidHexColor } from '@rgr/shared';
import type { Depot } from '@rgr/shared';
import type { DepotAsset } from './depotTypes';
import { DepotClusterTooltip } from './DepotClusterTooltip';
import { DepotAssetPanel } from './DepotAssetPanel';
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

const _STATUS_COLORS: Record<string, string> = {
  serviced: '#10b981',
  maintenance: '#f59e0b',
  out_of_service: '#ef4444',
};

/**
 * Category colors for dot fill (trailer vs dolly)
 */
const CATEGORY_COLORS: Record<string, string> = {
  trailer: '#00e5ff', // neon cyan
  dolly: '#e040fb', // neon purple
};
const LIGHT_CATEGORY_COLORS: Record<string, string> = {
  trailer: '#00bcd4', // neon cyan (slightly deeper for light bg)
  dolly: '#d500f9', // neon purple (slightly deeper for light bg)
};

const DEFAULT_DEPOT_COLOR = '#9ca3af';

/** Haversine distance in km between two lat/lng points */
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
    const [hoveredDepot, setHoveredDepot] = useState<string | null>(null);
    const depotPopupRoots = useRef<
      Array<{ root: ReturnType<typeof createRoot>; depot: DepotLocation }>
    >([]);
    const currentStyleUrl = useRef<string | null>(null);
    const initialIsDark = useRef(isDark);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [activeDepot, _setActiveDepot] = useState<string | null>(null);
    const [tooltipDepot, setTooltipDepot] = useState<{
      name: string;
      color: string;
      assets: DepotAsset[];
      position: { x: number; y: number };
    } | null>(null);
    const [explorePanelDepot, setExplorePanelDepot] = useState<{
      name: string;
      color: string;
      assets: DepotAsset[];
    } | null>(null);

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

        // Resize map when container dimensions change (e.g. sidebar toggle)
        const container = mapContainer.current;
        if (container) {
          const resizeObserver = new ResizeObserver(() => {
            mapInstance.resize();
          });
          resizeObserver.observe(container);
          // Clean up observer on unmount
          const originalCleanup = () => resizeObserver.disconnect();
          mapInstance.on('remove', originalCleanup);
        }
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

    // Group full asset data by depot (for depot popup panel)
    const depotAssets = useMemo(() => {
      const groups: Record<string, DepotAsset[]> = {};
      for (const asset of filteredAssets) {
        if (asset.depot && asset.latitude != null && asset.longitude != null) {
          const key = asset.depot;
          if (!groups[key]) groups[key] = [];
          groups[key]!.push({
            id: asset.id,
            assetNumber: asset.assetNumber,
            category: asset.category,
            status: asset.status,
            latitude: asset.latitude,
            longitude: asset.longitude,
          });
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

      depotLocations.forEach((depot: DepotLocation, idx) => {
        const depotColor = isValidHexColor(depot.color) ? depot.color : DEFAULT_DEPOT_COLOR;
        const z = depotZIndex[depot.name] ?? 10;
        const count = depotAssetCounts[depot.name] || 0;
        const _assets = depotAssets[depot.name] || [];

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
            isDark={isDark}
            isHovered={false}
            onClusterClick={() => {
              const marker = depotMarkers.current[idx];
              if (!marker || !map.current) return;
              const pos = map.current.project(marker.getLngLat());
              setTooltipDepot({
                name: depotName,
                color: depotColor,
                assets: depotAssets[depotName] || [],
                position: { x: pos.x, y: pos.y },
              });
            }}
          />
        );
        depotPopupRoots.current.push({ root: pinRoot, depot });

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center', offset: [0, -14] })
          .setLngLat([depot.lng, depot.lat])
          .addTo(mapInstance);

        depotMarkers.current.push(marker);
      });
    }, [mapLoaded, depotLocations, isDark, depotAssetCounts, depotAssets]);

    // Keep badge counts and hover state in sync
    const filteredDepotNames = Array.isArray(filters.depot) ? filters.depot : [];
    useEffect(() => {
      depotPopupRoots.current.forEach(({ root, depot }, idx) => {
        const depotColor = isValidHexColor(depot.color) ? depot.color : DEFAULT_DEPOT_COLOR;
        const count = depotAssetCounts[depot.name] || 0;
        const depotName = depot.name;
        const isFiltered = filteredDepotNames.includes(depotName);
        root.render(
          <PinContainer
            title={depotName}
            color={depotColor}
            assetCount={count}
            isDark={isDark}
            isHovered={isFiltered || hoveredDepot === depotName}
            onClusterClick={() => {
              const marker = depotMarkers.current[idx];
              if (!marker || !map.current) return;
              const pos = map.current.project(marker.getLngLat());
              setTooltipDepot({
                name: depotName,
                color: depotColor,
                assets: depotAssets[depotName] || [],
                position: { x: pos.x, y: pos.y },
              });
            }}
          />
        );
      });
    }, [depotAssetCounts, depotAssets, activeDepot, isDark, hoveredDepot, filteredDepotNames]);

    // DOM-overlay pulsing rings — supports multiple simultaneous animations
    interface DepotAnim {
      depot: DepotLocation;
      color: string;
      phase: 'expanding' | 'steady' | 'collapsing';
      startTime: number;
      collapseStartTime: number;
      collapseFromRadius: number;
      pulseStartTime: number | null;
    }
    const depotAnimsRef = useRef<Map<string, DepotAnim>>(new Map());

    useEffect(() => {
      if (!map.current || !mapLoaded || !mapContainer.current) return;
      const mapInstance = map.current;
      const container = mapContainer.current;

      let canvas = container.querySelector('.depot-pulse-overlay') as HTMLCanvasElement | null;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'depot-pulse-overlay';
        canvas.style.cssText =
          'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:100;';
        container.appendChild(canvas);
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const MAX_RADIUS_KM = 60;
      const EXPAND_DURATION = 600;
      const COLLAPSE_DURATION = 350;
      const PULSE_FADE_IN = 600;
      const SEGMENTS = 64;
      const STROKE_WIDTH = 1.2;

      const geoCircle = (lat: number, lng: number, radiusKm: number): [number, number][] => {
        const points: [number, number][] = [];
        const R = 6371;
        for (let j = 0; j <= SEGMENTS; j++) {
          const angle = (j / SEGMENTS) * Math.PI * 2;
          const dLat = (radiusKm / R) * Math.cos(angle) * (180 / Math.PI);
          const dLng =
            ((radiusKm / R) * Math.sin(angle) * (180 / Math.PI)) / Math.cos((lat * Math.PI) / 180);
          points.push([lng + dLng, lat + dLat]);
        }
        return points;
      };

      const drawRing = (
        depot: DepotLocation,
        color: string,
        radiusKm: number,
        strokeAlpha: number,
        fillAlpha: number,
        lineWidth: number
      ) => {
        if (radiusKm < 0.1) return;
        const geoPoints = geoCircle(depot.lat, depot.lng, radiusKm);
        const screenPoints = geoPoints.map((p) => mapInstance.project(p as [number, number]));
        ctx.beginPath();
        screenPoints.forEach((sp, idx) => {
          if (idx === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        });
        ctx.closePath();
        if (fillAlpha > 0) {
          ctx.fillStyle = color;
          ctx.globalAlpha = fillAlpha;
          ctx.fill();
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.globalAlpha = strokeAlpha;
        ctx.stroke();
      };

      const animate = () => {
        if (!map.current || !canvas) return;
        const anims = depotAnimsRef.current;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);

        const now = performance.now();
        const toDelete: string[] = [];

        anims.forEach((anim, name) => {
          const { depot, color } = anim;

          if (anim.phase === 'expanding' || anim.phase === 'steady') {
            const elapsed = now - anim.startTime;
            const expandT = Math.min(elapsed / EXPAND_DURATION, 1);
            const easedT = 1 - Math.pow(1 - expandT, 3);
            const currentRadius = easedT * MAX_RADIUS_KM;

            // Main circle
            drawRing(depot, color, currentRadius, easedT, easedT * 0.08, STROKE_WIDTH);

            if (expandT >= 1) {
              anim.phase = 'steady';

              // Single pulse ring: expands outward from base, fades, then repeats
              const PULSE_CYCLE = 1600;
              const steadyElapsed = elapsed - EXPAND_DURATION;
              const cycleT = (steadyElapsed % PULSE_CYCLE) / PULSE_CYCLE;
              const easedCycleT = 1 - Math.pow(1 - cycleT, 2);
              const pulseRadius = MAX_RADIUS_KM + easedCycleT * 25;
              const pulseAlpha = (1 - easedCycleT) * 0.55;
              const pulseWidth = 2.5 - easedCycleT * 1.0;
              drawRing(depot, color, pulseRadius, pulseAlpha, 0, pulseWidth);
            }
          } else if (anim.phase === 'collapsing') {
            const collapseElapsed = now - anim.collapseStartTime;
            const collapseT = Math.min(collapseElapsed / COLLAPSE_DURATION, 1);
            const easedCollapse = collapseT * collapseT;
            const currentRadius = anim.collapseFromRadius * (1 - easedCollapse);
            const alpha = 1 - easedCollapse;

            drawRing(depot, color, currentRadius, alpha, alpha * 0.08, STROKE_WIDTH);

            if (collapseT >= 1) {
              toDelete.push(name);
            }
          }
        });

        toDelete.forEach((name) => anims.delete(name));

        ctx.globalAlpha = 1;
        depotPulseAnimFrame.current = requestAnimationFrame(animate);
      };

      if (!depotPulseAnimFrame.current) {
        depotPulseAnimFrame.current = requestAnimationFrame(animate);
      }

      const onMove = () => mapInstance.triggerRepaint();
      mapInstance.on('move', onMove);

      return () => {
        mapInstance.off('move', onMove);
      };
    }, [mapLoaded, depotLocations]);

    // Driving route between filtered depots — canvas-rendered glowing dot with tail
    const routeAnimFrame = useRef<number | null>(null);
    const routeCoordsRef = useRef<[number, number][]>([]);
    useEffect(() => {
      if (!map.current || !mapLoaded || !mapContainer.current) return;
      const mapInstance = map.current;
      const container = mapContainer.current;
      // Clean up animation
      if (routeAnimFrame.current) {
        cancelAnimationFrame(routeAnimFrame.current);
        routeAnimFrame.current = null;
      }

      // Clean up canvas
      const oldCanvas = container.querySelector('.route-dot-overlay') as HTMLCanvasElement | null;
      if (oldCanvas) oldCanvas.remove();

      const orderedDepots = filteredDepotNames
        .map((name) => depotLocations.find((d) => d.name === name))
        .filter(Boolean) as DepotLocation[];

      if (orderedDepots.length < 2) {
        routeCoordsRef.current = [];
        return;
      }

      const waypoints = orderedDepots.map((d) => `${d.lng},${d.lat}`).join(';');
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;

      let cancelled = false;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (cancelled || !map.current) return;
          const routeData = data.routes?.[0];
          const route = routeData?.geometry as GeoJSON.LineString | undefined;
          if (!route) return;

          const totalDistKm = (routeData.distance || 0) / 1000;
          routeAnimState.totalDistanceKm = totalDistKm;
          routeAnimState.active = true;
          routeAnimState.returning = false;
          routeAnimState.currentDistanceKm = 0;

          const coords = route.coordinates as [number, number][];
          routeCoordsRef.current = coords;

          // Wait for style if needed
          const setup = () => {
            if (cancelled || !map.current) return;

            // Canvas overlay for glowing dot + tail + route trail (renders ABOVE the map)
            const canvas = document.createElement('canvas');
            canvas.className = 'route-dot-overlay';
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:101;';
            container.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Pre-compute cumulative distances for interpolation
            const screenPts = () => coords.map((c) => mapInstance.project(c as [number, number]));
            const cumDist = (pts: { x: number; y: number }[]) => {
              const d = [0];
              for (let i = 1; i < pts.length; i++) {
                const dx = pts[i]!.x - pts[i - 1]!.x;
                const dy = pts[i]!.y - pts[i - 1]!.y;
                d.push(d[i - 1]! + Math.sqrt(dx * dx + dy * dy));
              }
              return d;
            };

            const lerpOnPath = (pts: { x: number; y: number }[], dists: number[], t: number) => {
              if (pts.length === 0) return { x: 0, y: 0 };
              if (pts.length === 1) return { x: pts[0]!.x, y: pts[0]!.y };
              const totalLen = dists[dists.length - 1]!;
              if (totalLen <= 0) return { x: pts[0]!.x, y: pts[0]!.y };
              const clampedT = Math.max(0, Math.min(1, t));
              const target = clampedT * totalLen;
              for (let i = 1; i < dists.length; i++) {
                if (dists[i]! >= target) {
                  const segLen = dists[i]! - dists[i - 1]!;
                  const f = segLen > 0 ? (target - dists[i - 1]!) / segLen : 0;
                  return {
                    x: pts[i - 1]!.x + (pts[i]!.x - pts[i - 1]!.x) * f,
                    y: pts[i - 1]!.y + (pts[i]!.y - pts[i - 1]!.y) * f,
                  };
                }
              }
              return pts[pts.length - 1]!;
            };

            const SWEEP_DURATION = 12000;
            const startTime = performance.now();
            let tripDone = false;

            const animate = () => {
              if (!map.current || cancelled || !canvas.parentNode) return;

              const rect = canvas.getBoundingClientRect();
              const dpr = window.devicePixelRatio || 1;
              canvas.width = rect.width * dpr;
              canvas.height = rect.height * dpr;
              ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
              ctx.clearRect(0, 0, rect.width, rect.height);

              // Out and back — stop after return trip completes
              if (tripDone) return;

              const pts = screenPts();
              if (pts.length < 2) { routeAnimFrame.current = requestAnimationFrame(animate); return; }
              const dists = cumDist(pts);

              const elapsed = performance.now() - startTime;
              const totalDuration = SWEEP_DURATION * 2; // out + return
              const rawT = elapsed / totalDuration;
              if (rawT >= 1) {
                // Return trip complete — done
                tripDone = true;
                routeAnimState.active = false;
                routeAnimState.currentDistanceKm = 0;
                return;
              }
              // 0→0.5 = outbound (t: 0→1), 0.5→1 = return (t: 1→0)
              const halfT = Math.min(rawT, 1.0);
              const outbound = halfT <= 0.5;
              const t = outbound ? halfT * 2 : 2 - halfT * 2;

              // Update shared route state for live distance counter
              routeAnimState.returning = !outbound;
              // Always count up: outbound t goes 0→1, return t goes 1→0 so invert
              routeAnimState.currentDistanceKm = outbound ? t * totalDistKm : (1 - t) * totalDistKm;

              // Draw the route line behind the dot (traced path so far)
              // Outbound: draw from start to head. Return: draw from end to head.
              ctx.beginPath();
              if (outbound) {
                // Draw route from 0 to t
                for (let i = 0; i <= 200; i++) {
                  const pt = lerpOnPath(pts, dists, (i / 200) * t);
                  if (i === 0) ctx.moveTo(pt.x, pt.y);
                  else ctx.lineTo(pt.x, pt.y);
                }
              } else {
                // Draw route from 1 down to t
                for (let i = 0; i <= 200; i++) {
                  const pt = lerpOnPath(pts, dists, 1 - (i / 200) * (1 - t));
                  if (i === 0) ctx.moveTo(pt.x, pt.y);
                  else ctx.lineTo(pt.x, pt.y);
                }
              }
              ctx.strokeStyle = '#bf00ff';
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#bf00ff';
              ctx.shadowBlur = 6;
              ctx.stroke();
              ctx.shadowBlur = 0;

              // Draw neon purple head dot with glow — no tail
              const headPos = lerpOnPath(pts, dists, t);

              // Outer glow
              const grad = ctx.createRadialGradient(headPos.x, headPos.y, 0, headPos.x, headPos.y, 16);
              grad.addColorStop(0, 'rgba(191, 0, 255, 0.8)');
              grad.addColorStop(0.3, 'rgba(191, 0, 255, 0.35)');
              grad.addColorStop(1, 'rgba(191, 0, 255, 0)');
              ctx.beginPath();
              ctx.arc(headPos.x, headPos.y, 16, 0, Math.PI * 2);
              ctx.fillStyle = grad;
              ctx.fill();

              // Bright core
              ctx.beginPath();
              ctx.arc(headPos.x, headPos.y, 4.5, 0, Math.PI * 2);
              ctx.fillStyle = '#e040ff';
              ctx.shadowColor = '#bf00ff';
              ctx.shadowBlur = 14;
              ctx.fill();
              ctx.shadowBlur = 0;

              // Hot center
              ctx.beginPath();
              ctx.arc(headPos.x, headPos.y, 1.5, 0, Math.PI * 2);
              ctx.fillStyle = '#f0b0ff';
              ctx.fill();

              routeAnimFrame.current = requestAnimationFrame(animate);
            };

            routeAnimFrame.current = requestAnimationFrame(animate);

            // Repaint on map move
            const onMove = () => mapInstance.triggerRepaint();
            mapInstance.on('move', onMove);
          };

          if (mapInstance.isStyleLoaded()) {
            setup();
          } else {
            mapInstance.once('style.load', setup);
          }
        })
        .catch(() => { /* route is a visual enhancement */ });

      return () => {
        cancelled = true;
        routeAnimState.active = false;
        routeAnimState.currentDistanceKm = 0;
        if (routeAnimFrame.current) {
          cancelAnimationFrame(routeAnimFrame.current);
          routeAnimFrame.current = null;
        }
        const c = container.querySelector('.route-dot-overlay');
        if (c) c.remove();
      };
    }, [mapLoaded, filteredDepotNames, depotLocations]);

    // Cylinder hover detection — screen-space point-in-polygon against projected geo circles
    const HOVER_RADIUS_KM = 45;
    const CYLINDER_HOVER_HEIGHT = 80; // must match CYLINDER_HEIGHT_PX in debug draw
    useEffect(() => {
      if (!map.current || !mapLoaded) return;
      const mapInstance = map.current;

      const R = 6371;
      const SEGMENTS = 32; // fewer segments for hover check (perf)

      const geoCircleHover = (lat: number, lng: number, radiusKm: number): [number, number][] => {
        const points: [number, number][] = [];
        for (let j = 0; j <= SEGMENTS; j++) {
          const angle = (j / SEGMENTS) * Math.PI * 2;
          const dLat = (radiusKm / R) * Math.cos(angle) * (180 / Math.PI);
          const dLng =
            ((radiusKm / R) * Math.sin(angle) * (180 / Math.PI)) / Math.cos((lat * Math.PI) / 180);
          points.push([lng + dLng, lat + dLat]);
        }
        return points;
      };

      // Ray casting point-in-polygon
      const pointInPolygon = (
        px: number,
        py: number,
        polygon: { x: number; y: number }[]
      ): boolean => {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const pi = polygon[i]!;
          const pj = polygon[j]!;
          if (
            pi.y > py !== pj.y > py &&
            px < ((pj.x - pi.x) * (py - pi.y)) / (pj.y - pi.y) + pi.x
          ) {
            inside = !inside;
          }
        }
        return inside;
      };

      const onMouseMove = (e: mapboxgl.MapMouseEvent) => {
        const mx = e.point.x;
        const my = e.point.y;
        let closest: string | null = null;
        let closestDist = Infinity;

        for (let idx = 0; idx < depotLocations.length; idx++) {
          // Skip depots whose marker is hidden
          const marker = depotMarkers.current[idx];
          if (marker && marker.getElement().style.display === 'none') continue;

          const depot = depotLocations[idx]!;
          const geoPoints = geoCircleHover(depot.lat, depot.lng, HOVER_RADIUS_KM);
          const bottomPoly = geoPoints.map((p) => mapInstance.project(p as [number, number]));
          const topPoly = bottomPoly.map((p) => ({ x: p.x, y: p.y - CYLINDER_HOVER_HEIGHT }));

          // Check: inside bottom ellipse, top ellipse, or between them (cylinder walls)
          const inBottom = pointInPolygon(mx, my, bottomPoly);
          const inTop = pointInPolygon(mx, my, topPoly);

          // For walls: check if mouse is between top and bottom y-range and within horizontal bounds
          let inWalls = false;
          if (!inBottom && !inTop) {
            const minTopY = Math.min(...topPoly.map((p) => p.y));
            const maxBotY = Math.max(...bottomPoly.map((p) => p.y));
            if (my >= minTopY && my <= maxBotY) {
              // Between top and bottom — check if mouse x is within the horizontal extent
              // Find min/max x of the bottom polygon (wider since it's geo-projected)
              let minX = Infinity,
                maxX = -Infinity;
              for (const p of bottomPoly) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
              }
              inWalls = mx >= minX && mx <= maxX;
            }
          }

          if (inBottom || inTop || inWalls) {
            // Use screen distance to depot center for closest pick
            const center = mapInstance.project([depot.lng, depot.lat]);
            const dist = Math.sqrt((mx - center.x) ** 2 + (my - center.y) ** 2);
            if (dist < closestDist) {
              closest = depot.name;
              closestDist = dist;
            }
          }
        }

        setHoveredDepot(closest);
      };

      mapInstance.on('mousemove', onMouseMove);
      return () => {
        mapInstance.off('mousemove', onMouseMove);
      };
    }, [mapLoaded, depotLocations]);

    // React to hoveredDepot / filtered depot changes — manage per-depot animations
    useEffect(() => {
      const anims = depotAnimsRef.current;
      const now = performance.now();

      // A depot is "active" if it's mouse-hovered OR filtered
      const activeDepotNames = new Set<string>();
      if (hoveredDepot) activeDepotNames.add(hoveredDepot);
      filteredDepotNames.forEach((name) => activeDepotNames.add(name));

      // Start collapsing any depots that are no longer active
      anims.forEach((anim, name) => {
        if (!activeDepotNames.has(name) && anim.phase !== 'collapsing') {
          const elapsed = now - anim.startTime;
          const expandT = Math.min(elapsed / 600, 1);
          const easedT = 1 - Math.pow(1 - expandT, 3);
          anim.collapseFromRadius = easedT * 60;
          anim.collapseStartTime = now;
          anim.phase = 'collapsing';
        }
      });

      // Start expanding any newly active depots
      activeDepotNames.forEach((name) => {
        if (!anims.has(name)) {
          const depot = depotLocations.find((d) => d.name === name);
          if (depot) {
            anims.set(name, {
              depot,
              color: isValidHexColor(depot.color) ? depot.color : DEFAULT_DEPOT_COLOR,
              phase: 'expanding',
              startTime: now,
              collapseStartTime: 0,
              collapseFromRadius: 0,
              pulseStartTime: null,
            });
          }
        } else {
          // Re-activating a depot that's collapsing — restart expand
          const anim = anims.get(name)!;
          if (anim.phase === 'collapsing') {
            anim.phase = 'expanding';
            anim.startTime = now;
            anim.pulseStartTime = null;
          }
        }
      });
    }, [hoveredDepot, filteredDepotNames, depotLocations]);

    // Build GeoJSON FeatureCollection from filtered assets (exclude depot-counted assets)
    const assetGeoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
      () => ({
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
      }),
      [filteredAssets]
    );

    // Helper: add the asset-dots source + circle layer + flag layer to the current map
    const addAssetLayer = useCallback(
      (mapInstance: mapboxgl.Map, dark: boolean) => {
        console.log('[FleetMap] addAssetLayer called', {
          dark,
          features: assetGeoJson.features.length,
        });
        // Register flag icon for symbol layer
        registerAssetIcons(mapInstance, dark);

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
              'circle-radius': ['match', ['get', 'category'], 'trailer', 7, 'dolly', 5.5, 6],
              'circle-color': [
                'match',
                ['get', 'category'],
                'trailer',
                categoryColors['trailer'],
                'dolly',
                categoryColors['dolly'],
                defaultFill,
              ],
              'circle-stroke-width': 1.5,
              'circle-stroke-color': [
                'match',
                ['get', 'category'],
                'trailer',
                categoryColors['trailer'],
                'dolly',
                categoryColors['dolly'],
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
                'trailer',
                'trailer-pin',
                'dolly',
                'dolly-pin',
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
                'trailer',
                'trailer-pin-hover',
                'dolly',
                'dolly-pin-hover',
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
          mapInstance.addLayer(
            {
              id: 'asset-pulse-layer',
              type: 'circle',
              source: 'asset-pulse',
              slot: 'top',
              paint: {
                'circle-pitch-alignment': 'map',
                'circle-radius': 20,
                'circle-color': 'transparent',
                'circle-stroke-width': 2,
                'circle-stroke-color': dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.4)',
                'circle-stroke-opacity': 0.8,
              },
            },
            'asset-dots-layer'
          ); // render below dots
        }
      },
      [assetGeoJson]
    );

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
        // Guard: don't touch sources/layers while style is loading
        if (!mapInstance.isStyleLoaded()) return;
        // If source already exists, just update the data
        const existingSource = mapInstance.getSource('asset-dots') as
          | mapboxgl.GeoJSONSource
          | undefined;
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
              'trailer',
              categoryColors['trailer'],
              'dolly',
              categoryColors['dolly'],
              defaultFill,
            ]);
            mapInstance.setPaintProperty('asset-dots-layer', 'circle-stroke-color', [
              'match',
              ['get', 'category'],
              'trailer',
              categoryColors['trailer'],
              'dolly',
              categoryColors['dolly'],
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

      const onMouseEnter = (
        e: mapboxgl.MapMouseEvent & { features?: mapboxgl.GeoJSONFeature[] }
      ) => {
        mapInstance.getCanvas().style.cursor = 'pointer';

        const feature = e.features?.[0];
        if (!feature || feature.geometry.type !== 'Point') return;

        const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        const props = feature.properties!;
        hoverPopupRoot.current?.render(
          <AssetHoverCard
            asset={{ name: props['assetNumber'] as string, status: props['status'] as string }}
            isDark={isDark}
          />
        );

        hoverPopup.current!.setLngLat(coords).addTo(mapInstance);

        // Show tall hover pin for this feature (start at zero size for grow animation)
        const hoverPinSource = mapInstance.getSource('asset-hover-pin') as
          | mapboxgl.GeoJSONSource
          | undefined;
        if (hoverPinSource) {
          mapInstance.setLayoutProperty('asset-hover-pin-layer', 'icon-size', 0.01);
          hoverPinSource.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: coords },
                properties: { category: props['category'] as string },
              },
            ],
          });
        }

        // Set pulse source to hovered feature
        const pulseSource = mapInstance.getSource('asset-pulse') as
          | mapboxgl.GeoJSONSource
          | undefined;
        if (pulseSource) {
          pulseSource.setData({
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: coords },
                properties: {},
              },
            ],
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
            mapInstance.setPaintProperty(
              'asset-pulse-layer',
              'circle-stroke-opacity',
              opacity * 0.8
            );
            mapInstance.setPaintProperty(
              'asset-pulse-layer',
              'circle-stroke-color',
              'rgba(255,255,255,0.9)'
            );
            // Fill the circle — blooms in then fades out
            const fillOpacity = opacity * t * 0.4;
            mapInstance.setPaintProperty(
              'asset-pulse-layer',
              'circle-color',
              'rgba(255,255,255,0.9)'
            );
            mapInstance.setPaintProperty('asset-pulse-layer', 'circle-opacity', fillOpacity);
          }

          // Ease-out grow animation for hover pin
          const growElapsed = now - startTime;
          if (growElapsed < pinGrowDuration && mapInstance.getLayer('asset-hover-pin-layer')) {
            const gt = Math.min(growElapsed / pinGrowDuration, 1);
            // Ease-out cubic: decelerates into final position
            const eased = 1 - Math.pow(1 - gt, 3);
            mapInstance.setLayoutProperty(
              'asset-hover-pin-layer',
              'icon-size',
              eased * targetPinSize
            );
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
        const hoverPinSource = mapInstance.getSource('asset-hover-pin') as
          | mapboxgl.GeoJSONSource
          | undefined;
        if (hoverPinSource) {
          hoverPinSource.setData({ type: 'FeatureCollection', features: [] });
        }

        // Stop pulse animation and clear source
        if (pulseAnimFrame.current) {
          cancelAnimationFrame(pulseAnimFrame.current);
          pulseAnimFrame.current = null;
        }
        const pulseSource = mapInstance.getSource('asset-pulse') as
          | mapboxgl.GeoJSONSource
          | undefined;
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

    // Dismiss tooltip on map click
    useEffect(() => {
      if (!map.current || !mapLoaded) return;
      const handler = () => { setTooltipDepot(null); };
      map.current.on('click', handler);
      return () => { map.current?.off('click', handler); };
    }, [mapLoaded]);

    // Update tooltip position on map move
    useEffect(() => {
      if (!map.current || !mapLoaded || !tooltipDepot) return;
      const depot = depotLocations.find(d => d.name === tooltipDepot.name);
      if (!depot) return;
      const mapInstance = map.current;
      const handler = () => {
        const pos = mapInstance.project([depot.lng, depot.lat]);
        setTooltipDepot(prev => prev ? { ...prev, position: { x: pos.x, y: pos.y } } : null);
      };
      mapInstance.on('move', handler);
      return () => { mapInstance.off('move', handler); };
    }, [mapLoaded, tooltipDepot?.name, depotLocations]);

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
                    style={{
                      borderColor: RGR_COLORS.bright.vibrant,
                      borderTopColor: 'transparent',
                    }}
                  />
                  <p className="text-sm">Loading map...</p>
                </>
              ) : (
                <>
                  <svg
                    className="w-12 h-12 mx-auto mb-3 opacity-30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
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

        {/* Depot cluster tooltip */}
        {tooltipDepot && (
          <DepotClusterTooltip
            depotName={tooltipDepot.name}
            depotColor={tooltipDepot.color}
            assets={tooltipDepot.assets}
            position={tooltipDepot.position}
            onDismiss={() => setTooltipDepot(null)}
            onExplore={() => {
              const depot = depotLocations.find(d => d.name === tooltipDepot.name);
              if (depot && map.current) {
                map.current.flyTo({ center: [depot.lng, depot.lat], zoom: 10, duration: 1500 });
              }
              setExplorePanelDepot({
                name: tooltipDepot.name,
                color: tooltipDepot.color,
                assets: tooltipDepot.assets,
              });
              setTooltipDepot(null);
            }}
          />
        )}

        {/* Depot explore panel */}
        {explorePanelDepot && (
          <div className="absolute top-4 left-4 z-[200] w-[340px] max-h-[80vh] overflow-auto">
            <DepotAssetPanel
              assets={explorePanelDepot.assets}
              depotName={explorePanelDepot.name}
              depotColor={explorePanelDepot.color}
              isDark={isDark}
              onClose={() => setExplorePanelDepot(null)}
            />
          </div>
        )}
      </div>
    );
  }
);

FleetMapWithDataInner.displayName = 'FleetMapWithData';

export const FleetMapWithData = React.memo(FleetMapWithDataInner);

export default FleetMapWithData;
