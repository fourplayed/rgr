import { z } from 'zod';
import {
  MaintenanceStatusSchema,
  MaintenancePrioritySchema,
  MaintenanceTypeSchema,
} from '../enums/MaintenanceEnums';
import type {
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceType,
} from '../enums/MaintenanceEnums';
import { safeParseEnum } from '../../utils/safeParseEnum';
import type { AssertTypesMatch, MustBeTrue } from '../typeAssert';

/**
 * MaintenanceRecord — camelCase application interface
 */
export interface MaintenanceRecord {
  id: string;
  assetId: string;
  reportedBy: string | null;
  assignedTo: string | null;
  completedBy: string | null;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  maintenanceType: MaintenanceType | null;
  scheduledDate: string | null;
  completedAt: string | null;
  dueDate: string | null;
  estimatedCost: number | null;
  actualCost: number | null;
  partsUsed: Record<string, unknown> | null;
  hazardAlertId: string | null;
  scanEventId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * MaintenanceRecordRow — snake_case database row type
 */
export interface MaintenanceRecordRow {
  id: string;
  asset_id: string;
  reported_by: string | null;
  assigned_to: string | null;
  completed_by: string | null;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  maintenance_type: MaintenanceType | null;
  scheduled_date: string | null;
  completed_at: string | null;
  due_date: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  parts_used: Record<string, unknown> | null;
  hazard_alert_id: string | null;
  scan_event_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * MaintenanceRecord with joined profile names
 */
export interface MaintenanceRecordWithNames extends MaintenanceRecord {
  reporterName: string | null;
  assigneeName: string | null;
  completerName: string | null;
}

/**
 * Input for creating a maintenance record
 */
export interface CreateMaintenanceInput {
  assetId: string;
  reportedBy?: string | null | undefined;
  assignedTo?: string | null | undefined;
  title: string;
  description?: string | null | undefined;
  priority?: MaintenancePriority | undefined;
  status?: MaintenanceStatus | undefined;
  maintenanceType?: MaintenanceType | null | undefined;
  scheduledDate?: string | null | undefined;
  dueDate?: string | null | undefined;
  hazardAlertId?: string | null | undefined;
  scanEventId?: string | null | undefined;
  notes?: string | null | undefined;
}

/**
 * Input for updating a maintenance record
 */
export interface UpdateMaintenanceInput {
  assignedTo?: string | null | undefined;
  completedBy?: string | null | undefined;
  title?: string | undefined;
  description?: string | null | undefined;
  priority?: MaintenancePriority | undefined;
  status?: MaintenanceStatus | undefined;
  maintenanceType?: MaintenanceType | null | undefined;
  scheduledDate?: string | null | undefined;
  completedAt?: string | null | undefined;
  dueDate?: string | null | undefined;
  estimatedCost?: number | null | undefined;
  actualCost?: number | null | undefined;
  partsUsed?: Record<string, unknown> | null | undefined;
  notes?: string | null | undefined;
}

// ── Zod schemas ──

export const CreateMaintenanceInputSchema = z.object({
  assetId: z.string().uuid(),
  reportedBy: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  priority: MaintenancePrioritySchema.optional(),
  status: MaintenanceStatusSchema.optional(),
  maintenanceType: MaintenanceTypeSchema.nullable().optional(),
  scheduledDate: z.string().date().nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  hazardAlertId: z.string().uuid().nullable().optional(),
  scanEventId: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format');

export const UpdateMaintenanceInputSchema = z.object({
  assignedTo: z.string().uuid().nullable().optional(),
  completedBy: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  priority: MaintenancePrioritySchema.optional(),
  status: MaintenanceStatusSchema.optional(),
  maintenanceType: MaintenanceTypeSchema.nullable().optional(),
  scheduledDate: z.string().date().nullable().optional(),
  completedAt: isoDateString.nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
  estimatedCost: z.number().min(0).nullable().optional(),
  actualCost: z.number().min(0).nullable().optional(),
  partsUsed: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ── Mappers ──

export function mapRowToMaintenanceRecord(row: MaintenanceRecordRow): MaintenanceRecord {
  return {
    id: row.id,
    assetId: row.asset_id,
    reportedBy: row.reported_by,
    assignedTo: row.assigned_to,
    completedBy: row.completed_by,
    title: row.title,
    description: row.description,
    priority: safeParseEnum(MaintenancePrioritySchema, row.priority, 'medium'),
    status: safeParseEnum(MaintenanceStatusSchema, row.status, 'scheduled'),
    maintenanceType: safeParseEnum(MaintenanceTypeSchema, row.maintenance_type, null),
    scheduledDate: row.scheduled_date,
    completedAt: row.completed_at,
    dueDate: row.due_date,
    estimatedCost: row.estimated_cost,
    actualCost: row.actual_cost,
    partsUsed: row.parts_used,
    hazardAlertId: row.hazard_alert_id,
    scanEventId: row.scan_event_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type MaintenanceInsertRow = Omit<
  MaintenanceRecordRow,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'completed_by'
  | 'completed_at'
  | 'parts_used'
  | 'estimated_cost'
  | 'actual_cost'
>;
export type MaintenanceUpdateRow = Partial<Omit<MaintenanceRecordRow, 'id' | 'created_at'>>;

export function mapMaintenanceToInsert(input: CreateMaintenanceInput): MaintenanceInsertRow {
  return {
    asset_id: input.assetId,
    reported_by: input.reportedBy ?? null,
    assigned_to: input.assignedTo ?? null,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority ?? 'medium',
    status: input.status ?? 'scheduled',
    maintenance_type: input.maintenanceType ?? null,
    scheduled_date: input.scheduledDate ?? null,
    due_date: input.dueDate ?? null,
    hazard_alert_id: input.hazardAlertId ?? null,
    scan_event_id: input.scanEventId ?? null,
    notes: input.notes ?? null,
  };
}

export function mapMaintenanceToUpdate(input: UpdateMaintenanceInput): MaintenanceUpdateRow {
  const updates: MaintenanceUpdateRow = {};

  if (input.assignedTo !== undefined) updates['assigned_to'] = input.assignedTo;
  if (input.completedBy !== undefined) updates['completed_by'] = input.completedBy;
  if (input.title !== undefined) updates['title'] = input.title;
  if (input.description !== undefined) updates['description'] = input.description;
  if (input.priority !== undefined) updates['priority'] = input.priority;
  if (input.status !== undefined) updates['status'] = input.status;
  if (input.maintenanceType !== undefined) updates['maintenance_type'] = input.maintenanceType;
  if (input.scheduledDate !== undefined) updates['scheduled_date'] = input.scheduledDate;
  if (input.completedAt !== undefined) updates['completed_at'] = input.completedAt;
  if (input.dueDate !== undefined) updates['due_date'] = input.dueDate;
  if (input.estimatedCost !== undefined) updates['estimated_cost'] = input.estimatedCost;
  if (input.actualCost !== undefined) updates['actual_cost'] = input.actualCost;
  if (input.partsUsed !== undefined) updates['parts_used'] = input.partsUsed;
  if (input.notes !== undefined) updates['notes'] = input.notes;

  return updates;
}

// Compile-time schema <-> interface drift detection
type _CreateMaintenanceCheck = MustBeTrue<
  AssertTypesMatch<z.infer<typeof CreateMaintenanceInputSchema>, CreateMaintenanceInput>
>;
type _UpdateMaintenanceCheck = MustBeTrue<
  AssertTypesMatch<z.infer<typeof UpdateMaintenanceInputSchema>, UpdateMaintenanceInput>
>;
