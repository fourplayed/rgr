import { z } from 'zod';

/**
 * Defect status enum — matches DB: defect_status
 *
 * Lifecycle: reported → task_created (maintenance task linked) → resolved (task completed) / dismissed
 */
export const DefectStatus = {
  REPORTED: 'reported',
  TASK_CREATED: 'task_created',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

export type DefectStatus = (typeof DefectStatus)[keyof typeof DefectStatus];

export const DefectStatusSchema = z.enum(['reported', 'task_created', 'resolved', 'dismissed']);

export const DefectStatusLabels: Record<DefectStatus, string> = {
  reported: 'Reported',
  task_created: 'Accepted',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};
