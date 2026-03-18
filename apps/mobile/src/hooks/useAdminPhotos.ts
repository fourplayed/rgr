import { useQuery } from '@tanstack/react-query';
import { bulkDeletePhotos, queryFromService } from '@rgr/shared';
import { adminListPhotos } from '@rgr/shared/admin';
import type { AdminListPhotosParams } from '@rgr/shared/admin';
import { photoKeys } from './usePhotos';
import { useMutationFromService } from './useMutationFromService';

export const adminPhotoKeys = {
  all: ['admin-photos'] as const,
  lists: () => [...adminPhotoKeys.all, 'list'] as const,
  list: (params: AdminListPhotosParams) => [...adminPhotoKeys.lists(), params] as const,
};

export function useAdminPhotoList(params: AdminListPhotosParams = {}) {
  return useQuery({
    queryKey: adminPhotoKeys.list(params),
    queryFn: queryFromService(() => adminListPhotos(params)),
    staleTime: 30_000,
  });
}

export function useAdminBulkDeletePhotos() {
  return useMutationFromService({
    serviceFn: (photoIds: string[]) => bulkDeletePhotos(photoIds),
    invalidates: [adminPhotoKeys.all, photoKeys.all],
  });
}
