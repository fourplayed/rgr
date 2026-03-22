import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useFleetStatistics } from "@/hooks/useFleetData"

const STATS = [
  { key: "totalAssets",   label: "Total Assets",    color: "#3b82f6" },
  { key: "activeAssets",  label: "Active",           color: "#22c55e" },
  { key: "inMaintenance", label: "Maintenance",      color: "#f59e0b" },
  { key: "outOfService",  label: "Out of Service",   color: "#ef4444" },
] as const

type StatKey = typeof STATS[number]["key"]

export function NavFleetHealth() {
  const { data, isLoading } = useFleetStatistics()

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Fleet Health</SidebarGroupLabel>
      <SidebarMenu>
        {STATS.map(({ key, label, color }) => (
          <SidebarMenuItem key={key}>
            <div className="flex items-center justify-between px-2 py-1 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{label}</span>
              </div>
              <span className="font-medium tabular-nums">
                {isLoading ? "—" : (data?.[key as StatKey] ?? 0)}
              </span>
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
