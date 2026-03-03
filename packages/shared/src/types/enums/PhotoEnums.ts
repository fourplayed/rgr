import { z } from 'zod';

/**
 * Photo type enum — matches DB: photo_type column on photos table
 */
export const PhotoType = {
  FREIGHT: 'freight',
  DAMAGE: 'damage',
} as const;

export type PhotoType = (typeof PhotoType)[keyof typeof PhotoType];

export const PhotoTypeSchema = z.enum(['freight', 'damage']);
