import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import {
  getAssetPhotos,
  getPhotoById,
  uploadPhoto,
  deletePhoto,
  getSignedUrl,
} from '@rgr/shared';
import type { UploadPhotoOptions, PhotoListItem } from '@rgr/shared';
import { assetKeys } from './useAssetData';

/**
 * Query keys for photo-related data
 */
export const photoKeys = {
  all: ['photos'] as const,
  asset: (assetId: string) => [...photoKeys.all, 'asset', assetId] as const,
  detail: (photoId: string) => [...photoKeys.all, 'detail', photoId] as const,
  signedUrl: (storagePath: string) => [...photoKeys.all, 'signedUrl', storagePath] as const,
};

/**
 * Fetch photos for an asset with analysis summary
 */
export function useAssetPhotos(assetId: string | undefined) {
  return useQuery({
    queryKey: photoKeys.asset(assetId ?? ''),
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
 * Fetch a single photo with full analysis data
 */
export function usePhoto(photoId: string | undefined) {
  return useQuery({
    queryKey: photoKeys.detail(photoId ?? ''),
    queryFn: async () => {
      if (!photoId) throw new Error('Photo ID is required');

      console.log('[usePhoto] Fetching photo:', photoId);
      const result = await getPhotoById(photoId);

      if (!result.success) {
        console.error('[usePhoto] Failed:', result.error);
        throw new Error(result.error);
      }

      console.log('[usePhoto] Success:', result.data?.id);
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
    queryKey: photoKeys.signedUrl(storagePath ?? ''),
    queryFn: async () => {
      if (!storagePath) throw new Error('Storage path is required');

      const result = await getSignedUrl(storagePath);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!storagePath,
    staleTime: 3000000, // Cache signed URLs for ~50 minutes (they expire in 1 hour)
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
 * Prefetch thumbnail signed URLs for the first N photos.
 * Uses TanStack Query's prefetchQuery for cache integration.
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

    // Prefetch first 6 thumbnails into TanStack Query cache
    photos.slice(0, 6).forEach((photo) => {
      const path = photo.thumbnailPath || photo.storagePath;
      if (!path) return;

      queryClient.prefetchQuery({
        queryKey: photoKeys.signedUrl(path),
        queryFn: async () => {
          const result = await getSignedUrl(path);
          if (!result.success) throw new Error(result.error ?? 'Failed');
          return result.data;
        },
        staleTime: 3000000, // Match existing cache time
      });
    });
  }, [photoIds, queryClient]);
}
