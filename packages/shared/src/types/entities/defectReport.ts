import { z } from 'zod';
import { DefectStatusSchema } from '../enums/DefectEnums';
import type { DefectStatus } from '../enums/DefectEnums';
import type { AssetCategory } from '../enums/AssetEnums';
import { safeParseEnum } from '../../utils/safeParseEnum';

/**
 * DefectReport — camelCase application interface
 */
export interface DefectReport {
  id: string;
  assetId: string;
  reportedBy: string | null;
  scanEventId: string | null;
  title: string;
  description: string | null;
  status: DefectStatus;
  maintenanceRecordId: string | null;
  acceptedAt: string | null;
  resolvedAt: string | null;
  dismissedAt: string | null;
  dismissedReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * DefectReportRow — snake_case database row type
 */
export interface DefectReportRow {
  id: string;
  asset_id: string;
  reported_by: string | null;
  scan_event_id: string | null;
  title: string;
  description: string | null;
  status: string;
  maintenance_record_id: string | null;
  accepted_at: string | null;
  resolved_at: string | null;
  dismissed_at: string | null;
  dismissed_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * DefectReport with joined profile names
 */
export interface DefectReportWithNames extends DefectReport {
  reporterName: string | null;
}

/**
 * DefectReport for list display
 */
export interface DefectReportListItem {
  id: string;
  assetId: string;
  title: string;
  description: string | null;
  status: DefectStatus;
  maintenanceRecordId: string | null;
  createdAt: string;
  reporterName: string | null;
  assetNumber: string | null;
  assetCategory: AssetCategory | null;
}

/**
 * Input for creating a defect report
 */
export interface CreateDefectReportInput {
  assetId: string;
  reportedBy?: string | null;
  scanEventId?: string | null;
  title: string;
  description?: string | null;
  notes?: string | null;
}

/**
 * Input for updating a defect report
 */
export interface UpdateDefectReportInput {
  title?: string;
  description?: string | null;
  maintenanceRecordId?: string | null;
  acceptedAt?: string | null;
  resolvedAt?: string | null;
  dismissedAt?: string | null;
  dismissedReason?: string | null;
  notes?: string | null;
}

// ── Zod schemas ──

export const CreateDefectReportInputSchema = z.object({
  assetId: z.string().uuid(),
  reportedBy: z.string().uuid().nullable().optional(),
  scanEventId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format');

export const UpdateDefectReportInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  maintenanceRecordId: z.string().uuid().nullable().optional(),
  acceptedAt: isoDateString.nullable().optional(),
  resolvedAt: isoDateString.nullable().optional(),
  dismissedAt: isoDateString.nullable().optional(),
  dismissedReason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// ── Mappers ──

export function mapRowToDefectReport(row: DefectReportRow): DefectReport {
  return {
    id: row.id,
    assetId: row.asset_id,
    reportedBy: row.reported_by,
    scanEventId: row.scan_event_id,
    title: row.title,
    description: row.description,
    status: safeParseEnum(DefectStatusSchema, row.status, 'reported'),
    maintenanceRecordId: row.maintenance_record_id,
    acceptedAt: row.accepted_at,
    resolvedAt: row.resolved_at,
    dismissedAt: row.dismissed_at,
    dismissedReason: row.dismissed_reason,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type DefectReportInsertRow = Omit<
  DefectReportRow,
  'id' | 'created_at' | 'updated_at' | 'status' | 'maintenance_record_id' | 'accepted_at' | 'resolved_at' | 'dismissed_at' | 'dismissed_reason'
>;

export type DefectReportUpdateRow = Partial<Omit<DefectReportRow, 'id' | 'created_at'>>;

export function mapDefectReportToInsert(
  input: CreateDefectReportInput
): DefectReportInsertRow {
  return {
    asset_id: input.assetId,
    reported_by: input.reportedBy ?? null,
    scan_event_id: input.scanEventId ?? null,
    title: input.title,
    description: input.description ?? null,
    notes: input.notes ?? null,
  };
}

export function mapDefectReportToUpdate(
  input: UpdateDefectReportInput
): DefectReportUpdateRow {
  const updates: DefectReportUpdateRow = {};

  if (input.title !== undefined) updates['title'] = input.title;
  if (input.description !== undefined) updates['description'] = input.description;
  if (input.maintenanceRecordId !== undefined) updates['maintenance_record_id'] = input.maintenanceRecordId;
  if (input.acceptedAt !== undefined) updates['accepted_at'] = input.acceptedAt;
  if (input.resolvedAt !== undefined) updates['resolved_at'] = input.resolvedAt;
  if (input.dismissedAt !== undefined) updates['dismissed_at'] = input.dismissedAt;
  if (input.dismissedReason !== undefined) updates['dismissed_reason'] = input.dismissedReason;
  if (input.notes !== undefined) updates['notes'] = input.notes;

  return updates;
}
