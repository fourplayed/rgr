import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
  getAssetPhotos,
  getPhotoById,
  getPhotosByScanEventId,
  uploadPhoto,
  deletePhoto,
  bulkDeletePhotos,
  getSignedUrl,
  getSignedUrls,
  queryFromService,
} from '@rgr/shared';
import type { UploadPhotoOptions, PhotoListItem } from '@rgr/shared';
import { assetKeys } from './useAssetData';

/** Supabase signed URLs expire at 60 min — use 45 min for a safe buffer. */
const SIGNED_URL_STALE_TIME = 2_700_000;

/**
 * Query keys for photo-related data
 */
export const photoKeys = {
  all: ['photos'] as const,
  asset: (assetId: string) => [...photoKeys.all, 'asset', assetId] as const,
  scanEvent: (id: string) => [...photoKeys.all, 'scanEvent', id] as const,
  detail: (photoId: string) => [...photoKeys.all, 'detail', photoId] as const,
  signedUrl: (storagePath: string) => [...photoKeys.all, 'signedUrl', storagePath] as const,
};

/**
 * Fetch photos for an asset with analysis summary
 */
export function useAssetPhotos(assetId: string | undefined) {
  return useQuery({
    queryKey: photoKeys.asset(assetId ?? ''),
    queryFn: queryFromService(() => getAssetPhotos(assetId!)),
    enabled: !!assetId,
    staleTime: 60_000,
  });
}

/**
 * Fetch photos linked to a scan event
 */
export function useScanEventPhotos(scanEventId: string | null) {
  return useQuery({
    queryKey: photoKeys.scanEvent(scanEventId ?? ''),
    queryFn: queryFromService(() => getPhotosByScanEventId(scanEventId!)),
    enabled: !!scanEventId,
    staleTime: 60_000,
  });
}

/**
 * Fetch a single photo with full analysis data
 */
export function usePhoto(photoId: string | undefined) {
  return useQuery({
    queryKey: photoKeys.detail(photoId ?? ''),
    queryFn: queryFromService(() => getPhotoById(photoId!)),
    enabled: !!photoId,
    staleTime: 60_000,
  });
}

/**
 * Get a signed URL for a photo
 */
export function useSignedUrl(storagePath: string | undefined) {
  return useQuery({
    queryKey: photoKeys.signedUrl(storagePath ?? ''),
    queryFn: queryFromService(() => getSignedUrl(storagePath!)),
    enabled: !!storagePath,
    staleTime: SIGNED_URL_STALE_TIME,
  });
}

/**
 * Upload a photo
 */
export function useUploadPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: UploadPhotoOptions) => {
      const result = await uploadPhoto(options);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.asset(variables.assetId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
    },
  });
}

/**
 * Delete a photo
 */
export function useDeletePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoId, assetId }: { photoId: string; assetId: string }) => {
      const result = await deletePhoto(photoId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return { photoId, assetId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.asset(data.assetId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.assetId) });
      queryClient.removeQueries({ queryKey: photoKeys.detail(data.photoId) });
    },
  });
}

/**
 * Bulk delete photos
 */
export function useBulkDeletePhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoIds, assetId }: { photoIds: string[]; assetId: string }) => {
      const result = await bulkDeletePhotos(photoIds);

      if (!result.success) {
        throw new Error(result.error);
      }

      return { ...result.data, photoIds, assetId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.asset(data.assetId) });
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.assetId) });
      for (const photoId of data.photoIds) {
        queryClient.removeQueries({ queryKey: photoKeys.detail(photoId) });
      }
    },
  });
}

/**
 * Batch-fetch signed URLs for multiple storage paths in a single request.
 * Returns a map of { storagePath → signedUrl }.
 * Seeds individual photoKeys.signedUrl(path) cache entries from the batch result.
 */
export function useBatchSignedUrls(storagePaths: string[]) {
  const queryClient = useQueryClient();

  // Create a stable cache key from sorted paths
  const pathsKey = useMemo(() => storagePaths.slice().sort().join(','), [storagePaths]);

  return useQuery({
    queryKey: [...photoKeys.all, 'signedUrls', pathsKey],
    queryFn: async () => {
      const result = await getSignedUrls(storagePaths);
      if (!result.success) throw new Error(result.error ?? 'Failed to fetch signed URLs');

      // Seed individual signedUrl cache entries so components using
      // useSignedUrl(path) get cache hits for free
      for (const [path, url] of Object.entries(result.data)) {
        queryClient.setQueryData(photoKeys.signedUrl(path), url);
      }

      return result.data;
    },
    enabled: storagePaths.length > 0,
    staleTime: SIGNED_URL_STALE_TIME,
  });
}

/**
 * Prefetch thumbnail signed URLs for the first N photos using batch API.
 * Uses a single request instead of N individual requests.
 */
export function usePrefetchImages(photos: PhotoListItem[] | undefined) {
  const queryClient = useQueryClient();

  // Derive paths in useMemo so the effect reads stable data, not a stale closure
  const prefetchPaths = useMemo(() => {
    if (!photos?.length) return [];
    return photos
      .slice(0, 6)
      .map((photo) => photo.thumbnailPath ?? photo.storagePath)
      .filter((p): p is string => !!p);
  }, [photos]);

  // Stable string key for the dependency array — avoids re-firing on
  // referentially different arrays with identical content
  const pathsKey = useMemo(() => prefetchPaths.slice().sort().join('\0'), [prefetchPaths]);

  useEffect(() => {
    if (!prefetchPaths.length) return;

    const sortedKey = prefetchPaths.slice().sort().join(',');

    queryClient.prefetchQuery({
      queryKey: [...photoKeys.all, 'signedUrls', sortedKey],
      queryFn: async () => {
        const result = await getSignedUrls(prefetchPaths);
        if (!result.success) throw new Error(result.error ?? 'Failed');

        // Seed individual cache entries
        for (const [path, url] of Object.entries(result.data)) {
          queryClient.setQueryData(photoKeys.signedUrl(path), url);
        }

        return result.data;
      },
      staleTime: SIGNED_URL_STALE_TIME,
    });
    // pathsKey provides stable identity — prefetchPaths is read directly (no split)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey, queryClient]);
}
