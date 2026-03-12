import { z } from 'zod';

/**
 * Photo type enum — matches DB: photo_type column on photos table
 */
export const PhotoType = {
  FREIGHT: 'freight',
  DEFECT: 'defect',
  INSPECTION: 'inspection',
  GENERAL: 'general',
} as const;

export type PhotoType = (typeof PhotoType)[keyof typeof PhotoType];

export const PhotoTypeSchema = z.enum(['freight', 'defect', 'inspection', 'general']);

export const PHOTO_TYPES = PhotoTypeSchema.options;

export const PhotoTypeLabels: Record<PhotoType, string> = {
  freight: 'Freight',
  defect: 'Defect',
  inspection: 'Inspection',
  general: 'General',
};

