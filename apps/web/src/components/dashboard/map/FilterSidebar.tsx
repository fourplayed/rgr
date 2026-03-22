import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SearchIcon,
  MousePointerClickIcon,
  GripVerticalIcon,
  ChevronUpIcon,
  ZoomInIcon,
  ZoomOutIcon,
  HomeIcon,
} from 'lucide-react';
import { useDepots } from '@/hooks/useAssetData';
import { routeAnimState } from './FleetMapWithData';

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

function DepotHexGrid({
  depots,
  activeDepots,
  onToggle,
}: {
  depots: ReturnType<typeof useDepots>['data'] & { code: string; name: string; color: string | null }[];
  activeDepots: string[];
  onToggle: (name: string) => void;
}) {
  const [liveKm, setLiveKm] = useState(0);
  const [lastKm, setLastKm] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [returning, setReturning] = useState(false);
  const [outboundKm, setOutboundKm] = useState<number | null>(null);
  const wasReturning = useRef(false);
  const wasActive = useRef(false);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const { currentDistanceKm, active, returning: ret, totalDistanceKm } = routeAnimState;
      setLiveKm(currentDistanceKm);
      setIsActive(active);
      setReturning(ret);

      // When animation starts, clear the last reading
      if (active && !wasActive.current) {
        setLastKm(null);
      }
      // When animation finishes, freeze the last reading
      if (!active && wasActive.current) {
        setLastKm(Math.round(totalDistanceKm));
      }
      wasActive.current = active;

      // Capture outbound total when transitioning to return
      if (ret && !wasReturning.current) {
        setOutboundKm(Math.round(totalDistanceKm));
      }
      // Reset when animation stops or restarts
      if (!active || (!ret && wasReturning.current)) {
        setOutboundKm(null);
      }
      wasReturning.current = ret;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pill = (name: string) => {
    const depot = depots.find((d) => d.name === name);
    if (!depot) return null;
    return (
      <FilterPill
        key={depot.code}
        active={activeDepots.includes(depot.name)}
        label={depot.name}
        color={depot.color || '#00A8FF'}
        onClick={() => onToggle(depot.name)}
      />
    );
  };

  // Which depot is last in the filtered order (destination)?
  const lastFilteredDepot = activeDepots.length >= 2 ? activeDepots[activeDepots.length - 1] : null;

  const IMPACT_STYLE = {
    fontFamily: "Impact, 'Arial Narrow', 'Haettenschweiler', sans-serif",
    fontStyle: 'italic' as const,
    letterSpacing: '0.02em',
  };

  // Track pill element positions for drawing connecting lines
  const pillRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [lineCoords, setLineCoords] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Compute line between the two filtered depots
  useEffect(() => {
    if (activeDepots.length < 2 || !containerRef.current) {
      setLineCoords(null);
      return;
    }
    const first = activeDepots[0]!;
    const last = activeDepots[activeDepots.length - 1]!;
    const el1 = pillRefs.current[first];
    const el2 = pillRefs.current[last];
    const container = containerRef.current;
    if (!el1 || !el2 || !container) { setLineCoords(null); return; }

    const cRect = container.getBoundingClientRect();
    const r1 = el1.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();
    setLineCoords({
      x1: r1.left + r1.width / 2 - cRect.left,
      y1: r1.top + r1.height / 2 - cRect.top,
      x2: r2.left + r2.width / 2 - cRect.left,
      y2: r2.top + r2.height / 2 - cRect.top,
    });
  }, [activeDepots]);

  const pillWithRef = (name: string) => {
    const depot = depots.find((d) => d.name === name);
    if (!depot) return null;
    return (
      <div ref={(el) => { pillRefs.current[name] = el; }}>
        <FilterPill
          key={depot.code}
          active={activeDepots.includes(depot.name)}
          label={depot.name}
          color={depot.color || '#00A8FF'}
          onClick={() => onToggle(depot.name)}
        />
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-6 py-3">
      {/* SVG connector line between linked depots */}
      {lineCoords && activeDepots.length >= 2 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 0 }}
        >
          <line
            x1={lineCoords.x1}
            y1={lineCoords.y1}
            x2={lineCoords.x2}
            y2={lineCoords.y2}
            stroke="#bf00ff"
            strokeWidth="1.5"
            strokeOpacity="0.35"
            strokeDasharray="4 4"
          />
          {/* Glow line */}
          <line
            x1={lineCoords.x1}
            y1={lineCoords.y1}
            x2={lineCoords.x2}
            y2={lineCoords.y2}
            stroke="#bf00ff"
            strokeWidth="4"
            strokeOpacity="0.1"
            filter="blur(3px)"
          />
        </svg>
      )}

      {/* Top row: 2 pills */}
      <div className="flex justify-evenly w-full px-4 gap-6" style={{ position: 'relative', zIndex: 1 }}>
        {pillWithRef('Perth')}
        {pillWithRef('Carnarvon')}
      </div>

      {/* Middle row: pill — distance counter — pill */}
      <div className="flex justify-between items-center w-full gap-3" style={{ position: 'relative', zIndex: 1 }}>
        {pillWithRef('Wubin')}
        <div className="flex flex-col items-center justify-center flex-1" style={{ marginTop: '-6px' }}>
          <span
            className="text-3xl tabular-nums leading-none"
            style={{
              ...IMPACT_STYLE,
              color: isActive ? '#ffffff' : lastKm !== null ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)',
              textShadow: isActive ? '0 0 10px rgba(255, 255, 255, 0.4)' : 'none',
            }}
          >
            {isActive ? Math.round(liveKm) : lastKm !== null ? lastKm : '—'}
          </span>
          <span
            className="text-[9px] uppercase tracking-wider self-end"
            style={{
              fontFamily: "'Lato', sans-serif",
              color: isActive ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)',
              marginTop: '2px',
              marginRight: '20%',
            }}
          >
            km
          </span>
        </div>
        {pillWithRef('Hedland')}
      </div>

      {/* Bottom row: 2 pills */}
      <div className="flex justify-evenly w-full px-4 gap-6" style={{ position: 'relative', zIndex: 1 }}>
        {pillWithRef('Newman')}
        {pillWithRef('Karratha')}
      </div>

      {/* Outbound total — slides down and fades out below the card */}
      {outboundKm !== null && (
        <div
          className="absolute left-0 right-0 flex justify-center"
          style={{
            bottom: '-32px',
            animation: 'slideOutFade 0.5s ease-out forwards',
          }}
        >
          <span
            className="text-sm tabular-nums"
            style={{
              ...IMPACT_STYLE,
              color: '#bf80ff',
              textShadow: '0 0 8px rgba(191, 0, 255, 0.4)',
            }}
          >
            {outboundKm} km
          </span>
        </div>
      )}

      <style>{`
        @keyframes slideOutFade {
          0% { transform: translateY(0); opacity: 1; }
          60% { transform: translateY(20px); opacity: 0.7; }
          100% { transform: translateY(40px); opacity: 0; }
        }
      `}</style>
    </div>
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
        className="absolute top-4 right-4 z-50 pointer-events-auto"
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
          className="relative flex items-center justify-center size-10 rounded-xl bg-[rgba(0,0,0,0.55)] backdrop-blur-2xl border border-white/[0.12] shadow-2xl text-white/60 hover:text-white transition-all duration-200 cursor-grab active:cursor-grabbing"
        >
          <MousePointerClickIcon className="size-5" />
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
      className="absolute top-4 right-4 z-50 pointer-events-auto"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <div className="flex flex-col gap-3 bg-[rgba(0,0,0,0.55)] backdrop-blur-2xl rounded-xl border border-white/[0.12] px-3 py-3 shadow-2xl min-w-[340px]">
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
              Interactive
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

        {/* Separator */}
        <div className="h-px bg-white/[0.08]" />

        {/* Depot pills — hexagon layout with live distance counter */}
        <DepotHexGrid
          depots={depots}
          activeDepots={activeDepots}
          onToggle={handleToggleDepot}
        />

        {/* Clear depot filters */}
        {activeDepots.length > 0 && (
          <button
            type="button"
            onClick={() => onDepotChange([])}
            className="text-xs text-white/40 hover:text-white/70 transition-colors duration-200 cursor-pointer self-end"
            style={{ fontFamily: "'Lato', sans-serif" }}
          >
            Clear Depot Filtering
          </button>
        )}
      </div>
    </div>
  );
}
