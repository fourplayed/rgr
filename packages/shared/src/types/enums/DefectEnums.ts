import { z } from 'zod';

/**
 * Defect status enum — matches DB: defect_status
 *
 * Lifecycle: reported → accepted (task created) → resolved (task completed) / dismissed
 */
export const DefectStatus = {
  REPORTED: 'reported',
  ACCEPTED: 'accepted',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

export type DefectStatus =
  (typeof DefectStatus)[keyof typeof DefectStatus];

export const DefectStatusSchema = z.enum([
  'reported',
  'accepted',
  'resolved',
  'dismissed',
]);

export const DefectStatusLabels: Record<DefectStatus, string> = {
  reported: 'Reported',
  accepted: 'Accepted',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};
