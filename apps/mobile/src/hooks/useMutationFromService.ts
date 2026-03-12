import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ServiceResult } from '@rgr/shared';

interface MutationFromServiceOptions<TInput, TData, TContext = unknown> {
  serviceFn: (input: TInput) => Promise<ServiceResult<TData>>;
  invalidates?:
    | readonly (readonly unknown[])[]
    | ((data: TData, variables: TInput) => readonly (readonly unknown[])[]);
  onSuccess?: (data: TData, variables: TInput) => void;
  onMutate?: (variables: TInput) => Promise<TContext> | TContext;
  onError?: (error: Error, variables: TInput, context: TContext | undefined) => void;
  onSettled?: () => void;
}

/**
 * Wraps a ServiceResult-returning function into a React Query mutation with
 * declarative cache invalidation.
 *
 * - Unwraps ServiceResult (throws on !success so React Query sees an error)
 * - Invalidates each query key from `invalidates` on success
 * - Runs optional `onSuccess` callback after invalidation
 */
export function useMutationFromService<TInput, TData, TContext = unknown>({
  serviceFn,
  invalidates,
  onSuccess,
  onMutate,
  onError,
  onSettled,
}: MutationFromServiceOptions<TInput, TData, TContext>) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TInput, TContext>({
    mutationFn: async (input: TInput) => {
      const result = await serviceFn(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onMutate: onMutate ?? undefined!,
    onSuccess: (data, variables) => {
      const keys = typeof invalidates === 'function' ? invalidates(data, variables) : invalidates;

      if (keys) {
        for (const key of keys) {
          // SAFETY: React Query's QueryKey is mutable unknown[], our keys are readonly. Cast is safe (read-only usage).
          queryClient.invalidateQueries({ queryKey: key as unknown[] });
        }
      }

      onSuccess?.(data, variables);
    },
    onError: onError ?? undefined!,
    onSettled: onSettled ?? undefined!,
  });
}
