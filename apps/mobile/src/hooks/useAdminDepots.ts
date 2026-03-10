import { useQuery } from '@tanstack/react-query';
import { listAllDepots, createDepot, updateDepot, deleteDepot } from '@rgr/shared';
import type { CreateDepotInput, UpdateDepotInput } from '@rgr/shared';
import { depotKeys } from './useDepots';
import { useMutationFromService } from './useMutationFromService';

export const adminDepotKeys = {
  all: ['admin-depots'] as const,
  list: () => [...adminDepotKeys.all, 'list'] as const,
};

export function useAllDepots() {
  return useQuery({
    queryKey: adminDepotKeys.list(),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const result = await listAllDepots();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useCreateDepot() {
  return useMutationFromService({
    serviceFn: (input: CreateDepotInput) => createDepot(input),
    invalidates: [adminDepotKeys.list(), depotKeys.list()],
  });
}

export function useUpdateDepot() {
  return useMutationFromService({
    serviceFn: ({ id, input }: { id: string; input: UpdateDepotInput }) => updateDepot(id, input),
    invalidates: [adminDepotKeys.list(), depotKeys.list()],
  });
}

export function useDeleteDepot() {
  return useMutationFromService({
    serviceFn: (id: string) => deleteDepot(id),
    invalidates: [adminDepotKeys.list(), depotKeys.list()],
  });
}
