import { z } from 'zod';

/**
 * Maintenance status enum — matches DB: maintenance_status
 */
export const MaintenanceStatus = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type MaintenanceStatus = (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus];

export const MaintenanceStatusSchema = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

export const MAINTENANCE_STATUSES = MaintenanceStatusSchema.options;

export const MaintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * Maintenance priority enum — matches DB: maintenance_priority
 */
export const MaintenancePriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  CRITICAL: 'critical',
} as const;

export type MaintenancePriority = (typeof MaintenancePriority)[keyof typeof MaintenancePriority];

export const MaintenancePrioritySchema = z.enum(['low', 'medium', 'critical']);

export const MaintenancePriorityLabels: Record<MaintenancePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  critical: 'Critical',
};

export const MaintenancePriorityColors: Record<MaintenancePriority, string> = {
  low: '#6b7280',
  medium: '#3b82f6',
  critical: '#d43050',
};

/**
 * Maintenance type enum — matches DB CHECK constraint on maintenance_records.maintenance_type
 */
export const MaintenanceType = {
  SCHEDULED: 'scheduled',
  REACTIVE: 'reactive',
  INSPECTION: 'inspection',
  DEFECT_REPORT: 'defect_report',
} as const;

export type MaintenanceType = (typeof MaintenanceType)[keyof typeof MaintenanceType];

export const MaintenanceTypeSchema = z.enum([
  'scheduled',
  'reactive',
  'inspection',
  'defect_report',
]);
