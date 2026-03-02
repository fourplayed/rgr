import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listProfiles,
  adminUpdateProfile,
  adminCreateUser,
} from '@rgr/shared';
import type {
  UserRole,
  CreateUserInput,
  ListProfilesParams,
} from '@rgr/shared';

export const adminUserKeys = {
  all: ['admin-users'] as const,
  lists: () => [...adminUserKeys.all, 'list'] as const,
  list: (filters?: ListProfilesParams) =>
    [...adminUserKeys.lists(), filters] as const,
  details: () => [...adminUserKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminUserKeys.details(), id] as const,
};

export function useUserList(filters?: ListProfilesParams) {
  return useQuery({
    queryKey: adminUserKeys.list(filters),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const result = await listProfiles(filters);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: UserRole;
    }) => {
      const result = await adminUpdateProfile(userId, { role });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      isActive,
    }: {
      userId: string;
      isActive: boolean;
    }) => {
      const result = await adminUpdateProfile(userId, { isActive });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const result = await adminCreateUser(input);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
    },
  });
}
