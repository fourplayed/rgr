import { z } from 'zod';

/**
 * Asset status enum — matches DB: asset_status
 */
export const AssetStatus = {
  ACTIVE: 'active',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service',
  DECOMMISSIONED: 'decommissioned',
} as const;

export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

export const AssetStatusSchema = z.enum([
  'active',
  'maintenance',
  'out_of_service',
  'decommissioned',
]);

export const AssetStatusLabels: Record<AssetStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  out_of_service: 'Out of Service',
  decommissioned: 'Decommissioned',
};

export const AssetStatusColors: Record<AssetStatus, string> = {
  active: '#2bbb6e',
  maintenance: '#e8a020',
  out_of_service: '#d43050',
  decommissioned: '#6b7280',
};

/**
 * Asset category enum — matches DB: asset_category
 */
export const AssetCategory = {
  TRAILER: 'trailer',
  DOLLY: 'dolly',
} as const;

export type AssetCategory = (typeof AssetCategory)[keyof typeof AssetCategory];

export const AssetCategorySchema = z.enum(['trailer', 'dolly']);

export const AssetCategoryLabels: Record<AssetCategory, string> = {
  trailer: 'Trailer',
  dolly: 'Dolly',
};
