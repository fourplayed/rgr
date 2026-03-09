import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminListPhotos,
  bulkDeletePhotos,
  queryFromService,
} from '@rgr/shared';
import type { AdminListPhotosParams } from '@rgr/shared';
import { photoKeys } from './usePhotos';

export const adminPhotoKeys = {
  all: ['admin-photos'] as const,
  lists: () => [...adminPhotoKeys.all, 'list'] as const,
  list: (params: AdminListPhotosParams) =>
    [...adminPhotoKeys.lists(), params] as const,
};

export function useAdminPhotoList(params: AdminListPhotosParams = {}) {
  return useQuery({
    queryKey: adminPhotoKeys.list(params),
    queryFn: queryFromService(() => adminListPhotos(params)),
    staleTime: 30_000,
  });
}

export function useAdminBulkDeletePhotos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoIds: string[]) => {
      const result = await bulkDeletePhotos(photoIds);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminPhotoKeys.all });
      queryClient.invalidateQueries({ queryKey: photoKeys.all });
    },
  });
}
