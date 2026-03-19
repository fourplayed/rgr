import type { QueryClient, InfiniteData } from '@tanstack/react-query';

/**
 * React Native-safe placeholder ID for optimistic cache entries.
 * Uses Math.random() because expo-crypto isn't installed and Hermes lacks Web Crypto.
 * Collision risk is acceptable: IDs are ephemeral (replaced by server IDs on onSettled).
 */
export function placeholderId(): string {
  const s = () => Math.random().toString(16).slice(2, 10);
  return `${s()}-${s().slice(0, 4)}-4${s().slice(1, 4)}-${((Math.random() * 4) | 8).toString(16)}${s().slice(1, 4)}-${s()}${s().slice(0, 4)}`;
}

/**
 * Snapshot of a cache entry before an optimistic update.
 * Used by `rollback()` to restore the exact previous state.
 */
export interface OptimisticSnapshot<TCache> {
  queryKey: readonly unknown[];
  previousData: TCache | undefined;
}

/**
 * Standard page shape used by all infinite queries in this app.
 */
export interface InfinitePage<TItem> {
  data: TItem[];
  hasMore: boolean;
}

/**
 * Optimistically prepend an item to the first page of an infinite query.
 *
 * - Cancels in-flight refetches to prevent them from overwriting the optimistic state
 * - Snapshots the current cache for rollback
 * - Only mutates if at least one page already exists (avoids corrupting unloaded queries)
 */
export async function optimisticInfiniteInsert<TItem>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  item: TItem
): Promise<OptimisticSnapshot<InfiniteData<InfinitePage<TItem>>>> {
  await queryClient.cancelQueries({ queryKey });

  const previousData = queryClient.getQueryData<InfiniteData<InfinitePage<TItem>>>(queryKey);

  const firstPage = previousData?.pages?.[0];
  if (previousData && firstPage) {
    queryClient.setQueryData<InfiniteData<InfinitePage<TItem>>>(queryKey, {
      ...previousData,
      pages: [
        { data: [item, ...firstPage.data], hasMore: firstPage.hasMore },
        ...previousData.pages.slice(1),
      ],
    });
  }

  return { queryKey, previousData };
}

/**
 * Optimistically patch fields on a regular (non-infinite) cache entry.
 *
 * - Cancels in-flight refetches
 * - Shallow-merges the patch onto the existing data
 * - Returns a snapshot for rollback
 */
export async function optimisticPatch<TItem>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  patch: Partial<TItem>
): Promise<OptimisticSnapshot<TItem>> {
  await queryClient.cancelQueries({ queryKey });

  const previousData = queryClient.getQueryData<TItem>(queryKey);

  if (previousData) {
    queryClient.setQueryData<TItem>(queryKey, { ...previousData, ...patch });
  }

  return { queryKey, previousData };
}

/**
 * Restore the exact previous cache state from a snapshot.
 * No-op if the snapshot captured `undefined` (query had no data).
 */
export function rollback<TCache>(
  queryClient: QueryClient,
  snapshot: OptimisticSnapshot<TCache>
): void {
  if (snapshot.previousData !== undefined) {
    queryClient.setQueryData(snapshot.queryKey, snapshot.previousData);
  }
}
