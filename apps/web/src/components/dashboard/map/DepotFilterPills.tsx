import { useDepots } from "@/hooks/useAssetData"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CheckIcon } from "lucide-react"

interface DepotFilterPillsProps {
  activeDepots: string[]
  onDepotChange: (depots: string[]) => void
}

export function DepotFilterPills({ activeDepots, onDepotChange }: DepotFilterPillsProps) {
  const { data: depots = [] } = useDepots()

  const allSelected = activeDepots.length === 0

  const handleToggleDepot = (depotCode: string) => {
    if (activeDepots.includes(depotCode)) {
      onDepotChange(activeDepots.filter((d) => d !== depotCode))
    } else {
      onDepotChange([...activeDepots, depotCode])
    }
  }

  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      className="shadow-md shadow-black/15 overflow-visible bg-card"
    >
      <ToggleGroupItem
        value="all"
        pressed={allSelected}
        onClick={() => onDepotChange([])}
        className="relative text-xs font-medium"
      >
        {allSelected && (
          <span className="absolute -top-1.5 right-1 z-10 flex size-4 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
            <CheckIcon className="size-2.5" strokeWidth={3} />
          </span>
        )}
        All
      </ToggleGroupItem>

      {depots.map((depot) => {
        const isActive = activeDepots.includes(depot.code)
        return (
          <ToggleGroupItem
            key={depot.code}
            value={depot.code}
            pressed={isActive}
            onClick={() => handleToggleDepot(depot.code)}
            className="relative text-xs font-medium"
          >
            {isActive && (
              <span className="absolute -top-1.5 right-1 z-10 flex size-4 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                <CheckIcon className="size-2.5" strokeWidth={3} />
              </span>
            )}
            {depot.name}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
