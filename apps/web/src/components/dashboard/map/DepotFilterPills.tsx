import { useMemo } from 'react';
import { useDepots } from '@/hooks/useAssetData';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CheckIcon } from 'lucide-react';

interface DepotFilterPillsProps {
  activeDepots: string[];
  onDepotChange: (depots: string[]) => void;
}

const ROW1_NAMES = ['Perth', 'Wubin', 'Carnarvon'];
const ROW2_NAMES = ['Newman', 'Hedland', 'Karratha'];

export function DepotFilterPills({ activeDepots, onDepotChange }: DepotFilterPillsProps) {
  const { data: depots = [] } = useDepots();

  const allSelected = activeDepots.length === 0;

  const handleToggleDepot = (depotCode: string) => {
    if (activeDepots.includes(depotCode)) {
      onDepotChange(activeDepots.filter((d) => d !== depotCode));
    } else {
      onDepotChange([...activeDepots, depotCode]);
    }
  };

  const { row1, row2 } = useMemo(() => {
    const r1 = ROW1_NAMES.map((name) => depots.find((d) => d.name === name)).filter(Boolean) as typeof depots;
    const r2 = ROW2_NAMES.map((name) => depots.find((d) => d.name === name)).filter(Boolean) as typeof depots;
    const assigned = new Set([...ROW1_NAMES, ...ROW2_NAMES]);
    const extras = depots.filter((d) => !assigned.has(d.name));
    return { row1: r1, row2: [...r2, ...extras] };
  }, [depots]);

  const renderItem = (depot: (typeof depots)[number]) => {
    const isActive = activeDepots.includes(depot.code);
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
    );
  };

  return (
    <div className="flex flex-col gap-1.5">
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
        {row1.map(renderItem)}
      </ToggleGroup>
      <ToggleGroup
        variant="outline"
        size="sm"
        className="shadow-md shadow-black/15 overflow-visible bg-card"
      >
        {row2.map(renderItem)}
      </ToggleGroup>
    </div>
  );
}
