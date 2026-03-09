import { z } from 'zod';

/**
 * PushToken — camelCase application interface
 */
export interface PushToken {
  id: string;
  userId: string;
  token: string;
  deviceId: string;
  platform: 'ios' | 'android';
  createdAt: string;
  updatedAt: string;
}

/**
 * PushTokenRow — snake_case database row type
 */
export interface PushTokenRow {
  id: string;
  user_id: string;
  token: string;
  device_id: string;
  platform: 'ios' | 'android';
  created_at: string;
  updated_at: string;
}

/**
 * Input for upserting a push token
 */
export interface CreatePushTokenInput {
  userId: string;
  token: string;
  deviceId: string;
  platform: 'ios' | 'android';
}

// ── Zod schema ──

export const CreatePushTokenInputSchema = z.object({
  userId: z.string().uuid(),
  token: z.string().min(1),
  deviceId: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

// ── Mapper ──

export function mapRowToPushToken(row: PushTokenRow): PushToken {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    deviceId: row.device_id,
    platform: row.platform,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
