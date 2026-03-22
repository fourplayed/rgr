import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useDepots } from "@/hooks/useAssetData"
import { useAssetLocations } from "@/hooks/useFleetData"

const DOT_COLORS = [
  "#22c55e",
  "#a78bfa",
  "#f59e0b",
  "#f87171",
  "#38bdf8",
  "#fb923c",
  "#e879f9",
  "#34d399",
]

interface NavDepotsProps {
  onDepotClick?: (depotCode: string) => void
}

export function NavDepots({ onDepotClick }: NavDepotsProps) {
  const { data: depots = [] } = useDepots()
  const { data: locations = [] } = useAssetLocations()

  // AssetLocation.depot is the depot name (joined from depots table)
  // Count assets per depot by matching location.depot === depot.name
  const assetCountByDepotName = locations.reduce<Record<string, number>>((acc, loc) => {
    if (loc.depot) {
      acc[loc.depot] = (acc[loc.depot] ?? 0) + 1
    }
    return acc
  }, {})

  const activeDepots = depots.filter((d) => d.isActive)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Depots</SidebarGroupLabel>
      <SidebarMenu>
        {activeDepots.map((depot, index) => {
          const dotColor = DOT_COLORS[index % DOT_COLORS.length]!
          const count = assetCountByDepotName[depot.name] ?? 0

          return (
            <SidebarMenuItem key={depot.id}>
              <SidebarMenuButton
                onClick={() => onDepotClick?.(depot.code)}
                className="w-full"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="flex-1 truncate">{depot.name}</span>
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {count}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
        {activeDepots.length === 0 && (
          <SidebarMenuItem>
            <div className="px-2 py-1 text-sm text-muted-foreground">No depots found</div>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  )
}
