import { useState, useCallback, useMemo } from 'react';

const COMPLETABLE_STATUSES = ['scheduled', 'in_progress'];

interface SelectableItem {
  id: string;
  status: string;
}

export function useMaintenanceSelection(items: SelectableItem[]) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const completableIds = useMemo(
    () => new Set(items.filter((i) => COMPLETABLE_STATUSES.includes(i.status)).map((i) => i.id)),
    [items]
  );

  const enterSelection = useCallback(
    (initialId: string) => {
      if (!completableIds.has(initialId)) return;
      setIsSelecting(true);
      setSelectedIds(new Set([initialId]));
    },
    [completableIds]
  );

  const exitSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  }, []);

  const toggleItem = useCallback(
    (id: string) => {
      if (!completableIds.has(id)) return;
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [completableIds]
  );

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(completableIds));
  }, [completableIds]);

  return {
    isSelecting,
    selectedIds,
    selectedCount: selectedIds.size,
    enterSelection,
    exitSelection,
    toggleItem,
    selectAll,
    isCompletable: (id: string) => completableIds.has(id),
  };
}
