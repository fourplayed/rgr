import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listAllDepots, createDepot, updateDepot, deleteDepot } from '@rgr/shared';
import type { CreateDepotInput, UpdateDepotInput } from '@rgr/shared';
import { depotKeys } from './useDepots';

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDepotInput) => {
      const result = await createDepot(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDepotKeys.list() });
      queryClient.invalidateQueries({ queryKey: depotKeys.list() });
    },
  });
}

export function useUpdateDepot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateDepotInput }) => {
      const result = await updateDepot(id, input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDepotKeys.list() });
      queryClient.invalidateQueries({ queryKey: depotKeys.list() });
    },
  });
}

export function useDeleteDepot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteDepot(id);
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDepotKeys.list() });
      queryClient.invalidateQueries({ queryKey: depotKeys.list() });
    },
  });
}
