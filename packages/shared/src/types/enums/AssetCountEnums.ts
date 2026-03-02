import { z } from 'zod';

/**
 * Asset count session status enum — matches DB: status column on asset_count_sessions
 */
export const AssetCountSessionStatus = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type AssetCountSessionStatus = (typeof AssetCountSessionStatus)[keyof typeof AssetCountSessionStatus];

export const AssetCountSessionStatusSchema = z.enum(['in_progress', 'completed', 'cancelled']);
