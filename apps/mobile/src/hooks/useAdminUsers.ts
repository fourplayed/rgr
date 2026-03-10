import { useQuery } from '@tanstack/react-query';
import {
  listProfiles,
  adminUpdateProfile,
  adminCreateUser,
  fetchProfile,
  queryFromService,
} from '@rgr/shared';
import type { UserRole, CreateUserInput, ListProfilesParams } from '@rgr/shared';
import { useMutationFromService } from './useMutationFromService';

export const adminUserKeys = {
  all: ['admin-users'] as const,
  lists: () => [...adminUserKeys.all, 'list'] as const,
  list: (filters?: ListProfilesParams) => [...adminUserKeys.lists(), filters] as const,
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

export function useUserDetail(userId: string) {
  return useQuery({
    queryKey: adminUserKeys.detail(userId),
    queryFn: queryFromService(() => fetchProfile(userId)),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useUpdateUserRole() {
  return useMutationFromService({
    serviceFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      adminUpdateProfile(userId, { role }),
    invalidates: (_data, { userId }) => [adminUserKeys.lists(), adminUserKeys.detail(userId)],
  });
}

export function useUpdateUserStatus() {
  return useMutationFromService({
    serviceFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminUpdateProfile(userId, { isActive }),
    invalidates: (_data, { userId }) => [adminUserKeys.lists(), adminUserKeys.detail(userId)],
  });
}

export function useCreateUser() {
  return useMutationFromService({
    serviceFn: (input: CreateUserInput) => adminCreateUser(input),
    invalidates: [adminUserKeys.lists()],
  });
}
