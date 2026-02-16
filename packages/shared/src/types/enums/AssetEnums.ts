import { z } from 'zod';

/**
 * Asset status enum — matches DB: asset_status
 */
export const AssetStatus = {
  SERVICED: 'serviced',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service',
} as const;

export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

export const AssetStatusSchema = z.enum([
  'serviced',
  'maintenance',
  'out_of_service',
]);

export const AssetStatusLabels: Record<AssetStatus, string> = {
  serviced: 'Serviced',
  maintenance: 'Maintenance',
  out_of_service: 'Out of Service',
};

export const AssetStatusColors: Record<AssetStatus, string> = {
  serviced: '#2bbb6e',
  maintenance: '#e8a020',
  out_of_service: '#d43050',
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
