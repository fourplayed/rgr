/**
 * MapControls - Zoom/fit controls overlay for inside the map container
 *
 * Positioned absolutely in the top-right corner of the map.
 * Button styles shared with SearchFilterBar via CSS class names.
 */
import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface MapControlsProps {
  isDark: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitBounds: () => void;
}

export const MapControls = React.memo<MapControlsProps>(({
  isDark,
  onZoomIn,
  onZoomOut,
  onFitBounds,
}) => {
  const IconButton = ({ onClick, label, Icon }: { onClick: () => void; label: string; Icon: LucideIcon }) => (
    <button
      type="button"
      onClick={onClick}
      className={`map-header-btn ${isDark ? 'map-header-btn-dark' : 'map-header-btn-light'} relative overflow-hidden p-2 rounded-lg transition-all duration-300 ease-out hover:-translate-y-0.5`}
      aria-label={label}
    >
      <span className="relative z-[1]">
        <Icon className="w-4 h-4 text-white" />
      </span>
    </button>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <IconButton onClick={onZoomIn} label="Zoom in" Icon={ZoomIn} />
      <IconButton onClick={onZoomOut} label="Zoom out" Icon={ZoomOut} />
      <IconButton onClick={onFitBounds} label="Fit all assets" Icon={Maximize2} />
    </div>
  );
});

MapControls.displayName = 'MapControls';

/** @deprecated Use MapControls instead */
export const MapHeader = MapControls;
