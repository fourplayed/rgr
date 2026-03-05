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
} from '@rgr/shared';
import type { UploadPhotoOptions, PhotoListItem } from '@rgr/shared';
import { assetKeys } from './useAssetData';
import { logger } from '../utils/logger';

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
    queryKey: photoKeys.asset(assetId!),
    queryFn: async () => {
      if (!assetId) throw new Error('Asset ID is required');

      const result = await getAssetPhotos(assetId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!assetId,
    staleTime: 60000, // Photos don't change frequently - cache for 60s
  });
}

/**
 * Fetch photos linked to a scan event
 */
export function useScanEventPhotos(scanEventId: string | null) {
  return useQuery({
    queryKey: photoKeys.scanEvent(scanEventId!),
    queryFn: async () => {
      if (!scanEventId) throw new Error('Scan event ID is required');

      const result = await getPhotosByScanEventId(scanEventId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!scanEventId,
    staleTime: 60_000,
  });
}

/**
 * Fetch a single photo with full analysis data
 */
export function usePhoto(photoId: string | undefined) {
  return useQuery({
    queryKey: photoKeys.detail(photoId!),
    queryFn: async () => {
      if (!photoId) throw new Error('Photo ID is required');

      logger.info('Fetching photo', photoId);
      const result = await getPhotoById(photoId);

      if (!result.success) {
        logger.error('Failed to fetch photo', result.error);
        throw new Error(result.error);
      }

      logger.info('Photo fetched successfully', result.data?.id);
      return result.data;
    },
    enabled: !!photoId,
    staleTime: 60000, // Photos don't change frequently
  });
}

/**
 * Get a signed URL for a photo
 */
export function useSignedUrl(storagePath: string | undefined) {
  return useQuery({
    queryKey: photoKeys.signedUrl(storagePath!),
    queryFn: async () => {
      if (!storagePath) throw new Error('Storage path is required');

      const result = await getSignedUrl(storagePath);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
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
    onSuccess: (data, variables) => {
      // Invalidate photo list for the asset
      queryClient.invalidateQueries({ queryKey: photoKeys.asset(variables.assetId) });
      // Also invalidate asset detail to refresh photo count if displayed
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
      // Invalidate photo list for the asset
      queryClient.invalidateQueries({ queryKey: photoKeys.asset(data.assetId) });
      // Remove the specific photo from cache
      queryClient.removeQueries({ queryKey: photoKeys.detail(data.photoId) });
      // Also invalidate asset detail
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.assetId) });
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
      // Invalidate photo list for the asset
      queryClient.invalidateQueries({ queryKey: photoKeys.asset(data.assetId) });
      // Remove each deleted photo from cache
      for (const photoId of data.photoIds) {
        queryClient.removeQueries({ queryKey: photoKeys.detail(photoId) });
      }
      // Invalidate asset detail
      queryClient.invalidateQueries({ queryKey: assetKeys.detail(data.assetId) });
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
  const pathsKey = useMemo(
    () => storagePaths.slice().sort().join(','),
    [storagePaths]
  );

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

  // Use stable dependency - photo IDs string, not array reference
  const photoIds = useMemo(
    () => photos?.map(p => p.id).join(',') ?? '',
    [photos]
  );

  useEffect(() => {
    if (!photos?.length) return;

    // Collect first 6 thumbnail paths for batch prefetch
    const paths = photos
      .slice(0, 6)
      .map((photo) => photo.thumbnailPath ?? photo.storagePath)
      .filter((p): p is string => !!p);

    if (paths.length === 0) return;

    const pathsKey = paths.slice().sort().join(',');

    queryClient.prefetchQuery({
      queryKey: [...photoKeys.all, 'signedUrls', pathsKey],
      queryFn: async () => {
        const result = await getSignedUrls(paths);
        if (!result.success) throw new Error(result.error ?? 'Failed');

        // Seed individual cache entries
        for (const [path, url] of Object.entries(result.data)) {
          queryClient.setQueryData(photoKeys.signedUrl(path), url);
        }

        return result.data;
      },
      staleTime: SIGNED_URL_STALE_TIME,
    });
    // Using photoIds as stable dependency to avoid re-running on array reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoIds, queryClient]);
}
