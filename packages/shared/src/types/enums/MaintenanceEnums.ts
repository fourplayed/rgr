import { z } from 'zod';

/**
 * Maintenance status enum — matches DB: maintenance_status
 */
export const MaintenanceStatus = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type MaintenanceStatus = (typeof MaintenanceStatus)[keyof typeof MaintenanceStatus];

export const MaintenanceStatusSchema = z.enum(['scheduled', 'completed', 'cancelled']);

export const MaintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/**
 * Maintenance priority enum — matches DB: maintenance_priority
 */
export const MaintenancePriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type MaintenancePriority = (typeof MaintenancePriority)[keyof typeof MaintenancePriority];

export const MaintenancePrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const MaintenancePriorityLabels: Record<MaintenancePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const MaintenancePriorityColors: Record<MaintenancePriority, string> = {
  low: '#6b7280',
  medium: '#3b82f6',
  high: '#e8a020',
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
