/**
 * useAssetsLogic — Business logic hook for the Assets page
 *
 * Manages URL state (view, filters, sort, pagination, selected asset),
 * role-based permissions, and action handlers.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import { hasRoleLevel, UserRole, SORT_FIELD_MAP } from '@rgr/shared';
import type { Profile, AssetSortField } from '@rgr/shared';
import type { AssetStatus, AssetCategory } from '@rgr/shared';
import type {
  AssetFilters,
  AssetSort,
  AssetPagination,
  AssetsViewMode,
  AssetDetailTab,
} from './types';
import {
  DEFAULT_ASSET_SORT,
  DEFAULT_ASSET_PAGINATION,
} from './types';

export interface AssetsState {
  user: Profile | null;
  isDark: boolean;
  viewMode: AssetsViewMode;
  filters: AssetFilters;
  sort: AssetSort;
  pagination: AssetPagination;
  selectedAssetId: string | null;
  activeDetailTab: AssetDetailTab;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  showFiltersPanel: boolean;
}

export interface AssetsActions {
  setViewMode: (mode: AssetsViewMode) => void;
  setSearch: (search: string) => void;
  setFilters: (filters: Partial<AssetFilters>) => void;
  resetFilters: () => void;
  setSort: (field: AssetSortField) => void;
  setPage: (page: number) => void;
  selectAsset: (id: string | null) => void;
  setDetailTab: (tab: AssetDetailTab) => void;
  toggleFiltersPanel: () => void;
}

function parseSearchParams(params: URLSearchParams): {
  viewMode: AssetsViewMode;
  filters: AssetFilters;
  sort: AssetSort;
  pagination: AssetPagination;
  selectedAssetId: string | null;
  activeDetailTab: AssetDetailTab;
  showFiltersPanel: boolean;
} {
  const view = params.get('view');
  const viewMode: AssetsViewMode = view === 'map' ? 'map' : 'table';

  const search = params.get('search') ?? '';
  const statusParam = params.get('status');
  const categoryParam = params.get('category');
  const depotIdParam = params.get('depotId');
  const depotIds = depotIdParam ? depotIdParam.split(',') : [];

  const statuses = statusParam
    ? (statusParam.split(',') as AssetStatus[])
    : [];
  const categories = categoryParam
    ? (categoryParam.split(',') as AssetCategory[])
    : [];

  const rawSortField = params.get('sortField') ?? DEFAULT_ASSET_SORT.field;
  const sortField: AssetSortField = rawSortField in SORT_FIELD_MAP
    ? (rawSortField as AssetSortField)
    : DEFAULT_ASSET_SORT.field;
  const sortDir = params.get('sortDir');
  const sortDirection: 'asc' | 'desc' = sortDir === 'desc' ? 'desc' : 'asc';

  const pageStr = params.get('page');
  const page = pageStr ? parseInt(pageStr, 10) : DEFAULT_ASSET_PAGINATION.page;

  const selectedAssetId = params.get('assetId') ?? null;
  const tabParam = params.get('tab');
  const activeDetailTab: AssetDetailTab =
    tabParam === 'scans' || tabParam === 'maintenance' || tabParam === 'hazards'
      ? tabParam
      : 'overview';

  const showFilters = params.get('filters') === '1';

  return {
    viewMode,
    filters: { search, categories, statuses, depotIds, hasLocation: null },
    sort: { field: sortField, direction: sortDirection },
    pagination: { page, pageSize: DEFAULT_ASSET_PAGINATION.pageSize },
    selectedAssetId,
    activeDetailTab,
    showFiltersPanel: showFilters,
  };
}

export function useAssetsLogic(): { state: AssetsState; actions: AssetsActions } {
  const user = useAuthStore((s) => s.user);
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const parsed = useMemo(() => parseSearchParams(searchParams), [searchParams]);

  const userRole = (user?.role ?? 'driver') as import('@rgr/shared').UserRole;
  const canCreate = hasRoleLevel(userRole, UserRole.MANAGER);
  const canEdit = hasRoleLevel(userRole, UserRole.MANAGER);
  const canDelete = userRole === UserRole.SUPERUSER;

  // Helper to update search params without losing existing ones
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const actions: AssetsActions = useMemo(
    () => ({
      setViewMode: (mode: AssetsViewMode) => {
        updateParams({ view: mode === 'table' ? null : mode });
      },

      setSearch: (search: string) => {
        updateParams({ search: search || null, page: null });
      },

      setFilters: (partial: Partial<AssetFilters>) => {
        const updates: Record<string, string | null> = { page: null };
        if (partial.statuses !== undefined) {
          updates['status'] = partial.statuses.length > 0 ? partial.statuses.join(',') : null;
        }
        if (partial.categories !== undefined) {
          updates['category'] = partial.categories.length > 0 ? partial.categories.join(',') : null;
        }
        if (partial.depotIds !== undefined) {
          updates['depotId'] = partial.depotIds.length > 0 ? partial.depotIds.join(',') : null;
        }
        updateParams(updates);
      },

      resetFilters: () => {
        updateParams({
          search: null,
          status: null,
          category: null,
          depotId: null,
          page: null,
        });
      },

      setSort: (field: AssetSortField) => {
        const currentDir = parsed.sort.field === field ? parsed.sort.direction : 'asc';
        const newDir = parsed.sort.field === field && currentDir === 'asc' ? 'desc' : 'asc';
        updateParams({ sortField: field, sortDir: newDir, page: null });
      },

      setPage: (page: number) => {
        updateParams({ page: page > 1 ? String(page) : null });
      },

      selectAsset: (id: string | null) => {
        updateParams({ assetId: id, tab: null });
      },

      setDetailTab: (tab: AssetDetailTab) => {
        updateParams({ tab: tab === 'overview' ? null : tab });
      },

      toggleFiltersPanel: () => {
        updateParams({ filters: parsed.showFiltersPanel ? null : '1' });
      },
    }),
    [updateParams, parsed.sort.field, parsed.sort.direction, parsed.showFiltersPanel]
  );

  return {
    state: {
      user,
      isDark,
      viewMode: parsed.viewMode,
      filters: parsed.filters,
      sort: parsed.sort,
      pagination: parsed.pagination,
      selectedAssetId: parsed.selectedAssetId,
      activeDetailTab: parsed.activeDetailTab,
      canCreate,
      canEdit,
      canDelete,
      showFiltersPanel: parsed.showFiltersPanel,
    },
    actions,
  };
}
