import { useFleetStatistics } from "@/hooks/useFleetData"

const STATS = [
  { key: "totalAssets", label: "Total", color: "#3b82f6" },
  { key: "activeAssets", label: "Active", color: "#22c55e" },
  { key: "inMaintenance", label: "Maint.", color: "#f59e0b" },
  { key: "outOfService", label: "OOS", color: "#ef4444" },
] as const

export function FloatingStatPills() {
  const { data: stats } = useFleetStatistics()

  if (!stats) {
    return null
  }

  return (
    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5">
      {STATS.map(({ key, label, color }) => (
        <div
          key={key}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border rounded-full text-xs font-medium text-foreground"
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span>{stats[key]}</span>
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  )
}
