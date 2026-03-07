import type { AssetStatus, AssetCategory, AssetSortField } from '@rgr/shared';

/**
 * Filter state for the assets page
 */
export interface AssetFilters {
  search: string;
  categories: AssetCategory[];
  statuses: AssetStatus[];
  depotIds: string[];
  hasLocation: boolean | null;
}

/**
 * Sort state for the assets page
 */
export interface AssetSort {
  field: AssetSortField;
  direction: 'asc' | 'desc';
}

/**
 * Pagination state for the assets page
 */
export interface AssetPagination {
  page: number;
  pageSize: number;
}

/**
 * View mode for the assets page
 */
export type AssetsViewMode = 'table' | 'map';

/**
 * Active tab in the detail slideout
 */
export type AssetDetailTab = 'overview' | 'scans' | 'maintenance' | 'hazards';

// ── Defaults ──

export const DEFAULT_ASSET_FILTERS: AssetFilters = {
  search: '',
  categories: [],
  statuses: [],
  depotIds: [],
  hasLocation: null,
};

export const DEFAULT_ASSET_SORT: AssetSort = {
  field: 'assetNumber',
  direction: 'asc',
};

export const DEFAULT_ASSET_PAGINATION: AssetPagination = {
  page: 1,
  pageSize: 20,
};
