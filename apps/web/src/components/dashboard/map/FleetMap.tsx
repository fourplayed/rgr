/**
 * FleetMap - Mapbox-powered map component for fleet tracking
 * Updated to use RGR color palette from COLOR_PALETTE.md
 *
 * THEME AWARENESS:
 * - Accepts isDark prop to switch between dark/light Mapbox styles
 * - Uses custom fourplayed styles or falls back to Mapbox defaults
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Removed handleAssetClick from useEffect deps to prevent re-initialization
 * - Added stable reference pattern for event handlers
 * - Proper cleanup of map instance and event listeners
 * - MapBox token validation with helpful error messages
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { PLACEHOLDER_ASSETS, STATUS_COLORS, type PlaceholderAsset } from '@/constants';
import { DEPOT_LOCATIONS, DEPOT_COLOR, DEPOT_COLORS, type DepotLocation } from '@/constants/fleetMap';
import { RGR_COLORS } from '@/styles/color-palette';
import { DepotHoverCard } from './DepotHoverCard';
import { AssetHoverCard } from './AssetHoverCard';

// Validate and set Mapbox access token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
} else {
  console.error('MapBox Error: VITE_MAPBOX_TOKEN is not set in environment variables');
}

export interface FleetMapProps {
  className?: string;
  onAssetClick?: (assetId: string) => void;
  onMapLoad?: () => void;
  isDark?: boolean;
  /** Asset ID or name to focus on - map will fly to this location */
  focusAssetId?: string | null;
  /** Callback when focus animation completes */
  onFocusComplete?: (found: boolean) => void;
}

/** Default fallback color for unknown status - using Tailwind gray-500 */
const DEFAULT_STATUS_COLOR = '#6b7280'; // Gray-500 (acceptable as Tailwind standard color)

/** Theme-aware marker colors for light theme visibility */
const LIGHT_THEME_COLORS: Record<string, string> = {
  trailer: '#059669',      // emerald-600 - dark green for visibility
  dolly: '#166534',        // green-800 - darker green for contrast
  out_of_service: '#dc2626',  // red-600 - slightly darker red
};

export const FleetMap = React.memo<FleetMapProps>(({ className = '', onAssetClick, onMapLoad, isDark = true, focusAssetId, onFocusComplete }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const depotPopupRoots = useRef<Array<{ root: ReturnType<typeof createRoot>; depot: DepotLocation }>>([]);
  const assetPopupRoots = useRef<Array<{ root: ReturnType<typeof createRoot>; asset: PlaceholderAsset }>>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Use ref to store latest callback without causing re-renders
  const onAssetClickRef = useRef(onAssetClick);

  useEffect(() => {
    onAssetClickRef.current = onAssetClick;
  }, [onAssetClick]);

  // Stable reference to asset click handler
  const handleAssetClick = useCallback((assetId: string) => {
    onAssetClickRef.current?.(assetId);
  }, []);

  // Memoize map initialization to prevent recreation
  useEffect(() => {
    // If no MapBox token, skip initialization - we'll show placeholder UI
    if (!MAPBOX_TOKEN) {
      return;
    }

    if (!mapContainer.current || map.current) return;

    // Flag to track if component is mounted
    let isMounted = true;

    try {
      // Get theme-appropriate style URL
      const styleUrl = isDark
        ? import.meta.env.VITE_MAPBOX_STYLE_DARK || 'mapbox://styles/mapbox/dark-v11'
        : import.meta.env.VITE_MAPBOX_STYLE_LIGHT || 'mapbox://styles/mapbox/light-v11';

      // Initialize map centered on Western Australia
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: styleUrl,
        center: [122, -25], // Center of WA
        zoom: 4.5,
        attributionControl: false,
      });

      const mapInstance = map.current;

      // Error handler
      const handleMapError = (e: mapboxgl.ErrorEvent) => {
        if (isMounted) {
          const errorMsg = e.error?.message || 'Failed to load map. Please check your connection.';
          setMapError(errorMsg);
          console.error('Mapbox error:', e.error);
        }
      };

      mapInstance.on('error', handleMapError);

      // Load handler
      const handleMapLoad = () => {
        if (!isMounted || !mapInstance) return;

        setMapLoaded(true);

        // Notify parent that map is ready
        onMapLoad?.();

        // Add markers for each asset - use theme-aware colors
        PLACEHOLDER_ASSETS.forEach((asset: PlaceholderAsset) => {
          const statusColor = isDark
            ? (STATUS_COLORS[asset.status] ?? DEFAULT_STATUS_COLOR)
            : (LIGHT_THEME_COLORS[asset.status] ?? DEFAULT_STATUS_COLOR);
          const el = document.createElement('div');
          el.className = 'fleet-marker';
          el.innerHTML = `
            <div class="w-3 h-3 rounded-full shadow-lg cursor-pointer transition-transform hover:scale-150"
                 style="background-color: ${statusColor}; box-shadow: 0 0 8px ${statusColor}80;">
            </div>
          `;

          // Use stable callback reference
          const clickHandler = () => handleAssetClick(asset.id);
          el.addEventListener('click', clickHandler);

          // Create popup container for AssetHoverCard
          const popupContainer = document.createElement('div');
          const root = createRoot(popupContainer);
          root.render(
            <AssetHoverCard
              asset={{ name: asset.name, status: asset.status }}
              isDark={isDark}
            />
          );

          // Store root and asset for theme updates
          assetPopupRoots.current.push({ root, asset });

          // Create Mapbox popup with custom styling and elevated z-index
          const popup = new mapboxgl.Popup({
            offset: [0, -20],
            closeButton: false,
            closeOnClick: false,
            className: 'asset-hover-popup',
            maxWidth: 'none',
          }).setDOMContent(popupContainer);

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([asset.lng, asset.lat])
            .setPopup(popup)
            .addTo(mapInstance);

          // Show popup on hover
          el.addEventListener('mouseenter', () => {
            popup.addTo(mapInstance);
          });

          el.addEventListener('mouseleave', () => {
            popup.remove();
          });

          markers.current.push(marker);
        });

        // Add depot markers with hover cards showing asset counts
        DEPOT_LOCATIONS.forEach((depot: DepotLocation) => {
          const depotColor = DEPOT_COLORS[depot.name] || DEPOT_COLOR;

          // Create marker element
          const el = document.createElement('div');
          el.className = 'depot-marker';
          el.innerHTML = `
            <div class="flex items-center justify-center w-6 h-6 rounded-lg shadow-lg cursor-pointer transition-all duration-300 hover:scale-125"
                 style="background-color: ${depotColor};">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                   stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/>
                <path d="M6 18h12"/>
                <path d="M6 14h12"/>
                <rect width="12" height="12" x="6" y="10"/>
              </svg>
            </div>
          `;

          // Create popup container for DepotHoverCard
          const popupContainer = document.createElement('div');
          const root = createRoot(popupContainer);
          root.render(
            <DepotHoverCard
              depot={depot}
              isDark={isDark}
            />
          );

          // Store root and depot for theme updates
          depotPopupRoots.current.push({ root, depot });

          // Create Mapbox popup with custom styling and elevated z-index
          const popup = new mapboxgl.Popup({
            offset: [0, -20],
            closeButton: false,
            closeOnClick: false,
            className: 'depot-hover-popup',
            maxWidth: 'none',
          }).setDOMContent(popupContainer);

          // Create marker with popup
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([depot.lng, depot.lat])
            .setPopup(popup)
            .addTo(mapInstance);

          // Show popup on hover
          el.addEventListener('mouseenter', () => {
            popup.addTo(mapInstance);
          });

          el.addEventListener('mouseleave', () => {
            popup.remove();
          });

          markers.current.push(marker);
        });

        // Add navigation controls
        mapInstance.addControl(
          new mapboxgl.NavigationControl({ showCompass: false }),
          'top-right'
        );
      };

      mapInstance.on('load', handleMapLoad);
    } catch (error) {
      if (isMounted) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to initialize map';
        setMapError(errorMsg);
        console.error('MapBox initialization error:', error);
      }
    }

    // Cleanup function
    return () => {
      isMounted = false;

      // Unmount all depot popup React roots
      depotPopupRoots.current.forEach(({ root }) => {
        root.unmount();
      });
      depotPopupRoots.current = [];

      // Unmount all asset popup React roots
      assetPopupRoots.current.forEach(({ root }) => {
        root.unmount();
      });
      assetPopupRoots.current = [];

      // Remove all markers and their event listeners
      markers.current.forEach((marker) => {
        const element = marker.getElement();
        if (element) {
          // Clone node to remove all event listeners
          const clone = element.cloneNode(true);
          element.parentNode?.replaceChild(clone, element);
        }
        marker.remove();
      });
      markers.current = [];

      // Remove map instance
      if (map.current) {
        map.current.remove();
        map.current = null;
      }

      setMapLoaded(false);
      setMapError(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only initialize once - handleAssetClick and isDark are intentionally excluded

  // Watch for theme changes and update map style + marker colors + depot popups
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const styleUrl = isDark
      ? import.meta.env.VITE_MAPBOX_STYLE_DARK || 'mapbox://styles/mapbox/dark-v11'
      : import.meta.env.VITE_MAPBOX_STYLE_LIGHT || 'mapbox://styles/mapbox/light-v11';

    // Update map style without full re-initialization
    map.current.setStyle(styleUrl);

    // Update marker colors for theme
    markers.current.forEach((marker, index) => {
      const el = marker.getElement();
      const markerDiv = el?.querySelector('.w-3.h-3');
      if (markerDiv && index < PLACEHOLDER_ASSETS.length) {
        const asset = PLACEHOLDER_ASSETS[index];
        const statusColor = isDark
          ? (STATUS_COLORS[asset.status] ?? DEFAULT_STATUS_COLOR)
          : (LIGHT_THEME_COLORS[asset.status] ?? DEFAULT_STATUS_COLOR);
        (markerDiv as HTMLElement).style.backgroundColor = statusColor;
        (markerDiv as HTMLElement).style.boxShadow = `0 0 8px ${statusColor}80`;
      }
    });

    // Update depot popup themes by re-rendering with new isDark prop
    depotPopupRoots.current.forEach(({ root, depot }) => {
      root.render(
        <DepotHoverCard
          depot={depot}
          isDark={isDark}
        />
      );
    });

    // Update asset popup themes by re-rendering with new isDark prop
    assetPopupRoots.current.forEach(({ root, asset }) => {
      root.render(
        <AssetHoverCard
          asset={{ name: asset.name, status: asset.status }}
          isDark={isDark}
        />
      );
    });
  }, [isDark, mapLoaded]);

  // Watch for focusAssetId changes and fly to that asset location
  useEffect(() => {
    if (!map.current || !mapLoaded || !focusAssetId) return;

    // Find asset by ID or name (case-insensitive)
    const searchTerm = focusAssetId.toLowerCase().trim();
    const asset = PLACEHOLDER_ASSETS.find(
      (a) => a.id === searchTerm || a.name.toLowerCase() === searchTerm
    );

    if (asset) {
      // Fly to asset location with a moderate zoom (7-8) to maintain broad overview
      map.current.flyTo({
        center: [asset.lng, asset.lat],
        zoom: 8, // Broad overview zoom level
        duration: 1500, // Smooth 1.5 second animation
        essential: true,
      });

      // Highlight the marker briefly
      const assetIndex = PLACEHOLDER_ASSETS.indexOf(asset);
      if (assetIndex !== -1 && markers.current[assetIndex]) {
        const markerEl = markers.current[assetIndex].getElement();
        const markerDiv = markerEl?.querySelector('.w-3.h-3') as HTMLElement;
        if (markerDiv) {
          // Pulse animation
          markerDiv.style.transform = 'scale(2)';
          markerDiv.style.transition = 'transform 0.3s ease-out';
          setTimeout(() => {
            markerDiv.style.transform = 'scale(1)';
          }, 1500);
        }
      }

      onFocusComplete?.(true);
    } else {
      onFocusComplete?.(false);
    }
  }, [focusAssetId, mapLoaded, onFocusComplete]);

  const handleZoomIn = () => map.current?.zoomIn();
  const handleZoomOut = () => map.current?.zoomOut();
  const handleFitBounds = () => {
    if (!map.current) return;
    const bounds = new mapboxgl.LngLatBounds();
    PLACEHOLDER_ASSETS.forEach((asset) => bounds.extend([asset.lng, asset.lat]));
    DEPOT_LOCATIONS.forEach((depot: DepotLocation) => bounds.extend([depot.lng, depot.lat]));
    map.current.fitBounds(bounds, { padding: 50 });
  };

  return (
    <div
      className={`relative w-full h-full ${className}`}
      role="application"
      aria-label="Fleet tracking map"
    >
      {/* Mapbox container */}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {/* Loading state */}
      {!mapLoaded && !mapError && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: `${RGR_COLORS.navy.darkest}CC` }} // 80% opacity
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

      {/* No MapBox token - show simple error message */}
      {!MAPBOX_TOKEN && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: `${RGR_COLORS.navy.darkest}` }}
        >
          <div className="text-center max-w-md px-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke={RGR_COLORS.chrome.medium}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4 opacity-50"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <h3
              className="text-lg font-medium mb-2"
              style={{ color: RGR_COLORS.chrome.light }}
            >
              Map Unavailable
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: RGR_COLORS.chrome.medium }}
            >
              Unable to establish connection with the map server. Please check your configuration or try again later.
            </p>
          </div>
        </div>
      )}

      {/* Error state - only for map errors (not missing token) */}
      {mapError && MAPBOX_TOKEN && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: `${RGR_COLORS.navy.darkest}CC` }} // 80% opacity
        >
          <div className="text-center" style={{ color: RGR_COLORS.chrome.medium }}>
            <p className="text-sm" style={{ color: RGR_COLORS.semantic.error }}>
              {mapError}
            </p>
          </div>
        </div>
      )}

      {/* Custom map controls overlay - bottom right (only show when map is loaded) */}
      {MAPBOX_TOKEN && mapLoaded && (
        <div className="absolute bottom-4 right-4 flex flex-row gap-2 z-10">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2.5 rounded-xl backdrop-blur-sm border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            backgroundColor: `${RGR_COLORS.navy.base}CC`, // Navy Base 80% opacity
            borderColor: `${RGR_COLORS.bright.vibrant}33`, // Vibrant Blue 20% opacity
            color: RGR_COLORS.chrome.light,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${RGR_COLORS.bright.vibrant}1A`,
            ['--tw-ring-color' as string]: RGR_COLORS.bright.vibrant,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = RGR_COLORS.chrome.highlight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = RGR_COLORS.chrome.light;
          }}
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2.5 rounded-xl backdrop-blur-sm border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            backgroundColor: `${RGR_COLORS.navy.base}CC`,
            borderColor: `${RGR_COLORS.bright.vibrant}33`,
            color: RGR_COLORS.chrome.light,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${RGR_COLORS.bright.vibrant}1A`,
            ['--tw-ring-color' as string]: RGR_COLORS.bright.vibrant,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = RGR_COLORS.chrome.highlight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = RGR_COLORS.chrome.light;
          }}
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleFitBounds}
          className="p-2.5 rounded-xl backdrop-blur-sm border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            backgroundColor: `${RGR_COLORS.navy.base}CC`,
            borderColor: `${RGR_COLORS.bright.vibrant}33`,
            color: RGR_COLORS.chrome.light,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${RGR_COLORS.bright.vibrant}1A`,
            ['--tw-ring-color' as string]: RGR_COLORS.bright.vibrant,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = RGR_COLORS.chrome.highlight;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = RGR_COLORS.chrome.light;
          }}
          aria-label="Fit all assets"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
      )}


      {/* Custom styles for markers and popups */}
      <style>{`
        .mapboxgl-map {
          width: 100% !important;
          height: 100% !important;
        }
        .mapboxgl-canvas-container,
        .mapboxgl-canvas {
          width: 100% !important;
          height: 100% !important;
        }
        .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
        .mapboxgl-ctrl-group {
          display: none !important;
        }
        /* Depot hover popup specific styles */
        .depot-hover-popup {
          z-index: 1000 !important;
        }
        .depot-hover-popup .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          z-index: 1000 !important;
        }
        .depot-hover-popup .mapboxgl-popup-tip {
          display: none !important;
        }
        /* Asset hover popup specific styles */
        .asset-hover-popup {
          z-index: 1000 !important;
        }
        .asset-hover-popup .mapboxgl-popup-content {
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: none !important;
          z-index: 1000 !important;
        }
        .asset-hover-popup .mapboxgl-popup-tip {
          display: none !important;
        }
        /* Ensure depot markers have higher z-index for hover interactions */
        .depot-marker {
          z-index: 10;
        }
        .fleet-marker {
          z-index: 5;
        }
      `}</style>
    </div>
  );
});

FleetMap.displayName = 'FleetMap';

export default FleetMap;
