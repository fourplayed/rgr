import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ServiceResult } from '@rgr/shared';

interface MutationFromServiceOptions<TInput, TData> {
  serviceFn: (input: TInput) => Promise<ServiceResult<TData>>;
  invalidates?:
    | readonly (readonly unknown[])[]
    | ((data: TData, variables: TInput) => readonly (readonly unknown[])[]);
  onSuccess?: (data: TData, variables: TInput) => void;
}

/**
 * Wraps a ServiceResult-returning function into a React Query mutation with
 * declarative cache invalidation.
 *
 * - Unwraps ServiceResult (throws on !success so React Query sees an error)
 * - Invalidates each query key from `invalidates` on success
 * - Runs optional `onSuccess` callback after invalidation
 */
export function useMutationFromService<TInput, TData>({
  serviceFn,
  invalidates,
  onSuccess,
}: MutationFromServiceOptions<TInput, TData>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TInput) => {
      const result = await serviceFn(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data, variables) => {
      const keys = typeof invalidates === 'function' ? invalidates(data, variables) : invalidates;

      if (keys) {
        for (const key of keys) {
          queryClient.invalidateQueries({ queryKey: key as unknown[] });
        }
      }

      onSuccess?.(data, variables);
    },
  });
}
