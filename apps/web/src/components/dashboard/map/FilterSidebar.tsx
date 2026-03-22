import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SearchIcon,
  GripVerticalIcon,
  ChevronUpIcon,
  ZoomInIcon,
  ZoomOutIcon,
  HomeIcon,
} from 'lucide-react';
import { useDepots } from '@/hooks/useAssetData';

interface FilterSidebarProps {
  onSearch: (query: string) => void;
  activeDepots: string[];
  onDepotChange: (depots: string[]) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitBounds?: () => void;
}

function FilterPill({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative py-1.5 px-4 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200 ease-out cursor-pointer"
      style={{
        fontFamily: "'Lato', sans-serif",
        overflow: 'visible',
        background: active ? color : `${color}20`,
        border: `1px solid ${active ? color : `${color}50`}`,
        color: active ? '#fff' : `${color}90`,
        textShadow: active
          ? '0 0 6px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.5)'
          : '0 1px 3px rgba(0,0,0,0.5)',
        ['--pill-hover-bg' as string]: `${color}80`,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = `${color}4d`;
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = `${color}20`;
      }}
    >
      <span
        className="absolute flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] leading-none transition-all duration-300 ease-out"
        style={{
          top: '-6px',
          right: '-6px',
          backgroundColor: '#22c55e',
          color: '#fff',
          zIndex: 1,
          opacity: active ? 1 : 0,
          transform: active ? 'scale(1)' : 'scale(0)',
        }}
      >
        ✓
      </span>
      {label}
    </button>
  );
}

export function FilterSidebar({
  onSearch,
  activeDepots,
  onDepotChange,
  onZoomIn,
  onZoomOut,
  onFitBounds,
}: FilterSidebarProps) {
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const { data: depots = [] } = useDepots();

  // Drag state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: dragStart.current.posX + (e.clientX - dragStart.current.x),
        y: dragStart.current.posY + (e.clientY - dragStart.current.y),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      onSearch(value);
    },
    [onSearch]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(query);
    },
    [query, onSearch]
  );

  const handleToggleDepot = useCallback(
    (depotName: string) => {
      if (activeDepots.includes(depotName)) {
        onDepotChange(activeDepots.filter((d) => d !== depotName));
      } else {
        onDepotChange([...activeDepots, depotName]);
      }
    },
    [activeDepots, onDepotChange]
  );

  const activeCount = activeDepots.length;

  // Collapsed: small icon button
  if (collapsed) {
    return (
      <div
        ref={dragRef}
        className="absolute top-4 right-4 z-10 pointer-events-auto"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        <button
          onMouseDown={handleMouseDown}
          onClick={(_e) => {
            // Only open if it wasn't a drag
            if (
              Math.abs(position.x - dragStart.current.posX) < 3 &&
              Math.abs(position.y - dragStart.current.posY) < 3
            ) {
              setCollapsed(false);
            }
          }}
          className="relative flex items-center justify-center size-10 rounded-xl bg-[rgba(6,6,42,0.75)] backdrop-blur-xl border border-white/[0.08] shadow-lg text-white/60 hover:text-white transition-all duration-200 cursor-grab active:cursor-grabbing"
        >
          <SearchIcon className="size-5" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center size-4 rounded-full bg-[#22c55e] text-[8px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      ref={dragRef}
      className="absolute top-4 right-4 z-10 pointer-events-auto"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div className="flex flex-col gap-3 bg-[rgba(6,6,42,0.75)] backdrop-blur-xl rounded-xl border border-white/[0.08] px-4 py-3 shadow-lg min-w-[280px]">
        {/* Header — draggable area */}
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between select-none cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-1.5">
            <GripVerticalIcon className="size-4 text-white/40" />
            <span
              className="text-xs font-bold uppercase tracking-[0.1em] text-white/60"
              style={{ fontFamily: "'Lato', sans-serif" }}
            >
              Search & Filters
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onZoomIn && (
              <button
                onClick={onZoomIn}
                className="flex items-center justify-center size-8 text-white/60 hover:text-white transition-colors duration-200 cursor-pointer"
              >
                <ZoomInIcon className="size-5" />
              </button>
            )}
            {onZoomOut && (
              <button
                onClick={onZoomOut}
                className="flex items-center justify-center size-8 text-white/60 hover:text-white transition-colors duration-200 cursor-pointer"
              >
                <ZoomOutIcon className="size-5" />
              </button>
            )}
            {onFitBounds && (
              <button
                onClick={onFitBounds}
                className="flex items-center justify-center size-8 text-white/60 hover:text-white transition-colors duration-200 cursor-pointer"
              >
                <HomeIcon className="size-5" />
              </button>
            )}
            <button
              onClick={() => setCollapsed(true)}
              className="flex items-center justify-center size-8 text-white/60 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              <ChevronUpIcon className="size-6" />
            </button>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/50 pointer-events-none z-10" />
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Search assets..."
              style={{ fontFamily: "'Lato', sans-serif" }}
              className="
                w-full h-9 rounded-md pl-9 pr-3
                bg-white/[0.06] text-sm text-white/90 font-medium
                border border-white/[0.1]
                placeholder:text-white/25
                outline-none
                transition-all duration-200
                focus:bg-white/[0.1]
                focus:border-white/20
              "
            />
          </div>
        </form>

        {/* Depot pills */}
        <div className="flex flex-wrap items-center gap-2">
          {depots.map((depot) => {
            const isActive = activeDepots.includes(depot.name);
            const depotColor = depot.color || '#00A8FF';
            return (
              <FilterPill
                key={depot.code}
                active={isActive}
                label={depot.name}
                color={depotColor}
                onClick={() => handleToggleDepot(depot.name)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
