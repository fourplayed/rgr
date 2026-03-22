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
    <div className="flex flex-col gap-1 px-3">
      {STATS.map(({ key, label, color }) => (
        <div
          key={key}
          className="flex items-center justify-between py-1 text-sm text-sidebar-foreground"
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-sidebar-foreground/60">{label}</span>
          </div>
          <span className="font-medium tabular-nums">{stats[key]}</span>
        </div>
      ))}
    </div>
  )
}
