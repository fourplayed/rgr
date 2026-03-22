import { useDepots } from "@/hooks/useAssetData"

const DEPOT_COLORS = [
  "#22c55e",
  "#a78bfa",
  "#f59e0b",
  "#f87171",
  "#38bdf8",
  "#fb923c",
  "#e879f9",
  "#34d399",
]

interface DepotFilterPillsProps {
  activeDepot: string | null
  onDepotChange: (depotCode: string | null) => void
}

export function DepotFilterPills({ activeDepot, onDepotChange }: DepotFilterPillsProps) {
  const { data: depots = [] } = useDepots()

  const handleDepotClick = (depotCode: string) => {
    if (activeDepot === depotCode) {
      onDepotChange(null)
    } else {
      onDepotChange(depotCode)
    }
  }

  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 flex-wrap justify-end max-w-xs">
      {/* All pill */}
      <button
        onClick={() => onDepotChange(null)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full transition-colors ${
          activeDepot === null
            ? "bg-foreground text-background border-foreground"
            : "bg-card text-muted-foreground border-border hover:border-foreground/40"
        }`}
      >
        All
      </button>

      {/* One pill per depot */}
      {depots.map((depot, index) => {
        const color = DEPOT_COLORS[index % DEPOT_COLORS.length]
        const isActive = activeDepot === depot.code
        return (
          <button
            key={depot.code}
            onClick={() => handleDepotClick(depot.code)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full transition-colors ${
              isActive
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:border-foreground/40"
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            {depot.name}
          </button>
        )
      })}
    </div>
  )
}
