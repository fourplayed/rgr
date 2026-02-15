/**
 * FleetMapLazy - Lazy-loading wrapper for FleetMap component
 *
 * Performance Optimization:
 * - Uses IntersectionObserver to detect when map container is visible
 * - Only loads the heavy Mapbox library (~700KB) when the map is in viewport
 * - Shows a placeholder skeleton while loading
 * - Reduces initial page load time significantly
 *
 * Usage:
 * Replace direct FleetMap imports with FleetMapLazy for deferred loading
 */
import { useState, useEffect, useRef, lazy, Suspense, memo } from 'react';
import { MapSkeleton } from '@/components/common';
import type { FleetMapProps } from './FleetMap';

// Lazy load the actual FleetMap component
const FleetMap = lazy(() => import('./FleetMap'));

export interface FleetMapLazyProps extends FleetMapProps {
  /** Root margin for IntersectionObserver (default: '100px' - preload slightly before visible) */
  rootMargin?: string;
  /** Minimum time (ms) to show skeleton for smooth transition (default: 300) */
  minLoadingTime?: number;
}

/**
 * FleetMapLazy - Loads FleetMap only when visible in viewport
 *
 * Uses IntersectionObserver for efficient visibility detection.
 * Falls back to immediate loading if IntersectionObserver is not supported.
 */
export const FleetMapLazy = memo<FleetMapLazyProps>(({
  rootMargin = '100px',
  minLoadingTime = 300,
  isDark = true,
  className = '',
  ...mapProps
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const loadStartTime = useRef<number>(0);

  // Use IntersectionObserver to detect when container enters viewport
  useEffect(() => {
    // Fallback for browsers without IntersectionObserver support
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      setShouldRender(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
          loadStartTime.current = Date.now();

          // Ensure minimum loading time for smooth transition
          const timeoutId = setTimeout(() => {
            setShouldRender(true);
          }, minLoadingTime);

          // Cleanup timeout if component unmounts
          return () => clearTimeout(timeoutId);
        }
      },
      {
        root: null, // Use viewport as root
        rootMargin, // Preload slightly before visible
        threshold: 0.01, // Trigger when at least 1% is visible
      }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, rootMargin, minLoadingTime]);

  // Once visible, enable rendering after minimum loading time
  useEffect(() => {
    if (isVisible && !shouldRender) {
      const elapsed = Date.now() - loadStartTime.current;
      const remainingTime = Math.max(0, minLoadingTime - elapsed);

      const timeoutId = setTimeout(() => {
        setShouldRender(true);
      }, remainingTime);

      return () => clearTimeout(timeoutId);
    }
  }, [isVisible, shouldRender, minLoadingTime]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${className}`}
      role="application"
      aria-label="Fleet tracking map"
      aria-busy={!shouldRender}
    >
      {shouldRender ? (
        <Suspense fallback={<MapSkeleton className="absolute inset-0 w-full h-full" isDark={isDark} />}>
          <FleetMap
            className="absolute inset-0"
            isDark={isDark}
            {...mapProps}
          />
        </Suspense>
      ) : (
        <MapSkeleton
          className="absolute inset-0 w-full h-full"
          isDark={isDark}
        />
      )}
    </div>
  );
});

FleetMapLazy.displayName = 'FleetMapLazy';

export default FleetMapLazy;
